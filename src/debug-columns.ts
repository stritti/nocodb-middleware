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

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);
  const logger = new Logger('DebugColumns');

  try {
    const table = await nocoDBService.getTableByName('users');
    const usersTable = asTableRef(table);
    
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
          `/api/v3/tables/${usersTable.id}/records`,
          {
            params: { where: filter },
          },
        );
        const listLen = Array.isArray(response.data.list) ? response.data.list.length : 0;
        logger.log(
          `Filter ${filter} success. Records: ${listLen}`,
        );
      } catch (err: any) {
        logger.error(
          `Filter ${filter} failed: ${err.response?.data?.msg || err.message}`,
        );
      }
    }
  } catch (error) {
    logger.error('Error fetching columns', error);
  } finally {
    await app.close();
  }
}

void bootstrap();
