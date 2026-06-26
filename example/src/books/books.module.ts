import { Module } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { AuthModule } from '../shared/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
