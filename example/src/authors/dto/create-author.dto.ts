import { IsString, IsOptional, IsNotEmpty, IsDateString } from 'class-validator';

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsDateString()
  @IsOptional()
  birth_date?: string;
}
