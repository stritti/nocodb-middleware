import { Injectable, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../shared/services/nocodb.service';
import { Book, PageOptionsDto, PageDto } from '../shared/interfaces/book.interface';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtPayload } from '../shared/interfaces/user.interface';

@Injectable()
export class BooksService {
  constructor(private readonly nocodbService: NocoDBService) {}

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  private enrichWithAuthor(book: any): Promise<any> {
    if (!book?.author_id) return Promise.resolve(book);
    return this.nocodbService
      .findOne('authors', book.author_id)
      .then((author) => ({ ...book, author }))
      .catch(() => book);
  }

  private enrichBooksWithAuthors(books: any[]): Promise<any[]> {
    return Promise.all(books.map((book) => this.enrichWithAuthor(book)));
  }

  private buildPaginationMeta<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PageDto<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  private getPaginationParams(pageOptions: PageOptionsDto) {
    const { page = 1, limit = 10, sortBy = 'title', sortOrder = 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;
    return { page, limit, sortBy, sortOrder, offset };
  }

  // ──────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────

  /**
   * Get all books with pagination and filtering based on user role
   */
  async findAll(user: JwtPayload, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions);

    let where = '';
    if (user.role === 'guest') {
      where = '(price,lt,10)';
    }
    if (pageOptions.search) {
      const searchCondition = `(title,contains,${pageOptions.search})~or~(description,contains,${pageOptions.search})`;
      where = where ? `${where}~and~${searchCondition}` : searchCondition;
    }

    const [books, total] = await Promise.all([
      this.nocodbService.findAll('books', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('books', where),
    ]);

    return this.buildPaginationMeta(await this.enrichBooksWithAuthors(books), total, page, limit);
  }

  /**
   * Get a single book by ID
   */
  async findOne(id: number): Promise<Book> {
    const book = await this.nocodbService.findOne('books', id);
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    return this.enrichWithAuthor(book);
  }

  /**
   * Create a new book
   */
  async create(createBookDto: CreateBookDto): Promise<Book> {
    const book = await this.nocodbService.create('books', createBookDto);
    return this.enrichWithAuthor(book);
  }

  /**
   * Update a book
   */
  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    const existingBook = await this.nocodbService.findOne('books', id);
    if (!existingBook) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    const updatedBook = await this.nocodbService.update('books', id, updateBookDto);
    return this.enrichWithAuthor(updatedBook);
  }

  /**
   * Delete a book
   */
  async delete(id: number): Promise<void> {
    const existingBook = await this.nocodbService.findOne('books', id);
    if (!existingBook) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    await this.nocodbService.delete('books', id);
  }

  /**
   * Search books by title or description
   */
  async search(user: JwtPayload, query: string, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions);

    let where = `(title,contains,${query})~or~(description,contains,${query})`;
    if (user.role === 'guest') {
      where += '~and~(price,lt,10)';
    }

    const [books, total] = await Promise.all([
      this.nocodbService.findAll('books', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('books', where),
    ]);

    return this.buildPaginationMeta(await this.enrichBooksWithAuthors(books), total, page, limit);
  }

  /**
   * Get books by author
   */
  async findByAuthor(authorId: number, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions);

    const where = `(author_id,eq,${authorId})`;

    const [books, total] = await Promise.all([
      this.nocodbService.findAll('books', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('books', where),
    ]);

    return this.buildPaginationMeta(await this.enrichBooksWithAuthors(books), total, page, limit);
  }

  /**
   * Get books by price range with user-specific filtering
   */
  async findByPriceRange(
    user: JwtPayload,
    minPrice: number,
    maxPrice: number,
    pageOptions: PageOptionsDto,
  ): Promise<PageDto<Book>> {
    const { page, limit, offset } = this.getPaginationParams(pageOptions);
    // Always sort by price for price range queries
    const sortBy = 'price';
    const sortOrder: 'ASC' | 'DESC' = 'ASC';

    let where = `(price,gte,${minPrice})~and~(price,lte,${maxPrice})`;
    if (user.role === 'guest') {
      where += '~and~(price,lt,10)';
    }

    const [books, total] = await Promise.all([
      this.nocodbService.findAll('books', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('books', where),
    ]);

    return this.buildPaginationMeta(await this.enrichBooksWithAuthors(books), total, page, limit);
  }
}
