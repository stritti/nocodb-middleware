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
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';

interface NocoTableRef {
  id: string;
}

interface NocoUserRecord {
  id?: number | string;
  username?: string;
}

interface NocoRoleRecord {
  id?: number | string;
}

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
      await this.nocoDBService.findOne(
        usersTable.id,
        `(username,eq,${dto.username})`,
      ),
    );

    const existingByEmail = this.asUserRecord(
      await this.nocoDBService.findOne(
        usersTable.id,
        `(email,eq,${dto.email})`,
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

    const adminRole = this.asRoleRecord(
      await this.nocoDBService.findOne(rolesTable.id, '(role_name,eq,admin)'),
    );

    if (!adminRole) {
      throw new NotFoundException('Admin role is missing');
    }

    const adminRoleId = this.extractNumericId(adminRole);

    if (existingByUsername) {
      const existingUserId = this.extractNumericId(existingByUsername);
      if (
        !(await this.nocoDBService.findOne(
          userRolesTable.id,
          `(user,eq,${existingUserId})~and(role,eq,${adminRoleId})`,
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

    const passwordHash = crypto.createHash('sha256').update(dto.password).digest('hex');

    const createdUser = this.asUserRecord(
      await this.nocoDBService.create(usersTable.id, {
        username: dto.username,
        email: dto.email,
        password_hash: passwordHash,
        is_active: true,
      }),
    );

    if (!createdUser) {
      throw new NotFoundException('Created user payload is invalid');
    }

    const userId = this.extractNumericId(createdUser);

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
  }): number {
    const rawId = record.id;

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
