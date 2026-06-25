import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { Author, PageOptionsDto, PageDto } from '../shared/interfaces/book.interface';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { Roles } from '../shared/decorators/roles.decorator';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  /**
   * Get all authors
   */
  @Get()
  @Roles('admin', 'user', 'guest')
  async findAll(@Query() pageOptions: PageOptionsDto): Promise<PageDto<Author>> {
    return this.authorsService.findAll(pageOptions);
  }

  /**
   * Get a single author by ID
   */
  @Get(':id')
  @Roles('admin', 'user', 'guest')
  async findOne(@Param('id') id: number): Promise<Author> {
    return this.authorsService.findOne(id);
  }

  /**
   * Create a new author
   */
  @Post()
  @Roles('admin')
  async create(@Body() createAuthorDto: CreateAuthorDto): Promise<Author> {
    return this.authorsService.create(createAuthorDto);
  }

  /**
   * Update an author
   */
  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: number,
    @Body() updateAuthorDto: UpdateAuthorDto,
  ): Promise<Author> {
    return this.authorsService.update(id, updateAuthorDto);
  }

  /**
   * Delete an author
   */
  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: number): Promise<void> {
    return this.authorsService.delete(id);
  }

  /**
   * Get books by author
   */
  @Get(':id/books')
  @Roles('admin', 'user', 'guest')
  async getBooksByAuthor(
    @Param('id') authorId: number,
    @Query() pageOptions: PageOptionsDto,
  ): Promise<PageDto<any>> {
    return this.authorsService.getBooksByAuthor(authorId, pageOptions);
  }

  /**
   * Search authors by name
   */
  @Get('search')
  @Roles('admin', 'user', 'guest')
  async search(
    @Query('q') query: string,
    @Query() pageOptions: PageOptionsDto,
  ): Promise<PageDto<Author>> {
    return this.authorsService.search(query, pageOptions);
  }
}
