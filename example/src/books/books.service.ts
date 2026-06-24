import { Injectable, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../shared/services/nocodb.service';
import { Book, CreateBookDto, UpdateBookDto, PageOptionsDto, PageDto, Author } from '../shared/interfaces/book.interface';
import { JwtPayload } from '../shared/interfaces/user.interface';

@Injectable()
export class BooksService {
  constructor(private readonly nocodbService: NocoDBService) {}

  /**
   * Get all books with pagination and filtering based on user role
   */
  async findAll(user: JwtPayload, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
    const { page = 1, limit = 10, sortBy = 'title', sortOrder = 'ASC', search } = pageOptions;
    const offset = (page - 1) * limit;

    // Build where clause
    let where = '';
    
    // For guests, only show books with price < 10
    if (user.role === 'guest') {
      where = '(price,lt,10)';
    }

    // Add search filter if provided
    if (search) {
      const searchCondition = `(title,contains,${search})~or~(description,contains,${search})`;
      where = where ? `${where}~and~${searchCondition}` : searchCondition;
    }

    // Get books
    const books = await this.nocodbService.findAll('books', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get total count
    const total = await this.nocodbService.count('books', where);

    // Enrich books with author data
    const enrichedBooks = await Promise.all(
      books.map(async (book) => {
        if (book.author_id) {
          try {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...book, author };
          } catch (error) {
            return book;
          }
        }
        return book;
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedBooks,
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

  /**
   * Get a single book by ID
   */
  async findOne(id: number): Promise<Book> {
    const book = await this.nocodbService.findOne('books', id);
    
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    // Enrich with author data
    if (book.author_id) {
      try {
        const author = await this.nocodbService.findOne('authors', book.author_id);
        return { ...book, author };
      } catch (error) {
        return book;
      }
    }

    return book;
  }

  /**
   * Create a new book
   */
  async create(createBookDto: CreateBookDto): Promise<Book> {
    const book = await this.nocodbService.create('books', createBookDto);
    
    // Enrich with author data if author_id is provided
    if (book.author_id) {
      try {
        const author = await this.nocodbService.findOne('authors', book.author_id);
        return { ...book, author };
      } catch (error) {
        return book;
      }
    }

    return book;
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

    // Enrich with author data
    if (updatedBook.author_id) {
      try {
        const author = await this.nocodbService.findOne('authors', updatedBook.author_id);
        return { ...updatedBook, author };
      } catch (error) {
        return updatedBook;
      }
    }

    return updatedBook;
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
    const { page = 1, limit = 10, sortBy = 'title', sortOrder = 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;

    // Build where clause for search
    let where = `(title,contains,${query})~or~(description,contains,${query})`;

    // For guests, only show books with price < 10
    if (user.role === 'guest') {
      where += '~and~(price,lt,10)';
    }

    // Get books
    const books = await this.nocodbService.findAll('books', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get total count
    const total = await this.nocodbService.count('books', where);

    // Enrich books with author data
    const enrichedBooks = await Promise.all(
      books.map(async (book) => {
        if (book.author_id) {
          try {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...book, author };
          } catch (error) {
            return book;
          }
        }
        return book;
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedBooks,
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

  /**
   * Get books by author
   */
  async findByAuthor(authorId: number, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
    const { page = 1, limit = 10, sortBy = 'title', sortOrder = 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;

    const where = `(author_id,eq,${authorId})`;

    // Get books
    const books = await this.nocodbService.findAll('books', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get total count
    const total = await this.nocodbService.count('books', where);

    // Enrich books with author data
    const enrichedBooks = await Promise.all(
      books.map(async (book) => {
        if (book.author_id) {
          try {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...book, author };
          } catch (error) {
            return book;
          }
        }
        return book;
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedBooks,
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

  /**
   * Get books by price range with user-specific filtering
   */
  async findByPriceRange(
    user: JwtPayload,
    minPrice: number,
    maxPrice: number,
    pageOptions: PageOptionsDto,
  ): Promise<PageDto<Book>> {
    const { page = 1, limit = 10, sortBy = 'price', sortOrder = 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;

    // Build where clause for price range
    let where = `(price,gte,${minPrice})~and~(price,lte,${maxPrice})`;

    // For guests, only show books with price < 10
    if (user.role === 'guest') {
      where += '~and~(price,lt,10)';
    }

    // Get books
    const books = await this.nocodbService.findAll('books', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get total count
    const total = await this.nocodbService.count('books', where);

    // Enrich books with author data
    const enrichedBooks = await Promise.all(
      books.map(async (book) => {
        if (book.author_id) {
          try {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...book, author };
          } catch (error) {
            return book;
          }
        }
        return book;
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedBooks,
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
}
