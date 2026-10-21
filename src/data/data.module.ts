import { Module } from '@nestjs/common';
import { PermissionsModule } from '../permissions/permissions.module';
import { DataController } from './data.controller';
import { DataService } from './data.service';
import { TablePermissionsGuard } from './table-permissions.guard';

@Module({
  imports: [PermissionsModule],
  controllers: [DataController],
  providers: [DataService, TablePermissionsGuard],
})
export class DataModule {}
