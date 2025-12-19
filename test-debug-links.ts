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

async function debugLinkColumns() {
    console.log('=== Debugging Link Column Creation ===\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);

    // Get existing tables
    const usersTable = await nocoService.getTableByName('users');
    const rolesTable = await nocoService.getTableByName('roles');
    const userRolesTable = await nocoService.getTableByName('user_roles');

    if (!usersTable || !rolesTable || !userRolesTable) {
        console.log('Missing tables. Run test-init.ts first.');
        await app.close();
        return;
    }

    console.log(`Users Table ID: ${usersTable.id}`);
    console.log(`Roles Table ID: ${rolesTable.id}`);
    console.log(`User Roles Table ID: ${userRolesTable.id}\n`);

    // Manually try to create link column
    console.log('Testing manual link column creation...\n');

    const tests = [
        {
            name: 'Test 1: BelongsTo with parentId and childId',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User Test',
                column_name: 'user_test',
                parentId: usersTable.id,
                childId: userRolesTable.id,
                type: 'bt'
            }
        },
        {
            name: 'Test 2: HasMany from parent side',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User Roles Ref',
                column_name: 'user_roles_ref',
                parentId: userRolesTable.id,
                childId: usersTable.id,
                type: 'hm'
            }
        }
    ];

    for (const test of tests) {
        console.log(`${test.name}`);
        console.log(`Payload: ${JSON.stringify(test.payload, null, 2)}`);

        try {
            const res = await nocoService.getHttpClient().post(
                `/api/v2/meta/tables/${userRolesTable.id}/columns`,
                test.payload
            );
            console.log('✓ SUCCESS!');
            console.log(`Response: ${JSON.stringify(res.data, null, 2).substring(0, 300)}\n`);
        } catch (e) {
            console.log(`✗ FAILED: ${e.response?.status} - ${e.response?.data?.msg || e.message}`);
            if (e.response?.data) {
                console.log(`Details: ${JSON.stringify(e.response.data, null, 2)}\n`);
            }
        }
    }

    await app.close();
}

debugLinkColumns().catch(console.error);
