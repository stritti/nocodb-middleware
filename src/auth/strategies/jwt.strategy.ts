import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdentityClaimsNormalizerService } from '../identity/identity-claims-normalizer.service';
import { IdentityProviderPort } from '../identity/identity-provider.port';
import { IDENTITY_PROVIDER } from '../identity/identity-provider.constants';
import { AuthProviderConfigService } from '../auth-provider-config.service';
import { NocoDBService } from '../../nocodb/nocodb.service';

interface JwtPayload {
  sub?: string | number;
  username?: string;
  preferred_username?: string;
  email?: string;
  roles?: string[] | string;
  role?: string[] | string;
  scope?: string[] | string;
  scp?: string[] | string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authProviderConfig: AuthProviderConfigService,
    private readonly claimsNormalizer: IdentityClaimsNormalizerService,
    @Inject(IDENTITY_PROVIDER)
    private readonly identityProvider: IdentityProviderPort,
    private readonly nocoDBService: NocoDBService,
  ) {
    const provider = authProviderConfig.getProvider();
    const jwtSecret =
      provider === 'external'
        ? configService.get<string>('EXTERNAL_JWT_SECRET')
        : configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      algorithms: ['HS256'],
      issuer:
        provider === 'external'
          ? configService.get<string>('EXTERNAL_JWT_ISSUER')
          : undefined,
      audience:
        provider === 'external'
          ? configService.get<string>('EXTERNAL_JWT_AUDIENCE')
          : undefined,
    });
  }

  async validate(payload: JwtPayload) {
    const provider = this.authProviderConfig.getProvider();
    const claims = this.claimsNormalizer.normalize(payload, provider);

    if (provider === 'local') {
      const userId = Number(claims.subject);

      if (!Number.isInteger(userId) || userId <= 0) {
        throw new UnauthorizedException('Token payload contains invalid sub');
      }

      const usersTable = await this.nocoDBService.getTableByName('users');
      if (!usersTable) {
        throw new UnauthorizedException('Users table is unavailable');
      }

      const user = await this.nocoDBService.read(usersTable.id, userId);
      if (!user || user.is_active === false) {
        throw new UnauthorizedException('User is inactive or missing');
      }

      return {
        userId,
        username: user.username ?? claims.username ?? 'unknown',
        email: user.email ?? claims.email,
        roles: claims.roles,
      };
    }

    const identity = await this.identityProvider.resolveIdentity(claims);

    if (!identity.active) {
      throw new UnauthorizedException('User is inactive');
    }

    return {
      userId: identity.userId,
      username: identity.username,
      email: identity.email,
      roles: identity.roles,
    };
  }
}
