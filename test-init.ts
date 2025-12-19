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

async function testInitialization() {
    console.log('=== Testing Database Initialization with Fixed Link Columns ===\n');

    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);

    console.log('1. Deleting existing tables to test fresh creation...');
    const tablesToDelete = ['user_roles', 'table_permissions', 'roles', 'users'];

    for (const tableName of tablesToDelete) {
        try {
            const table = await nocoService.getTableByName(tableName);
            if (table) {
                await nocoService.getHttpClient().delete(`/api/v2/meta/tables/${table.id}`);
                console.log(`   ✓ Deleted ${tableName}`);
            }
        } catch (e) {
            console.log(`   - ${tableName} not found or already deleted`);
        }
    }

    console.log('\n2. Restarting app to trigger fresh initialization...');
    await app.close();

    const app2 = await NestFactory.createApplicationContext(AppModule);
    const nocoService2 = app2.get(NocoDBService);

    console.log('\n3. Checking created tables and columns...');

    for (const tableName of ['users', 'roles', 'user_roles', 'table_permissions']) {
        const table = await nocoService2.getTableByName(tableName);
        if (table) {
            console.log(`\n✓ Table ${tableName} exists (ID: ${table.id})`);

            // Get columns
            const schema = await nocoService2.getHttpClient().get(`/api/v2/meta/tables/${table.id}`);
            const columns = schema.data.columns || [];

            console.log(`  Columns:`);
            columns.forEach((col: any) => {
                const info = col.uidt === 'LinkToAnotherRecord'
                    ? ` (Link to: ${col.colOptions?.fk_related_model_id || 'unknown'})`
                    : '';
                console.log(`    - ${col.title} (${col.column_name}): ${col.uidt}${info}`);
            });
        } else {
            console.log(`\n✗ Table ${tableName} NOT found!`);
        }
    }

    await app2.close();
    console.log('\n=== Test Complete ===');
}

testInitialization().catch(console.error);
