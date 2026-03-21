import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TableCatalogService } from './table-catalog.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';

@Controller('meta/tables')
@UseGuards(JwtAuthGuard)
export class TableCatalogController {
  constructor(private readonly tableCatalogService: TableCatalogService) {}

  @Get()
  async listTables(): Promise<TableCatalogItemDto[]> {
    return this.tableCatalogService.listExternalTables();
  }
}
