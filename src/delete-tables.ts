import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBService } from './nocodb/nocodb.service';
import { Logger } from '@nestjs/common';

interface NocoTableRef {
  id: string;
}

interface NocoErrorResponse {
  data?: unknown;
}

function asTableRef(value: unknown): NocoTableRef | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { id?: unknown };
  return typeof candidate.id === 'string' ? { id: candidate.id } : null;
}

function extractErrorPayload(error: unknown): unknown {
  if (!error || typeof error !== 'object') {
    return 'Unknown error';
  }

  const candidate = error as { response?: NocoErrorResponse; message?: string };
  return candidate.response?.data ?? candidate.message ?? 'Unknown error';
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);
  const logger = new Logger('DeleteTables');

  try {
    const httpClient = nocoDBService.getHttpClient();

    // Tables to delete
    const tablesToDelete = ['user_roles', 'table_permissions'];

    for (const tableName of tablesToDelete) {
      try {
        const table = asTableRef(await nocoDBService.getTableByName(tableName));

        if (!table) {
          logger.warn(`Table ${tableName} not found, skipping...`);
          continue;
        }

        logger.log(`Deleting table ${tableName} (ID: ${table.id})...`);

        await httpClient.delete(`/api/v2/meta/tables/${table.id}`);

        logger.log(`✓ Table ${tableName} deleted successfully`);
      } catch (error) {
        logger.error(
          `Failed to delete table ${tableName}:`,
          extractErrorPayload(error),
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

void bootstrap();
