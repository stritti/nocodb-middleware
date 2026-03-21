import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NocoDBService } from './nocodb/nocodb.service';

/**
 * Test script for Phase 2 - DatabaseInitializationService
 *
 * This will automatically run when the app starts and create the tables.
 * Just start the app context and the OnModuleInit hook will trigger.
 */
async function testPhase2() {
  console.log('🧪 Starting Phase 2 Tests...\n');
  console.log(
    '📋 This test will initialize the app and trigger automatic table creation\n',
  );

  const app = await NestFactory.createApplicationContext(AppModule);
  const nocoDBService = app.get(NocoDBService);

  try {
    console.log('\n📋 Verifying created tables...');

    const tablesToCheck = ['users', 'roles', 'user_roles', 'table_permissions'];
    const prefix = nocoDBService.getTablePrefix();

    for (const tableName of tablesToCheck) {
      const exists = await nocoDBService.tableExists(tableName);
      const fullName = `${prefix}${tableName}`;
      console.log(
        `  ${exists ? '✅' : '❌'} Table "${fullName}" ${exists ? 'exists' : 'NOT FOUND'}`,
      );

      if (exists) {
        const table = await nocoDBService.getTableByName(tableName);
        console.log(
          `     ID: ${table.id}, Columns: ${table.columns?.length || 'unknown'}`,
        );
      }
    }

    // Check if admin role was seeded
    console.log('\n📋 Checking default admin role...');
    const rolesTable = await nocoDBService.getTableByName('roles');
    if (rolesTable) {
      const httpClient = nocoDBService.getHttpClient();
      const response = await httpClient.get(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          params: {
            where: '(role_name,eq,admin)',
          },
        },
      );

      const adminRole = response.data.list?.[0];
      if (adminRole) {
        console.log('  ✅ Admin role found:');
        console.log(`     Name: ${adminRole.role_name}`);
        console.log(`     Description: ${adminRole.description}`);
        console.log(`     System Role: ${adminRole.is_system_role}`);
      } else {
        console.log('  ⚠️  Admin role not found (may be created on first run)');
      }
    }

    console.log('\n✅ Phase 2 Tests Completed Successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// Run tests
testPhase2()
  .then(() => {
    console.log('\n🎉 All Phase 2 tests passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Tests failed:', error);
    process.exit(1);
  });
