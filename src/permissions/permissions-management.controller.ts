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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PermissionsManagementService } from './permissions-management.service';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { CreateRoleDto } from '../roles/dto/create-role.dto';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import {
  AssignRoleDto,
  AssignMultipleRolesDto,
} from '../users/dto/assign-role.dto';
import { PermissionsGuard } from './permissions.guard';
import {
  RequireCreate,
  RequireRead,
  RequireDelete,
} from './permissions.decorator';

@ApiTags('admin / permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
@UseGuards(PermissionsGuard)
export class PermissionsManagementController {
  constructor(
    private permissionsManagement: PermissionsManagementService,
    private rolesService: RolesService,
    private userRolesService: UserRolesService,
  ) {}

  // ========== Roles Management ==========

  @Post('roles')
  @RequireCreate('roles')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get('roles')
  @RequireRead('roles')
  @ApiOperation({ summary: 'List all roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async getAllRoles() {
    return this.rolesService.getAllRoles();
  }

  @Delete('roles/:roleId')
  @RequireDelete('roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role by ID' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async deleteRole(@Param('roleId', ParseIntPipe) roleId: number) {
    await this.rolesService.deleteRole(roleId);
  }

  // ========== Table Permissions Management ==========

  @Post('table-permissions')
  @RequireCreate('table_permissions')
  @ApiOperation({ summary: 'Set permissions for a role on a table' })
  @ApiResponse({ status: 201, description: 'Permissions set successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async setTablePermissions(@Body() dto: SetTablePermissionsDto) {
    return this.permissionsManagement.setTablePermissions(dto);
  }

  @Post('table-permissions/batch')
  @RequireCreate('table_permissions')
  @ApiOperation({
    summary: 'Batch-set permissions for a role across multiple tables',
  })
  @ApiResponse({ status: 201, description: 'Permissions set successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async batchSetPermissions(@Body() dto: BatchSetPermissionsDto) {
    return this.permissionsManagement.batchSetPermissions(dto);
  }

  @Get('roles/:roleId/permissions')
  @RequireRead('table_permissions')
  @ApiOperation({ summary: 'Get all table permissions for a role' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({ status: 200, description: 'List of table permissions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.permissionsManagement.getRolePermissions(roleId);
  }

  @Delete('roles/:roleId/permissions')
  @RequireDelete('table_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete all table permissions for a role' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Permissions deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async deleteRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    await this.permissionsManagement.deleteRolePermissions(roleId);
  }

  @Post('roles/:sourceRoleId/copy-to/:targetRoleId')
  @RequireCreate('table_permissions')
  @ApiOperation({ summary: 'Copy all permissions from one role to another' })
  @ApiParam({
    name: 'sourceRoleId',
    type: Number,
    description: 'Source role ID',
  })
  @ApiParam({
    name: 'targetRoleId',
    type: Number,
    description: 'Target role ID',
  })
  @ApiResponse({ status: 201, description: 'Permissions copied successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async copyPermissions(
    @Param('sourceRoleId', ParseIntPipe) sourceRoleId: number,
    @Param('targetRoleId', ParseIntPipe) targetRoleId: number,
  ) {
    return this.permissionsManagement.copyPermissions(
      sourceRoleId,
      targetRoleId,
    );
  }

  // ========== User Roles Assignment ==========

  @Post('user-roles/assign')
  @RequireCreate('user_roles')
  @ApiOperation({ summary: 'Assign a single role to a user' })
  @ApiResponse({ status: 201, description: 'Role assigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async assignRole(@Body() dto: AssignRoleDto) {
    return this.userRolesService.assignRole(dto);
  }

  @Post('user-roles/assign-multiple')
  @RequireCreate('user_roles')
  @ApiOperation({ summary: 'Assign multiple roles to a user' })
  @ApiResponse({ status: 201, description: 'Roles assigned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async assignMultipleRoles(@Body() dto: AssignMultipleRolesDto) {
    return this.userRolesService.assignMultipleRoles(dto);
  }

  @Delete('user-roles/users/:userId/roles/:roleId')
  @RequireDelete('user_roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiParam({ name: 'roleId', type: Number, description: 'Role ID' })
  @ApiResponse({ status: 204, description: 'Role removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async removeRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    await this.userRolesService.removeRole(userId, roleId);
  }

  @Get('users/:userId/roles')
  @RequireRead('user_roles')
  @ApiOperation({ summary: 'Get all roles assigned to a user' })
  @ApiParam({ name: 'userId', type: Number, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'List of user roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – insufficient permissions',
  })
  async getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.userRolesService.getUserRoles(userId);
  }
}
