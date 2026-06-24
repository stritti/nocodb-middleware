import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto, UpdateBookDto, PageOptionsDto, PageDto, Book } from '../shared/interfaces/book.interface';
import { Roles } from '../shared/decorators/roles.decorator';
import { RolesGuard } from '../shared/guards/roles.guard';
import { PermissionsGuard } from '../shared/guards/permissions.guard';
import { JwtPayload } from '../shared/interfaces/user.interface';

@Controller('api/books')
@UseGuards(RolesGuard, PermissionsGuard)
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  /**
   * Get all books
   */
  @Get()
  @Roles('admin', 'user', 'guest')
  async findAll(
    @Request() req: { user: JwtPayload },
    @Query() pageOptions: PageOptionsDto,
  ): Promise<PageDto<Book>> {
    return this.booksService.findAll(req.user, pageOptions);
  }

  /**
   * Get a single book by ID
   */
  @Get(':id')
  @Roles('admin', 'user', 'guest')
  async findOne(@Param('id') id: number): Promise<Book> {
    return this.booksService.findOne(id);
  }

  /**
   * Create a new book
   */
  @Post()
  @Roles('admin')
  async create(@Body() createBookDto: CreateBookDto): Promise<Book> {
    return this.booksService.create(createBookDto);
  }

  /**
   * Update a book
   */
  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: number,
    @Body() updateBookDto: UpdateBookDto,
  ): Promise<Book> {
    return this.booksService.update(id, updateBookDto);
  }

  /**
   * Delete a book
   */
  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: number): Promise<void> {
    return this.booksService.delete(id);
  }

  /**
   * Search books by title or description
   */
  @Get('search')
  @Roles('admin', 'user', 'guest')
  async search(
    @Request() req: { user: JwtPayload },
    @Query('q') query: string,
    @Query() pageOptions: PageOptionsDto,
  ): Promise<PageDto<Book>> {
    return this.booksService.search(req.user, query, pageOptions);
  }

  /**
   * Get books by author
   */
  @Get('author/:authorId')
  @Roles('admin', 'user', 'guest')
  async findByAuthor(
    @Param('authorId') authorId: number,
    @Query() pageOptions: PageOptionsDto,
  ): Promise<PageDto<Book>> {
    return this.booksService.findByAuthor(authorId, pageOptions);
  }

  /**
   * Get books by price range
   */
  @Get('price-range')
  @Roles('admin', 'user', 'guest')
  async findByPriceRange(
    @Request() req: { user: JwtPayload },
    @Query('min') minPrice: number,
    @Query('max') maxPrice: number,
    @Query() pageOptions: PageOptionsDto,
  ): Promise<PageDto<Book>> {
    return this.booksService.findByPriceRange(req.user, minPrice, maxPrice, pageOptions);
  }
}
