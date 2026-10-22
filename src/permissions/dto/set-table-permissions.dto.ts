import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  TABLE_NAME_PATTERN,
  TABLE_NAME_RULE,
} from '../../common/validation/table-name';

export class SetTablePermissionsDto {
  @ApiProperty({ example: 1, description: 'Numeric role ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;

  @ApiProperty({
    example: 'products',
    description: `Logical table name: ${TABLE_NAME_RULE}`,
  })
  @IsString()
  @IsNotEmpty({ message: 'Table name is required' })
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
