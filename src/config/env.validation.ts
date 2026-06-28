import { plainToInstance } from 'class-transformer';
import { IsString, IsUrl, IsOptional, IsNumber, validateSync } from 'class-validator';

export class EnvironmentVariables {
  @IsUrl({ require_tld: false })
  @IsOptional()
  NOCODB_API_URL?: string;

  @IsString()
  @IsOptional()
  NOCODB_API_TOKEN?: string;

  @IsString()
  @IsOptional()
  NOCODB_BASE_ID?: string;

  @IsString()
  @IsOptional()
  NOCODB_TABLE_PREFIX?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN?: string;

  @IsString()
  @IsOptional()
  AUTH_PROVIDER?: string;

  @IsString()
  @IsOptional()
  EXTERNAL_JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  EXTERNAL_JWT_ISSUER?: string;

  @IsString()
  @IsOptional()
  EXTERNAL_JWT_AUDIENCE?: string;

  @IsString()
  @IsOptional()
  BOOTSTRAP_ADMIN_TOKEN?: string;

  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string;

  @IsString()
  @IsOptional()
  OTEL_ENABLED?: string;

  @IsNumber()
  @IsOptional()
  NOCODB_RETRY_COUNT?: number;

  @IsNumber()
  @IsOptional()
  NOCODB_RETRY_BASE_DELAY?: number;

  @IsNumber()
  @IsOptional()
  NOCODB_RETRY_MAX_DELAY?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  });
  if (errors.length > 0) {
    const messages = errors.map(
      (err) => `${err.property}: ${Object.values(err.constraints ?? {}).join(', ')}`
    );
    throw new Error(`Environment validation failed:\n${messages.join('\n')}`);
  }
  return validatedConfig;
}
