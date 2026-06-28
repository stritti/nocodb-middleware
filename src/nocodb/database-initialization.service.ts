import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';
import { andFilters, filterEq } from './nocodb-filter.util';

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

  constructor(private nocoDBService: NocoDBService) {}

  async onModuleInit() {
    const prefix = this.nocoDBService.getTablePrefix();
    const prefixInfo = prefix ? ` with prefix "${prefix}"` : '';
    this.logger.log(`Starting database initialization${prefixInfo}...`);
    try {
      await this.initializeTables();
      this.logger.log('Database initialization completed');
    } catch (err) {
      this.logger.error(
        'Database initialization failed, service will start in degraded mode',
        err,
      );
      // Don't re-throw — the app should still start
    }
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
        {
          name: 'auth_provider',
          title: 'Auth Provider',
          type: 'SingleLineText',
        },
        {
          name: 'external_subject',
          title: 'External Subject',
          type: 'SingleLineText',
        },
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
      const tableMetadata = await this.nocoDBService.getTableMetadata(tableId);
      const existingColumns = tableMetadata.columns || [];
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
      this.logger.error(
        `Error ensuring columns for table ${tableName}:`,
        error,
      );
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
        linkColumns: [{ name: 'role', targetTable: 'roles' }],
      },
    ];

    const missingLinks: string[] = [];

    for (const tableSpec of requiredLinks) {
      try {
        const table = await this.nocoDBService.getTableByName(
          tableSpec.tableName,
        );
        if (!table) continue;

        const tableMetadata = await this.nocoDBService.getTableMetadata(
          table.id,
        );
        const columns = tableMetadata.columns || [];
        const existingColumnNames = new Set(
          columns.map((c: any) => c.column_name),
        );

        for (const link of tableSpec.linkColumns) {
          if (!existingColumnNames.has(link.name)) {
            missingLinks.push(
              `${tableSpec.tableName}.${link.name} -> ${link.targetTable}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Error verifying links for ${tableSpec.tableName}`,
          error,
        );
      }
    }

    if (missingLinks.length > 0) {
      this.logger.error(
        `MISSING LINK COLUMNS: ${missingLinks.join(', ')}. Please create them manually in NocoDB UI.`,
      );
      // We don't throw here to allow the app to start, but functional errors will occur if these are used.
    } else {
      this.logger.log('✓ All required link columns verified successfully');
    }
  }

  private async seedDefaultPermissions() {
    this.logger.log('Seeding default permissions...');
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const permissionsTable =
        await this.nocoDBService.getTableByName('table_permissions');

      if (!rolesTable || !permissionsTable) return;

      const rolesResult = await this.nocoDBService.list(rolesTable.id, {
        where: filterEq('role_name', 'admin'),
        limit: 1,
      });

      let adminRole = rolesResult.list[0];

      if (!adminRole) {
        adminRole = await this.nocoDBService.create(rolesTable.id, {
          role_name: 'admin',
          description: 'System Administrator',
          is_system_role: true,
        });
      }

      const adminRoleId = this.extractNumericId(adminRole);
      await this.ensureAdminPermissions(permissionsTable.id, adminRoleId);

      this.logger.log('Default permissions seeded (admin role ensured)');
    } catch (error) {
      this.logger.error('Failed to seed default permissions', error);
    }
  }

  private async ensureAdminPermissions(
    permissionsTableId: string,
    adminRoleId: number,
  ): Promise<void> {
    const protectedTables = [
      'users',
      'roles',
      'user_roles',
      'table_permissions',
    ];

    for (const tableName of protectedTables) {
      const existing = await this.nocoDBService.findOne(
        permissionsTableId,
        andFilters(
          filterEq('role.id', adminRoleId),
          filterEq('table_name', tableName),
        ),
      );

      const permissionData = {
        role: [{ id: adminRoleId }],
        table_name: tableName,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
      };

      if (existing?.id) {
        await this.nocoDBService.update(
          permissionsTableId,
          this.extractNumericId(existing),
          permissionData,
        );
      } else {
        await this.nocoDBService.create(permissionsTableId, permissionData);
      }
    }
  }

  private extractNumericId(record: { id?: number | string }): number {
    const rawId = record.id;

    if (typeof rawId === 'number') {
      return rawId;
    }

    if (typeof rawId === 'string' && rawId.length > 0) {
      const parsed = Number(rawId);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    throw new Error('Invalid NocoDB record ID payload');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
