import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import {
  ProvisionUserDto,
  UpdateUserStatusDto,
} from './dto/provision-user.dto';
import { UserProvisioningService } from './user-provisioning.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserProvisioningController {
  constructor(
    private readonly userProvisioningService: UserProvisioningService,
  ) {}

  @Post()
  @SetMetadata('roles', ['admin'])
  async createUser(@Body() dto: ProvisionUserDto) {
    return this.userProvisioningService.createLocalUser(dto);
  }

  @Patch(':id/status')
  @SetMetadata('roles', ['admin'])
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userProvisioningService.setUserStatus(id, dto.isActive);
  }
}
