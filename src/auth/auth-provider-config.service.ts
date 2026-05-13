import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthProviderConfigService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const provider = this.getProvider();

    if (provider === 'local') {
      if (!this.configService.get<string>('JWT_SECRET')) {
        throw new Error('JWT_SECRET is required when AUTH_PROVIDER=local');
      }
      return;
    }

    if (!this.configService.get<string>('EXTERNAL_JWT_SECRET')) {
      throw new Error(
        'EXTERNAL_JWT_SECRET is required when AUTH_PROVIDER=external',
      );
    }

    if (!this.configService.get<string>('EXTERNAL_JWT_ISSUER')) {
      throw new Error(
        'EXTERNAL_JWT_ISSUER is required when AUTH_PROVIDER=external',
      );
    }

    if (!this.configService.get<string>('EXTERNAL_JWT_AUDIENCE')) {
      throw new Error(
        'EXTERNAL_JWT_AUDIENCE is required when AUTH_PROVIDER=external',
      );
    }
  }

  getProvider(): 'local' | 'external' {
    const configured =
      this.configService.get<string>('AUTH_PROVIDER')?.toLowerCase() ?? 'local';

    if (configured !== 'local' && configured !== 'external') {
      throw new Error('AUTH_PROVIDER must be either "local" or "external"');
    }

    return configured;
  }
}
