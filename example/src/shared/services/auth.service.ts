import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { NocoDBService } from './nocodb.service';
import { User, UserWithPassword, AuthCredentials, AuthResponse, JwtPayload } from '../interfaces/user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly nocodbService: NocoDBService,
    private readonly jwtService: JwtService,
  ) {}

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Validate user credentials
   */
  async validateUser(credentials: AuthCredentials): Promise<UserWithPassword | null> {
    try {
      // Find user by username or email
      const users = await this.nocodbService.findAll('users', {
        where: `(username,eq,${credentials.username})~or~(email,eq,${credentials.username})`,
        limit: 1,
      });

      if (users.length === 0) {
        return null;
      }

      const user = users[0];
      
      // Check password
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
      
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error: unknown) {
      this.logger.error(`Error validating user: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Login user and return JWT token
   */
  async login(credentials: AuthCredentials): Promise<AuthResponse> {
    const user = await this.validateUser(credentials);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;

    return {
      access_token: accessToken,
      user: userWithoutPassword,
    };
  }

  /**
   * Register a new user
   */
  async register(credentials: AuthCredentials & { email: string }): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUsers = await this.nocodbService.findAll('users', {
        where: `(username,eq,${credentials.username})~or~(email,eq,${credentials.email})`,
        limit: 1,
      });

      if (existingUsers.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(credentials.password, 10);

      // Create user
      const userData = {
        username: credentials.username,
        email: credentials.email,
        password_hash: passwordHash,
        role: 'user', // Force role — never trust client-supplied role
      };

      const newUser = await this.nocodbService.create('users', userData);

      const payload: JwtPayload = {
        sub: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      };

      const accessToken = this.jwtService.sign(payload);

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = newUser;

      return {
        access_token: accessToken,
        user: userWithoutPassword,
      };
    } catch (error: unknown) {
      this.logger.error(`Error registering user: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * Get current user from JWT payload
   */
  async getCurrentUser(payload: JwtPayload): Promise<User | null> {
    try {
      const user = await this.nocodbService.findOne('users', payload.sub);
      
      if (!user) {
        return null;
      }

      // Return user without password hash
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error: unknown) {
      this.logger.error(`Error fetching current user: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Update user password
   */
  async updatePassword(userId: number, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get current user
      const user = await this.nocodbService.findOne('users', userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.nocodbService.update('users', userId, {
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      });

      return true;
    } catch (error: unknown) {
      this.logger.error(`Error updating password: ${this.getErrorMessage(error)}`);
      throw error;
    }
  }
}
