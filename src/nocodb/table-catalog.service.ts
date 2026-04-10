import { Injectable } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';

interface NocoTableMeta {
  id?: string | number;
  table_name?: string;
  title?: string;
}

@Injectable()
export class TableCatalogService {
  private readonly internalTableNames = new Set([
    'users',
    'roles',
    'user_roles',
    'table_permissions',
  ]);

  constructor(
    private readonly nocoDBService: NocoDBService,
  ) {}

  async listExternalTables(): Promise<TableCatalogItemDto[]> {
    const prefix = this.nocoDBService.getTablePrefix();
    const tables = await this.nocoDBService.listTables();

    return tables
      .map((table) => this.normalizeTableMeta(table))
      .filter((table): table is Required<NocoTableMeta> => table !== null)
      .filter((table) => {
        const unprefixedName =
          prefix && table.table_name.startsWith(prefix)
            ? table.table_name.slice(prefix.length)
            : table.table_name;

        return !this.internalTableNames.has(unprefixedName);
      })
      .map((table) => ({
        id: String(table.id),
        tableName: table.table_name,
        title: table.title,
      }));
  }

  private normalizeTableMeta(input: unknown): Required<NocoTableMeta> | null {
    if (!input || typeof input !== 'object') {
      return null;
    }

    const table = input as NocoTableMeta;

    if (
      (typeof table.id !== 'string' && typeof table.id !== 'number') ||
      typeof table.table_name !== 'string' ||
      typeof table.title !== 'string'
    ) {
      return null;
    }

    return {
      id: table.id,
      table_name: table.table_name,
      title: table.title,
    };
  }
}
