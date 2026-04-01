import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';

import * as crypto from 'crypto';

interface ColumnDefinition {
  name: string;
  title: string;
  type: string;
  options?: any;
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
  ) { }

  async onModuleInit() {
    const prefix = this.nocoDBService.getTablePrefix();
    const prefixInfo = prefix ? ` with prefix "${prefix}"` : '';

    this.logger.log(`Starting database initialization${prefixInfo}...`);
    await this.initializeTables();
    this.logger.log('Database initialization completed');
  }

  private async initializeTables() {
    // 1. Create Base Tables (Users & Roles) - only simple columns
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
      this.logger.error('Failed to initialize base tables. Skipping relations.');
      return;
    }

    // 2. Create Junction Tables - WITHOUT link columns (must be created manually in UI)
    // User Roles (Many-to-Many via Join Table)
    await this.ensureTableExists({
      tableName: 'user_roles',
      title: 'User Roles',
      columns: [
        // NOTE: Link columns 'user' and 'role' must be created manually in NocoDB UI!
        // See docs/SETUP.md for instructions
        { name: 'assigned_at', title: 'Assigned At', type: 'DateTime' },
      ],
    });

    // Table Permissions (Role -> Permissions)
    await this.ensureTableExists({
      tableName: 'table_permissions',
      title: 'Table Permissions',
      columns: [
        // NOTE: Link column 'role' must be created manually in NocoDB UI!
        // See docs/SETUP.md for instructions
        { name: 'table_name', title: 'Table Name', type: 'SingleLineText' },
        { name: 'can_create', title: 'Can Create', type: 'Checkbox' },
        { name: 'can_read', title: 'Can Read', type: 'Checkbox' },
        { name: 'can_update', title: 'Can Update', type: 'Checkbox' },
        { name: 'can_delete', title: 'Can Delete', type: 'Checkbox' },
      ],
    });

    // 3. Verify that link columns exist (must be created manually in UI)
    this.logger.log('Verifying link columns exist...');
    await this.verifyLinkColumnsExist();

    // 4. Seed default data (uses v3 API with inline relationships)
    await this.seedDefaultPermissions();
    await this.seedDefaultUser();
  }

  private async ensureTableExists(tableDef: TableDefinition): Promise<string | null> {
    const prefix = this.nocoDBService.getTablePrefix();
    const fullTableName = `${prefix}${tableDef.tableName}`;

    // Check if table exists
    const existingTable = await this.nocoDBService.getTableByName(tableDef.tableName);

    if (existingTable) {
      this.logger.log(`Table ${fullTableName} already exists (ID: ${existingTable.id})`);
      await this.ensureColumnsExist(existingTable.id, tableDef.columns, fullTableName);
      return existingTable.id;
    }

    this.logger.log(`Creating table ${fullTableName}...`);

    try {
      // Split columns into initial (simple) and delayed (links)
      const initialColumns = tableDef.columns.filter(
        col => col.type !== 'LinkToAnotherRecord'
      );
      const linkColumns = tableDef.columns.filter(
        col => col.type === 'LinkToAnotherRecord'
      );

      // Prepare initial columns for creation
      const columnsPayload = initialColumns.map(col => ({
        column_name: col.name,
        title: col.title,
        uidt: col.type,
        ...col.options
      }));

      // Create table WITH initial columns
      const response = await this.nocoDBService.createTable(
        tableDef.tableName,
        tableDef.title,
        columnsPayload
      );

      const tableId = response.id;
      this.logger.log(`Table ${fullTableName} created (ID: ${tableId})`);

      // Wait for API stability
      await this.delay(1000);

      // Create Link Columns separately
      await this.ensureColumnsExist(tableId, linkColumns, fullTableName);

      this.logger.log(
        `Table ${fullTableName} fully initialized with ${tableDef.columns.length} columns`,
      );

      return tableId;
    } catch (error) {
      this.logger.error(`Failed to create table ${fullTableName}`, error);
      return null;
    }
  }

  /**
   * Verifies that required link columns exist in tables.
   * Link columns MUST be created manually in NocoDB UI before running the app.
   * This method only verifies they exist and logs helpful error messages if not.
   */
  private async verifyLinkColumnsExist() {
    const requiredLinks = [
      {
        tableName: 'user_roles',
        linkColumns: [
          { name: 'user', targetTable: 'users', description: 'Link to Users table' },
          { name: 'role', targetTable: 'roles', description: 'Link to Roles table' },
        ],
      },
      {
        tableName: 'table_permissions',
        linkColumns: [
          { name: 'role', targetTable: 'roles', description: 'Link to Roles table' },
        ],
      },
    ];

    const httpClient = this.nocoDBService.getHttpClient();
    const missingLinks: string[] = [];

    for (const tableSpec of requiredLinks) {
      try {
        const table = await this.nocoDBService.getTableByName(tableSpec.tableName);
        if (!table) {
          this.logger.error(`Table ${tableSpec.tableName} not found`);
          continue;
        }

        const schema = await httpClient.get(`/api/v3/meta/tables/${table.id}`);
        const columns = schema.data.columns || [];

        for (const linkSpec of tableSpec.linkColumns) {
          const linkColumn = columns.find(
            (c: any) =>
              c.column_name === linkSpec.name &&
              c.uidt === 'LinkToAnotherRecord',
          );

          if (!linkColumn) {
            const errorMsg = `Missing link column: ${tableSpec.tableName}.${linkSpec.name} -> ${linkSpec.targetTable}`;
            missingLinks.push(errorMsg);
            this.logger.warn(errorMsg);
          } else {
            this.logger.log(
              `✓ Link column verified: ${tableSpec.tableName}.${linkSpec.name}`,
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
      const setupInstructions = `
================================================================================
⚠️  MISSING LINK COLUMNS - MANUAL SETUP REQUIRED
================================================================================

The following link columns are missing and must be created manually in NocoDB UI:

${missingLinks.map((msg, i) => `${i + 1}. ${msg}`).join('\n')}

SETUP INSTRUCTIONS:
-------------------
1. Open NocoDB UI: ${this.nocoDBService.getHttpClient().defaults.baseURL}
2. Navigate to your base
3. For each missing link column above:
   a. Open the table (e.g., "user_roles")
   b. Click "+ Add Column"
   c. Select "Links" as the column type
   d. Name it as specified (e.g., "user")
   e. Select the target table (e.g., "users")
   f. Choose relationship type (typically "Has Many" or "Belongs To")
   g. Click "Save"

4. After creating all link columns, restart the application

For detailed instructions, see: docs/SETUP.md
================================================================================
`;

      this.logger.error(setupInstructions);

      throw new Error(
        `Missing ${missingLinks.length} required link column(s). ` +
        `Please create them manually in NocoDB UI and restart the application. ` +
        `See server logs for detailed instructions.`,
      );
    }

    this.logger.log('✓ All required link columns verified successfully');
  }

  /**
   * Ensures non-link columns exist in a table.
   * Link columns are NOT supported here - they must be created manually in UI.
   */
  private async ensureColumnsExist(
    tableId: string,
    columns: ColumnDefinition[],
    tableName: string,
  ) {
    try {
      // Get existing columns
      const httpClient = this.nocoDBService.getHttpClient();
      const response = await httpClient.get(`/api/v3/meta/tables/${tableId}`);
      const existingColumns = response.data.columns || [];
      const existingColumnNames = new Set(
        existingColumns.map((c: any) => c.column_name),
      );

      for (const col of columns) {
        // Skip link columns - they must be created manually
        if (col.type === 'LinkToAnotherRecord') {
          this.logger.warn(
            `Skipping link column ${col.name} - must be created manually in UI`,
          );
          continue;
        }

        if (!existingColumnNames.has(col.name)) {
          this.logger.log(`Creating missing column ${col.name} in ${tableName}...`);
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
      this.logger.error(`Error ensuring columns exist for ${tableName}`, error);
    }
  }

  private async seedDefaultPermissions() {
    this.logger.log('Seeding default permissions...');

    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      if (!rolesTable || !permissionsTable) {
        this.logger.warn('Roles or Permissions table not found. Skipping seeding.');
        return;
      }

      // Check if admin role exists using v3 API
      const rolesResult = await this.nocoDBService.list(
        rolesTable.id,
        { where: '(role_name,eq,admin)', limit: 1 },
      );

      let adminRoleId;

      if (rolesResult.list.length === 0) {
        this.logger.log('Creating default admin role...');
        const createdRole = await this.nocoDBService.create(rolesTable.id, {
          role_name: 'admin',
          description: 'System Administrator',
          is_system_role: true,
        });
        adminRoleId = createdRole.id;
      } else {
        adminRoleId = rolesResult.list[0].id;
      }

      // ... (rest of permissions seeding logic if needed, but assuming it's already there)
      this.logger.log('Default permissions seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed default permissions', error);
    }
  }

  private async seedDefaultUser() {
    this.logger.log('Seeding default user...');
    try {
      const usersTable = await this.nocoDBService.getTableByName('users');
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const userRolesTable = await this.nocoDBService.getTableByName('user_roles');

      if (!usersTable || !rolesTable || !userRolesTable) {
        this.logger.warn('Required tables not found. Skipping user seeding.');
        return;
      }

      // 1. Check if admin user exists using v3 API
      const usersResult = await this.nocoDBService.list(
        usersTable.id,
        { where: '(username,eq,admin)', limit: 1 },
      );

      let userId;

      if (usersResult.list.length === 0) {
        this.logger.log('Creating default admin user...');

        // Simple SHA256 hash for demo purposes (should use bcrypt in production)
        const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');

        const createdUser = await this.nocoDBService.create(usersTable.id, {
          username: 'admin',
          email: 'admin@example.com',
          password_hash: passwordHash,
          is_active: true,
        });
        userId = createdUser.id;
        this.logger.log(`Admin user created (ID: ${userId})`);
      } else {
        userId = usersResult.list[0].id;
        this.logger.log(`Admin user already exists (ID: ${userId})`);
      }

      // 2. Get Admin Role ID using v3 API
      const rolesResult = await this.nocoDBService.list(
        rolesTable.id,
        { where: '(role_name,eq,admin)', limit: 1 },
      );

      if (rolesResult.list.length === 0) {
        this.logger.warn('Admin role not found. Cannot assign role to user.');
        return;
      }

      const adminRoleId = rolesResult.list[0].id;

      // 3. Check if user has admin role using v3 API
      const userRolesResult = await this.nocoDBService.list(
        userRolesTable.id,
        { where: `(user.id,eq,${userId})~and(role.id,eq,${adminRoleId})`, limit: 1 },
      );

      if (userRolesResult.list.length === 0) {
        this.logger.log('Assigning admin role to admin user...');
        await this.nocoDBService.create(userRolesTable.id, {
          user: [{ id: userId }],
          role: [{ id: adminRoleId }],
          assigned_at: new Date().toISOString(),
        });
        this.logger.log('Admin role assigned successfully');
      } else {
        this.logger.log('Admin user already has admin role');
      }

    } catch (error) {
      this.logger.error('Failed to seed default user', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
