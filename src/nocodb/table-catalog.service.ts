import { Injectable } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';
import { SYSTEM_TABLES } from '../common/constants/table-names';

interface NocoTableMeta {
  id?: string | number;
  table_name?: string;
  title?: string;
}

@Injectable()
export class TableCatalogService {
  constructor(private readonly nocoDBService: NocoDBService) {}

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

        return !SYSTEM_TABLES.has(unprefixedName);
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
