import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiResponseSchemaHost } from '@nestjs/swagger';

type SchemaObject = ApiResponseSchemaHost['schema'];

/**
 * OpenAPI schema of a record: `id` plus the table's fields by title. Fields
 * differ per table, so they are described as additional properties.
 */
export const RECORD_SCHEMA: SchemaObject = {
  type: 'object',
  properties: {
    id: { oneOf: [{ type: 'integer' }, { type: 'string' }], example: 1 },
  },
  required: ['id'],
  additionalProperties: true,
  example: { id: 1, Name: 'Alice', Email: 'alice@example.com' },
};

export class PageInfoDto {
  @ApiProperty({
    description:
      'Number of all records matching the filter (independent of limit/offset)',
    example: 42,
  })
  totalRows!: number;

  @ApiPropertyOptional({ description: 'Requested page size', example: 25 })
  pageSize?: number;
}

export class RecordListDto {
  @ApiProperty({ type: 'array', items: RECORD_SCHEMA })
  list!: Record<string, unknown>[];

  @ApiProperty({ type: PageInfoDto })
  pageInfo!: PageInfoDto;
}
