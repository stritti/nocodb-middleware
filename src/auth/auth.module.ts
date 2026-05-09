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
import { UserProvisioningController } from './user-provisioning.controller';
import { UserProvisioningService } from './user-provisioning.service';
import { AuthProviderConfigService } from './auth-provider-config.service';
import { IdentityClaimsNormalizerService } from './identity/identity-claims-normalizer.service';
import { LocalNocodbIdentityProviderService } from './identity/local-nocodb-identity-provider.service';
import { ExternalJwtIdentityProviderService } from './identity/external-jwt-identity-provider.service';
import { IDENTITY_PROVIDER } from './identity/identity-provider.constants';
import { NocoDBModule } from '../nocodb/nocodb.module';

@Module({
  imports: [
    ConfigModule,
    NocoDBModule,
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
    AuthProviderConfigService,
    IdentityClaimsNormalizerService,
    LocalNocodbIdentityProviderService,
    ExternalJwtIdentityProviderService,
    {
      provide: IDENTITY_PROVIDER,
      useFactory: (
        authProviderConfig: AuthProviderConfigService,
        localProvider: LocalNocodbIdentityProviderService,
        externalProvider: ExternalJwtIdentityProviderService,
      ) =>
        authProviderConfig.getProvider() === 'external'
          ? externalProvider
          : localProvider,
      inject: [
        AuthProviderConfigService,
        LocalNocodbIdentityProviderService,
        ExternalJwtIdentityProviderService,
      ],
    },
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtModule, UserProvisioningService],
})
export class AuthModule {}
