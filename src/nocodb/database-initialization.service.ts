import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';
import { NocoFieldDefinition } from './nocodb.types';
import { andFilters, filterEq } from './nocodb-filter.util';
import { extractNumericId } from '../common/utils/nocodb-utils';

/**
 * Field of a system table. The NocoDB v3 Data API keys record values by the
 * field title, so `title` must equal the property name used in the code.
 */
type FieldDefinition = NocoFieldDefinition;

interface TableDefinition {
  tableName: string;
  /** Human-readable name, stored as the table description. */
  title: string;
  fields: FieldDefinition[];
}

/**
 * Relations are stored as numeric id fields (`user_id`, `role_id`). NocoDB v3
 * cannot filter link fields by the id of the linked record, which the
 * permission lookups depend on.
 */
export const SYSTEM_TABLES: readonly TableDefinition[] = [
  {
    tableName: 'users',
    title: 'Users',
    fields: [
      { title: 'username', type: 'SingleLineText' },
      { title: 'email', type: 'Email' },
      { title: 'password_hash', type: 'LongText' },
      { title: 'is_active', type: 'Checkbox' },
      { title: 'auth_provider', type: 'SingleLineText' },
      { title: 'external_subject', type: 'SingleLineText' },
    ],
  },
  {
    tableName: 'roles',
    title: 'Roles',
    fields: [
      { title: 'role_name', type: 'SingleLineText' },
      { title: 'description', type: 'LongText' },
      { title: 'is_system_role', type: 'Checkbox' },
    ],
  },
  {
    tableName: 'user_roles',
    title: 'User Roles',
    fields: [
      { title: 'user_id', type: 'Number' },
      { title: 'role_id', type: 'Number' },
      { title: 'assigned_at', type: 'DateTime' },
    ],
  },
  {
    tableName: 'table_permissions',
    title: 'Table Permissions',
    fields: [
      { title: 'role_id', type: 'Number' },
      { title: 'table_name', type: 'SingleLineText' },
      { title: 'can_create', type: 'Checkbox' },
      { title: 'can_read', type: 'Checkbox' },
      { title: 'can_update', type: 'Checkbox' },
      { title: 'can_delete', type: 'Checkbox' },
    ],
  },
];

@Injectable()
export class DatabaseInitializationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitializationService.name);

  constructor(private nocoDBService: NocoDBService) {}

  async onModuleInit() {
    const prefix = this.nocoDBService.getTablePrefix();
    const prefixInfo = prefix ? ` with prefix "${prefix}"` : '';

    this.logger.log(`Starting database initialization${prefixInfo}...`);
    await this.initializeTables();
    this.logger.log('Database initialization completed');
  }

  private async initializeTables() {
    for (const table of SYSTEM_TABLES) {
      const tableId = await this.ensureTableExists(table);
      if (!tableId) {
        this.logger.error(
          `Failed to initialize table ${table.tableName}. Skipping seeding.`,
        );
        return;
      }
    }

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
      await this.ensureFieldsExist(
        existingTable.id,
        tableDef.fields,
        fullTableName,
      );
      return existingTable.id;
    }

    this.logger.log(`Creating table ${fullTableName}...`);

    try {
      const response = await this.nocoDBService.createTable(
        tableDef.tableName,
        tableDef.title,
        [...tableDef.fields],
      );

      const tableId = response.id != null ? String(response.id) : null;
      if (tableId) {
        this.logger.log(`Table ${fullTableName} created (ID: ${tableId})`);
      }
      return tableId;
    } catch (error) {
      this.logger.error(`Failed to create table ${fullTableName}`, error);
      return null;
    }
  }

  private async ensureFieldsExist(
    tableId: string,
    fields: readonly FieldDefinition[],
    tableName: string,
  ) {
    try {
      const tableMetadata = await this.nocoDBService.getTableMetadata(tableId);
      const existingFields = new Set(
        (tableMetadata.fields ?? []).map((field) => field.title),
      );

      for (const field of fields) {
        if (existingFields.has(field.title)) {
          continue;
        }

        this.logger.log(
          `Creating missing field ${field.title} in ${tableName}...`,
        );
        try {
          await this.nocoDBService.createColumn(tableId, field);
          this.logger.log(`Field ${field.title} created`);
        } catch (err) {
          this.logger.error(
            `Failed to create field ${field.title} in ${tableName}`,
            err,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error ensuring fields for table ${tableName}:`, error);
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

      const adminRoleId = extractNumericId(adminRole);
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
          filterEq('role_id', adminRoleId),
          filterEq('table_name', tableName),
        ),
      );

      const permissionData = {
        role_id: adminRoleId,
        table_name: tableName,
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true,
      };

      if (existing?.id) {
        await this.nocoDBService.update(
          permissionsTableId,
          extractNumericId(existing),
          permissionData,
        );
      } else {
        await this.nocoDBService.create(permissionsTableId, permissionData);
      }
    }
  }
}
