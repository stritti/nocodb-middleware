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

async function testV3Endpoints() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);
    const httpClient = nocoService.getHttpClient();
    const baseId = nocoService.getBaseId();

    console.log('=== NocoDB v3 API Endpoint Research ===\n');
    console.log(`Base ID: ${baseId}\n`);

    // Test 1: List tables via v3
    console.log('1. Testing: GET /api/v3/meta/bases/{baseId}/tables');
    try {
        const res = await httpClient.get(`/api/v3/meta/bases/${baseId}/tables`);
        console.log('✓ Success! Response:', JSON.stringify(res.data, null, 2).substring(0, 500));
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
    }

    // Test 2: Alternative endpoint
    console.log('\n2. Testing: GET /api/v3/bases/{baseId}/tables');
    try {
        const res = await httpClient.get(`/api/v3/bases/${baseId}/tables`);
        console.log('✓ Success! Response:', JSON.stringify(res.data, null, 2).substring(0, 500));
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
    }

    // Test 3: Get existing table via v3
    const usersTable = await nocoService.getTableByName('users');
    if (usersTable) {
        console.log(`\n3. Testing: GET /api/v3/meta/tables/${usersTable.id}`);
        try {
            const res = await httpClient.get(`/api/v3/meta/tables/${usersTable.id}`);
            console.log('✓ Success! Response:', JSON.stringify(res.data, null, 2).substring(0, 500));
        } catch (e) {
            console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
        }

        // Test 4: Get columns via v3
        console.log(`\n4. Testing: GET /api/v3/meta/tables/${usersTable.id}/columns`);
        try {
            const res = await httpClient.get(`/api/v3/meta/tables/${usersTable.id}/columns`);
            console.log('✓ Success! Response:', JSON.stringify(res.data, null, 2).substring(0, 500));
        } catch (e) {
            console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
        }
    }

    // Test 5: Try to create a test table via v3
    const testTableName = `test_v3_${Date.now()}`;
    console.log(`\n5. Testing: POST /api/v3/meta/bases/${baseId}/tables`);
    console.log(`   Creating test table: ${testTableName}`);
    try {
        const res = await httpClient.post(`/api/v3/meta/bases/${baseId}/tables`, {
            table_name: testTableName,
            title: 'Test V3 Table',
            columns: [
                {
                    column_name: 'test_field',
                    title: 'Test Field',
                    uidt: 'SingleLineText'
                }
            ]
        });
        console.log('✓ Success! Response:', JSON.stringify(res.data, null, 2).substring(0, 500));

        // Clean up - delete test table
        const tableId = res.data.id;
        console.log(`\n6. Cleaning up: DELETE /api/v3/meta/tables/${tableId}`);
        try {
            await httpClient.delete(`/api/v3/meta/tables/${tableId}`);
            console.log('✓ Test table deleted');
        } catch (e) {
            console.log('✗ Delete failed:', e.message);
        }
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
        if (e.response?.data) {
            console.log('   Full error:', JSON.stringify(e.response.data, null, 2));
        }
    }

    // Test 6: Try alternative v2 endpoint for comparison
    console.log(`\n7. Testing v2 (for comparison): POST /api/v2/meta/bases/${baseId}/tables`);
    const testTableName2 = `test_v2_${Date.now()}`;
    try {
        const res = await httpClient.post(`/api/v2/meta/bases/${baseId}/tables`, {
            table_name: testTableName2,
            title: 'Test V2 Table'
        });
        console.log('✓ Success! Response:', JSON.stringify(res.data, null, 2).substring(0, 500));

        // Try to add column via v2
        const tableId = res.data.id;
        console.log(`\n8. Testing: POST /api/v2/meta/tables/${tableId}/columns`);
        try {
            const colRes = await httpClient.post(`/api/v2/meta/tables/${tableId}/columns`, {
                column_name: 'test_col',
                title: 'Test Column',
                uidt: 'SingleLineText'
            });
            console.log('✓ Column created:', JSON.stringify(colRes.data, null, 2).substring(0, 300));
        } catch (e) {
            console.log('✗ Column creation failed:', e.message);
        }

        // Clean up
        await httpClient.delete(`/api/v2/meta/tables/${tableId}`);
        console.log('✓ Test table deleted');
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
    }

    await app.close();
}

testV3Endpoints().catch(console.error);
