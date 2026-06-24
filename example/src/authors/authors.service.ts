import { Injectable, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../shared/services/nocodb.service';
import { Author, CreateAuthorDto, UpdateAuthorDto, PageOptionsDto, PageDto, Book } from '../shared/interfaces/book.interface';

@Injectable()
export class AuthorsService {
  constructor(private readonly nocodbService: NocoDBService) {}

  /**
   * Get all authors with pagination
   */
  async findAll(pageOptions: PageOptionsDto): Promise<PageDto<Author>> {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC', search } = pageOptions;
    const offset = (page - 1) * limit;

    // Build where clause
    let where = '';
    
    if (search) {
      where = `(name,contains,${search})~or~(bio,contains,${search})`;
    }

    // Get authors
    const authors = await this.nocodbService.findAll('authors', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get total count
    const total = await this.nocodbService.count('authors', where);

    const totalPages = Math.ceil(total / limit);

    return {
      data: authors,
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
    const author = await this.nocodbService.create('authors', createAuthorDto);
    return author;
  }

  /**
   * Update an author
   */
  async update(id: number, updateAuthorDto: UpdateAuthorDto): Promise<Author> {
    const existingAuthor = await this.nocodbService.findOne('authors', id);
    
    if (!existingAuthor) {
      throw new NotFoundException(`Author with ID ${id} not found`);
    }

    const updatedAuthor = await this.nocodbService.update('authors', id, updateAuthorDto);
    return updatedAuthor;
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
  async getBooksByAuthor(authorId: number, pageOptions: PageOptionsDto): Promise<PageDto<Book>> {
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
   * Search authors by name or bio
   */
  async search(query: string, pageOptions: PageOptionsDto): Promise<PageDto<Author>> {
    const { page = 1, limit = 10, sortBy = 'name', sortOrder = 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;

    const where = `(name,contains,${query})~or~(bio,contains,${query})`;

    // Get authors
    const authors = await this.nocodbService.findAll('authors', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get total count
    const total = await this.nocodbService.count('authors', where);

    const totalPages = Math.ceil(total / limit);

    return {
      data: authors,
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
