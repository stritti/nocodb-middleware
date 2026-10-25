import { Injectable } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';
import { isValidTableName } from '../common/validation/table-name';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';

interface TableEntry {
  id: string | number;
  title: string;
}

/** Internal tables of the middleware; never listed. */
const INTERNAL_TABLE_NAMES: ReadonlySet<string> = new Set(
  Object.values(SYSTEM_TABLE_NAMES),
);

@Injectable()
export class TableCatalogService {
  constructor(private readonly nocoDBService: NocoDBService) {}

  /**
   * Tables available to clients. `tableName` is the logical name (without the
   * configured prefix) used by the data API and in table permissions. With a
   * prefix, only tables carrying it are listed, because only those can be
   * resolved by name. Tables whose name violates the table name rule are
   * omitted: no permission could be granted for them.
   */
  async listExternalTables(): Promise<TableCatalogItemDto[]> {
    const prefix = this.nocoDBService.getTablePrefix();
    const tables = await this.nocoDBService.listTables();

    return (
      tables
        .map((table) => this.normalizeTableMeta(table))
        .filter((table): table is TableEntry => table !== null)
        .filter((table) => table.title.startsWith(prefix))
        .map((table) => ({
          id: String(table.id),
          tableName: table.title.slice(prefix.length),
          title: table.title,
        }))
        .filter((table) => !INTERNAL_TABLE_NAMES.has(table.tableName))
        // same rule as table permissions and the data API
        .filter((table) => isValidTableName(table.tableName))
    );
  }

  private normalizeTableMeta(input: unknown): TableEntry | null {
    if (!input || typeof input !== 'object') {
      return null;
    }

    const table = input as Partial<TableEntry>;

    if (
      (typeof table.id !== 'string' && typeof table.id !== 'number') ||
      typeof table.title !== 'string'
    ) {
      return null;
    }

    return { id: table.id, title: table.title };
  }
}
