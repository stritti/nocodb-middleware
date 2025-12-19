import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsManagementService } from './permissions-management.service';
import { PermissionsManagementController } from './permissions-management.controller';
import { PermissionsGuard } from './permissions.guard';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { NocoDBModule } from '../nocodb/nocodb.module';

@Module({
    imports: [NocoDBModule],
    providers: [
        PermissionsService,
        PermissionsManagementService,
        PermissionsGuard,
        RolesService,
        UserRolesService,
    ],
    controllers: [PermissionsManagementController],
    exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule { }
