import { Module } from '@nestjs/common';
import { NocoDBModule } from '../nocodb/nocodb.module';
import { PublicReadController } from './public-read.controller';
import { PublicReadService } from './public-read.service';
import { ResourceRegistryService } from './resource-registry.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [NocoDBModule, PermissionsModule],
  controllers: [PublicReadController],
  providers: [PublicReadService, ResourceRegistryService],
})
export class PublicReadModule {}
