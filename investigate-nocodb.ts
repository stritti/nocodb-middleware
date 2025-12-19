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

async function investigateNocoDB() {
    console.log('=== Deep Investigation: NocoDB Server Info ===\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);
    const httpClient = nocoService.getHttpClient();
    const baseId = nocoService.getBaseId();

    // 1. Get NocoDB Version
    console.log('1. Checking NocoDB Version...');
    try {
        const versionRes = await httpClient.get('/api/v1/version');
        console.log('   Version:', JSON.stringify(versionRes.data, null, 2));
    } catch (e) {
        console.log('   Version endpoint failed:', e.message);
    }

    // Try alternative version endpoint
    try {
        const healthRes = await httpClient.get('/api/v1/health');
        console.log('   Health:', JSON.stringify(healthRes.data, null, 2));
    } catch (e) {
        console.log('   Health endpoint failed:', e.message);
    }

    // 2. Get Base Info
    console.log('\n2. Getting Base Info...');
    try {
        const baseRes = await httpClient.get(`/api/v2/meta/bases/${baseId}`);
        console.log('   Base:', JSON.stringify({
            id: baseRes.data.id,
            title: baseRes.data.title,
            sources: baseRes.data.sources?.length || 0
        }, null, 2));
    } catch (e) {
        console.log('   Failed:', e.message);
    }

    // 3. Get Tables and inspect existing link columns
    console.log('\n3. Inspecting Existing Tables for Link Column Patterns...');
    try {
        const tablesRes = await httpClient.get(`/api/v2/meta/bases/${baseId}/tables`);
        const tables = tablesRes.data.list || [];

        for (const table of tables) {
            const schema = await httpClient.get(`/api/v2/meta/tables/${table.id}`);
            const linkCols = schema.data.columns?.filter((c: any) => c.uidt === 'LinkToAnotherRecord') || [];

            if (linkCols.length > 0) {
                console.log(`\n   Table: ${table.title} (${table.table_name})`);
                linkCols.forEach((col: any) => {
                    console.log(`   Link Column: ${col.title} (${col.column_name})`);
                    console.log('   colOptions:', JSON.stringify(col.colOptions, null, 2));
                });
            }
        }
    } catch (e) {
        console.log('   Failed:', e.message);
    }

    // 4. Try creating via different meta endpoints
    console.log('\n4. Testing Alternative Column Creation Endpoints...');

    const userRolesTable = await nocoService.getTableByName('user_roles');
    const usersTable = await nocoService.getTableByName('users');

    if (userRolesTable && usersTable) {
        const endpoints = [
            { name: 'v2 meta columns', url: `/api/v2/meta/tables/${userRolesTable.id}/columns` },
            { name: 'v1 meta columns', url: `/api/v1/db/meta/tables/${userRolesTable.id}/columns` },
            { name: 'v2 base columns', url: `/api/v2/meta/bases/${baseId}/tables/${userRolesTable.id}/columns` },
        ];

        for (const endpoint of endpoints) {
            console.log(`\n   Testing: ${endpoint.name}`);
            console.log(`   URL: ${endpoint.url}`);

            try {
                const res = await httpClient.post(endpoint.url, {
                    uidt: 'LinkToAnotherRecord',
                    title: 'Test Link',
                    column_name: 'test_link_' + Date.now(),
                    parentId: usersTable.id,
                    childId: userRolesTable.id,
                    type: 'bt'
                });
                console.log('   ✓ SUCCESS!');
                console.log('   Response:', JSON.stringify(res.data, null, 2).substring(0, 300));

                // Delete the test column
                if (res.data.id) {
                    await httpClient.delete(`/api/v2/meta/columns/${res.data.id}`);
                    console.log('   Cleaned up test column');
                }
            } catch (e) {
                console.log(`   ✗ Failed: ${e.response?.status} - ${e.response?.data?.msg || e.message}`);
            }
        }
    }

    // 5. Check if we need source_id
    console.log('\n5. Testing with source_id parameter...');
    if (userRolesTable && usersTable) {
        try {
            const tableSchema = await httpClient.get(`/api/v2/meta/tables/${userRolesTable.id}`);
            const sourceId = tableSchema.data.source_id;

            console.log(`   Source ID: ${sourceId}`);

            const res = await httpClient.post(`/api/v2/meta/tables/${userRolesTable.id}/columns`, {
                uidt: 'LinkToAnotherRecord',
                title: 'Test With Source',
                column_name: 'test_with_source',
                source_id: sourceId,
                parentId: usersTable.id,
                childId: userRolesTable.id,
                type: 'bt'
            });
            console.log('   ✓ SUCCESS!');

            if (res.data.id) {
                await httpClient.delete(`/api/v2/meta/columns/${res.data.id}`);
            }
        } catch (e) {
            console.log(`   ✗ Failed: ${e.response?.status} - ${e.response?.data?.msg || e.message}`);
        }
    }

    await app.close();
    console.log('\n=== Investigation Complete ===');
}

investigateNocoDB().catch(console.error);
