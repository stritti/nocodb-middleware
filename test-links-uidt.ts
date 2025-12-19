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

async function testLinksUidt() {
    console.log('=== Testing with uidt="Links" (from GitHub/Docs) ===\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);
    const httpClient = nocoService.getHttpClient();

    const usersTable = await nocoService.getTableByName('users');
    const userRolesTable = await nocoService.getTableByName('user_roles');

    console.log(`Users: ${usersTable.id}`);
    console.log(`User Roles: ${userRolesTable.id}\n`);

    const tests = [
        {
            name: 'Test 1: uidt="Links" + type="hm" (Has Many)',
            payload: {
                uidt: 'Links',
                title: 'User',
                column_name: 'user',
                childId: userRolesTable.id,
                parentId: usersTable.id,
                type: 'hm'
            }
        },
        {
            name: 'Test 2: uidt="Links" + type="bt" (Belongs To)',
            payload: {
                uidt: 'Links',
                title: 'User BT',
                column_name: 'user_bt',
                childId: userRolesTable.id,
                parentId: usersTable.id,
                type: 'bt'
            }
        },
        {
            name: 'Test 3: uidt="Links" + type="mm" (Many-to-Many)',
            payload: {
                uidt: 'Links',
                title: 'User MM',
                column_name: 'user_mm',
                childId: userRolesTable.id,
                parentId: usersTable.id,
                type: 'mm'
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

            console.log('\n🎉🎉🎉 SUCCESS!!! 🎉🎉🎉\n');
            console.log('Response:', JSON.stringify(res.data, null, 2).substring(0, 600));

            // Clean up
            if (res.data.id) {
                try {
                    await httpClient.delete(`/api/v2/meta/columns/${res.data.id}`);
                    console.log('\n✓ Cleaned up test column\n');
                } catch (e) {
                    console.log('\nCould not clean up\n');
                }
            }

            break; // Success! Stop testing
        } catch (e) {
            console.log(`✗ Failed: ${e.response?.status} - ${e.response?.data?.msg || e.message}\n`);
        }
    }

    await app.close();
}

testLinksUidt().catch(console.error);
