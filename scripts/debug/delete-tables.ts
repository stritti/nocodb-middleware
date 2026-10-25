/**
 * DESTRUCTIVE: deletes tables (`user_roles`, `table_permissions`) from the
 * configured NocoDB instance. Development only — never run against production.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { NocoDBService } from '../../src/nocodb/nocodb.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);
  const logger = new Logger('DeleteTables');

  try {
    const httpClient = nocoDBService.getHttpClient();
    const tablesToDelete = ['user_roles', 'table_permissions'];

    for (const tableName of tablesToDelete) {
      try {
        const table = await nocoDBService.getTableByName(tableName);

        if (!table) {
          logger.warn(`Table ${tableName} not found, skipping...`);
          continue;
        }

        logger.log(`Deleting table ${tableName} (ID: ${table.id})...`);
        await httpClient.delete(`/api/v3/meta/tables/${table.id}`);
        logger.log(`✓ Table ${tableName} deleted successfully`);
      } catch (error) {
        logger.error(`Error deleting table ${tableName}:`, error as Error);
      }
    }
  } catch (error) {
    logger.error('Fatal error:', error as Error);
  } finally {
    await app.close();
  }
}

bootstrap();
