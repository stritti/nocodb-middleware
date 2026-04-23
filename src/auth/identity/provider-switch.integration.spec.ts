import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IDENTITY_PROVIDER } from './identity-provider.constants';
import { LocalNocodbIdentityProviderService } from './local-nocodb-identity-provider.service';
import { ExternalJwtIdentityProviderService } from './external-jwt-identity-provider.service';
import { UserProvisioningService } from '../user-provisioning.service';

describe('Identity provider switch (integration)', () => {
  const userProvisioningMock = {
    upsertIdentityUser: jest.fn(),
  };

  it('selects local provider when AUTH_PROVIDER=local', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LocalNocodbIdentityProviderService,
        ExternalJwtIdentityProviderService,
        {
          provide: UserProvisioningService,
          useValue: userProvisioningMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string | undefined> = {
                AUTH_PROVIDER: 'local',
              };
              return values[key];
            }),
          },
        },
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
              configService.get<string>('AUTH_PROVIDER')?.toLowerCase() ??
              'local';
            return provider === 'external' ? externalProvider : localProvider;
          },
        },
      ],
    }).compile();

    const provider = moduleRef.get(IDENTITY_PROVIDER);
    expect(provider).toBeInstanceOf(LocalNocodbIdentityProviderService);
  });

  it('selects external provider when AUTH_PROVIDER=external', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        LocalNocodbIdentityProviderService,
        ExternalJwtIdentityProviderService,
        {
          provide: UserProvisioningService,
          useValue: userProvisioningMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string | undefined> = {
                AUTH_PROVIDER: 'external',
              };
              return values[key];
            }),
          },
        },
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
              configService.get<string>('AUTH_PROVIDER')?.toLowerCase() ??
              'local';
            return provider === 'external' ? externalProvider : localProvider;
          },
        },
      ],
    }).compile();

    const provider = moduleRef.get(IDENTITY_PROVIDER);
    expect(provider).toBeInstanceOf(ExternalJwtIdentityProviderService);
  });
});
