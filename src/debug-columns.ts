import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBService } from './nocodb/nocodb.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoDBService = app.get(NocoDBService);
    const logger = new Logger('DebugColumns');

    try {
        const usersTable = await nocoDBService.getTableByName('users');
        if (!usersTable) {
            logger.error('Users table not found');
            return;
        }

        logger.log(`Users Table ID: ${usersTable.id}`);

        const httpClient = nocoDBService.getHttpClient();

        // Test filters
        const filters = [
            '(username,eq,admin)',
            '(Username,eq,admin)'
        ];

        for (const filter of filters) {
            try {
                logger.log(`Testing filter: ${filter}`);
                const response = await httpClient.get(`/api/v2/tables/${usersTable.id}/records`, {
                    params: { where: filter }
                });
                logger.log(`Filter ${filter} success. Records: ${response.data.list.length}`);
            } catch (err: any) {
                logger.error(`Filter ${filter} failed: ${err.response?.data?.msg || err.message}`);
            }
        }

        /*
        // Fetch records to see actual column names
        try {
            const recordsResponse = await httpClient.get(`/api/v2/tables/${usersTable.id}/records`, {
                params: { limit: 1 }
            });

            logger.log('Records found: ' + recordsResponse.data.list.length);
            if (recordsResponse.data.list.length > 0) {
                const record = recordsResponse.data.list[0];
                logger.log('Record Keys:', Object.keys(record));
                logger.log('Record Data:', JSON.stringify(record, null, 2));
            } else {
                logger.log('No records found in table.');
            }
        } catch (recordError) {
            logger.error('Error fetching records', recordError);
        }
        */
    } catch (error) {
        logger.error('Error fetching columns', error);
    } finally {
        await app.close();
    }
}

bootstrap();
