import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';

interface ColumnDefinition {
  name: string;
  title: string;
  type: string;
  options?: any;
  parentId?: string; // For LinkToAnotherRecord
  pk?: boolean;
  ai?: boolean;
}

interface TableDefinition {
  tableName: string;
  title: string;
  columns: ColumnDefinition[];
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
    // 1. Create Base Tables (Users & Roles)
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

    // 2. Create Junction Tables with stable Foreign Key numbers (Avoids NocoDB Meta Corruption)
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

    // 3. Seed default data
    await this.seedDefaultPermissions();
    await this.seedDefaultUser();
  }

  /**
   * Ensure a relationship link exists between tables
   * Uses V2 Meta API which is currently more stable for building relationships in V3 bases
   */
  private async ensureLinkExists(
    sourceTableId: string,
    name: string,
    title: string,
    targetTableId: string,
  ) {
    const maxRetries = 3;
    let lastError: any;

    for (let i = 1; i <= maxRetries; i++) {
      try {
        const httpClient = this.nocoDBService.getHttpClient();

        // Wait a bit before checking/creating (especially on retry)
        // This gives NocoDB time to finalize previous metadata operations
        if (i > 1) {
          this.logger.log(`Retry ${i}/${maxRetries} for link ${name} in 2s...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const schema = await httpClient.get(
          `/api/v2/meta/tables/${sourceTableId}`,
        );
        const columns = schema.data.columns || [];
        const exists = columns.some(
          (c: any) => c.column_name === name || c.title === title,
        );

        if (exists) {
          this.logger.log(`✓ Link ${name} already exists`);
          return;
        }

        this.logger.log(
          `Creating link ${name} -> ${targetTableId} (Attempt ${i})...`,
        );

        const payload = {
          column_name: name,
          title: title,
          uidt: 'LinkToAnotherRecord',
          type: 'LinkToAnotherRecord',
          parentId: sourceTableId,
          childId: targetTableId,
          type_options: {
            type: 'bt', // Belongs To relationship
          },
        };

        await httpClient.post(
          `/api/v2/meta/tables/${sourceTableId}/columns`,
          payload,
        );
        this.logger.log(`Link column ${name} created successfully`);
        return;
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Attempt ${i} failed for link ${name}: ${JSON.stringify(error.response?.data || error.message)}`,
        );
      }
    }

    this.logger.error(
      `Failed to ensure link ${name} after ${maxRetries} attempts:`,
      JSON.stringify(lastError?.response?.data || lastError?.message, null, 2),
    );
  }

  private async ensureTableExists(
    tableDef: TableDefinition,
  ): Promise<string | null> {
    const prefix = this.nocoDBService.getTablePrefix();
    const fullTableName = `${prefix}${tableDef.tableName}`;

    // Check if table exists
    let existingTable = await this.nocoDBService.getTableByName(
      tableDef.tableName,
    );

    // Resilience: If we find a table but can't read its details, it's likely corrupted
    // (like the 'getModel' error). In that case, we should proceed as if it doesn't exist.
    if (existingTable) {
      try {
        const httpClient = this.nocoDBService.getHttpClient();
        await httpClient.get(`/api/v2/meta/tables/${existingTable.id}`);
        this.logger.log(
          `Table ${fullTableName} already exists (ID: ${existingTable.id})`,
        );
        return existingTable.id;
      } catch (e) {
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

      const tableId = response.id || response.Id;
      this.logger.log(`Table ${fullTableName} created (ID: ${tableId})`);

      return tableId;
    } catch (error) {
      this.logger.error(
        `Failed to create table ${fullTableName}`,
        error.response?.data || error.message,
      );
      return null;
    }
  }

  private async seedDefaultPermissions() {
    this.logger.log('Seeding default permissions...');
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');

      if (!rolesTable || !permissionsTable) {
        this.logger.warn(
          'Roles or Permissions table not found. Skipping seeding.',
        );
        return;
      }

      // 1. Get or Create Admin Role
      const adminRole = await this.nocoDBV3Service.findOne(
        rolesTable.id,
        '(Role Name,eq,admin)',
      );
      let adminRoleId;

      if (!adminRole) {
        this.logger.log('Creating default admin role...');
        const newRole = await this.nocoDBV3Service.create(rolesTable.id, {
          'Role Name': 'admin',
          Description: 'System Administrator',
          'Is System Role': true,
        });
        adminRoleId = newRole.id || newRole.Id;
      } else {
        adminRoleId = adminRole.id || adminRole.Id;
      }

      // 2. Check if admin permissions exist
      // Use 'Role Id' for V3 Data API filtering
      const existingPerms = await this.nocoDBV3Service.findOne(
        permissionsTable.id,
        `(Role Id,eq,${adminRoleId})~and(Table Name,eq,users)`,
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
      this.logger.error('Failed to seed default permissions', error);
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

      const usersTable = await this.nocoDBService.getTableByName('users');
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const userRolesTable =
        await this.nocoDBService.getTableByName('user_roles');

      if (!usersTable || !rolesTable || !userRolesTable) {
        this.logger.warn('Required tables not found. Skipping user seeding.');
        return;
      }

      // 1. Find existing bootstrap admin user
      const adminUser = await this.nocoDBV3Service.findOne(
        usersTable.id,
        `(Username,eq,${bootstrapAdminUsername})`,
      );

      if (!adminUser) {
        this.logger.warn(
          `Bootstrap admin user "${bootstrapAdminUsername}" not found. Skipping admin role assignment.`,
        );
        return;
      }

      const userId = adminUser.id || adminUser.Id;

      // 2. Get Admin Role
      const adminRole = await this.nocoDBV3Service.findOne(
        rolesTable.id,
        '(Role Name,eq,admin)',
      );
      if (!adminRole) {
        this.logger.warn('Admin role not found. Cannot assign role to user.');
        return;
      }
      const adminRoleId = adminRole.id || adminRole.Id;

      // 3. Check and Assign Role
      const existingUserRole = await this.nocoDBV3Service.findOne(
        userRolesTable.id,
        `(User Id,eq,${userId})~and(Role Id,eq,${adminRoleId})`,
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
      this.logger.error('Failed to seed default user', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
