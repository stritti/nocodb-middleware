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

async function testLinkColumns() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);
    const httpClient = nocoService.getHttpClient();
    const baseId = nocoService.getBaseId();

    console.log('=== Testing Link Column Creation with v3 API ===\n');

    // Step 1: Create two test tables
    console.log('1. Creating test tables...');
    let table1Id, table2Id;

    try {
        const table1 = await httpClient.post(`/api/v3/meta/bases/${baseId}/tables`, {
            table_name: `test_parent_${Date.now()}`,
            title: 'Test Parent',
            columns: [
                { column_name: 'name', title: 'Name', uidt: 'SingleLineText' }
            ]
        });
        table1Id = table1.data.id;
        console.log(`✓ Parent table created: ${table1Id}`);

        const table2 = await httpClient.post(`/api/v3/meta/bases/${baseId}/tables`, {
            table_name: `test_child_${Date.now()}`,
            title: 'Test Child',
            columns: [
                { column_name: 'title', title: 'Title', uidt: 'SingleLineText' }
            ]
        });
        table2Id = table2.data.id;
        console.log(`✓ Child table created: ${table2Id}`);
    } catch (e) {
        console.error('✗ Table creation failed:', e.message);
        await app.close();
        return;
    }

    // Step 2: Try different approaches to create link column
    console.log('\n2. Testing link column creation approaches...\n');

    // Approach A: POST to /api/v3/meta/tables/{id}/columns
    console.log('A. POST /api/v3/meta/tables/{childId}/columns with LinkToAnotherRecord');
    try {
        const res = await httpClient.post(`/api/v3/meta/tables/${table2Id}/columns`, {
            column_name: 'parent_link',
            title: 'Parent Link',
            uidt: 'LinkToAnotherRecord',
            parentId: table1Id,
            childId: table2Id,
            type: 'bt'
        });
        console.log('✓ Success!', JSON.stringify(res.data, null, 2).substring(0, 300));
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
    }

    // Approach B: Try with v2 endpoint
    console.log('\nB. POST /api/v2/meta/tables/{childId}/columns with LinkToAnotherRecord');
    try {
        const res = await httpClient.post(`/api/v2/meta/tables/${table2Id}/columns`, {
            uidt: 'LinkToAnotherRecord',
            title: 'Parent V2',
            column_name: 'parent_v2',
            parentId: table1Id,
            childId: table2Id,
            type: 'bt'
        });
        console.log('✓ Success!', JSON.stringify(res.data, null, 2).substring(0, 300));
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
        if (e.response?.data) {
            console.log('  Details:', JSON.stringify(e.response.data, null, 2));
        }
    }

    // Approach C: Try with different payload structure
    console.log('\nC. Trying with fk_related_model_id instead of parentId');
    try {
        const res = await httpClient.post(`/api/v2/meta/tables/${table2Id}/columns`, {
            uidt: 'LinkToAnotherRecord',
            title: 'Parent FK',
            column_name: 'parent_fk',
            fk_related_model_id: table1Id,
            type: 'bt'
        });
        console.log('✓ Success!', JSON.stringify(res.data, null, 2).substring(0, 300));
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
        if (e.response?.data) {
            console.log('  Details:', JSON.stringify(e.response.data, null, 2));
        }
    }

    // Approach D: Check if we need fk_mm_model_id for many-to-many
    console.log('\nD. Trying many-to-many with fk_mm_model_id');
    try {
        const res = await httpClient.post(`/api/v2/meta/tables/${table2Id}/columns`, {
            uidt: 'LinkToAnotherRecord',
            title: 'Parent MM',
            column_name: 'parent_mm',
            fk_related_model_id: table1Id,
            fk_mm_model_id: table2Id,
            type: 'mm'
        });
        console.log('✓ Success!', JSON.stringify(res.data, null, 2).substring(0, 300));
    } catch (e) {
        console.log('✗ Failed:', e.response?.status, e.response?.data?.msg || e.message);
        if (e.response?.data) {
            console.log('  Details:', JSON.stringify(e.response.data, null, 2));
        }
    }

    // Approach E: Check existing working link columns
    console.log('\n3. Inspecting existing tables for link column format...');
    const usersTable = await nocoService.getTableByName('users');
    if (usersTable) {
        try {
            const schema = await httpClient.get(`/api/v2/meta/tables/${usersTable.id}`);
            const linkColumns = schema.data.columns?.filter((c: any) => c.uidt === 'LinkToAnotherRecord');
            if (linkColumns && linkColumns.length > 0) {
                console.log('Found existing link columns:');
                linkColumns.forEach((col: any) => {
                    console.log(`  - ${col.title}:`, JSON.stringify({
                        uidt: col.uidt,
                        fk_related_model_id: col.colOptions?.fk_related_model_id,
                        type: col.colOptions?.type,
                        fk_mm_model_id: col.colOptions?.fk_mm_model_id,
                        fk_mm_parent_column_id: col.colOptions?.fk_mm_parent_column_id,
                        fk_mm_child_column_id: col.colOptions?.fk_mm_child_column_id
                    }, null, 2));
                });
            } else {
                console.log('No existing link columns found in users table');
            }
        } catch (e) {
            console.log('Failed to inspect users table:', e.message);
        }
    }

    // Cleanup
    console.log('\n4. Cleaning up test tables...');
    try {
        await httpClient.delete(`/api/v2/meta/tables/${table1Id}`);
        console.log(`✓ Deleted table ${table1Id}`);
    } catch (e) {
        console.log(`✗ Failed to delete ${table1Id}:`, e.message);
    }

    try {
        await httpClient.delete(`/api/v2/meta/tables/${table2Id}`);
        console.log(`✓ Deleted table ${table2Id}`);
    } catch (e) {
        console.log(`✗ Failed to delete ${table2Id}:`, e.message);
    }

    await app.close();
}

testLinkColumns().catch(console.error);
