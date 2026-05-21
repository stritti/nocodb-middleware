import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { BootstrapAdminService } from './bootstrap-admin.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';

@Controller('bootstrap')
export class BootstrapAdminController {
  constructor(private readonly bootstrapAdminService: BootstrapAdminService) {}

  @Post('admin')
  @HttpCode(HttpStatus.CREATED)
  async bootstrapAdmin(
    @Body() dto: BootstrapAdminDto,
    @Headers('x-bootstrap-token') bootstrapToken?: string,
  ) {
    return this.bootstrapAdminService.bootstrapAdmin(dto, bootstrapToken);
  }
}
