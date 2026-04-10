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

interface NocoTableRef {
  id: string;
}

interface NocoUserRecord {
  id?: number | string;
  Id?: number | string;
  Username?: string;
}

interface NocoRoleRecord {
  id?: number | string;
  Id?: number | string;
}

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

    const usersTable = this.assertTableRef(
      await this.nocoDBService.getTableByName('users'),
    );
    const rolesTable = this.assertTableRef(
      await this.nocoDBService.getTableByName('roles'),
    );
    const userRolesTable = this.assertTableRef(
      await this.nocoDBService.getTableByName('user_roles'),
    );

    const existingByUsername = this.asUserRecord(
      await this.nocoDBV3Service.findOne(
        usersTable.id,
        `(Username,eq,${dto.username})`,
      ),
    );

    const existingByEmail = this.asUserRecord(
      await this.nocoDBV3Service.findOne(
        usersTable.id,
        `(Email,eq,${dto.email})`,
      ),
    );

    if (
      existingByEmail &&
      !existingByUsername &&
      String(existingByEmail.Username ?? '') !== dto.username
    ) {
      throw new ConflictException(
        `User with email "${dto.email}" already exists`,
      );
    }

    const adminRole = this.asRoleRecord(
      await this.nocoDBV3Service.findOne(rolesTable.id, '(Role Name,eq,admin)'),
    );

    if (!adminRole) {
      throw new NotFoundException('Admin role is missing');
    }

    const adminRoleId = this.extractNumericId(adminRole);

    if (existingByUsername) {
      const existingUserId = this.extractNumericId(existingByUsername);
      if (
        !(await this.nocoDBV3Service.findOne(
          userRolesTable.id,
          `(User Id,eq,${existingUserId})~and(Role Id,eq,${adminRoleId})`,
        ))
      ) {
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

    const createdUser = this.asUserRecord(
      await this.nocoDBV3Service.create(usersTable.id, {
        Username: dto.username,
        Email: dto.email,
        'Password Hash': passwordHash,
        'Is Active': true,
      }),
    );

    if (!createdUser) {
      throw new NotFoundException('Created user payload is invalid');
    }

    const userId = this.extractNumericId(createdUser);

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

  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `scrypt:${salt}:${derivedKey}`;
  }

  private assertTableRef(value: unknown): NocoTableRef {
    if (!value || typeof value !== 'object') {
      throw new NotFoundException(
        'Required bootstrap tables are missing. Run database initialization first.',
      );
    }

    const record = value as { id?: unknown };

    if (typeof record.id !== 'string') {
      throw new NotFoundException(
        'Required bootstrap tables are missing. Run database initialization first.',
      );
    }

    return { id: record.id };
  }

  private asUserRecord(value: unknown): NocoUserRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return value as NocoUserRecord;
  }

  private asRoleRecord(value: unknown): NocoRoleRecord | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    return value as NocoRoleRecord;
  }

  private extractNumericId(record: {
    id?: number | string;
    Id?: number | string;
  }): number {
    const rawId = record.id ?? record.Id;

    if (typeof rawId === 'number') {
      return rawId;
    }

    if (typeof rawId === 'string' && rawId.length > 0) {
      const parsed = Number(rawId);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    throw new NotFoundException('Invalid record ID payload');
  }
}
