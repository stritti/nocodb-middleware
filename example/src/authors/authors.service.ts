import { Injectable, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../shared/services/nocodb.service';
import { Author, PageOptionsDto, PageDto, Book } from '../shared/interfaces/book.interface';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { JwtPayload } from '../shared/interfaces/user.interface';

@Injectable()
export class AuthorsService {
  constructor(private readonly nocodbService: NocoDBService) {}

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  private getPaginationParams(
    pageOptions: PageOptionsDto,
    defaults: { sortBy?: string; sortOrder?: 'ASC' | 'DESC' } = {},
  ) {
    const { page = 1, limit = 10, sortBy = defaults.sortBy || 'name', sortOrder = defaults.sortOrder || 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;
    return { page, limit, sortBy, sortOrder, offset };
  }

  private buildPaginationMeta<T>(data: T[], total: number, page: number, limit: number): PageDto<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    };
  }

  // ──────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────

  /**
   * Get all authors with pagination
   */
  async findAll(pageOptions: PageOptionsDto): Promise<PageDto<Author>> {
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions);

    let where = '';
    if (pageOptions.search) {
      where = `(name,contains,${pageOptions.search})~or~(bio,contains,${pageOptions.search})`;
    }

    const [authors, total] = await Promise.all([
      this.nocodbService.findAll('authors', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('authors', where),
    ]);

    return this.buildPaginationMeta(authors, total, page, limit);
  }

  /**
   * Get a single author by ID
   */
  async findOne(id: number): Promise<Author> {
    const author = await this.nocodbService.findOne('authors', id);
    if (!author) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    return author;
  }

  /**
   * Create a new author
   */
  async create(createAuthorDto: CreateAuthorDto): Promise<Author> {
    return this.nocodbService.create('authors', createAuthorDto);
  }

  /**
   * Update an author
   */
  async update(id: number, updateAuthorDto: UpdateAuthorDto): Promise<Author> {
    const existingAuthor = await this.nocodbService.findOne('authors', id);
    if (!existingAuthor) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    return this.nocodbService.update('authors', id, updateAuthorDto);
  }

  /**
   * Delete an author
   */
  async delete(id: number): Promise<void> {
    const existingAuthor = await this.nocodbService.findOne('authors', id);
    if (!existingAuthor) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }
    await this.nocodbService.delete('authors', id);
  }

  /**
   * Get books by author
   */
  async getBooksByAuthor(user: JwtPayload, authorId: number, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions, { sortBy: 'title' });

    let where = `(author_id,eq,${authorId})`;
    if (user.role === 'guest') {
      where += '~and~(price,lt,10)';
    }

    const [books, total] = await Promise.all([
      this.nocodbService.findAll('books', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('books', where),
    ]);

    const enrichedBooks = await Promise.all(
      books.map(async (book) => {
        if (book.author_id) {
          try {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...book, author };
          } catch {
            return book;
          }
        }
        return book;
      }),
    );

    return this.buildPaginationMeta(enrichedBooks, total, page, limit);
  }

  /**
   * Search authors by name or bio
   */
  async search(query: string, pageOptions: PageOptionsDto): Promise<PageDto<Author>> {
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions);

    const where = `(name,contains,${query})~or~(bio,contains,${query})`;

    const [authors, total] = await Promise.all([
      this.nocodbService.findAll('authors', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('authors', where),
    ]);

    return this.buildPaginationMeta(authors, total, page, limit);
  }
}
