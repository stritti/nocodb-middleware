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
import {
  TABLE_NAME_PATTERN,
  TABLE_NAME_RULE,
} from '../../common/validation/table-name';

export class TablePermissionItem {
  @ApiProperty({
    example: 'products',
    description: `Logical table name: ${TABLE_NAME_RULE}`,
  })
  @IsString()
  @IsNotEmpty()
  @Matches(TABLE_NAME_PATTERN, {
    message: `Table name may only contain ${TABLE_NAME_RULE}`,
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
