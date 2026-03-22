import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { NocoDBService } from '../nocodb/nocodb.service';
import { NocoDBV3Service } from '../nocodb/nocodb-v3.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';

@Injectable()
export class BootstrapAdminService {
  constructor(
    private readonly configService: ConfigService,
    private readonly nocoDBService: NocoDBService,
    private readonly nocoDBV3Service: NocoDBV3Service,
  ) {}

  async bootstrapAdmin(
    dto: BootstrapAdminDto,
    bootstrapToken: string | undefined,
  ): Promise<{
    success: true;
    userId: number;
    username: string;
    created: boolean;
  }> {
    this.assertBootstrapAllowed(bootstrapToken);

    const usersTable = await this.nocoDBService.getTableByName('users');
    const rolesTable = await this.nocoDBService.getTableByName('roles');
    const userRolesTable = await this.nocoDBService.getTableByName('user_roles');

    if (!usersTable || !rolesTable || !userRolesTable) {
      throw new NotFoundException(
        'Required bootstrap tables are missing. Run database initialization first.',
      );
    }

    const existingByUsername = await this.nocoDBV3Service.findOne(
      usersTable.id,
      `(Username,eq,${dto.username})`,
    );

    const existingByEmail = await this.nocoDBV3Service.findOne(
      usersTable.id,
      `(Email,eq,${dto.email})`,
    );

    if (
      existingByEmail &&
      !existingByUsername &&
      String(existingByEmail.Username || '') !== dto.username
    ) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    const adminRole = await this.nocoDBV3Service.findOne(
      rolesTable.id,
      '(Role Name,eq,admin)',
    );

    if (!adminRole) {
      throw new NotFoundException('Admin role is missing');
    }

    const adminRoleId = Number(adminRole.id || adminRole.Id);

    if (existingByUsername) {
      const existingUserId = Number(existingByUsername.id || existingByUsername.Id);
      const existingAssignment = await this.nocoDBV3Service.findOne(
        userRolesTable.id,
        `(User Id,eq,${existingUserId})~and(Role Id,eq,${adminRoleId})`,
      );

      if (!existingAssignment) {
        await this.nocoDBV3Service.create(userRolesTable.id, {
          'User Id': existingUserId,
          'Role Id': adminRoleId,
          'Assigned At': new Date().toISOString(),
        });
      }

      return {
        success: true,
        userId: existingUserId,
        username: dto.username,
        created: false,
      };
    }

    const passwordHash = this.hashPassword(dto.password);

    const createdUser = await this.nocoDBV3Service.create(usersTable.id, {
      Username: dto.username,
      Email: dto.email,
      'Password Hash': passwordHash,
      'Is Active': true,
    });

    const userId = Number(createdUser.id || createdUser.Id);

    await this.nocoDBV3Service.create(userRolesTable.id, {
      'User Id': userId,
      'Role Id': adminRoleId,
      'Assigned At': new Date().toISOString(),
    });

    return {
      success: true,
      userId,
      username: dto.username,
      created: true,
    };
  }

  private assertBootstrapAllowed(bootstrapToken: string | undefined): void {
    const configuredToken = this.configService.get<string>('BOOTSTRAP_ADMIN_TOKEN');

    if (!configuredToken) {
      throw new ForbiddenException('Bootstrap token is not configured');
    }

    if (!bootstrapToken) {
      throw new UnauthorizedException('Missing bootstrap token');
    }

    const provided = Buffer.from(bootstrapToken);
    const expected = Buffer.from(configuredToken);

    if (provided.length !== expected.length) {
      throw new UnauthorizedException('Invalid bootstrap token');
    }

    const valid = crypto.timingSafeEqual(provided, expected);

    if (!valid) {
      throw new UnauthorizedException('Invalid bootstrap token');
    }
  }

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${derivedKey}`;
  }
}
