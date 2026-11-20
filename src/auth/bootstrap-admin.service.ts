import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
  IntrinsicException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';
import { andFilters, filterEq } from '../nocodb/nocodb-filter.util';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { hashPassword } from './password-hasher.util';
import {
  assertTableRef,
  asUserRecord,
  asRoleRecord,
  extractNumericId,
} from '../common/utils/nocodb-utils';

/**
 * Creates the first admin, or promotes an existing user to admin, guarded by
 * `BOOTSTRAP_ADMIN_TOKEN`.
 *
 * The endpoint locks itself once any user holds the admin role: further
 * calls are rejected with 403, so a leaked token cannot be used later to
 * promote arbitrary users. Repeating the call for a user who already is admin
 * stays idempotent. Every call is written to the audit log.
 */
@Injectable()
export class BootstrapAdminService {
  private readonly logger = new Logger(BootstrapAdminService.name);

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
    try {
      this.assertBootstrapAllowed(bootstrapToken);
    } catch (error) {
      this.audit('denied', dto.username, 'invalid_token');
      throw error;
    }

    const usersTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USERS),
    );
    const rolesTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.ROLES),
    );
    const userRolesTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USER_ROLES),
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
      const alreadyAdmin = await this.nocoDBService.findOne(
        userRolesTable.id,
        andFilters(
          filterEq('user_id', existingUserId),
          filterEq('role_id', adminRoleId),
        ),
      );
      if (alreadyAdmin) {
        this.audit('unchanged', dto.username, 'already_admin');
        return {
          success: true,
          userId: existingUserId,
          username: dto.username,
          created: false,
        };
      }
    }

    await this.assertNoAdminExists(userRolesTable.id, adminRoleId, dto);

    if (existingByUsername) {
      const existingUserId = extractNumericId(existingByUsername);
      await this.nocoDBService.create(userRolesTable.id, {
        user_id: existingUserId,
        role_id: adminRoleId,
      });
      this.audit('promoted', dto.username);

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
      user_id: userId,
      role_id: adminRoleId,
    });
    this.audit('created', dto.username);

    return {
      success: true,
      userId,
      username: dto.username,
      created: true,
    };
  }

  private async assertNoAdminExists(
    userRolesTableId: string,
    adminRoleId: number,
    dto: BootstrapAdminDto,
  ): Promise<void> {
    const anyAdmin = await this.nocoDBService.findOne(
      userRolesTableId,
      filterEq('role_id', adminRoleId),
    );
    if (anyAdmin) {
      this.audit('denied', dto.username, 'admin_exists');
      throw new ForbiddenException(
        'Bootstrap is locked because an admin already exists',
      );
    }
  }

  private audit(
    outcome: 'created' | 'promoted' | 'unchanged' | 'denied',
    username: string,
    reason?: string,
  ): void {
    // Structured audit entry; with nestjs-pino the object becomes JSON fields.
    const entry = { event: 'bootstrap_admin', outcome, username, reason };
    if (outcome === 'denied') {
      this.logger.warn(entry, 'Bootstrap admin denied');
    } else {
      this.logger.log(entry, `Bootstrap admin ${outcome}`);
    }
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
