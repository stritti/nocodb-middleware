import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBService } from './nocodb/nocodb.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);
  const logger = new Logger('DeleteTables');

  try {
    const httpClient = nocoDBService.getHttpClient();
    const baseId = nocoDBService.getBaseId();

    // Tables to delete
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
      } catch (error: any) {
        logger.error(
          `Failed to delete table ${tableName}:`,
          error.response?.data || error.message,
        );
      }
    }

    logger.log('Done!');
  } catch (error) {
    logger.error('Error during table deletion', error);
  } finally {
    await app.close();
  }
}

bootstrap();
