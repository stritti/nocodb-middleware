import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetTablePermissionsDto {
  @ApiProperty({ example: 1, description: 'Numeric role ID' })
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;

  @ApiProperty({
    example: 'products',
    description: 'Table name (alphanumeric, underscores, hyphens)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Table name is required' })
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
