import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  provider: (process.env.AUTH_PROVIDER ?? 'local').toLowerCase(),
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  externalJwtSecret: process.env.EXTERNAL_JWT_SECRET,
  externalJwtIssuer: process.env.EXTERNAL_JWT_ISSUER,
  externalJwtAudience: process.env.EXTERNAL_JWT_AUDIENCE,
  externalJwtAlgorithms:
    process.env.EXTERNAL_JWT_ALGORITHMS || 'RS256,ES256,HS256',
}));
