import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name cannot be empty' })
  @MinLength(3, { message: 'Role name must be at least 3 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  roleName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean = false;
}
