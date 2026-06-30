import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TableCatalogItemDto {
  @ApiProperty({ example: '12345', description: 'NocoDB table ID' })
  id: string;

  @ApiProperty({ example: 'products', description: 'Table name' })
  tableName: string;

  @ApiPropertyOptional({
    example: 'Products Catalog',
    description: 'Display title',
  })
  title?: string;
}
