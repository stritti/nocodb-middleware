import { PartialType } from '@nestjs/mapped-types';
import { CreateBookDto } from './create-book.dto';
import { IsNumber, IsPositive, IsOptional } from 'class-validator';

export class UpdateBookDto extends PartialType(CreateBookDto) {
  @IsNumber()
  @IsOptional()
  @IsPositive()
  id?: number;
}
