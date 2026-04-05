import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Unique name for the role',
    example: 'editor',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: 'Role name cannot be empty' })
  @MinLength(3, { message: 'Role name must be at least 3 characters' })
  @MaxLength(50, { message: 'Role name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_\-]+(?: [a-zA-Z0-9_\-]+)*$/, {
    message:
      'Role name may only contain alphanumeric characters, spaces, underscores, and hyphens',
  })
  roleName: string;

  @ApiPropertyOptional({
    description: 'Optional description of the role',
    example: 'Can edit but not delete records',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether this is a built-in system role',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean = false;
}
