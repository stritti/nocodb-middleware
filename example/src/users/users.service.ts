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

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  private getPaginationParams(
    pageOptions: PageOptionsDto,
    defaults: { sortBy?: string; sortOrder?: 'ASC' | 'DESC' } = {},
  ) {
    const { page = 1, limit = 10, sortBy = defaults.sortBy || 'username', sortOrder = defaults.sortOrder || 'ASC' } = pageOptions;
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
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions);

    let where = '';
    if (pageOptions.search) {
      where = `(username,contains,${pageOptions.search})~or~(email,contains,${pageOptions.search})`;
    }

    const [usersWithPassword, total] = await Promise.all([
      this.nocodbService.findAll('users', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('users', where),
    ]);

    // Strip password hashes
    const users = usersWithPassword.map((u: UserWithPassword) => {
      const { password_hash, ...rest } = u;
      return rest;
    });

    return this.buildPaginationMeta(users, total, page, limit);
  }

  /**
   * Get a single user by ID
   */
  async findOne(currentUser: JwtPayload, id: number): Promise<User> {
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You can only access your own user data');
    }

    const userWithPassword = await this.nocodbService.findOne('users', id);
    if (!userWithPassword) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password_hash, ...userWithoutPassword } = userWithPassword;
    return userWithoutPassword;
  }

  /**
   * Update user
   */
  async update(currentUser: JwtPayload, id: number, updateData: Partial<User>): Promise<User> {
    if (currentUser.role !== 'admin' && currentUser.sub !== id) {
      throw new ForbiddenException('You can only update your own user data');
    }

    // Prevent non-admins from changing roles
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
    const { page, limit, sortBy, sortOrder, offset } = this.getPaginationParams(pageOptions, { sortBy: 'title' });

    const where = `(user_id,eq,${user.sub})`;

    const [favorites, total] = await Promise.all([
      this.nocodbService.findAll('favorites', { where, limit, offset, sortBy, sortOrder }),
      this.nocodbService.count('favorites', where),
    ]);

    const enrichedFavorites = await Promise.all(
      favorites.map(async (fav) => {
        try {
          const book = await this.nocodbService.findOne('books', fav.book_id);
          if (book.author_id) {
            const author = await this.nocodbService.findOne('authors', book.author_id);
            return { ...fav, book: { ...book, author } };
          }
          return { ...fav, book };
        } catch {
          return fav;
        }
      }),
    );

    return this.buildPaginationMeta(enrichedFavorites, total, page, limit);
  }

  /**
   * Add a book to user's favorites
   */
  async addFavorite(userId: number, bookId: number): Promise<any> {
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

    const favorite = await this.nocodbService.create('favorites', {
      user_id: userId,
      book_id: bookId,
    });

    const enrichedFavorite: any = { ...favorite, book: { ...book } };

    if (book.author_id) {
      try {
        const author = await this.nocodbService.findOne('authors', book.author_id);
        enrichedFavorite.book.author = author;
      } catch {
        // Ignore enrichment errors
      }
    }

    return enrichedFavorite;
  }

  /**
   * Remove a book from user's favorites
   */
  async removeFavorite(userId: number, bookId: number): Promise<void> {
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
