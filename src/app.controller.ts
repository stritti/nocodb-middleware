import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('info')
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
