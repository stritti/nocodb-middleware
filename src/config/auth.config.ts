import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  provider: (process.env.AUTH_PROVIDER ?? 'local').toLowerCase(),
  jwtSecret: process.env.JWT_SECRET,
  externalJwtSecret: process.env.EXTERNAL_JWT_SECRET,
  externalJwtIssuer: process.env.EXTERNAL_JWT_ISSUER,
  externalJwtAudience: process.env.EXTERNAL_JWT_AUDIENCE,
}));
