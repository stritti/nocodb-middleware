import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  IntrinsicException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { NocoDBService } from '../nocodb/nocodb.service';
import { andFilters, filterEq } from '../nocodb/nocodb-filter.util';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { hashPassword } from './password-hasher.util';
import {
  assertTableRef,
  asUserRecord,
  asRoleRecord,
  extractNumericId,
} from '../common/utils/nocodb-utils';

@Injectable()
export class BootstrapAdminService {
  constructor(
    private readonly configService: ConfigService,
    private readonly nocoDBService: NocoDBService,
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

    const usersTable = assertTableRef(
      await this.nocoDBService.getTableByName('users'),
    );
    const rolesTable = assertTableRef(
      await this.nocoDBService.getTableByName('roles'),
    );
    const userRolesTable = assertTableRef(
      await this.nocoDBService.getTableByName('user_roles'),
    );

    const existingByUsername = asUserRecord(
      await this.nocoDBService.findOne(
        usersTable.id,
        filterEq('username', dto.username),
      ),
    );

    const existingByEmail = asUserRecord(
      await this.nocoDBService.findOne(
        usersTable.id,
        filterEq('email', dto.email),
      ),
    );

    if (
      existingByEmail &&
      !existingByUsername &&
      String(existingByEmail.username ?? '') !== dto.username
    ) {
      throw new ConflictException(
        `User with email "${dto.email}" already exists`,
      );
    }

    const adminRole = asRoleRecord(
      await this.nocoDBService.findOne(
        rolesTable.id,
        filterEq('role_name', 'admin'),
      ),
    );

    if (!adminRole) {
      throw new NotFoundException('Admin role is missing');
    }

    const adminRoleId = extractNumericId(adminRole);

    if (existingByUsername) {
      const existingUserId = extractNumericId(existingByUsername);
      if (
        !(await this.nocoDBService.findOne(
          userRolesTable.id,
          andFilters(
            filterEq('user', existingUserId),
            filterEq('role', adminRoleId),
          ),
        ))
      ) {
        await this.nocoDBService.create(userRolesTable.id, {
          user: [{ id: existingUserId }],
          role: [{ id: adminRoleId }],
        });
      }

      return {
        success: true,
        userId: existingUserId,
        username: dto.username,
        created: false,
      };
    }

    const passwordHash = hashPassword(dto.password);

    const createdUser = asUserRecord(
      await this.nocoDBService.create(usersTable.id, {
        username: dto.username,
        email: dto.email,
        password_hash: passwordHash,
        is_active: true,
      }),
    );

    if (!createdUser) {
      throw new IntrinsicException('Created user payload is invalid');
    }

    const userId = extractNumericId(createdUser);

    await this.nocoDBService.create(userRolesTable.id, {
      user: [{ id: userId }],
      role: [{ id: adminRoleId }],
    });

    return {
      success: true,
      userId,
      username: dto.username,
      created: true,
    };
  }

  private assertBootstrapAllowed(bootstrapToken: string | undefined): void {
    const configuredToken = this.configService.get<string>(
      'BOOTSTRAP_ADMIN_TOKEN',
    );

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
}
