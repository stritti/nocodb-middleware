import { IsNumber, IsNotEmpty, IsArray } from 'class-validator';

export class AssignRoleDto {
  @IsNumber()
  @IsNotEmpty({ message: 'User ID is required' })
  userId: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;
}

export class AssignMultipleRolesDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  roleIds: number[];
}
