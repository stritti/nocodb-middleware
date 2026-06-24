import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BooksModule } from './books/books.module';
import { AuthorsModule } from './authors/authors.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './shared/auth.module';
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
