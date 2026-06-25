import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BooksModule } from './books/books.module';
import { AuthorsModule } from './authors/authors.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './shared/auth.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { RolesGuard } from './shared/guards/roles.guard';
import { PermissionsGuard } from './shared/guards/permissions.guard';

@Module({
  imports: [
    AuthModule,
    BooksModule,
    AuthorsModule,
    UsersModule,
  ],
  providers: [
    // Global JWT auth guard — runs first to validate token and populate request.user
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global guards for role and permission checking
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
