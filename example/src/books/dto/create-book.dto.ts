import { IsString, IsNumber, IsOptional, IsPositive, IsISBN, IsNotEmpty } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  published_year?: number;

  @IsString()
  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  author_id?: number;
}
