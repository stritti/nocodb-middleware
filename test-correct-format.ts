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

async function testCorrectFormat() {
    console.log('=== Testing Correct API Format for Link Columns ===\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);
    const httpClient = nocoService.getHttpClient();

    // Get version first
    console.log('1. Getting NocoDB Version...');
    try {
        // Try different version endpoints
        const endpoints = ['/api/v1/version', '/api/version', '/version', '/api/v2/version'];
        for (const endpoint of endpoints) {
            try {
                const res = await httpClient.get(endpoint);
                console.log(`   ✓ ${endpoint}:`, JSON.stringify(res.data, null, 2));
                break;
            } catch (e) {
                console.log(`   ✗ ${endpoint}: ${e.message}`);
            }
        }
    } catch (e) {
        console.log('   Could not determine version');
    }

    const usersTable = await nocoService.getTableByName('users');
    const userRolesTable = await nocoService.getTableByName('user_roles');

    if (!usersTable || !userRolesTable) {
        console.log('\nTables not found');
        await app.close();
        return;
    }

    console.log(`\n2. Table IDs:`);
    console.log(`   Users: ${usersTable.id}`);
    console.log(`   User Roles: ${userRolesTable.id}`);

    // Web research says: use fk_related_model_id instead of parentId
    console.log('\n3. Testing with fk_related_model_id (from web research)...\n');

    const tests = [
        {
            name: 'Format 1: fk_related_model_id only',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User Link 1',
                column_name: 'user_link_1',
                fk_related_model_id: usersTable.id
            }
        },
        {
            name: 'Format 2: fk_related_model_id + type',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User Link 2',
                column_name: 'user_link_2',
                fk_related_model_id: usersTable.id,
                type: 'bt'
            }
        },
        {
            name: 'Format 3: With fk_child_column_id and fk_parent_column_id as null',
            payload: {
                uidt: 'LinkToAnotherRecord',
                title: 'User Link 3',
                column_name: 'user_link_3',
                fk_related_model_id: usersTable.id,
                fk_child_column_id: null,
                fk_parent_column_id: null
            }
        },
        {
            name: 'Format 4: With explicit column IDs from tables',
            payload: async () => {
                const userSchema = await httpClient.get(`/api/v2/meta/tables/${usersTable.id}`);
                const userRolesSchema = await httpClient.get(`/api/v2/meta/tables/${userRolesTable.id}`);

                const userIdCol = userSchema.data.columns.find((c: any) => c.pk);
                const userRoleIdCol = userRolesSchema.data.columns.find((c: any) => c.pk);

                return {
                    uidt: 'LinkToAnotherRecord',
                    title: 'User Link 4',
                    column_name: 'user_link_4',
                    fk_related_model_id: usersTable.id,
                    fk_child_column_id: userRoleIdCol?.id,
                    fk_parent_column_id: userIdCol?.id
                };
            }
        }
    ];

    for (const test of tests) {
        console.log(`Testing: ${test.name}`);

        try {
            const payload = typeof test.payload === 'function' ? await test.payload() : test.payload;
            console.log(`Payload:`, JSON.stringify(payload, null, 2));

            const res = await httpClient.post(
                `/api/v2/meta/tables/${userRolesTable.id}/columns`,
                payload
            );

            console.log('   ✓✓✓ SUCCESS! ✓✓✓');
            console.log('   Response:', JSON.stringify(res.data, null, 2).substring(0, 400));

            // Clean up
            if (res.data.id) {
                await httpClient.delete(`/api/v2/meta/columns/${res.data.id}`);
                console.log('   Cleaned up\n');
            }

            break; // Success! Stop testing
        } catch (e) {
            console.log(`   ✗ Failed: ${e.response?.status} - ${e.response?.data?.msg || e.message}`);
            if (e.response?.data && e.response?.data?.msg?.includes('dt')) {
                console.log('   Full error:', JSON.stringify(e.response.data, null, 2));
            }
            console.log();
        }
    }

    await app.close();
}

testCorrectFormat().catch(console.error);
