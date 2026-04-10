import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBService } from './nocodb/nocodb.service';
import { Logger } from '@nestjs/common';

interface NocoTableRef {
  id: string;
}

interface NocoListResponse {
  list?: unknown[];
}

interface NocoErrorResponse {
  data?: {
    msg?: string;
  };
}

function asTableRef(value: unknown): NocoTableRef | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as { id?: unknown };
  return typeof candidate.id === 'string' ? { id: candidate.id } : null;
}

function extractListLength(value: unknown): number {
  if (!value || typeof value !== 'object') {
    return 0;
  }

  const payload = value as { data?: NocoListResponse };
  return Array.isArray(payload.data?.list) ? payload.data.list.length : 0;
}

function extractErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'Unknown error';
  }

  const candidate = error as {
    response?: NocoErrorResponse;
    message?: string;
  };

  return candidate.response?.data?.msg ?? candidate.message ?? 'Unknown error';
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);
  const logger = new Logger('DebugColumns');

  try {
    const usersTable = asTableRef(await nocoDBService.getTableByName('users'));
    if (!usersTable) {
      logger.error('Users table not found');
      return;
    }

    logger.log(`Users Table ID: ${usersTable.id}`);

    const httpClient = nocoDBService.getHttpClient();

    // Test filters
    const filters = ['(username,eq,admin)', '(Username,eq,admin)'];

    for (const filter of filters) {
      try {
        logger.log(`Testing filter: ${filter}`);
        const response = await httpClient.get(
          `/api/v2/tables/${usersTable.id}/records`,
          {
            params: { where: filter },
          },
        );
        logger.log(
          `Filter ${filter} success. Records: ${extractListLength(response)}`,
        );
      } catch (err) {
        logger.error(`Filter ${filter} failed: ${extractErrorMessage(err)}`);
      }
    }
  } catch (error) {
    logger.error('Error fetching columns', error);
  } finally {
    await app.close();
  }
}

void bootstrap();
