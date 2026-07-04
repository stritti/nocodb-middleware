import { Controller, Get, SetMetadata, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RateLimitGuard } from '../auth/guards/rate-limit.guard';
import { TableCatalogService } from './table-catalog.service';
import { TableCatalogItemDto } from './dto/table-catalog-item.dto';

@Controller('meta/tables')
@UseGuards(JwtAuthGuard, RolesGuard, RateLimitGuard)
export class TableCatalogController {
  constructor(private readonly tableCatalogService: TableCatalogService) {}

  @Get()
  @SetMetadata('roles', ['admin'])
  async listTables(): Promise<TableCatalogItemDto[]> {
    return this.tableCatalogService.listExternalTables();
  }
}
