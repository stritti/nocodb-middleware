import {
  IsNumber,
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsBoolean,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TablePermissionItem {
  @ApiProperty({
    example: 'products',
    description: 'Table name (alphanumeric, underscores, hyphens)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Table name may only contain alphanumeric characters, underscores, and hyphens',
  })
  tableName: string;

  @ApiProperty({ example: true, description: 'Allow CREATE operations' })
  @IsBoolean()
  canCreate: boolean;

  @ApiProperty({ example: true, description: 'Allow READ operations' })
  @IsBoolean()
  canRead: boolean;

  @ApiProperty({ example: true, description: 'Allow UPDATE operations' })
  @IsBoolean()
  canUpdate: boolean;

  @ApiProperty({ example: false, description: 'Allow DELETE operations' })
  @IsBoolean()
  canDelete: boolean;
}

export class BatchSetPermissionsDto {
  @ApiProperty({ example: 1, description: 'Numeric role ID' })
  @IsNumber()
  @IsNotEmpty()
  roleId: number;

  @ApiProperty({
    type: [TablePermissionItem],
    description: 'List of table permission entries',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TablePermissionItem)
  permissions: TablePermissionItem[];
}
