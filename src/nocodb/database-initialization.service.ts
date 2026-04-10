import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';

type JsonObject = Record<string, unknown>;

interface ColumnDefinition {
  name: string;
  title: string;
  type: string;
  options?: JsonObject;
  parentId?: string;
  pk?: boolean;
  ai?: boolean;
}

interface TableDefinition {
  tableName: string;
  title: string;
  columns: ColumnDefinition[];
}

interface NocoRecordRef {
  id?: number | string;
  Id?: number | string;
}

interface TableMeta {
  id: string;
  table_name: string;
  title?: string;
}

@Injectable()
export class DatabaseInitializationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitializationService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private nocoDBV3Service: NocoDBV3Service,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const prefix = this.nocoDBService.getTablePrefix();
    const prefixInfo = prefix ? ` with prefix "${prefix}"` : '';

    this.logger.log(`Starting database initialization${prefixInfo}...`);
    await this.initializeTables();
    this.logger.log('Database initialization completed');
  }

  private async initializeTables() {
    const usersTableId = await this.ensureTableExists({
      tableName: 'users',
      title: 'Users',
      columns: [
        { name: 'username', title: 'Username', type: 'SingleLineText' },
        { name: 'email', title: 'Email', type: 'Email' },
        { name: 'password_hash', title: 'Password Hash', type: 'LongText' },
        { name: 'is_active', title: 'Is Active', type: 'Checkbox' },
      ],
    });

    const rolesTableId = await this.ensureTableExists({
      tableName: 'roles',
      title: 'Roles',
      columns: [
        { name: 'role_name', title: 'Role Name', type: 'SingleLineText' },
        { name: 'description', title: 'Description', type: 'LongText' },
        { name: 'is_system_role', title: 'Is System Role', type: 'Checkbox' },
      ],
    });

    if (!usersTableId || !rolesTableId) {
      this.logger.error(
        'Failed to initialize base tables. Skipping junction tables.',
      );
      return;
    }

    await this.ensureTableExists({
      tableName: 'user_roles',
      title: 'User Roles',
      columns: [
        { name: 'user_id', title: 'User Id', type: 'Number' },
        { name: 'role_id', title: 'Role Id', type: 'Number' },
        { name: 'assigned_at', title: 'Assigned At', type: 'DateTime' },
      ],
    });

    await this.ensureTableExists({
      tableName: 'table_permissions',
      title: 'Table Permissions',
      columns: [
        { name: 'role_id', title: 'Role Id', type: 'Number' },
        { name: 'table_name', title: 'Table Name', type: 'SingleLineText' },
        { name: 'can_create', title: 'Can Create', type: 'Checkbox' },
        { name: 'can_read', title: 'Can Read', type: 'Checkbox' },
        { name: 'can_update', title: 'Can Update', type: 'Checkbox' },
        { name: 'can_delete', title: 'Can Delete', type: 'Checkbox' },
      ],
    });

    await this.seedDefaultPermissions();
    await this.seedDefaultUser();
  }

  private async ensureLinkExists(
    sourceTableId: string,
    name: string,
    title: string,
    targetTableId: string,
  ) {
    const maxRetries = 3;
    let lastError: unknown;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        const httpClient = this.nocoDBService.getHttpClient();

        if (i > 1) {
          this.logger.log(`Retry ${i}/${maxRetries} for link ${name} in 2s...`);
          await this.delay(2000);
        }

        const schema = await httpClient.get<unknown>(
          `/api/v2/meta/tables/${sourceTableId}`,
        );
        const columns = this.extractColumns(schema.data);
        const exists = columns.some((column) =>
          this.columnMatches(column, name, title),
        );

        if (exists) {
          this.logger.log(`✓ Link ${name} already exists`);
          return;
        }

        this.logger.log(
          `Creating link ${name} -> ${targetTableId} (Attempt ${i})...`,
        );

        const payload: JsonObject = {
          column_name: name,
          title: title,
          uidt: 'LinkToAnotherRecord',
          type: 'LinkToAnotherRecord',
          parentId: sourceTableId,
          childId: targetTableId,
          type_options: {
            type: 'bt',
          },
        };

        await httpClient.post<unknown>(
          `/api/v2/meta/tables/${sourceTableId}/columns`,
          payload,
        );
        this.logger.log(`Link column ${name} created successfully`);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${i} failed for link ${name}: ${this.errorPayload(error)}`,
        );
      }
    }

    this.logger.error(
      `Failed to ensure link ${name} after ${maxRetries} attempts:`,
      this.errorPayload(lastError),
    );
  }

  private async ensureTableExists(
    tableDef: TableDefinition,
  ): Promise<string | null> {
    const prefix = this.nocoDBService.getTablePrefix();
    const fullTableName = `${prefix}${tableDef.tableName}`;

    let existingTable = this.toTableMeta(
      await this.nocoDBService.getTableByName(tableDef.tableName),
    );

    if (existingTable) {
      try {
        const httpClient = this.nocoDBService.getHttpClient();
        await httpClient.get<unknown>(
          `/api/v2/meta/tables/${existingTable.id}`,
        );
        this.logger.log(
          `Table ${fullTableName} already exists (ID: ${existingTable.id})`,
        );
        return existingTable.id;
      } catch {
        this.logger.warn(
          `Existing table ${fullTableName} (${existingTable.id}) found but inaccessible. Ignoring it.`,
        );
        existingTable = null;
      }
    }

    this.logger.log(`Creating table ${fullTableName} using V3 API...`);

    try {
      const baseId = this.nocoDBService.getBaseId();

      const fields = tableDef.columns.map((col) => ({
        column_name: col.name,
        title: col.title,
        uidt: col.type,
        type: col.type,
      }));

      const response = await this.nocoDBV3Service.createTableV3(baseId, {
        table_name: fullTableName,
        title: fullTableName,
        fields: fields,
      });

      const recordRef = this.toRecordRef(response);
      if (!recordRef) {
        this.logger.error(
          `Failed to parse created table response for ${fullTableName}`,
        );
        return null;
      }

      const tableId = String(this.extractRecordId(recordRef));
      this.logger.log(`Table ${fullTableName} created (ID: ${tableId})`);

      return tableId;
    } catch (error) {
      this.logger.error(
        `Failed to create table ${fullTableName}`,
        this.errorPayload(error),
      );
      return null;
    }
  }

  private async seedDefaultPermissions() {
    this.logger.log('Seeding default permissions...');
    try {
      const rolesTable = this.toTableMeta(
        await this.nocoDBService.getTableByName('roles'),
      );
      const permissionsTable = this.toTableMeta(
        await this.nocoDBService.getTableByName('table_permissions'),
      );

      if (!rolesTable || !permissionsTable) {
        this.logger.warn(
          'Roles or Permissions table not found. Skipping seeding.',
        );
        return;
      }

      const adminRoleRef = this.toRecordRef(
        await this.nocoDBV3Service.findOne(
          rolesTable.id,
          '(Role Name,eq,admin)',
        ),
      );
      let adminRoleId: number | string;

      if (!adminRoleRef) {
        this.logger.log('Creating default admin role...');
        const newRole = this.toRecordRef(
          await this.nocoDBV3Service.create(rolesTable.id, {
            'Role Name': 'admin',
            Description: 'System Administrator',
            'Is System Role': true,
          }),
        );
        if (!newRole) {
          this.logger.error('Failed to create admin role');
          return;
        }
        adminRoleId = this.extractRecordId(newRole);
      } else {
        adminRoleId = this.extractRecordId(adminRoleRef);
      }

      const existingPerms = this.toRecordRef(
        await this.nocoDBV3Service.findOne(
          permissionsTable.id,
          `(Role Id,eq,${adminRoleId})~and(Table Name,eq,users)`,
        ),
      );

      if (!existingPerms) {
        this.logger.log('Creating admin permissions for users table...');
        await this.nocoDBV3Service.create(permissionsTable.id, {
          'Table Name': 'users',
          'Can Create': true,
          'Can Read': true,
          'Can Update': true,
          'Can Delete': true,
          'Role Id': adminRoleId,
        });
      }

      this.logger.log('Default permissions seeded successfully');
    } catch (error) {
      this.logger.error(
        'Failed to seed default permissions',
        this.errorPayload(error),
      );
    }
  }

  private async seedDefaultUser() {
    this.logger.log('Seeding default user...');
    try {
      const bootstrapAdminUsername = this.configService.get<string>(
        'NOCODB_BOOTSTRAP_ADMIN_USERNAME',
      );

      if (!bootstrapAdminUsername) {
        this.logger.warn(
          'NOCODB_BOOTSTRAP_ADMIN_USERNAME not configured. Skipping default admin assignment.',
        );
        return;
      }

      const usersTable = this.toTableMeta(
        await this.nocoDBService.getTableByName('users'),
      );
      const rolesTable = this.toTableMeta(
        await this.nocoDBService.getTableByName('roles'),
      );
      const userRolesTable = this.toTableMeta(
        await this.nocoDBService.getTableByName('user_roles'),
      );

      if (!usersTable || !rolesTable || !userRolesTable) {
        this.logger.warn('Required tables not found. Skipping user seeding.');
        return;
      }

      const adminUserRef = this.toRecordRef(
        await this.nocoDBV3Service.findOne(
          usersTable.id,
          `(Username,eq,${bootstrapAdminUsername})`,
        ),
      );

      if (!adminUserRef) {
        this.logger.warn(
          `Bootstrap admin user "${bootstrapAdminUsername}" not found. Skipping admin role assignment.`,
        );
        return;
      }

      const userId = this.extractRecordId(adminUserRef);

      const adminRoleRef = this.toRecordRef(
        await this.nocoDBV3Service.findOne(
          rolesTable.id,
          '(Role Name,eq,admin)',
        ),
      );
      if (!adminRoleRef) {
        this.logger.warn('Admin role not found. Cannot assign role to user.');
        return;
      }
      const adminRoleId = this.extractRecordId(adminRoleRef);

      const existingUserRole = this.toRecordRef(
        await this.nocoDBV3Service.findOne(
          userRolesTable.id,
          `(User Id,eq,${userId})~and(Role Id,eq,${adminRoleId})`,
        ),
      );

      if (!existingUserRole) {
        this.logger.log('Assigning admin role to bootstrap admin user...');
        await this.nocoDBV3Service.create(userRolesTable.id, {
          'User Id': userId,
          'Role Id': adminRoleId,
          'Assigned At': new Date().toISOString(),
        });
        this.logger.log('Admin role assigned successfully');
      } else {
        this.logger.log('Bootstrap admin user already has admin role');
      }
    } catch (error) {
      this.logger.error(
        'Failed to seed default user',
        this.errorPayload(error),
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractRecordId(record: NocoRecordRef): number | string {
    const id = record.id ?? record.Id;

    if (typeof id === 'number') {
      return id;
    }

    if (typeof id === 'string') {
      const parsed = Number(id);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
      return id;
    }

    throw new Error('Invalid NocoDB record id');
  }

  private extractColumns(data: unknown): JsonObject[] {
    if (!this.isObject(data)) {
      return [];
    }

    const columns = data.columns;
    if (!Array.isArray(columns)) {
      return [];
    }

    return columns.filter((column): column is JsonObject =>
      this.isObject(column),
    );
  }

  private columnMatches(
    column: JsonObject,
    name: string,
    title: string,
  ): boolean {
    const columnName = this.asString(column.column_name);
    const columnTitle = this.asString(column.title);

    return columnName === name || columnTitle === title;
  }

  private toRecordRef(record: unknown): NocoRecordRef | null {
    if (!this.isObject(record)) {
      return null;
    }

    const id = record.id ?? record.Id;
    if (typeof id === 'string' || typeof id === 'number') {
      return { id };
    }

    return null;
  }

  private toTableMeta(record: unknown): TableMeta | null {
    if (!this.isObject(record)) {
      return null;
    }

    const id = record.id;
    const tableName = record.table_name;

    if (typeof id === 'string' && typeof tableName === 'string') {
      return {
        id,
        table_name: tableName,
        title: this.asString(record.title) ?? undefined,
      };
    }

    return null;
  }

  private asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private isObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null;
  }

  private errorPayload(error: unknown): string {
    if (!this.isObject(error)) {
      return typeof error === 'string' ? error : 'Unknown error';
    }

    const response = this.isObject(error.response) ? error.response : null;
    if (response && 'data' in response) {
      const data = response.data;
      if (typeof data === 'string') {
        return data;
      }
      if (this.isObject(data)) {
        return JSON.stringify(data);
      }
    }

    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }

    return 'Unknown error';
  }
}
