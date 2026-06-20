import { Logger } from '@nestjs/common';

export interface CorsValidationResult {
  origins: string[];
  valid: boolean;
  warnings: string[];
  errors: string[];
}

/**
 * Parses and validates the CORS_ORIGINS environment variable.
 *
 * - Splits comma-separated origins
 * - Trims whitespace
 * - Filters empty entries
 * - Returns warnings and errors for misconfiguration
 * - Throws in production if wildcard '*' is used
 */
export function parseAndValidateCorsOrigins(
  corsOriginsRaw: string | undefined,
  isProduction: boolean,
): CorsValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const origins = (corsOriginsRaw ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    warnings.push(
      'CORS_ORIGINS is empty or not set. CORS will be disabled (no cross-origin requests allowed).',
    );
  } else {
    for (const origin of origins) {
      if (origin === '*') {
        if (isProduction) {
          errors.push(
            'CORS_ORIGINS contains wildcard "*" which is NOT allowed in production. Please set explicit origins.',
          );
        } else {
          warnings.push(
            'CORS_ORIGINS contains wildcard "*". This allows ALL origins and should NOT be used in production.',
          );
        }
      }
      if (isProduction && origin.includes('localhost')) {
        warnings.push(
          `CORS_ORIGINS contains "${origin}" — localhost origins should not be used in production.`,
        );
      }
    }
  }

  return {
    origins,
    valid: warnings.length === 0 && errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Logs CORS configuration warnings and errors at application startup.
 * Throws an error in production if critical misconfigurations are found.
 * Call this during bootstrap after parsing CORS origins.
 */
export function logCorsWarnings(
  result: CorsValidationResult,
  logger: Logger,
): void {
  if (result.origins.length > 0) {
    logger.log(`CORS origins: ${result.origins.join(', ')}`);
  } else {
    logger.warn('CORS is disabled (no origins configured)');
  }

  if (result.errors.length > 0) {
    for (const error of result.errors) {
      logger.error(`CORS: ${error}`);
    }
    // In production, throw to prevent startup with insecure config
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CORS configuration error in production: ' + result.errors.join('; '),
      );
    }
  }

  if (result.warnings.length > 0) {
    for (const warning of result.warnings) {
      logger.warn(`CORS: ${warning}`);
    }
  }
}
