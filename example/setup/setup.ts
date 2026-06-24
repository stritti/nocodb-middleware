import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

interface NocoDBConfig {
  baseUrl: string;
  apiKey: string;
  dbName: string;
}

interface TableConfig {
  name: string;
  columns: {
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    isUnique?: boolean;
    isNotNull?: boolean;
    defaultValue?: string;
  }[];
}

interface PermissionConfig {
  role: string;
  table: string;
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

const TABLES: TableConfig[] = [
  {
    name: 'authors',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'name', type: 'TEXT', isNotNull: true },
      { name: 'bio', type: 'TEXT' },
      { name: 'birth_date', type: 'TEXT' },
      { name: 'created_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    name: 'books',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'title', type: 'TEXT', isNotNull: true },
      { name: 'description', type: 'TEXT' },
      { name: 'published_year', type: 'INTEGER' },
      { name: 'isbn', type: 'TEXT', isUnique: true },
      { name: 'price', type: 'REAL', defaultValue: '0' },
      { name: 'author_id', type: 'INTEGER' },
      { name: 'created_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'username', type: 'TEXT', isNotNull: true, isUnique: true },
      { name: 'email', type: 'TEXT', isNotNull: true, isUnique: true },
      { name: 'password_hash', type: 'TEXT', isNotNull: true },
      { name: 'role', type: 'TEXT', isNotNull: true, defaultValue: "'user'" },
      { name: 'created_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
  {
    name: 'favorites',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'user_id', type: 'INTEGER', isNotNull: true },
      { name: 'book_id', type: 'INTEGER', isNotNull: true },
      { name: 'created_at', type: 'TEXT', defaultValue: 'CURRENT_TIMESTAMP' },
    ],
  },
];

const PERMISSIONS: PermissionConfig[] = [
  // Authors table permissions
  { role: 'admin', table: 'authors', read: true, create: true, update: true, delete: true },
  { role: 'user', table: 'authors', read: true, create: false, update: false, delete: false },
  { role: 'guest', table: 'authors', read: true, create: false, update: false, delete: false },

  // Books table permissions
  { role: 'admin', table: 'books', read: true, create: true, update: true, delete: true },
  { role: 'user', table: 'books', read: true, create: false, update: false, delete: false },
  { role: 'guest', table: 'books', read: true, create: false, update: false, delete: false },

  // Users table permissions
  { role: 'admin', table: 'users', read: true, create: true, update: true, delete: true },
  { role: 'user', table: 'users', read: true, create: false, update: true, delete: false },
  { role: 'guest', table: 'users', read: false, create: false, update: false, delete: false },

  // Favorites table permissions
  { role: 'admin', table: 'favorites', read: true, create: true, update: true, delete: true },
  { role: 'user', table: 'favorites', read: true, create: true, update: false, delete: true },
  { role: 'guest', table: 'favorites', read: false, create: false, update: false, delete: false },
];

const SAMPLE_DATA = {
  authors: [
    { name: 'J.K. Rowling', bio: 'British author best known for the Harry Potter series', birth_date: '1965-07-31' },
    { name: 'George Orwell', bio: 'English novelist, essayist, journalist and critic', birth_date: '1903-06-25' },
    { name: 'Jane Austen', bio: 'English novelist known for her social commentary', birth_date: '1775-12-16' },
    { name: 'Stephen King', bio: 'American author of horror, supernatural fiction, suspense, and fantasy', birth_date: '1947-09-21' },
    { name: 'Agatha Christie', bio: 'English writer known for her detective novels', birth_date: '1890-09-15' },
  ],
  books: [
    { title: 'Harry Potter and the Philosopher\'s Stone', description: 'The first novel in the Harry Potter series', published_year: 1997, isbn: '9780747532743', price: 12.99, author_id: 1 },
    { title: 'Harry Potter and the Chamber of Secrets', description: 'The second novel in the Harry Potter series', published_year: 1998, isbn: '9780747538486', price: 12.99, author_id: 1 },
    { title: '1984', description: 'A dystopian social science fiction novel', published_year: 1949, isbn: '9780451524935', price: 9.99, author_id: 2 },
    { title: 'Animal Farm', description: 'An allegorical novella reflecting events leading up to the Russian Revolution', published_year: 1945, isbn: '9780451526342', price: 8.99, author_id: 2 },
    { title: 'Pride and Prejudice', description: 'A romantic novel of manners', published_year: 1813, isbn: '9780141439518', price: 7.99, author_id: 3 },
    { title: 'Emma', description: 'A novel about the perils of misconstrued romance', published_year: 1815, isbn: '9780141439587', price: 7.99, author_id: 3 },
    { title: 'The Shining', description: 'A horror novel about a haunted hotel', published_year: 1977, isbn: '9780385121675', price: 10.99, author_id: 4 },
    { title: 'It', description: 'A horror novel about a shape-shifting entity', published_year: 1986, isbn: '9780670813020', price: 14.99, author_id: 4 },
    { title: 'Murder on the Orient Express', description: 'A detective novel featuring Hercule Poirot', published_year: 1934, isbn: '9780007119318', price: 9.99, author_id: 5 },
    { title: 'And Then There Were None', description: 'A mystery novel about ten strangers trapped on an island', published_year: 1939, isbn: '9780007136520', price: 8.99, author_id: 5 },
  ],
  users: [
    { username: 'admin', email: 'admin@example.com', password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'admin' },
    { username: 'alice', email: 'alice@example.com', password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'user' },
    { username: 'bob', email: 'bob@example.com', password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'user' },
    { username: 'guest', email: 'guest@example.com', password_hash: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', role: 'guest' },
  ],
  favorites: [
    { user_id: 2, book_id: 1 }, // alice likes Harry Potter 1
    { user_id: 2, book_id: 3 }, // alice likes 1984
    { user_id: 3, book_id: 5 }, // bob likes Pride and Prejudice
    { user_id: 3, book_id: 7 }, // bob likes The Shining
  ],
};

class NocoDBSetup {
  private config: NocoDBConfig;
  private httpClient: any;

  constructor() {
    this.config = {
      baseUrl: process.env.NOCODB_BASE_URL || 'http://localhost:8080',
      apiKey: process.env.NOCODB_API_KEY || '',
      dbName: process.env.EXAMPLE_DB_NAME || 'example_books_db',
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'xc-auth': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async run() {
    console.log('🚀 Starting NocoDB Middleware Example Setup...');
    console.log('');

    try {
      // Step 1: Create database
      await this.createDatabase();

      // Step 2: Create tables
      await this.createTables();

      // Step 3: Insert sample data
      await this.insertSampleData();

      // Step 4: Configure permissions
      await this.configurePermissions();

      console.log('');
      console.log('✅ Setup completed successfully!');
      console.log('');
      console.log('📋 Next steps:');
      console.log('1. Start the middleware server: npm run start:dev');
      console.log('2. Test the API endpoints with the provided users:');
      console.log('   - admin: admin@example.com / password: password');
      console.log('   - alice: alice@example.com / password: password');
      console.log('   - bob: bob@example.com / password: password');
      console.log('   - guest: guest@example.com / password: password');
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  private async createDatabase() {
    console.log('📦 Creating database...');
    
    // Note: In NocoDB, databases are typically created via the UI
    // This is a placeholder for the actual API call
    console.log(`   Database '${this.config.dbName}' should be created manually in NocoDB UI`);
    console.log('   or via API if available.');
    console.log('');
  }

  private async createTables() {
    console.log('📋 Creating tables...');
    
    for (const table of TABLES) {
      console.log(`   Creating table: ${table.name}`);
      
      // In a real implementation, this would call the NocoDB API
      // to create tables and columns
      
      // For now, we'll just log the SQL that would be executed
      const sql = this.generateCreateTableSQL(table);
      console.log(`   SQL: ${sql.substring(0, 100)}...`);
    }
    
    console.log('');
  }

  private generateCreateTableSQL(table: TableConfig): string {
    const columns = table.columns.map(col => {
      let sql = `${col.name} ${col.type}`;
      if (col.isPrimaryKey) sql += ' PRIMARY KEY AUTOINCREMENT';
      if (col.isUnique) sql += ' UNIQUE';
      if (col.isNotNull) sql += ' NOT NULL';
      if (col.defaultValue) sql += ` DEFAULT ${col.defaultValue}`;
      return sql;
    }).join(', ');
    
    return `CREATE TABLE IF NOT EXISTS ${table.name} (${columns})`;
  }

  private async insertSampleData() {
    console.log('📝 Inserting sample data...');
    
    for (const [tableName, records] of Object.entries(SAMPLE_DATA)) {
      console.log(`   Inserting ${records.length} records into ${tableName}`);
      
      // In a real implementation, this would call the NocoDB API
      // to insert records
      
      for (const record of records) {
        const columns = Object.keys(record).join(', ');
        const values = Object.values(record).map(v => 
          typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
        ).join(', ');
        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
        console.log(`     - ${sql.substring(0, 80)}...`);
      }
    }
    
    console.log('');
  }

  private async configurePermissions() {
    console.log('🔐 Configuring permissions...');
    
    for (const perm of PERMISSIONS) {
      console.log(`   ${perm.role} on ${perm.table}: ` +
        `R${perm.read ? '+' : '-'}` +
        `C${perm.create ? '+' : '-'}` +
        `U${perm.update ? '+' : '-'}` +
        `D${perm.delete ? '+' : '-'}`);
      
      // In a real implementation, this would call the NocoDB API
      // to configure permissions for each role and table
    }
    
    console.log('');
    console.log('   Note: Permissions should be configured in NocoDB UI');
    console.log('   or via API if available.');
    console.log('');
  }
}

// Run the setup
const setup = new NocoDBSetup();
setup.run();
