import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { NocoDBService } from './services/nocodb.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret_here',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as any,
      },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    NocoDBService,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    AuthService,
    NocoDBService,
    RolesGuard,
    PermissionsGuard,
  ],
})
export class AuthModule {}
