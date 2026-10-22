import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './auth/decorators/public.decorator';

@ApiTags('info')
// Public: API info for clients and humans
@Public()
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Information' })
  getHello() {
    return {
      name: 'NocoDB Middleware API',
      version: process.env.npm_package_version ?? '1.0',
      description: 'Robust NestJS middleware for NocoDB',
      swagger: '/api',
      health: '/health',
      documentation: '/api',
    };
  }
}
