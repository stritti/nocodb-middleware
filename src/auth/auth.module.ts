import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { BootstrapAdminController } from './bootstrap-admin.controller';
import { IDENTITY_PROVIDER } from './identity/identity-provider.constants';
import { LocalNocodbIdentityProviderService } from './identity/local-nocodb-identity-provider.service';
import { ExternalJwtIdentityProviderService } from './identity/external-jwt-identity-provider.service';
import { IdentityClaimsNormalizerService } from './identity/identity-claims-normalizer.service';
import { UserProvisioningService } from './user-provisioning.service';
import { UserProvisioningController } from './user-provisioning.controller';
import { AuthProviderConfigService } from './auth-provider-config.service';
import authConfig from '../config/auth.config';

@Module({
  imports: [
    ConfigModule.forFeature(authConfig),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
            '1d') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BootstrapAdminController, UserProvisioningController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    BootstrapAdminService,
    UserProvisioningService,
    LocalNocodbIdentityProviderService,
    ExternalJwtIdentityProviderService,
    IdentityClaimsNormalizerService,
    AuthProviderConfigService,
    {
      provide: IDENTITY_PROVIDER,
      inject: [
        ConfigService,
        LocalNocodbIdentityProviderService,
        ExternalJwtIdentityProviderService,
      ],
      useFactory: (
        configService: ConfigService,
        localProvider: LocalNocodbIdentityProviderService,
        externalProvider: ExternalJwtIdentityProviderService,
      ) => {
        const provider =
          configService.get<string>('AUTH_PROVIDER')?.toLowerCase() ?? 'local';
        return provider === 'external' ? externalProvider : localProvider;
      },
    },
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
