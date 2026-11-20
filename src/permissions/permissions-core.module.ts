import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

/**
 * Provides the single {@link PermissionsService} instance (and its cache).
 *
 * Kept separate from {@link PermissionsModule} so the auth layer can resolve a
 * user's roles from NocoDB without a circular import (PermissionsModule
 * imports AuthModule for the admin controller).
 */
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsCoreModule {}
