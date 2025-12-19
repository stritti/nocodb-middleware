import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NocoDBModule } from './nocodb/nocodb.module';
import { AuthModule } from './auth/auth.module';
import { ExamplesModule } from './examples/examples.module';
import { HealthModule } from './health/health.module';
import { PermissionsModule } from './permissions/permissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    NocoDBModule,
    AuthModule,
    ExamplesModule,
    HealthModule,
    PermissionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
