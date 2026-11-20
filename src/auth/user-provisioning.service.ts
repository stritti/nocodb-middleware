import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SYSTEM_TABLE_NAMES } from '../common/system-table-names';
import { andFilters, filterEq, filterIn } from '../nocodb/nocodb-filter.util';
import {
  NormalizedIdentityClaims,
  ResolvedIdentity,
} from './identity/identity-provider.port';
import { ProvisionUserDto } from './dto/provision-user.dto';
import { hashPassword } from './password-hasher.util';
import {
  assertTableRef,
  asUserRecord,
  extractNumericId,
  NocoUserRecord,
} from '../common/utils/nocodb-utils';

/** Role that is never linked to an external identity automatically. */
const ADMIN_ROLE_NAME = 'admin';

@Injectable()
export class UserProvisioningService {
  private readonly logger = new Logger(UserProvisioningService.name);

  constructor(private readonly nocoDBService: NocoDBService) {}

  /**
   * Maps an external identity to a user record.
   *
   * Users are matched by `(auth_provider, external_subject)`. An existing
   * account is linked by e-mail only if the token proves the address
   * (`email_verified: true`), the account is not linked to another external
   * identity yet, and it does not hold the admin role. Otherwise anyone who
   * can register that e-mail address at the IdP would take over the account.
   */
  async upsertIdentityUser(
    claims: NormalizedIdentityClaims,
  ): Promise<ResolvedIdentity> {
    const usersTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USERS),
    );

    const bySubject = await this.findBySubject(usersTable.id, claims);
    const byEmail = claims.email
      ? asUserRecord(
          await this.nocoDBService.findOne(
            usersTable.id,
            filterEq('email', claims.email),
          ),
        )
      : null;

    if (
      bySubject &&
      byEmail &&
      extractNumericId(bySubject) !== extractNumericId(byEmail)
    ) {
      throw new ConflictException(
        'Identity subject conflicts with existing email mapping',
      );
    }

    if (bySubject) {
      const changes: Record<string, unknown> = {};
      if (claims.email && claims.email !== bySubject.email) {
        changes.email = claims.email;
      }
      if (claims.username && claims.username !== bySubject.username) {
        changes.username = claims.username;
      }
      // Avoid a NocoDB write on every authenticated request.
      if (Object.keys(changes).length === 0) {
        return this.toResolvedIdentity(bySubject, claims.roles);
      }

      const updated = await this.nocoDBService.update(
        usersTable.id,
        extractNumericId(bySubject),
        changes,
      );
      return this.toResolvedIdentity(asUserRecord(updated), claims.roles);
    }

    if (byEmail) {
      const existingId = extractNumericId(byEmail);
      await this.assertEmailLinkAllowed(byEmail, existingId, claims);
      const updated = await this.nocoDBService.update(
        usersTable.id,
        existingId,
        {
          auth_provider: claims.provider,
          external_subject: claims.subject,
          username: claims.username ?? byEmail.username,
        },
      );
      return this.toResolvedIdentity(asUserRecord(updated), claims.roles);
    }

    const created = await this.nocoDBService.create(usersTable.id, {
      username: claims.username ?? this.defaultUsername(claims),
      email: claims.email,
      password_hash: claims.provider === 'local' ? null : undefined,
      is_active: true,
      auth_provider: claims.provider,
      external_subject: claims.subject,
    });

    return this.toResolvedIdentity(asUserRecord(created), claims.roles);
  }

  async createLocalUser(dto: ProvisionUserDto): Promise<ResolvedIdentity> {
    const usersTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USERS),
    );

    const byUsername = await this.nocoDBService.findOne(
      usersTable.id,
      filterEq('username', dto.username),
    );
    if (byUsername) {
      throw new ConflictException(
        `User with username "${dto.username}" already exists`,
      );
    }

    const byEmail = await this.nocoDBService.findOne(
      usersTable.id,
      filterEq('email', dto.email),
    );
    if (byEmail) {
      throw new ConflictException(
        `User with email "${dto.email}" already exists`,
      );
    }

    const created = await this.nocoDBService.create(usersTable.id, {
      username: dto.username,
      email: dto.email,
      password_hash: hashPassword(dto.password),
      is_active: dto.isActive ?? true,
      auth_provider: 'local',
      external_subject: dto.email,
    });

    const resolved = this.toResolvedIdentity(
      asUserRecord(created),
      dto.roles ?? [],
    );

    if (dto.roles && dto.roles.length > 0) {
      await this.assignRolesByName(resolved.userId, dto.roles);
    }

    return resolved;
  }

  async setUserStatus(
    userId: number,
    isActive: boolean,
  ): Promise<ResolvedIdentity> {
    const usersTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USERS),
    );

    const updated = await this.nocoDBService.update(usersTable.id, userId, {
      is_active: isActive,
    });

    return this.toResolvedIdentity(asUserRecord(updated), []);
  }

  private async assertEmailLinkAllowed(
    user: NocoUserRecord,
    userId: number,
    claims: NormalizedIdentityClaims,
  ): Promise<void> {
    let reason: string | undefined;

    if (claims.emailVerified !== true) {
      reason = 'email_not_verified';
    } else if (user.auth_provider === claims.provider) {
      // Already linked to a different subject of this provider.
      reason = 'already_linked';
    } else if (await this.hasRole(userId, ADMIN_ROLE_NAME)) {
      reason = 'admin_account';
    }

    if (reason) {
      this.logger.warn({
        event: 'identity_link_denied',
        reason,
        userId,
        provider: claims.provider,
      });
      throw new ConflictException(
        'An account with this email already exists and cannot be linked automatically',
      );
    }
  }

  private async hasRole(userId: number, roleName: string): Promise<boolean> {
    const userRolesTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USER_ROLES),
    );
    const assignments = await this.nocoDBService.listAll(userRolesTable.id, {
      where: filterEq('user_id', userId),
      fields: ['role_id'],
    });
    const roleIds = [
      ...new Set(
        assignments
          .map((assignment) => Number(assignment.role_id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    if (roleIds.length === 0) {
      return false;
    }

    const rolesTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.ROLES),
    );
    const role = await this.nocoDBService.findOne(
      rolesTable.id,
      andFilters(filterIn('id', roleIds), filterEq('role_name', roleName)),
    );
    return role !== null;
  }

  private async findBySubject(
    usersTableId: string,
    claims: NormalizedIdentityClaims,
  ): Promise<NocoUserRecord | null> {
    return asUserRecord(
      await this.nocoDBService.findOne(
        usersTableId,
        andFilters(
          filterEq('auth_provider', claims.provider),
          filterEq('external_subject', claims.subject),
        ),
      ),
    );
  }

  private async assignRolesByName(
    userId: number,
    roleNames: string[],
  ): Promise<void> {
    const rolesTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.ROLES),
    );
    const userRolesTable = assertTableRef(
      await this.nocoDBService.getTableByName(SYSTEM_TABLE_NAMES.USER_ROLES),
    );

    for (const roleName of roleNames) {
      const role = await this.nocoDBService.findOne(
        rolesTable.id,
        filterEq('role_name', roleName),
      );
      if (!role?.id) {
        continue;
      }

      const roleId = extractNumericId(role);
      const existing = await this.nocoDBService.findOne(
        userRolesTable.id,
        andFilters(filterEq('user_id', userId), filterEq('role_id', roleId)),
      );

      if (!existing) {
        await this.nocoDBService.create(userRolesTable.id, {
          user_id: userId,
          role_id: roleId,
          assigned_at: new Date().toISOString(),
        });
      }
    }
  }

  private defaultUsername(claims: NormalizedIdentityClaims): string {
    return claims.email?.split('@')[0] ?? `user_${claims.subject}`;
  }

  private toResolvedIdentity(
    record: NocoUserRecord | null,
    tokenRoles: string[],
  ): ResolvedIdentity {
    if (!record) {
      throw new NotFoundException('User payload is missing');
    }

    return {
      userId: extractNumericId(record),
      username: record.username ?? 'unknown',
      email: record.email,
      active: record.is_active !== false,
      roles: tokenRoles,
    };
  }
}
