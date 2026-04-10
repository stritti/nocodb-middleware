import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBService } from './nocodb/nocodb.service';

/**
 * Test script for Phase 1 - NocoDBService Meta API v2 methods
 */
async function testPhase1() {
  console.log('🧪 Starting Phase 1 Tests...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);

  try {
    // Test 1: Get Base ID and Table Prefix
    console.log('📋 Test 1: Configuration');
    const baseId = nocoDBService.getBaseId();
    const tablePrefix = nocoDBService.getTablePrefix();
    console.log(`  ✅ Base ID: ${baseId}`);
    console.log(`  ✅ Table Prefix: "${tablePrefix}"`);

    // Test 2: Check if a test table exists
    console.log('\n📋 Test 2: Table Existence Check');
    const testTableName = 'test_phase1_table';
    const exists = await nocoDBService.tableExists(testTableName);
    console.log(
      `  ✅ Table "${tablePrefix}${testTableName}" exists: ${exists}`,
    );

    // Test 3: Get table by name (if exists)
    if (exists) {
      console.log('\n📋 Test 3: Get Table Details');
      const table = await nocoDBService.getTableByName(testTableName);
      console.log(`  ✅ Found table:`, table ? table.title : 'Not found');
    }

    // Test 4: List all tables (using HTTP client)
    console.log('\n📋 Test 4: List All Tables');
    const httpClient = nocoDBService.getHttpClient();
    const response = await httpClient.get(
      `/api/v3/meta/bases/${baseId}/tables`,
    );
    const tables = response.data.list || [];
    console.log(`  ✅ Total tables in base: ${tables.length}`);
    tables.forEach((table: any) => {
      console.log(`     - ${table.table_name} (${table.title})`);
    });

    console.log('\n📋 Test 5: List Tables (using service method)');
    const tableList = await nocoDBService.listTables();
    console.log(`  ✅ Service listTables returned ${tableList.length} tables`);

    console.log('\n✅ Phase 1 Tests Completed Successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run tests
testPhase1()
  .then(() => {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  });
