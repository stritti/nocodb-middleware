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
    example: 'content-editor',
    description: 'Unique role name (3–50 chars, alphanumeric/spaces/underscores/hyphens)',
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
    example: 'Can create and edit content, but not delete',
    description: 'Optional human-readable description (max 255 chars)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Mark as a built-in system role that cannot be deleted',
  })
  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean = false;
}
