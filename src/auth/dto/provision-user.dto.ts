import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { SanitizeHtml } from '../../common/decorators/sanitize-html.decorator';

export class ProvisionUserDto {
  @ApiProperty({ example: 'alice' })
  @IsString()
  @MinLength(3)
  @SanitizeHtml()
  username!: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword#123' })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiPropertyOptional({ example: ['developer'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive!: boolean;
}
