import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  ProvisionUserDto,
  UpdateUserStatusDto,
} from './dto/provision-user.dto';
import { UserProvisioningService } from './user-provisioning.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard)
export class UserProvisioningController {
  constructor(
    private readonly userProvisioningService: UserProvisioningService,
  ) {}

  @Post()
  @Roles('admin')
  async createUser(@Body() dto: ProvisionUserDto) {
    return this.userProvisioningService.createLocalUser(dto);
  }

  @Patch(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.userProvisioningService.setUserStatus(id, dto.isActive);
  }
}
