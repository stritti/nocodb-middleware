# NestJS Production Service with Authentication - AI Agent Instructions

## Übersicht

Du bist ein erfahrener NestJS-Entwickler, der produktionsreife, sichere und skalierbare Backend-Services mit modernen Authentifizierungs- und Autorisierungsmechanismen entwickelt. Diese Anleitung enthält Best Practices und bewährte Patterns für Enterprise-Grade NestJS-Anwendungen.

## Grundprinzipien

### Architektur
- **Modulare Struktur**: Strikte Trennung in Module (Auth, Users, Resources, etc.)
- **Dependency Injection**: Vollständige Nutzung des NestJS DI-Systems
- **SOLID-Prinzipien**: Saubere Architektur mit klaren Verantwortlichkeiten
- **Single Responsibility**: Jeder Service hat genau eine Aufgabe
- **Repository Pattern**: Trennung von Business-Logik und Datenzugriff

### Code-Qualität
- **TypeScript strict mode**: Immer aktiviert für maximale Typsicherheit
- **DTOs für alle Inputs**: Validierung mit `class-validator` und `class-transformer`
- **Swagger/OpenAPI**: Vollständige API-Dokumentation
- **Unit & E2E Tests**: Mindestens 80% Code Coverage
- **ESLint & Prettier**: Konsistenter Code-Stil

## Projekt-Setup

### Initiale Installation

```bash
# NestJS CLI installieren
npm i -g @nestjs/cli

# Neues Projekt erstellen
nest new project-name

# Core Dependencies installieren
npm install --save @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt passport-local bcrypt class-validator class-transformer

# Security Dependencies
npm install --save @nestjs/throttler helmet

# Dev Dependencies
npm install --save-dev @types/passport-jwt @types/passport-local @types/bcrypt
```

### Environment Configuration

```typescript
// src/config/config.ts
export const config = () => ({
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  
  // JWT Configuration
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET,
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  
  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.THROTTLE_TTL, 10) || 60000,
    limit: parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
});
```

```env
# .env (NIEMALS in Git committen!)
NODE_ENV=production
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=myuser
DB_PASSWORD=super-secure-password
DB_NAME=mydatabase

# JWT Secrets (WICHTIG: Generiere starke, zufällige Secrets!)
JWT_ACCESS_SECRET=your-very-strong-access-secret-min-256-bits
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-very-strong-refresh-secret-min-256-bits
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=10

# CORS
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

## Authentifizierungs-Architektur

### Module-Struktur

```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessTokenSecret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

### User Entity

```typescript
// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ unique: true })
  @Index()
  username: string;

  @Column()
  @Exclude() // Niemals im Response zurückgeben
  password: string;

  @Column({ 
    type: 'enum', 
    enum: UserRole, 
    default: UserRole.USER 
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  @Exclude()
  refreshToken?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### DTOs (Data Transfer Objects)

```typescript
// src/auth/dto/signup.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail({}, { message: 'Ungültige E-Mail-Adresse' })
  email: string;

  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @MinLength(3, { message: 'Username muss mindestens 3 Zeichen lang sein' })
  @MaxLength(20, { message: 'Username darf maximal 20 Zeichen lang sein' })
  username: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  @IsString()
  @MinLength(8, { message: 'Passwort muss mindestens 8 Zeichen lang sein' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Passwort muss Groß- und Kleinbuchstaben, Zahlen und Sonderzeichen enthalten' }
  )
  password: string;
}

// src/auth/dto/signin.dto.ts
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsString()
  identifier: string; // Email oder Username

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  @IsString()
  password: string;
}
```

### Auth Service mit Refresh Token

```typescript
// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<AuthTokens> {
    // Prüfen ob User bereits existiert
    const existingUser = await this.usersService.findByEmailOrUsername(
      signUpDto.email,
      signUpDto.username,
    );

    if (existingUser) {
      throw new ConflictException('Email oder Username bereits vergeben');
    }

    // Passwort hashen
    const hashedPassword = await this.hashPassword(signUpDto.password);

    // User erstellen
    const user = await this.usersService.create({
      ...signUpDto,
      password: hashedPassword,
    });

    // Tokens generieren
    const tokens = await this.generateTokens(user);
    
    // Refresh Token hashen und speichern
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async signIn(signInDto: SignInDto): Promise<AuthTokens> {
    // User finden (per Email oder Username)
    const user = await this.usersService.findByEmailOrUsername(
      signInDto.identifier,
      signInDto.identifier,
    );

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    // Passwort prüfen
    const isPasswordValid = await bcrypt.compare(
      signInDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }

    // Last login aktualisieren
    await this.usersService.updateLastLogin(user.id);

    // Tokens generieren
    const tokens = await this.generateTokens(user);
    
    // Refresh Token hashen und speichern
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<AuthTokens> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Zugriff verweigert');
    }

    // Refresh Token prüfen
    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Zugriff verweigert');
    }

    // Neue Tokens generieren
    const tokens = await this.generateTokens(user);
    
    // Neuen Refresh Token speichern
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.removeRefreshToken(userId);
  }

  private async generateTokens(user: any): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessTokenSecret'),
        expiresIn: this.configService.get<string>('jwt.accessTokenExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshTokenSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshTokenExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hashedRefreshToken = await this.hashPassword(refreshToken);
    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
  }

  private async hashPassword(password: string): Promise<string> {
    const rounds = this.configService.get<number>('bcryptRounds');
    return bcrypt.hash(password, rounds);
  }

  async validateUser(identifier: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmailOrUsername(identifier, identifier);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    
    return null;
  }
}
```

### Passport Strategies

```typescript
// src/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'identifier', // Akzeptiere Email oder Username
      passwordField: 'password',
    });
  }

  async validate(identifier: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(identifier, password);
    
    if (!user) {
      throw new UnauthorizedException('Ungültige Anmeldedaten');
    }
    
    return user;
  }
}

// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessTokenSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Benutzer nicht gefunden oder deaktiviert');
    }
    
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}

// src/auth/strategies/jwt-refresh.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.refreshTokenSecret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.get('Authorization')?.replace('Bearer', '').trim();
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh Token fehlt');
    }
    
    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
      refreshToken,
    };
  }
}
```

### Guards für Authorization

```typescript
// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }
}

// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('Zugriff verweigert');
    }
    
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException('Unzureichende Berechtigungen');
    }
    
    return true;
  }
}
```

### Decorators

```typescript
// src/common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    return data ? user?.[data] : user;
  },
);
```

### Auth Controller

```typescript
// src/auth/auth.controller.ts
import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UseGuards,
  Get,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/signup.dto';
import { SignInDto } from './dto/signin.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Neuen Benutzer registrieren' })
  @ApiResponse({ status: 201, description: 'Benutzer erfolgreich registriert' })
  @ApiResponse({ status: 409, description: 'Email oder Username bereits vergeben' })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Public()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Benutzer anmelden' })
  @ApiResponse({ status: 200, description: 'Erfolgreich angemeldet' })
  @ApiResponse({ status: 401, description: 'Ungültige Anmeldedaten' })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Access Token erneuern' })
  @ApiResponse({ status: 200, description: 'Token erfolgreich erneuert' })
  @ApiResponse({ status: 401, description: 'Ungültiger Refresh Token' })
  async refreshTokens(@CurrentUser() user: any) {
    return this.authService.refreshTokens(user.userId, user.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Benutzer abmelden' })
  @ApiResponse({ status: 200, description: 'Erfolgreich abgemeldet' })
  async logout(@CurrentUser('userId') userId: string) {
    await this.authService.logout(userId);
    return { message: 'Erfolgreich abgemeldet' };
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktuelles Benutzerprofil abrufen' })
  @ApiResponse({ status: 200, description: 'Profil erfolgreich abgerufen' })
  getProfile(@CurrentUser() user: any) {
    return user;
  }
}
```

## Security Best Practices

### Main.ts Configuration

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  
  // CORS Configuration
  const corsOrigins = configService.get<string[]>('cors.origins');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });
  
  // Global Prefix
  app.setGlobalPrefix('api');
  
  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  
  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Entfernt Properties, die nicht im DTO sind
      forbidNonWhitelisted: true, // Wirft Fehler bei unbekannten Properties
      transform: true, // Transformiert Payloads zu DTO-Instanzen
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  // Swagger Documentation (nur in Development)
  if (configService.get('nodeEnv') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('NestJS API with Authentication')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication')
      .addTag('Users')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }
  
  const port = configService.get<number>('port');
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
```

### Rate Limiting

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { config } from './config/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    
    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'short',
          ttl: 1000,
          limit: 3,
        },
        {
          name: 'medium',
          ttl: 10000,
          limit: 20,
        },
        {
          name: 'long',
          ttl: configService.get<number>('rateLimit.ttl'),
          limit: configService.get<number>('rateLimit.limit'),
        },
      ],
      inject: [ConfigService],
    }),
    
    // Feature Modules
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Global Guards
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // JWT Auth ist default für alle Routes
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Role-based Access Control
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Rate Limiting
    },
  ],
})
export class AppModule {}
```

### Custom Rate Limiting für spezifische Endpoints

```typescript
// src/auth/auth.controller.ts
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  // Strenges Rate Limiting für Login (3 Versuche pro Sekunde)
  @Throttle({ short: { ttl: 1000, limit: 3 } })
  @Post('signin')
  async signIn(@Body() signInDto: SignInDto) {
    // ...
  }
  
  // Kein Rate Limiting für Token Refresh
  @SkipThrottle()
  @Post('refresh')
  async refreshTokens(@CurrentUser() user: any) {
    // ...
  }
}
```

## Production Deployment Checklist

### ✅ Environment Variables
- [ ] Alle Secrets aus dem Code entfernt
- [ ] Starke, zufällige JWT Secrets generiert (min. 256 Bit)
- [ ] `.env` Dateien in `.gitignore`
- [ ] Secrets Manager verwenden (AWS Secrets Manager, Azure Key Vault, etc.)
- [ ] Separate Konfiguration für dev/staging/production

### ✅ Security
- [ ] Helmet middleware aktiviert
- [ ] CORS richtig konfiguriert (nur vertrauenswürdige Origins)
- [ ] Rate Limiting implementiert
- [ ] Input Validation auf allen Endpoints
- [ ] SQL Injection Protection (ORM verwenden)
- [ ] XSS Protection (Sanitize inputs)
- [ ] HTTPS erzwingen (niemals HTTP in Production)
- [ ] Security Headers gesetzt
- [ ] CSRF Protection für Web-Frontends

### ✅ Authentication
- [ ] Starke Passwort-Policies (min. 8 Zeichen, Komplexität)
- [ ] Bcrypt mit mindestens 12 Rounds
- [ ] JWT mit kurzen Ablaufzeiten (Access Token: 15min)
- [ ] Refresh Token Pattern implementiert
- [ ] Refresh Tokens gehashed in DB gespeichert
- [ ] Logout invalidiert Refresh Tokens
- [ ] Account Lockout nach fehlgeschlagenen Login-Versuchen

### ✅ Database
- [ ] Connection Pooling konfiguriert
- [ ] Indizes auf häufig abgefragte Felder
- [ ] Migrations für Schema-Änderungen
- [ ] Regelmäßige Backups
- [ ] SSL-Verbindung zur Datenbank

### ✅ Logging & Monitoring
- [ ] Strukturiertes Logging (Winston, Pino)
- [ ] Error Tracking (Sentry, Rollbar)
- [ ] Performance Monitoring (New Relic, DataDog)
- [ ] Health Checks implementiert
- [ ] Alerts für kritische Fehler

### ✅ Performance
- [ ] Response Caching wo sinnvoll
- [ ] Database Query Optimization
- [ ] Kompression aktiviert (gzip/brotli)
- [ ] Load Balancing bei hoher Last
- [ ] Horizontal Scaling vorbereitet

### ✅ Testing
- [ ] Unit Tests für Services (min. 80% Coverage)
- [ ] Integration Tests für kritische Flows
- [ ] E2E Tests für wichtige User Journeys
- [ ] Security Tests (OWASP)

### ✅ CI/CD
- [ ] Automatisierte Tests in Pipeline
- [ ] Automatische Deployments
- [ ] Rollback-Strategie definiert
- [ ] Blue-Green oder Canary Deployments

## Beispiel: Protected Resource Controller

```typescript
// src/posts/posts.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Posts')
@ApiBearerAuth()
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Alle Posts abrufen (öffentlich)' })
  findAll() {
    return this.postsService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Einzelnen Post abrufen (öffentlich)' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Neuen Post erstellen (authentifiziert)' })
  @ApiResponse({ status: 201, description: 'Post erfolgreich erstellt' })
  @ApiResponse({ status: 401, description: 'Nicht authentifiziert' })
  create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.postsService.create(createPostDto, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Post aktualisieren (Owner oder Admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') userRole: UserRole,
  ) {
    return this.postsService.update(id, updatePostDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Post löschen (nur Admin/Moderator)' })
  @ApiResponse({ status: 200, description: 'Post erfolgreich gelöscht' })
  @ApiResponse({ status: 403, description: 'Unzureichende Berechtigungen' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.postsService.remove(id);
  }
}
```

## Error Handling

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Log error
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : 'Unknown error',
    );

    // Response senden
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
    });
  }
}

// In main.ts registrieren:
app.useGlobalFilters(new AllExceptionsFilter());
```

## Testing

```typescript
// src/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmailOrUsername: jest.fn(),
    create: jest.fn(),
    updateRefreshToken: jest.fn(),
    updateLastLogin: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'bcryptRounds': 12,
        'jwt.accessTokenSecret': 'test-access-secret',
        'jwt.accessTokenExpiresIn': '15m',
        'jwt.refreshTokenSecret': 'test-refresh-secret',
        'jwt.refreshTokenExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'Password123!',
    };

    it('should successfully register a new user', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: '1',
        ...signUpDto,
        password: 'hashed-password',
        role: 'user',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.signUp(signUpDto);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if user exists', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValue({
        id: '1',
        email: signUpDto.email,
      });

      await expect(service.signUp(signUpDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('signIn', () => {
    const signInDto = {
      identifier: 'test@example.com',
      password: 'Password123!',
    };

    it('should successfully sign in a user', async () => {
      const hashedPassword = await bcrypt.hash(signInDto.password, 12);
      mockUsersService.findByEmailOrUsername.mockResolvedValue({
        id: '1',
        email: signInDto.identifier,
        password: hashedPassword,
        isActive: true,
        role: 'user',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.signIn(signInDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockUsersService.findByEmailOrUsername.mockResolvedValue(null);

      await expect(service.signIn(signInDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

## Wichtige NPM Scripts

```json
{
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "typeorm": "typeorm-ts-node-commonjs",
    "migration:generate": "npm run typeorm -- migration:generate -d src/config/typeorm.config.ts",
    "migration:run": "npm run typeorm -- migration:run -d src/config/typeorm.config.ts",
    "migration:revert": "npm run typeorm -- migration:revert -d src/config/typeorm.config.ts"
  }
}
```

## Zusammenfassung: Key Takeaways

### 🔐 Authentifizierung
- JWT mit Access & Refresh Token Pattern
- Bcrypt für Passwort-Hashing (min. 12 Rounds)
- Passport.js Strategien (Local, JWT, JWT-Refresh)
- Sichere Token-Speicherung (gehashed)

### 🛡️ Security
- Helmet für HTTP Security Headers
- CORS korrekt konfiguriert
- Rate Limiting auf allen Endpoints
- Input Validation mit class-validator
- HTTPS in Production erzwingen

### 🏗️ Architektur
- Modulare Struktur
- Guards für Authentication & Authorization
- Decorators für Clean Code (@Public, @Roles, @CurrentUser)
- DTOs für alle Inputs/Outputs
- Repository Pattern

### 🚀 Production-Ready
- Environment-spezifische Konfiguration
- Logging & Monitoring
- Error Handling
- Health Checks
- Comprehensive Testing

### 📋 Checkliste befolgen
Arbeite systematisch die Deployment Checklist ab, bevor du in Production gehst. Security ist kein Zusatz-Feature, sondern muss von Anfang an eingebaut sein.
