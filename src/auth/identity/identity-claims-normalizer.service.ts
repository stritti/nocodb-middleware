import { Injectable, UnauthorizedException } from '@nestjs/common';
import { NormalizedIdentityClaims } from './identity-provider.port';

interface TokenPayload {
  sub?: unknown;
  email?: unknown;
  username?: unknown;
  preferred_username?: unknown;
  roles?: unknown;
  role?: unknown;
  scope?: unknown;
  scp?: unknown;
}

@Injectable()
export class IdentityClaimsNormalizerService {
  normalize(
    payload: TokenPayload,
    provider: 'local' | 'external',
  ): NormalizedIdentityClaims {
    const subject = this.coerceString(payload.sub);

    if (!subject) {
      throw new UnauthorizedException('Token payload is missing sub claim');
    }

    const username =
      this.coerceString(payload.preferred_username) ??
      this.coerceString(payload.username);

    return {
      subject,
      provider,
      email: this.coerceString(payload.email),
      username,
      roles: this.parseRoles(payload.roles ?? payload.role),
      scope: this.parseScope(payload.scope ?? payload.scp),
    };
  }

  private coerceString(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized.length > 0 ? normalized : undefined;
    }

    if (typeof value === 'number') {
      return String(value);
    }

    return undefined;
  }

  private parseRoles(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);
    }

    if (typeof value === 'string') {
      return value
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    return [];
  }

  private parseScope(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0);
    }

    if (typeof value === 'string') {
      return value
        .split(/\s+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
    }

    return [];
  }
}
