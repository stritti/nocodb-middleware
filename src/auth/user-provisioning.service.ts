import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { andFilters, filterEq } from '../nocodb/nocodb-filter.util';
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
  NocoTableRef,
} from '../common/utils/nocodb-utils';

@Injectable()
export class UserProvisioningService {
  constructor(private readonly nocoDBService: NocoDBService) {}

  async upsertIdentityUser(
    claims: NormalizedIdentityClaims,
  ): Promise<ResolvedIdentity> {
    const usersTable = assertTableRef(
      await this.nocoDBService.getTableByName('users'),
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
      const existingId = extractNumericId(bySubject);
      const updated = await this.nocoDBService.update(
        usersTable.id,
        existingId,
        {
          email: claims.email ?? bySubject.email,
          username: claims.username ?? bySubject.username,
        },
      );
      return this.toResolvedIdentity(asUserRecord(updated), claims.roles);
    }

    if (byEmail) {
      const existingId = extractNumericId(byEmail);
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
      await this.nocoDBService.getTableByName('users'),
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
      await this.nocoDBService.getTableByName('users'),
    );

    const updated = await this.nocoDBService.update(usersTable.id, userId, {
      is_active: isActive,
    });

    return this.toResolvedIdentity(asUserRecord(updated), []);
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
      await this.nocoDBService.getTableByName('roles'),
    );
    const userRolesTable = assertTableRef(
      await this.nocoDBService.getTableByName('user_roles'),
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
        andFilters(filterEq('user.id', userId), filterEq('role.id', roleId)),
      );

      if (!existing) {
        await this.nocoDBService.create(userRolesTable.id, {
          user: [{ id: userId }],
          role: [{ id: roleId }],
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
