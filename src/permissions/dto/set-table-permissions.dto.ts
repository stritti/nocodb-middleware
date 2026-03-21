import { IsNumber, IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class SetTablePermissionsDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;

  @IsString()
  @IsNotEmpty({ message: 'Table name is required' })
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
