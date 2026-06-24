import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../shared/services/auth.service';
import { NocoDBService } from '../shared/services/nocodb.service';
import { User, UserWithPassword, AuthCredentials, AuthResponse, JwtPayload } from '../shared/interfaces/user.interface';
import { PageOptionsDto, PageDto } from '../shared/interfaces/book.interface';

@Injectable()
export class UsersService {
  constructor(
    private readonly authService: AuthService,
    private readonly nocodbService: NocoDBService,
  ) {}

  /**
   * Register a new user
   */
  async register(credentials: AuthCredentials & { email: string }): Promise<AuthResponse> {
    return this.authService.register(credentials);
  }

  /**
   * Login user
   */
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    return this.authService.login(credentials);
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(payload: JwtPayload): Promise<User> {
    const user = await this.authService.getCurrentUser(payload);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get all users (admin only)
   */
  async findAll(pageOptions: PageOptionsDto): Promise<PageDto<User>> {
    const { page = 1, limit = 10, sortBy = 'username', sortOrder = 'ASC', search } = pageOptions;
    const offset = (page - 1) * limit;

    // Build where clause
    let where = '';
    
    if (search) {
      where = `(username,contains,${search})~or~(email,contains,${search})`;
    }

    // Get users (without password hashes)
    const usersWithPassword = await this.nocodbService.findAll('users', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Remove password hashes
    const users = usersWithPassword.map((user: UserWithPassword) => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    // Get total count
    const total = await this.nocodbService.count('users', where);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users,
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
   * Get a single user by ID
   */
  async findOne(currentUser: JwtPayload, id: number): Promise<User> {
    // Users can only access their own data (unless they're admin)
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You can only access your own user data');
    }

    const userWithPassword = await this.nocodbService.findOne('users', id);
    
    if (!userWithPassword) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Remove password hash
    const { password_hash, ...userWithoutPassword } = userWithPassword;
    return userWithoutPassword;
  }

  /**
   * Update user
   */
  async update(currentUser: JwtPayload, id: number, updateData: Partial<User>): Promise<User> {
    // Users can only update their own data (unless they're admin)
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You can only update your own user data');
    }

    // Prevent updating role if not admin
    if (currentUser.role !== 'admin' && updateData.role) {
      delete updateData.role;
    }

    const existingUser = await this.nocodbService.findOne('users', id);
    
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.nocodbService.update('users', id, {
      ...updateData,
      updated_at: new Date().toISOString(),
    });

    // Remove password hash
    const { password_hash, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Delete user
   */
  async delete(id: number): Promise<void> {
    const existingUser = await this.nocodbService.findOne('users', id);
    
    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.nocodbService.delete('users', id);
  }

  /**
   * Update password
   */
  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    return this.authService.updatePassword(userId, currentPassword, newPassword);
  }

  /**
   * Get user's favorite books
   */
  async getFavorites(user: JwtPayload, pageOptions: PageOptionsDto): Promise<PageDto<any>> {
    const { page = 1, limit = 10, sortBy = 'title', sortOrder = 'ASC' } = pageOptions;
    const offset = (page - 1) * limit;

    const where = `(user_id,eq,${user.sub})`;

    // Get favorites
    const favorites = await this.nocodbService.findAll('favorites', {
      where,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    // Get book details for each favorite
    const enrichedFavorites = await Promise.all(
      favorites.map(async (favorite) => {
        try {
          const book = await this.nocodbService.findOne('books', favorite.book_id);
          if (book.author_id) {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...favorite, book: { ...book, author } };
          }
          return { ...favorite, book };
        } catch (error) {
          return favorite;
        }
      })
    );

    // Get total count
    const total = await this.nocodbService.count('favorites', where);

    const totalPages = Math.ceil(total / limit);

    return {
      data: enrichedFavorites,
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
   * Add a book to user's favorites
   */
  async addFavorite(userId: number, bookId: number): Promise<any> {
    // Check if book exists
    const book = await this.nocodbService.findOne('books', bookId);
    
    if (!book) {
      throw new NotFoundException(`Book with ID ${bookId} not found`);
    }

    // Check if already in favorites
    const existingFavorites = await this.nocodbService.findAll('favorites', {
      where: `(user_id,eq,${userId})~and~(book_id,eq,${bookId})`,
      limit: 1,
    });

    if (existingFavorites.length > 0) {
      throw new Error('Book is already in favorites');
    }

    // Add to favorites
    const favorite = await this.nocodbService.create('favorites', {
      user_id: userId,
      book_id: bookId,
    });

    // Enrich with book data
    const enrichedFavorite = {
      ...favorite,
      book: { ...book },
    };

    if (book.author_id) {
      try {
        const author = await this.nocodbService.findOne('authors', book.author_id);
        enrichedFavorite.book.author = author;
      } catch (error) {
        // Ignore error
      }
    }

    return enrichedFavorite;
  }

  /**
   * Remove a book from user's favorites
   */
  async removeFavorite(userId: number, bookId: number): Promise<void> {
    // Find the favorite
    const favorites = await this.nocodbService.findAll('favorites', {
      where: `(user_id,eq,${userId})~and~(book_id,eq,${bookId})`,
      limit: 1,
    });

    if (favorites.length === 0) {
      throw new NotFoundException('Favorite not found');
    }

    await this.nocodbService.delete('favorites', favorites[0].id);
  }
}
