import { Injectable } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';
import { NocoDBV3Service } from './nocodb-v3.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';

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
    private readonly nocoDBV3Service: NocoDBV3Service,
  ) {}

  async listExternalTables(): Promise<TableCatalogItemDto[]> {
    const baseId = this.nocoDBService.getBaseId();
    const prefix = this.nocoDBService.getTablePrefix();
    const tables = await this.nocoDBV3Service.listTablesMetaV3(baseId);

    return tables
      .filter((table: any) => {
        const tableName = table.table_name || '';
        const unprefixedName =
          prefix && tableName.startsWith(prefix)
            ? tableName.slice(prefix.length)
            : tableName;

        return !this.internalTableNames.has(unprefixedName);
      })
      .map((table: any) => ({
        id: String(table.id),
        tableName: table.table_name,
        title: table.title,
      }));
  }
}
