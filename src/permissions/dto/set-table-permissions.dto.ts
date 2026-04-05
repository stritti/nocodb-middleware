import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetTablePermissionsDto {
  @ApiProperty({
    description: 'ID of the role to assign permissions to',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;

  @ApiProperty({
    description: 'Name of the NocoDB table',
    example: 'Products',
    pattern: '^[a-zA-Z0-9_-]+$',
  })
  @IsString()
  @IsNotEmpty({ message: 'Table name is required' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Table name may only contain alphanumeric characters, underscores, and hyphens',
  })
  tableName: string;

  @ApiProperty({ description: 'Allow record creation', example: true })
  @IsBoolean()
  canCreate: boolean;

  @ApiProperty({ description: 'Allow record reads', example: true })
  @IsBoolean()
  canRead: boolean;

  @ApiProperty({ description: 'Allow record updates', example: true })
  @IsBoolean()
  canUpdate: boolean;

  @ApiProperty({ description: 'Allow record deletion', example: false })
  @IsBoolean()
  canDelete: boolean;
}
