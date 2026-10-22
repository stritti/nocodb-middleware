import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListRecordsQueryDto {
  @ApiPropertyOptional({
    description: 'NocoDB filter expression',
    example: '(Name,eq,Alice)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  where?: string;

  @ApiPropertyOptional({
    description: 'Sort fields, prefix with - for descending',
    example: '-CreatedAt',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  sort?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
