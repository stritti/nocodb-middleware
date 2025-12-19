import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { NocoDBModule } from './src/nocodb/nocodb.module';
import { NocoDBService } from './src/nocodb/nocodb.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(NocoDBModule);

    // We need to manually load config if not using AppModule
    // But NocoDBModule imports ConfigModule.forFeature.
    // Let's try to create a dynamic module wrapper
}

// Better approach: Create a temporary module
import { Module } from '@nestjs/common';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        NocoDBModule
    ]
})
class AppModule { }

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const nocoService = app.get(NocoDBService);

    try {
        console.log('Fetching users table...');
        const usersTable = await nocoService.getTableByName('users');

        if (usersTable) {
            console.log('Users table found. ID:', usersTable.id);

            // Test queries
            const queries = [
                '(username,eq,admin)',
                '(Username,eq,admin)',
                '(c0gi9rkd4azfnce,eq,admin)' // Column ID
            ];

            for (const query of queries) {
                console.log(`\nTesting query: ${query}`);
                try {
                    const res = await nocoService.getHttpClient().get(`/api/v2/tables/${usersTable.id}/records`, {
                        params: { where: query }
                    });
                    console.log('Success! Records found:', res.data.list.length);
                } catch (e) {
                    console.log('Failed:', e.response?.data || e.message);
                }
            }

            console.log('Fetching table details...');
            try {
                const tableRes = await nocoService.getHttpClient().get(`/api/v2/meta/tables/${usersTable.id}`);
                const columns = tableRes.data.columns;

                console.log('Columns:');
                columns.forEach((col: any) => {
                    console.log(`- Name: ${col.column_name}, Title: ${col.title}, ID: ${col.id}`);
                });
            } catch (e) {
                console.error('Failed to fetch table details:', e.message);
            }
        } else {
            console.log('Users table NOT found.');
        }

        console.log('\nFetching roles table...');
        const rolesTable = await nocoService.getTableByName('roles');

        if (rolesTable) {
            console.log('Roles table found. ID:', rolesTable.id);

            // Test queries
            const queries = [
                '(role_name,eq,admin)',
                '(Role Name,eq,admin)',
                '(c69llprpl37p05m,eq,admin)' // Column ID
            ];

            for (const query of queries) {
                console.log(`\nTesting query: ${query}`);
                try {
                    const res = await nocoService.getHttpClient().get(`/api/v2/tables/${rolesTable.id}/records`, {
                        params: { where: query }
                    });
                    console.log('Success! Records found:', res.data.list.length);
                } catch (e) {
                    console.log('Failed:', e.response?.data || e.message);
                }
            }

            console.log('Fetching table details...');
            try {
                const tableRes = await nocoService.getHttpClient().get(`/api/v2/meta/tables/${rolesTable.id}`);
                const columns = tableRes.data.columns;

                console.log('Columns:');
                columns.forEach((col: any) => {
                    console.log(`- Name: ${col.column_name}, Title: ${col.title}, ID: ${col.id}`);
                });
            } catch (e) {
                console.error('Failed to fetch table details:', e.message);
            }
        } else {
            console.log('Roles table NOT found.');
        }

        console.log('\nFetching user_roles table...');
        const userRolesTable = await nocoService.getTableByName('user_roles');

        if (userRolesTable) {
            console.log('User Roles table found. ID:', userRolesTable.id);
            console.log('Deleting user_roles table to force recreation...');
            try {
                await nocoService.getHttpClient().delete(`/api/v2/meta/tables/${userRolesTable.id}`);
                console.log('User Roles table deleted.');
            } catch (e) {
                console.error('Failed to delete user_roles table:', e.message);
            }
        } else {
            console.log('User Roles table NOT found.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await app.close();
    }

    console.log('\nRestarting application context to recreate tables...');
    const app2 = await NestFactory.createApplicationContext(NocoDBModule);
    const nocoService2 = app2.get(NocoDBService);

    try {
        console.log('Fetching user_roles table again...');
        const userRolesTable2 = await nocoService2.getTableByName('user_roles');
        if (userRolesTable2) {
            console.log('User Roles table recreated. ID:', userRolesTable2.id);
            // Check columns
            const tableRes = await nocoService2.getHttpClient().get(`/api/v2/meta/tables/${userRolesTable2.id}`);
            const columns = tableRes.data.columns;
            console.log('Columns:');
            columns.forEach((col: any) => {
                console.log(`- Name: ${col.column_name}, Title: ${col.title}, ID: ${col.id}`);
            });

            // Try to create HasMany relation from users to user_roles
            console.log('\nTrying to create HasMany relation from users to user_roles...');
            try {
                const usersTable = await nocoService2.getTableByName('users');
                await nocoService2.createColumn(
                    usersTable.id,
                    'user_roles',
                    'LinkToAnotherRecord',
                    'User Roles',
                    {
                        parentId: userRolesTable2.id,
                        childId: usersTable.id,
                        type: 'hm'
                    }
                );
                console.log('HasMany relation created successfully!');
            } catch (e) {
                console.error('Failed to create HasMany relation:', e.message);
                if (e.response?.data) {
                    console.error('Error details:', JSON.stringify(e.response.data));
                }
            }
        }
    } catch (e) {
        console.error('Error in second run:', e);
    } finally {
        await app2.close();
    }
}

run();
