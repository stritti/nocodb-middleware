import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Role name cannot be empty' })
  @MinLength(3, { message: 'Role name must be at least 3 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_\-]+(?: [a-zA-Z0-9_\-]+)*$/, {
    message:
      'Role name may only contain alphanumeric characters, spaces, underscores, and hyphens',
  })
  roleName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean = false;
}
