import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  provider: (process.env.AUTH_PROVIDER ?? 'local').toLowerCase(),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  externalJwtSecret: process.env.EXTERNAL_JWT_SECRET,
  externalJwtIssuer: process.env.EXTERNAL_JWT_ISSUER,
  externalJwtAudience: process.env.EXTERNAL_JWT_AUDIENCE,
  jwtIssuer: process.env.JWT_ISSUER,
  jwtAudience: process.env.JWT_AUDIENCE,
  // Unset: derived from EXTERNAL_JWT_SECRET (see resolveExternalJwtAlgorithms)
  externalJwtAlgorithms: process.env.EXTERNAL_JWT_ALGORITHMS,
}));
