import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IDENTITY_PROVIDER } from '../identity/identity-provider.constants';
import { IdentityProviderPort } from '../identity/identity-provider.port';
import { IdentityClaimsNormalizerService } from '../identity/identity-claims-normalizer.service';
import { AuthProviderConfigService } from '../auth-provider-config.service';

type JwtPayload = Record<string, unknown>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly provider: 'local' | 'external';

  constructor(
    configService: ConfigService,
    authProviderConfigService: AuthProviderConfigService,
    private readonly claimsNormalizer: IdentityClaimsNormalizerService,
    @Inject(IDENTITY_PROVIDER)
    private readonly identityProvider: IdentityProviderPort,
  ) {
    const provider = authProviderConfigService.getProvider();
    const secretKeyName =
      provider === 'external' ? 'EXTERNAL_JWT_SECRET' : 'JWT_SECRET';
    const secret = configService.get<string>(secretKeyName);

    if (!secret) {
      throw new Error(`${secretKeyName} is required`);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      issuer:
        provider === 'external'
          ? configService.get<string>('EXTERNAL_JWT_ISSUER')
          : undefined,
      audience:
        provider === 'external'
          ? configService.get<string>('EXTERNAL_JWT_AUDIENCE')
          : undefined,
    });

    this.provider = provider;
  }

  async validate(payload: JwtPayload) {
    const normalizedClaims = this.claimsNormalizer.normalize(
      payload,
      this.provider,
    );

    const identity =
      await this.identityProvider.resolveIdentity(normalizedClaims);

    if (!identity.active) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      userId: identity.userId,
      username: identity.username,
      email: identity.email,
      roles: identity.roles,
      scope: normalizedClaims.scope,
      subject: normalizedClaims.subject,
      authProvider: normalizedClaims.provider,
    };
  }
}
