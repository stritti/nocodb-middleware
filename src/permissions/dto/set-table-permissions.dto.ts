import {
  IsNumber,
  IsString,
  IsNotEmpty,
  IsBoolean,
  Matches,
} from 'class-validator';

export class SetTablePermissionsDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;

  @IsString()
  @IsNotEmpty({ message: 'Table name is required' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Table name may only contain alphanumeric characters, underscores, and hyphens',
  })
  tableName: string;

  @IsBoolean()
  canCreate: boolean;

  @IsBoolean()
  canRead: boolean;

  @IsBoolean()
  canUpdate: boolean;

  @IsBoolean()
  canDelete: boolean;
}
