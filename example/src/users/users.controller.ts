import { Controller, Get, Post, Body, Param, Put, Delete, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, AuthCredentials, AuthResponse, JwtPayload } from '../shared/interfaces/user.interface';
import { Roles } from '../shared/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PageOptionsDto, PageDto } from '../shared/interfaces/book.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Register a new user (public, no auth required)
   */
  @Public()
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponse> {
    return this.usersService.register(createUserDto);
  }

  /**
   * Login user (public, no auth required)
   */
  @Public()
  @Post('login')
  async login(@Body() credentials: AuthCredentials): Promise<AuthResponse> {
    return this.usersService.login(credentials);
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @Roles('admin', 'user', 'guest')
  async getProfile(@Request() req: { user: JwtPayload }): Promise<User> {
    return this.usersService.getCurrentUser(req.user);
  }

  /**
   * Get all users (admin only)
   */
  @Get()
  @Roles('admin')
  async findAll(@Query() pageOptions: PageOptionsDto): Promise<PageDto<User>> {
    return this.usersService.findAll(pageOptions);
  }

  /**
   * Get a single user by ID
   */
  @Get(':id')
  @Roles('admin', 'user')
  async findOne(@Request() req: { user: JwtPayload }, @Param('id') id: number): Promise<User> {
    return this.usersService.findOne(req.user, id);
  }

  /**
   * Update user
   */
  @Put(':id')
  @Roles('admin', 'user')
  async update(
    @Request() req: { user: JwtPayload },
    @Param('id') id: number,
    @Body() updateData: Partial<User>,
  ): Promise<User> {
    return this.usersService.update(req.user, id, updateData);
  }

  /**
   * Delete user
   */
  @Delete(':id')
  @Roles('admin')
  async delete(@Param('id') id: number): Promise<void> {
    return this.usersService.delete(id);
  }

  /**
   * Update password
   */
  @Put('me/password')
  @Roles('admin', 'user', 'guest')
  async updatePassword(
    @Request() req: { user: JwtPayload },
    @Body() passwordData: UpdatePasswordDto,
  ): Promise<{ success: boolean }> {
    const success = await this.usersService.updatePassword(
      req.user.sub,
      passwordData.currentPassword,
      passwordData.newPassword,
    );
    return { success };
  }

  /**
   * Get user's favorite books
   */
  @Get('me/favorites')
  @Roles('admin', 'user')
  async getFavorites(@Request() req: { user: JwtPayload }, @Query() pageOptions: PageOptionsDto): Promise<PageDto<any>> {
    return this.usersService.getFavorites(req.user, pageOptions);
  }

  /**
   * Add a book to user's favorites
   */
  @Post('me/favorites/:bookId')
  @Roles('admin', 'user')
  async addFavorite(@Request() req: { user: JwtPayload }, @Param('bookId') bookId: number): Promise<any> {
    return this.usersService.addFavorite(req.user.sub, bookId);
  }

  /**
   * Remove a book from user's favorites
   */
  @Delete('me/favorites/:bookId')
  @Roles('admin', 'user')
  async removeFavorite(@Request() req: { user: JwtPayload }, @Param('bookId') bookId: number): Promise<void> {
    return this.usersService.removeFavorite(req.user.sub, bookId);
  }
}
