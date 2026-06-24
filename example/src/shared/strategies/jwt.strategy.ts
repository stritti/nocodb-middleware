import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { JwtPayload } from '../interfaces/user.interface';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your_jwt_secret_here',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // In a real application, you might want to verify the user exists in the database
    // For this example, we'll just return the payload
    return {
      sub: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
  }
}
