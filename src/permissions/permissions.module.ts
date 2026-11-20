import { Module } from '@nestjs/common';
import { PermissionsCoreModule } from './permissions-core.module';
import { PermissionsManagementService } from './permissions-management.service';
import { PermissionsManagementController } from './permissions-management.controller';
import { PermissionsGuard } from './permissions.guard';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { NocoDBModule } from '../nocodb/nocodb.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [NocoDBModule, AuthModule, PermissionsCoreModule],
  providers: [
    PermissionsManagementService,
    PermissionsGuard,
    RolesService,
    UserRolesService,
  ],
  controllers: [PermissionsManagementController],
  exports: [PermissionsCoreModule, PermissionsGuard],
})
export class PermissionsModule {}
