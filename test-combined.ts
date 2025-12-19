import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { NocoDBModule } from './src/nocodb/nocodb.module';
import { NocoDBService } from './src/nocodb/nocodb.service';
import { Module } from '@nestjs/common';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        NocoDBModule
    ]
})
class AppModule { }

async function testCombinedParams() {
    console.log('=== Testing Combined parentId + fk_related_model_id ===\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);
    const httpClient = nocoService.getHttpClient();

    const usersTable = await nocoService.getTableByName('users');
    const userRolesTable = await nocoService.getTableByName('user_roles');

    console.log(`Users Table: ${usersTable.id}`);
    console.log(`User Roles Table: ${userRolesTable.id}\n`);

    const tests = [
        {
            name: 'Test 1: parentId + fk_related_model_id (same value)',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User',
                column_name: 'user',
                parentId: usersTable.id,
                fk_related_model_id: usersTable.id,
                childId: userRolesTable.id,
                type: 'bt'
            }
        },
        {
            name: 'Test 2: Without type parameter',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User No Type',
                column_name: 'user_no_type',
                parentId: usersTable.id,
                fk_related_model_id: usersTable.id,
                childId: userRolesTable.id
            }
        },
        {
            name: 'Test 3: Only parentId and childId',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User Simple',
                column_name: 'user_simple',
                parentId: usersTable.id,
                childId: userRolesTable.id
            }
        }
    ];

    for (const test of tests) {
        console.log(`${test.name}`);
        console.log(`Payload:`, JSON.stringify(test.payload, null, 2));

        try {
            const res = await httpClient.post(
                `/api/v2/meta/tables/${userRolesTable.id}/columns`,
                test.payload
            );

            console.log('✓✓✓ SUCCESS!!! ✓✓✓');
            console.log('Response:', JSON.stringify(res.data, null, 2).substring(0, 500));

            // Clean up
            if (res.data.id) {
                try {
                    await httpClient.delete(`/api/v2/meta/columns/${res.data.id}`);
                    console.log('Cleaned up test column\n');
                } catch (cleanupErr) {
                    console.log('Could not clean up (might be OK)\n');
                }
            }

            break; // Found working format!
        } catch (e) {
            console.log(`✗ Failed: ${e.response?.status} - ${e.response?.data?.msg || e.message}\n`);
        }
    }

    await app.close();
}

testCombinedParams().catch(console.error);
