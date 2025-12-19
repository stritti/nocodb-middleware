import {
    Controller,
    Post,
    Get,
    Delete,
    Body,
    Param,
    ParseIntPipe,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PermissionsManagementService } from './permissions-management.service';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { CreateRoleDto } from '../roles/dto/create-role.dto';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import { AssignRoleDto, AssignMultipleRolesDto } from '../users/dto/assign-role.dto';
import { PermissionsGuard } from './permissions.guard';
import { RequireCreate, RequireRead, RequireDelete } from './permissions.decorator';

@Controller('admin/permissions')
@UseGuards(PermissionsGuard)
export class PermissionsManagementController {
    constructor(
        private permissionsManagement: PermissionsManagementService,
        private rolesService: RolesService,
        private userRolesService: UserRolesService,
    ) { }

    // ========== Roles Management ==========

    @Post('roles')
    @RequireCreate('roles')
    @HttpCode(HttpStatus.CREATED)
    async createRole(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.createRole(createRoleDto);
    }

    @Get('roles')
    @RequireRead('roles')
    async getAllRoles() {
        return this.rolesService.getAllRoles();
    }

    @Delete('roles/:roleId')
    @RequireDelete('roles')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRole(@Param('roleId', ParseIntPipe) roleId: number) {
        await this.rolesService.deleteRole(roleId);
    }

    // ========== Table Permissions Management ==========

    @Post('table-permissions')
    @RequireCreate('table_permissions')
    async setTablePermissions(@Body() dto: SetTablePermissionsDto) {
        return this.permissionsManagement.setTablePermissions(dto);
    }

    @Post('table-permissions/batch')
    @RequireCreate('table_permissions')
    async batchSetPermissions(@Body() dto: BatchSetPermissionsDto) {
        return this.permissionsManagement.batchSetPermissions(dto);
    }

    @Get('roles/:roleId/permissions')
    @RequireRead('table_permissions')
    async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
        return this.permissionsManagement.getRolePermissions(roleId);
    }

    @Delete('roles/:roleId/permissions')
    @RequireDelete('table_permissions')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
        await this.permissionsManagement.deleteRolePermissions(roleId);
    }

    @Post('roles/:sourceRoleId/copy-to/:targetRoleId')
    @RequireCreate('table_permissions')
    async copyPermissions(
        @Param('sourceRoleId', ParseIntPipe) sourceRoleId: number,
        @Param('targetRoleId', ParseIntPipe) targetRoleId: number,
    ) {
        return this.permissionsManagement.copyPermissions(sourceRoleId, targetRoleId);
    }

    // ========== User Roles Assignment ==========

    @Post('user-roles/assign')
    @RequireCreate('user_roles')
    async assignRole(@Body() dto: AssignRoleDto) {
        return this.userRolesService.assignRole(dto);
    }

    @Post('user-roles/assign-multiple')
    @RequireCreate('user_roles')
    async assignMultipleRoles(@Body() dto: AssignMultipleRolesDto) {
        return this.userRolesService.assignMultipleRoles(dto);
    }

    @Delete('user-roles/users/:userId/roles/:roleId')
    @RequireDelete('user_roles')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeRole(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('roleId', ParseIntPipe) roleId: number,
    ) {
        await this.userRolesService.removeRole(userId, roleId);
    }

    @Get('users/:userId/roles')
    @RequireRead('user_roles')
    async getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
        return this.userRolesService.getUserRoles(userId);
    }
}
