import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TableCatalogService } from './table-catalog.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';

@Controller('meta/tables')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TableCatalogController {
  constructor(private readonly tableCatalogService: TableCatalogService) {}

  @Get()
  @Roles('admin')
  async listTables(): Promise<TableCatalogItemDto[]> {
    return this.tableCatalogService.listExternalTables();
  }
}
