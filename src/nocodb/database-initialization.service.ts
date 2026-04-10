import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NocoDBService } from './nocodb.service';
import * as crypto from 'crypto';

interface ColumnDefinition {
  name: string;
  title: string;
  type: string;
  options?: Record<string, any>;
  parentId?: string;
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
    // 1. Create Core Tables
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
        'Failed to initialize base tables. Skipping relations and seeding.',
      );
      return;
    }

    // 2. Junction and Permission Tables
    // Note: Link columns (user, role) must be verified or created manually if meta API fails
    await this.ensureTableExists({
      tableName: 'user_roles',
      title: 'User Roles',
      columns: [
        { name: 'assigned_at', title: 'Assigned At', type: 'DateTime' },
      ],
    });

    await this.ensureTableExists({
      tableName: 'table_permissions',
      title: 'Table Permissions',
      columns: [
        { name: 'table_name', title: 'Table Name', type: 'SingleLineText' },
        { name: 'can_create', title: 'Can Create', type: 'Checkbox' },
        { name: 'can_read', title: 'Can Read', type: 'Checkbox' },
        { name: 'can_update', title: 'Can Update', type: 'Checkbox' },
        { name: 'can_delete', title: 'Can Delete', type: 'Checkbox' },
      ],
    });

    // 3. Verify relationships (Link columns)
    await this.verifyLinkColumnsExist();

    // 4. Seed Data
    await this.seedDefaultPermissions();
    await this.seedDefaultUser();
  }

  private async ensureTableExists(
    tableDef: TableDefinition,
  ): Promise<string | null> {
    const prefix = this.nocoDBService.getTablePrefix();
    const fullTableName = `${prefix}${tableDef.tableName}`;

    // Check if table exists
    const existingTable = await this.nocoDBService.getTableByName(
      tableDef.tableName,
    );

    if (existingTable) {
      this.logger.log(
        `Table ${fullTableName} already exists (ID: ${existingTable.id})`,
      );
      await this.ensureColumnsExist(
        existingTable.id,
        tableDef.columns,
        fullTableName,
      );
      return existingTable.id;
    }

    this.logger.log(`Creating table ${fullTableName}...`);

    try {
      const columnsPayload = tableDef.columns.map((col) => ({
        column_name: col.name,
        title: col.title,
        uidt: col.type,
        ...col.options,
      }));

      const response = await this.nocoDBService.createTable(
        tableDef.tableName,
        tableDef.title,
        columnsPayload,
      );

      const tableId = response.id;
      this.logger.log(`Table ${fullTableName} created (ID: ${tableId})`);
      return tableId;
    } catch (error) {
      this.logger.error(`Failed to create table ${fullTableName}`, error);
      return null;
    }
  }

  private async ensureColumnsExist(
    tableId: string,
    columns: ColumnDefinition[],
    tableName: string,
  ) {
    try {
      const httpClient = this.nocoDBService.getHttpClient();
      const response = await httpClient.get(`/api/v3/meta/tables/${tableId}`);
      const existingColumns = response.data.columns || [];
      const existingColumnNames = new Set(
        existingColumns.map((c: any) => c.column_name),
      );

      for (const col of columns) {
        if (!existingColumnNames.has(col.name)) {
          this.logger.log(
            `Creating missing column ${col.name} in ${tableName}...`,
          );
          try {
            await this.nocoDBService.createColumn(
              tableId,
              col.name,
              col.type,
              col.title,
              col.options,
            );
            this.logger.log(`Column ${col.name} created`);
            await this.delay(500);
          } catch (err) {
            this.logger.error(
              `Failed to create column ${col.name} in ${tableName}`,
              err,
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error ensuring columns for table ${tableName}:`, error);
    }
  }

  private async verifyLinkColumnsExist() {
    const requiredLinks = [
      {
        tableName: 'user_roles',
        linkColumns: [
          { name: 'user', targetTable: 'users' },
          { name: 'role', targetTable: 'roles' },
        ],
      },
      {
        tableName: 'table_permissions',
        linkColumns: [
          { name: 'role', targetTable: 'roles' },
        ],
      },
    ];

    const missingLinks: string[] = [];

    for (const tableSpec of requiredLinks) {
      try {
        const table = await this.nocoDBService.getTableByName(tableSpec.tableName);
        if (!table) continue;

        const response = await this.nocoDBService.getHttpClient().get(`/api/v3/meta/tables/${table.id}`);
        const columns = response.data.columns || [];
        const existingColumnNames = new Set(columns.map((c: any) => c.column_name));

        for (const link of tableSpec.linkColumns) {
          if (!existingColumnNames.has(link.name)) {
            missingLinks.push(`${tableSpec.tableName}.${link.name} -> ${link.targetTable}`);
          }
        }
      } catch (error) {
        this.logger.error(`Error verifying links for ${tableSpec.tableName}`, error);
      }
    }

    if (missingLinks.length > 0) {
      this.logger.error(`MISSING LINK COLUMNS: ${missingLinks.join(', ')}. Please create them manually in NocoDB UI.`);
      // We don't throw here to allow the app to start, but functional errors will occur if these are used.
    } else {
      this.logger.log('✓ All required link columns verified successfully');
    }
  }

  private async seedDefaultPermissions() {
    this.logger.log('Seeding default permissions...');
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      if (!rolesTable || !permissionsTable) return;

      const rolesResult = await this.nocoDBService.list(rolesTable.id, {
        where: '(role_name,eq,admin)',
        limit: 1,
      });

      let adminRoleId;
      if (rolesResult.list.length === 0) {
        const createdRole = await this.nocoDBService.create(rolesTable.id, {
          role_name: 'admin',
          description: 'System Administrator',
          is_system_role: true,
        });
        adminRoleId = createdRole.id;
      } else {
        adminRoleId = rolesResult.list[0].id;
      }

      this.logger.log('Default permissions seeded (admin role ensured)');
    } catch (error) {
      this.logger.error('Failed to seed default permissions', error);
    }
  }

  private async seedDefaultUser() {
    this.logger.log('Seeding default user...');
    try {
      const bootstrapAdminUsername = this.configService.get<string>('nocodb.bootstrapAdminUsername') || 'admin';
      
      const usersTable = await this.nocoDBService.getTableByName('users');
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const userRolesTable = await this.nocoDBService.getTableByName('user_roles');

      if (!usersTable || !rolesTable || !userRolesTable) return;

      const usersResult = await this.nocoDBService.list(usersTable.id, {
        where: `(username,eq,${bootstrapAdminUsername})`,
        limit: 1,
      });

      let userId;
      if (usersResult.list.length === 0) {
        this.logger.log(`Creating bootstrap admin user "${bootstrapAdminUsername}"...`);
        const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');
        const createdUser = await this.nocoDBService.create(usersTable.id, {
          username: bootstrapAdminUsername,
          email: `${bootstrapAdminUsername}@example.com`,
          password_hash: passwordHash,
          is_active: true,
        });
        userId = createdUser.id;
      } else {
        userId = usersResult.list[0].id;
      }

      const rolesResult = await this.nocoDBService.list(rolesTable.id, {
        where: '(role_name,eq,admin)',
        limit: 1,
      });

      if (rolesResult.list.length === 0) return;
      const adminRoleId = rolesResult.list[0].id;

      const userRolesResult = await this.nocoDBService.list(userRolesTable.id, {
        where: `(user.id,eq,${userId})~and(role.id,eq,${adminRoleId})`,
        limit: 1,
      });

      if (userRolesResult.list.length === 0) {
        this.logger.log('Assigning admin role to bootstrap admin user...');
        await this.nocoDBService.create(userRolesTable.id, {
          user: [{ id: userId }],
          role: [{ id: adminRoleId }],
          assigned_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.error('Failed to seed default user', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
