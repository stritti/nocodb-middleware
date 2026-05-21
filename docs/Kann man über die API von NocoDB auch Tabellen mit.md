# Kann man über die API von NocoDB auch Tabellen mit Spalten anlegen?

Ja, über die API von NocoDB kannst du sowohl Tabellen als auch deren Spalten anlegen – allerdings erfolgt dies nicht direkt mit einer einzigen „create table“-API wie bei klassischen RDBMS, sondern in mehreren Schritten oder über Meta-APIs, die regelmäßig aktualisiert werden.

### Tabellen anlegen per API

Zum Anlegen einer neuen Tabelle kannst du je nach Version und Setup die Meta-API verwenden, die in der Dokumentation als „Table Operations“ aufgeführt ist. Damit lässt sich prüfen, ob eine Tabelle existiert, sie ggf. erstellen und wiederum alle Tabellen im Workspace auflisten. Die Verwaltung läuft üblicherweise über das API-Endpunkt-Schema „/api/v1/db/meta“, wobei Details in der OpenAPI-Beschreibung für deine NC-Instanz einsehbar sind. Importfunktionen (CSV, Excel, JSON) bieten ebenfalls eine Möglichkeit, neue Tabellen inklusive Spalten via API zu erstellen.[^1_6][^1_9][^1_10]

### Spalten anlegen per API

Die API unterstützt das Anlegen (und Löschen) von Spalten über Endpunkte wie zum Beispiel „add_column“ oder vergleichbare Routen. Du kannst für eine bestehende Tabelle also per REST-Request einzelne Felder (Spalten) hinzufügen. Das Hinzufügen von Spalten erfolgt, indem du Namen, Typ und ggf. weitere Meta-Informationen in der Payload an das API schickst.[^1_8][^1_6]

### Beispiel-Vorgehen (übersichtlich)

- Erstelle eine neue Tabelle über die API oder per Import (CSV/JSON) mit Konfiguration der Spalten.
- Alternativ oder ergänzend füge per API einzelne Spalten hinzu („add_column“).


### Hinweise

- Die genaue API-Struktur und Payload hängen von deiner NocoDB-Version ab.
- Manche Meta-API-Features befinden sich regelmäßig in Entwicklung, daher immer gegen die OpenAPI-Spezifikation oder deine Instanz prüfen.

Für moderne Anwendungen, z. B. in Verbindung mit NestJS, bietet sich eine generische Implementierung an, die diese Requests kapselt und bei Bedarf dynamisch Tabellen und Spalten für dein Datenmodell erstellt – darunter robust mit Authentifizierung und Fehlerbehandlung.[^1_9][^1_10][^1_6]
<span style="display:none">[^1_1][^1_11][^1_12][^1_13][^1_14][^1_15][^1_16][^1_2][^1_3][^1_4][^1_5][^1_7]</span>

<div align="center">⁂</div>

[^1_1]: https://community.nocodb.com/t/can-we-create-tables-through-meta-api-v2/2064

[^1_2]: https://github.com/nocodb/nocodb/issues/1430

[^1_3]: https://www.youtube.com/watch?v=EyWKg9CsHks

[^1_4]: https://www.reddit.com/r/selfhosted/comments/wezor8/nocodb_really_an_excel_replacement/

[^1_5]: https://www.youtube.com/watch?v=P61bhhTn16c

[^1_6]: https://www.flowhunt.io/de/integrationen/nocodb/

[^1_7]: https://julianguttzeit.de/custom-gpt-datenbankanbindung-chatgpt-nocodb/

[^1_8]: https://nocodb.com/docs/product-docs/fields

[^1_9]: https://nocodb.com/docs/scripts/examples/demo/table-operations

[^1_10]: https://nocodb.com/docs/product-docs/tables/create-table-via-import

[^1_11]: https://www.productivix.com/de/page/anzeige-gehosteten-daten-no-code-tabelle/

[^1_12]: https://www.reddit.com/r/selfhosted/comments/ywsxd2/open_source_spreadsheet_with_external_api/

[^1_13]: https://www.flowhunt.io/de/mcp-servers/nocodb/

[^1_14]: https://nocodb.com/docs/product-docs/table-details

[^1_15]: https://community.nocodb.com/t/is-it-possible-to-create-a-database-via-the-rest-api/1241

[^1_16]: https://www.youtube.com/watch?v=lykVzrSjEVk


---

# Ich würde gerne über Nest.js beim Start der Anwendung prüfen, ob in einem über .env konfigurierbaren Workspace die Tabellen für das User-/Rollenmanagement existieren. Wenn nicht, sollen diese automatisch über die API angelegt werden. Inklusive den notwendigen Spalten. Dazu sollte die aktuelle API von NocoDB verwendet werden.

Ja, du kannst über die NocoDB Meta API v2 gezielt Tabellen und Spalten programmatisch anlegen. Für dein Szenario mit NestJS beim Application-Start ist `OnModuleInit` der perfekte Lifecycle-Hook, um die Tabellenstruktur für User-/Rollenmanagement zu initialisieren.[^2_1][^2_2]

## Architektur-Überblick

Die Lösung besteht aus drei Komponenten: einem **ConfigModule** für Umgebungsvariablen, einem **NocoDBService** für API-Interaktionen und einem **InitializationService**, der beim Start die Tabellenstruktur prüft und ggf. anlegt.[^2_3][^2_1]

## Implementation

### 1. Umgebungskonfiguration (.env)

```env
NOCODB_API_URL=https://app.nocodb.com
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here
```


### 2. NocoDB Service

Erstelle einen Service für alle API-Operationen:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class NocoDBService {
  private readonly logger = new Logger(NocoDBService.name);
  private readonly client: AxiosInstance;
  private readonly baseId: string;

  constructor(private configService: ConfigService) {
    const apiUrl = this.configService.get<string>('NOCODB_API_URL');
    const apiToken = this.configService.get<string>('NOCODB_API_TOKEN');
    this.baseId = this.configService.get<string>('NOCODB_BASE_ID');

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'xc-token': apiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Prüft ob eine Tabelle existiert
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const response = await this.client.get(
        `/api/v2/meta/bases/${this.baseId}/tables`
      );
      
      const tables = response.data.list || [];
      return tables.some((table: any) => table.table_name === tableName);
    } catch (error) {
      this.logger.error(`Fehler beim Prüfen der Tabelle ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Tabelle
   */
  async createTable(tableName: string, title: string): Promise<any> {
    try {
      const response = await this.client.post(
        `/api/v2/meta/bases/${this.baseId}/tables`,
        {
          table_name: tableName,
          title: title,
        }
      );
      
      this.logger.log(`Tabelle ${tableName} erfolgreich erstellt`);
      return response.data;
    } catch (error) {
      this.logger.error(`Fehler beim Erstellen der Tabelle ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Spalte in einer Tabelle
   */
  async createColumn(
    tableId: string,
    columnName: string,
    columnType: string,
    title?: string,
    additionalOptions?: any
  ): Promise<any> {
    try {
      const payload = {
        column_name: columnName,
        title: title || columnName,
        uidt: columnType, // UI Data Type
        ...additionalOptions,
      };

      const response = await this.client.post(
        `/api/v2/meta/tables/${tableId}/columns`,
        payload
      );

      this.logger.log(`Spalte ${columnName} in Tabelle ${tableId} erstellt`);
      return response.data;
    } catch (error) {
      this.logger.error(`Fehler beim Erstellen der Spalte ${columnName}:`, error);
      throw error;
    }
  }

  /**
   * Holt Tabellen-Details inkl. ID
   */
  async getTableByName(tableName: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/api/v2/meta/bases/${this.baseId}/tables`
      );
      
      const tables = response.data.list || [];
      return tables.find((table: any) => table.table_name === tableName);
    } catch (error) {
      this.logger.error(`Fehler beim Abrufen der Tabelle ${tableName}:`, error);
      throw error;
    }
  }
}
```


### 3. Initialization Service

Service für die automatische Tabellen-Initialisierung beim Start:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';

interface ColumnDefinition {
  name: string;
  title: string;
  type: string;
  options?: any;
}

interface TableDefinition {
  tableName: string;
  title: string;
  columns: ColumnDefinition[];
}

@Injectable()
export class DatabaseInitializationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitializationService.name);

  constructor(private nocoDBService: NocoDBService) {}

  async onModuleInit() {
    this.logger.log('Starte Datenbank-Initialisierung...');
    await this.initializeTables();
    this.logger.log('Datenbank-Initialisierung abgeschlossen');
  }

  private async initializeTables() {
    const tableDefinitions: TableDefinition[] = [
      {
        tableName: 'users',
        title: 'Users',
        columns: [
          { name: 'username', title: 'Username', type: 'SingleLineText' },
          { name: 'email', title: 'Email', type: 'Email' },
          { name: 'password_hash', title: 'Password Hash', type: 'LongText' },
          { name: 'is_active', title: 'Is Active', type: 'Checkbox' },
          { name: 'created_at', title: 'Created At', type: 'DateTime' },
          { name: 'updated_at', title: 'Updated At', type: 'DateTime' },
        ],
      },
      {
        tableName: 'roles',
        title: 'Roles',
        columns: [
          { name: 'role_name', title: 'Role Name', type: 'SingleLineText' },
          { name: 'description', title: 'Description', type: 'LongText' },
          {
            name: 'permissions',
            title: 'Permissions',
            type: 'MultiSelect',
            options: {
              options: [
                { title: 'read', color: 'blue' },
                { title: 'write', color: 'green' },
                { title: 'delete', color: 'red' },
                { title: 'admin', color: 'purple' },
              ],
            },
          },
          { name: 'created_at', title: 'Created At', type: 'DateTime' },
        ],
      },
      {
        tableName: 'user_roles',
        title: 'User Roles',
        columns: [
          { name: 'user_id', title: 'User ID', type: 'Number' },
          { name: 'role_id', title: 'Role ID', type: 'Number' },
          { name: 'assigned_at', title: 'Assigned At', type: 'DateTime' },
        ],
      },
    ];

    for (const tableDef of tableDefinitions) {
      await this.ensureTableExists(tableDef);
    }

    // Optional: Link-Beziehungen nach Tabellenerstellung einrichten
    await this.setupRelationships();
  }

  private async ensureTableExists(tableDef: TableDefinition) {
    const exists = await this.nocoDBService.tableExists(tableDef.tableName);

    if (exists) {
      this.logger.log(`Tabelle ${tableDef.tableName} existiert bereits`);
      return;
    }

    this.logger.log(`Erstelle Tabelle ${tableDef.tableName}...`);
    
    // Tabelle erstellen
    const table = await this.nocoDBService.createTable(
      tableDef.tableName,
      tableDef.title
    );

    // Kurze Verzögerung für API-Stabilität
    await this.delay(1000);

    // Spalten hinzufügen
    for (const column of tableDef.columns) {
      await this.nocoDBService.createColumn(
        table.id,
        column.name,
        column.type,
        column.title,
        column.options
      );
      
      // Verzögerung zwischen Spalten-Erstellung
      await this.delay(500);
    }

    this.logger.log(`Tabelle ${tableDef.tableName} vollständig erstellt`);
  }

  private async setupRelationships() {
    // Hier könnten Link-Beziehungen zwischen Tabellen erstellt werden
    // z.B. users -> user_roles <- roles
    this.logger.log('Beziehungen werden eingerichtet...');
    
    // Beispiel für Link-Spalte (auskommentiert, da tabellenspezifisch)
    /*
    const usersTable = await this.nocoDBService.getTableByName('users');
    const rolesTable = await this.nocoDBService.getTableByName('roles');
    
    await this.nocoDBService.createColumn(
      usersTable.id,
      'roles',
      'LinkToAnotherRecord',
      'User Roles',
      {
        type: 'mm',
        childId: rolesTable.id,
        childColumn: 'role_name',
        parentColumn: 'username',
      }
    );
    */
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```


### 4. Module-Konfiguration

Binde alles im AppModule zusammen:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NocoDBService } from './nocodb/nocodb.service';
import { DatabaseInitializationService } from './nocodb/database-initialization.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [NocoDBService, DatabaseInitializationService],
})
export class AppModule {}
```


## Wichtige NocoDB-Spaltentypen

Die gängigsten `uidt` (UI Data Types) für Spalten sind:[^2_4][^2_5]

- **SingleLineText**: Einzeiliger Text
- **LongText**: Mehrzeiliger Text
- **Email**: Email-Validierung
- **Number**: Numerische Werte
- **Checkbox**: Boolean-Werte
- **DateTime**: Datum/Zeit
- **SingleSelect**: Auswahl-Dropdown (einfach)
- **MultiSelect**: Auswahl-Dropdown (mehrfach)
- **LinkToAnotherRecord**: Beziehungen zwischen Tabellen


## Hinweise zur Produktion

**Fehlerbehandlung**: Implementiere Retry-Logik für API-Calls, da NocoDB bei schnellen aufeinanderfolgenden Requests Rate-Limits haben kann.[^2_6][^2_3]

**Idempotenz**: Die Lösung prüft vor dem Anlegen, ob Tabellen existieren – bei wiederholtem Start werden keine Duplikate erstellt.[^2_7][^2_8]

**Authentifizierung**: Der API-Token sollte über ein Secret-Management-System (z.B. Vault, AWS Secrets Manager) statt direkt in `.env` verwaltet werden.[^2_9][^2_3]

**Swagger-Dokumentation**: Deine NocoDB-Instanz bietet eine OpenAPI-Spezifikation unter `{nocodb_url}/api/v2/meta/bases/{base_id}/swagger.json` zur Referenz aller verfügbaren Endpunkte.[^2_10][^2_11]

Diese Implementierung stellt sicher, dass beim Start deiner NestJS-Anwendung automatisch die benötigte Datenbank-Struktur für User- und Rollenmanagement in NocoDB vorhanden ist.[^2_2][^2_3][^2_1]
<span style="display:none">[^2_12][^2_13][^2_14][^2_15][^2_16][^2_17][^2_18][^2_19][^2_20][^2_21][^2_22][^2_23][^2_24][^2_25][^2_26][^2_27][^2_28][^2_29][^2_30]</span>

<div align="center">⁂</div>

[^2_1]: https://docs.nestjs.com/fundamentals/lifecycle-events

[^2_2]: https://blog.stackademic.com/advanced-guide-to-lifecycle-events-in-nestjs-ab2b5fbfeb65

[^2_3]: https://nocodb.com/docs/product-docs/developer-resources/rest-apis

[^2_4]: https://nocodb.com/apis/v2/meta

[^2_5]: https://nocodb.com/docs/scripts/api-reference/field

[^2_6]: https://www.reddit.com/r/NocoDB/comments/1mdnteo/api_broken/

[^2_7]: https://nocodb.com/docs/scripts/examples/demo/table-operations

[^2_8]: https://nocodb.com/docs/scripts/api-reference/base

[^2_9]: https://github.com/nocodb/nocodb/discussions/9228

[^2_10]: https://community.nocodb.com/t/can-we-create-tables-through-meta-api-v2/2064

[^2_11]: https://github.com/nocodb/nocodb/discussions/7878

[^2_12]: https://github.com/nocodb/nocodb/issues/9073

[^2_13]: https://github.com/nocodb/nocodb/issues/1430

[^2_14]: https://github.com/nocodb/nocodb/issues/7119

[^2_15]: https://github.com/nocodb/nocodb/discussions/3663

[^2_16]: https://github.com/nocodb/nocodb/issues/1036

[^2_17]: https://github.com/nocodb/nocodb/issues/9298

[^2_18]: https://docs.nestjs.com/migration-guide

[^2_19]: https://github.com/nocodb/nocodb/issues/11740

[^2_20]: https://github.com/nocodb/nocodb/releases

[^2_21]: https://github.com/nocodb/nocodb/discussions/369

[^2_22]: https://github.com/nocodb/nocodb/discussions/2373

[^2_23]: https://nocodb.com/docs/product-docs/developer-resources/rest-apis/upload-via-api

[^2_24]: https://github.com/nocodb/nocodb/discussions/8956

[^2_25]: https://github.com/nocodb/nocodb/issues/7879

[^2_26]: https://github.com/nocodb/nocodb/issues/2809

[^2_27]: https://nocodb.com/apis/v2/data

[^2_28]: https://www.reddit.com/r/NocoDB/comments/1j01xuk/api_record_posting/

[^2_29]: https://community.nocodb.com/t/is-it-possible-to-create-a-database-via-the-rest-api/1241

[^2_30]: https://communaltech.hashnode.dev/uploading-files-to-nocodb-with-python


---

# Kannst du den Code noch anpassen, dass man ggfs. die Tabellen mit einem konfigurierbaren Präfix versehen kann?

Ja, ich passe den Code an, um ein konfigurierbares Tabellen-Präfix zu unterstützen. Das ermöglicht dir, verschiedene Umgebungen (dev, staging, prod) oder Mandanten sauber zu trennen.[^3_1][^3_2]

## Angepasste Implementation

### 1. Erweiterte .env-Konfiguration

```env
NOCODB_API_URL=https://app.nocodb.com
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here
NOCODB_TABLE_PREFIX=app_
```


### 2. Angepasster NocoDB Service

Der Service nutzt das Präfix bei allen Tabellen-Operationen:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class NocoDBService {
  private readonly logger = new Logger(NocoDBService.name);
  private readonly client: AxiosInstance;
  private readonly baseId: string;
  private readonly tablePrefix: string;

  constructor(private configService: ConfigService) {
    const apiUrl = this.configService.get<string>('NOCODB_API_URL');
    const apiToken = this.configService.get<string>('NOCODB_API_TOKEN');
    this.baseId = this.configService.get<string>('NOCODB_BASE_ID');
    this.tablePrefix = this.configService.get<string>('NOCODB_TABLE_PREFIX', '');

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'xc-token': apiToken,
        'Content-Type': 'application/json',
      },
    });

    if (this.tablePrefix) {
      this.logger.log(`Tabellen-Präfix aktiviert: "${this.tablePrefix}"`);
    }
  }

  /**
   * Fügt das konfigurierte Präfix zu einem Tabellennamen hinzu
   */
  private getPrefixedTableName(tableName: string): string {
    return `${this.tablePrefix}${tableName}`;
  }

  /**
   * Prüft ob eine Tabelle existiert
   */
  async tableExists(tableName: string): Promise<boolean> {
    const prefixedName = this.getPrefixedTableName(tableName);
    
    try {
      const response = await this.client.get(
        `/api/v2/meta/bases/${this.baseId}/tables`
      );
      
      const tables = response.data.list || [];
      return tables.some((table: any) => table.table_name === prefixedName);
    } catch (error) {
      this.logger.error(`Fehler beim Prüfen der Tabelle ${prefixedName}:`, error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Tabelle mit Präfix
   */
  async createTable(tableName: string, title: string): Promise<any> {
    const prefixedName = this.getPrefixedTableName(tableName);
    const prefixedTitle = this.getPrefixedTableName(title);
    
    try {
      const response = await this.client.post(
        `/api/v2/meta/bases/${this.baseId}/tables`,
        {
          table_name: prefixedName,
          title: prefixedTitle,
        }
      );
      
      this.logger.log(`Tabelle ${prefixedName} erfolgreich erstellt`);
      return response.data;
    } catch (error) {
      this.logger.error(`Fehler beim Erstellen der Tabelle ${prefixedName}:`, error);
      throw error;
    }
  }

  /**
   * Erstellt eine neue Spalte in einer Tabelle
   */
  async createColumn(
    tableId: string,
    columnName: string,
    columnType: string,
    title?: string,
    additionalOptions?: any
  ): Promise<any> {
    try {
      const payload = {
        column_name: columnName,
        title: title || columnName,
        uidt: columnType,
        ...additionalOptions,
      };

      const response = await this.client.post(
        `/api/v2/meta/tables/${tableId}/columns`,
        payload
      );

      this.logger.log(`Spalte ${columnName} in Tabelle ${tableId} erstellt`);
      return response.data;
    } catch (error) {
      this.logger.error(`Fehler beim Erstellen der Spalte ${columnName}:`, error);
      throw error;
    }
  }

  /**
   * Holt Tabellen-Details inkl. ID (mit Präfix-Suche)
   */
  async getTableByName(tableName: string): Promise<any> {
    const prefixedName = this.getPrefixedTableName(tableName);
    
    try {
      const response = await this.client.get(
        `/api/v2/meta/bases/${this.baseId}/tables`
      );
      
      const tables = response.data.list || [];
      return tables.find((table: any) => table.table_name === prefixedName);
    } catch (error) {
      this.logger.error(`Fehler beim Abrufen der Tabelle ${prefixedName}:`, error);
      throw error;
    }
  }

  /**
   * Gibt das konfigurierte Tabellen-Präfix zurück
   */
  getTablePrefix(): string {
    return this.tablePrefix;
  }
}
```


### 3. Angepasster Initialization Service

Der Service bleibt nahezu identisch, da das Präfix transparent im NocoDBService behandelt wird:

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NocoDBService } from './nocodb.service';

interface ColumnDefinition {
  name: string;
  title: string;
  type: string;
  options?: any;
}

interface TableDefinition {
  tableName: string;
  title: string;
  columns: ColumnDefinition[];
}

@Injectable()
export class DatabaseInitializationService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseInitializationService.name);

  constructor(private nocoDBService: NocoDBService) {}

  async onModuleInit() {
    const prefix = this.nocoDBService.getTablePrefix();
    const prefixInfo = prefix ? ` mit Präfix "${prefix}"` : '';
    
    this.logger.log(`Starte Datenbank-Initialisierung${prefixInfo}...`);
    await this.initializeTables();
    this.logger.log('Datenbank-Initialisierung abgeschlossen');
  }

  private async initializeTables() {
    // Tabellennamen OHNE Präfix definieren - das Präfix wird automatisch hinzugefügt
    const tableDefinitions: TableDefinition[] = [
      {
        tableName: 'users',
        title: 'Users',
        columns: [
          { name: 'username', title: 'Username', type: 'SingleLineText' },
          { name: 'email', title: 'Email', type: 'Email' },
          { name: 'password_hash', title: 'Password Hash', type: 'LongText' },
          { name: 'is_active', title: 'Is Active', type: 'Checkbox' },
          { name: 'created_at', title: 'Created At', type: 'DateTime' },
          { name: 'updated_at', title: 'Updated At', type: 'DateTime' },
        ],
      },
      {
        tableName: 'roles',
        title: 'Roles',
        columns: [
          { name: 'role_name', title: 'Role Name', type: 'SingleLineText' },
          { name: 'description', title: 'Description', type: 'LongText' },
          {
            name: 'permissions',
            title: 'Permissions',
            type: 'MultiSelect',
            options: {
              options: [
                { title: 'read', color: 'blue' },
                { title: 'write', color: 'green' },
                { title: 'delete', color: 'red' },
                { title: 'admin', color: 'purple' },
              ],
            },
          },
          { name: 'created_at', title: 'Created At', type: 'DateTime' },
        ],
      },
      {
        tableName: 'user_roles',
        title: 'User Roles',
        columns: [
          { name: 'user_id', title: 'User ID', type: 'Number' },
          { name: 'role_id', title: 'Role ID', type: 'Number' },
          { name: 'assigned_at', title: 'Assigned At', type: 'DateTime' },
        ],
      },
    ];

    for (const tableDef of tableDefinitions) {
      await this.ensureTableExists(tableDef);
    }

    await this.setupRelationships();
  }

  private async ensureTableExists(tableDef: TableDefinition) {
    const exists = await this.nocoDBService.tableExists(tableDef.tableName);
    const prefix = this.nocoDBService.getTablePrefix();
    const fullTableName = `${prefix}${tableDef.tableName}`;

    if (exists) {
      this.logger.log(`Tabelle ${fullTableName} existiert bereits`);
      return;
    }

    this.logger.log(`Erstelle Tabelle ${fullTableName}...`);
    
    const table = await this.nocoDBService.createTable(
      tableDef.tableName,
      tableDef.title
    );

    await this.delay(1000);

    for (const column of tableDef.columns) {
      await this.nocoDBService.createColumn(
        table.id,
        column.name,
        column.type,
        column.title,
        column.options
      );
      
      await this.delay(500);
    }

    this.logger.log(`Tabelle ${fullTableName} vollständig erstellt`);
  }

  private async setupRelationships() {
    this.logger.log('Beziehungen werden eingerichtet...');
    // Beziehungs-Logik bleibt unverändert
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```


### 4. Optionale Validierung

Für Produktionsumgebungen empfiehlt sich eine Validierung der Umgebungsvariablen mit Joi:[^3_3][^3_4]

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { NocoDBService } from './nocodb/nocodb.service';
import { DatabaseInitializationService } from './nocodb/database-initialization.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        NOCODB_API_URL: Joi.string().uri().required(),
        NOCODB_API_TOKEN: Joi.string().required(),
        NOCODB_BASE_ID: Joi.string().required(),
        NOCODB_TABLE_PREFIX: Joi.string().default('').allow(''),
      }),
    }),
  ],
  providers: [NocoDBService, DatabaseInitializationService],
})
export class AppModule {}
```


## Verwendungsbeispiele

### Entwicklungsumgebung (.env.development)

```env
NOCODB_TABLE_PREFIX=dev_
```

Erzeugt: `dev_users`, `dev_roles`, `dev_user_roles`

### Produktionsumgebung (.env.production)

```env
NOCODB_TABLE_PREFIX=prod_
```

Erzeugt: `prod_users`, `prod_roles`, `prod_user_roles`

### Mandantenfähigkeit (.env)

```env
NOCODB_TABLE_PREFIX=tenant_abc_
```

Erzeugt: `tenant_abc_users`, `tenant_abc_roles`, `tenant_abc_user_roles`

### Ohne Präfix

```env
NOCODB_TABLE_PREFIX=
```

Erzeugt: `users`, `roles`, `user_roles`

## Best Practices

**Konsistente Namenskonventionen**: Verwende Trennzeichen wie `_` am Ende des Präfix für bessere Lesbarkeit (`app_users` statt `appusers`).[^3_5][^3_1]

**Umgebungsspezifische .env-Dateien**: Nutze `.env.development`, `.env.staging`, `.env.production` für unterschiedliche Konfigurationen.[^3_6][^3_2]

**Default-Wert**: Der Code verwendet einen leeren String als Default, sodass das Präfix optional ist.[^3_1][^3_3]

**Logging**: Die Implementierung loggt das aktive Präfix beim Start, sodass du sofort siehst, welche Konfiguration aktiv ist.[^3_7][^3_5]

Diese Lösung macht deine NestJS-Anwendung flexibel für verschiedene Deployment-Szenarien, ohne den Code anpassen zu müssen – nur die Umgebungsvariablen ändern sich.[^3_2][^3_4][^3_1]
<span style="display:none">[^3_10][^3_11][^3_12][^3_13][^3_14][^3_15][^3_16][^3_17][^3_8][^3_9]</span>

<div align="center">⁂</div>

[^3_1]: https://docs.nestjs.com/techniques/configuration

[^3_2]: https://dev.to/vishnucprasad/managing-configuration-and-environment-variables-in-nestjs-28ni

[^3_3]: https://www.devcentrehouse.eu/blogs/using-environment-variables-in-nestjs-projects/

[^3_4]: https://felixastner.com/articles/nestjs-env-db-setup

[^3_5]: https://www.tomray.dev/nestjs-config

[^3_6]: https://www.youtube.com/watch?v=ZF9jV6xdcv0

[^3_7]: https://docs.nestjs.com/techniques/logger

[^3_8]: https://docs.nestjs.com/fundamentals/custom-providers

[^3_9]: https://docs.nestjs.com/fundamentals/dynamic-modules

[^3_10]: https://docs.nestjs.com/migration-guide

[^3_11]: https://docs.nestjs.com/security/authentication

[^3_12]: https://docs.nestjs.com/faq/common-errors

[^3_13]: https://docs.nestjs.com/techniques/caching

[^3_14]: https://docs.nestjs.com/recipes/prisma

[^3_15]: https://docs.nestjs.com/microservices/basics

[^3_16]: https://stackoverflow.com/questions/53426486/best-practice-to-use-config-service-in-nestjs-module

[^3_17]: https://www.reddit.com/r/Nestjs_framework/comments/jwikg7/best_practice_for_configuring_different_db_types/


---

# Jetzt benötigen wir noch ein Mapping Von der Rolle auf die konkreten Berechtigung für die CRUD-Operationen aller verfügbaren Tabellen im konfigurierten Workspace.

Ich erstelle dir jetzt ein vollständiges RBAC-System mit granularen CRUD-Berechtigungen für alle Tabellen im NocoDB Workspace. Das System nutzt einen Claims-based Authorization Ansatz, der flexibler ist als reines Rollen-Mapping.[^4_1][^4_2]

## Erweiterte Tabellenstruktur

### 1. Permissions-Tabelle in der Initialisierung

Erweitere den `DatabaseInitializationService` um eine Permissions-Tabelle:

```typescript
private async initializeTables() {
  const tableDefinitions: TableDefinition[] = [
    {
      tableName: 'users',
      title: 'Users',
      columns: [
        { name: 'username', title: 'Username', type: 'SingleLineText' },
        { name: 'email', title: 'Email', type: 'Email' },
        { name: 'password_hash', title: 'Password Hash', type: 'LongText' },
        { name: 'is_active', title: 'Is Active', type: 'Checkbox' },
        { name: 'created_at', title: 'Created At', type: 'DateTime' },
        { name: 'updated_at', title: 'Updated At', type: 'DateTime' },
      ],
    },
    {
      tableName: 'roles',
      title: 'Roles',
      columns: [
        { name: 'role_name', title: 'Role Name', type: 'SingleLineText' },
        { name: 'description', title: 'Description', type: 'LongText' },
        { name: 'is_system_role', title: 'Is System Role', type: 'Checkbox' },
        { name: 'created_at', title: 'Created At', type: 'DateTime' },
      ],
    },
    {
      tableName: 'user_roles',
      title: 'User Roles',
      columns: [
        { name: 'user_id', title: 'User ID', type: 'Number' },
        { name: 'role_id', title: 'Role ID', type: 'Number' },
        { name: 'assigned_at', title: 'Assigned At', type: 'DateTime' },
      ],
    },
    {
      tableName: 'table_permissions',
      title: 'Table Permissions',
      columns: [
        { name: 'role_id', title: 'Role ID', type: 'Number' },
        { name: 'table_name', title: 'Table Name', type: 'SingleLineText' },
        { name: 'can_create', title: 'Can Create', type: 'Checkbox' },
        { name: 'can_read', title: 'Can Read', type: 'Checkbox' },
        { name: 'can_update', title: 'Can Update', type: 'Checkbox' },
        { name: 'can_delete', title: 'Can Delete', type: 'Checkbox' },
        { name: 'created_at', title: 'Created At', type: 'DateTime' },
        { name: 'updated_at', title: 'Updated At', type: 'DateTime' },
      ],
    },
  ];

  for (const tableDef of tableDefinitions) {
    await this.ensureTableExists(tableDef);
  }

  // Default-Berechtigungen für Admin-Rolle anlegen
  await this.seedDefaultPermissions();
}

private async seedDefaultPermissions() {
  this.logger.log('Erstelle Standard-Berechtigungen...');
  
  // Admin-Rolle anlegen
  // User-Rolle anlegen
  // Standard-Permissions für beide Rollen auf alle Tabellen setzen
  // Details in einem separaten Seeding-Service
}
```


### 2. Permission Types und Enums

Erstelle Type-Definitionen für das Permission-System:

```typescript
// src/permissions/enums/crud-action.enum.ts
export enum CrudAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}

// src/permissions/interfaces/permission.interface.ts
export interface TablePermission {
  roleId: number;
  tableName: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface UserPermissions {
  userId: number;
  username: string;
  roles: string[];
  permissions: Map<string, Set<CrudAction>>;
}
```


### 3. Permissions Service

Service für die Verwaltung und Abfrage von Berechtigungen:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { CrudAction } from './enums/crud-action.enum';
import { TablePermission, UserPermissions } from './interfaces/permission.interface';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private permissionsCache: Map<number, UserPermissions> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

  constructor(private nocoDBService: NocoDBService) {}

  /**
   * Ruft alle Tabellen im konfigurierten Workspace ab
   */
  async getAllWorkspaceTables(): Promise<string[]> {
    try {
      const response = await this.nocoDBService.getClient().get(
        `/api/v2/meta/bases/${this.nocoDBService.getBaseId()}/tables`
      );

      const tables = response.data.list || [];
      const prefix = this.nocoDBService.getTablePrefix();
      
      // Filtere nur Tabellen mit dem konfigurierten Präfix
      return tables
        .map((table: any) => table.table_name)
        .filter((name: string) => 
          prefix ? name.startsWith(prefix) : true
        );
    } catch (error) {
      this.logger.error('Fehler beim Abrufen der Workspace-Tabellen:', error);
      throw error;
    }
  }

  /**
   * Lädt alle Berechtigungen eines Users
   */
  async getUserPermissions(userId: number): Promise<UserPermissions> {
    // Cache-Check
    const cached = this.permissionsCache.get(userId);
    if (cached) {
      return cached;
    }

    try {
      // 1. Hole User mit Rollen
      const userRolesTable = await this.nocoDBService.getTableByName('user_roles');
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      const usersTable = await this.nocoDBService.getTableByName('users');

      // User-Daten abrufen
      const userResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${usersTable.id}/records/${userId}`
      );
      const user = userResponse.data;

      // User-Rollen abrufen
      const userRolesResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user_id,eq,${userId})`,
          },
        }
      );

      const roleIds = userRolesResponse.data.list.map((ur: any) => ur.role_id);
      
      if (roleIds.length === 0) {
        this.logger.warn(`User ${userId} hat keine zugewiesenen Rollen`);
        return this.createEmptyPermissions(userId, user.username);
      }

      // 2. Hole Rollen-Informationen
      const rolesResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          params: {
            where: `(Id,in,${roleIds.join(',')})`,
          },
        }
      );

      const roles = rolesResponse.data.list;
      const roleNames = roles.map((r: any) => r.role_name);

      // 3. Hole Table-Permissions für alle Rollen
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');
      const permissionsResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role_id,in,${roleIds.join(',')})`,
          },
        }
      );

      // 4. Aggregiere Permissions (OR-Logik: wenn eine Rolle Zugriff hat, hat der User Zugriff)
      const permissionsMap = new Map<string, Set<CrudAction>>();
      
      for (const perm of permissionsResponse.data.list) {
        const tableName = perm.table_name;
        
        if (!permissionsMap.has(tableName)) {
          permissionsMap.set(tableName, new Set());
        }
        
        const actions = permissionsMap.get(tableName)!;
        
        if (perm.can_create) actions.add(CrudAction.CREATE);
        if (perm.can_read) actions.add(CrudAction.READ);
        if (perm.can_update) actions.add(CrudAction.UPDATE);
        if (perm.can_delete) actions.add(CrudAction.DELETE);
      }

      const userPermissions: UserPermissions = {
        userId,
        username: user.username,
        roles: roleNames,
        permissions: permissionsMap,
      };

      // Cache für TTL
      this.permissionsCache.set(userId, userPermissions);
      setTimeout(() => this.permissionsCache.delete(userId), this.CACHE_TTL);

      return userPermissions;
    } catch (error) {
      this.logger.error(`Fehler beim Laden der Berechtigungen für User ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Prüft ob ein User eine bestimmte Aktion auf einer Tabelle ausführen darf
   */
  async canUserPerformAction(
    userId: number,
    tableName: string,
    action: CrudAction,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    
    const tablePermissions = userPermissions.permissions.get(tableName);
    
    if (!tablePermissions) {
      return false; // Keine Permissions für diese Tabelle
    }

    return tablePermissions.has(action);
  }

  /**
   * Setzt Berechtigungen für eine Rolle auf eine Tabelle
   */
  async setTablePermissions(
    roleId: number,
    tableName: string,
    permissions: Partial<Record<CrudAction, boolean>>,
  ): Promise<void> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      // Check if permission entry exists
      const existingResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role_id,eq,${roleId})~and(table_name,eq,${tableName})`,
          },
        }
      );

      const permissionData = {
        role_id: roleId,
        table_name: tableName,
        can_create: permissions[CrudAction.CREATE] ?? false,
        can_read: permissions[CrudAction.READ] ?? false,
        can_update: permissions[CrudAction.UPDATE] ?? false,
        can_delete: permissions[CrudAction.DELETE] ?? false,
        updated_at: new Date().toISOString(),
      };

      if (existingResponse.data.list.length > 0) {
        // Update existing
        const existingId = existingResponse.data.list[^4_0].Id;
        await this.nocoDBService.getClient().patch(
          `/api/v2/tables/${permissionsTable.id}/records/${existingId}`,
          permissionData
        );
      } else {
        // Create new
        await this.nocoDBService.getClient().post(
          `/api/v2/tables/${permissionsTable.id}/records`,
          {
            ...permissionData,
            created_at: new Date().toISOString(),
          }
        );
      }

      this.logger.log(`Berechtigungen für Rolle ${roleId} auf Tabelle ${tableName} gesetzt`);
      
      // Invalidate cache for all users with this role
      this.permissionsCache.clear();
    } catch (error) {
      this.logger.error('Fehler beim Setzen der Berechtigungen:', error);
      throw error;
    }
  }

  /**
   * Initialisiert Permissions für alle Tabellen im Workspace für eine Rolle
   */
  async initializePermissionsForRole(
    roleId: number,
    roleName: string,
    defaultPermissions: Partial<Record<CrudAction, boolean>>,
  ): Promise<void> {
    this.logger.log(`Initialisiere Berechtigungen für Rolle ${roleName}...`);
    
    const tables = await this.getAllWorkspaceTables();
    
    for (const tableName of tables) {
      await this.setTablePermissions(roleId, tableName, defaultPermissions);
    }
    
    this.logger.log(`${tables.length} Tabellen-Berechtigungen für Rolle ${roleName} initialisiert`);
  }

  /**
   * Cache invalidieren
   */
  clearCache(userId?: number): void {
    if (userId) {
      this.permissionsCache.delete(userId);
    } else {
      this.permissionsCache.clear();
    }
  }

  private createEmptyPermissions(userId: number, username: string): UserPermissions {
    return {
      userId,
      username,
      roles: [],
      permissions: new Map(),
    };
  }
}
```


### 4. Permissions Guard

Guard zur Prüfung von Berechtigungen auf Route-Ebene:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from './permissions.service';
import { CrudAction } from './enums/crud-action.enum';

export const REQUIRE_PERMISSIONS_KEY = 'requirePermissions';

export interface RequiredPermission {
  table: string;
  action: CrudAction;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<RequiredPermission[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Keine Permissions erforderlich
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.warn('User nicht authentifiziert');
      throw new ForbiddenException('Benutzer nicht authentifiziert');
    }

    // Prüfe alle erforderlichen Permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionsService.canUserPerformAction(
        user.userId,
        permission.table,
        permission.action,
      );

      if (!hasPermission) {
        this.logger.warn(
          `User ${user.userId} hat keine Berechtigung für ${permission.action} auf ${permission.table}`,
        );
        throw new ForbiddenException(
          `Keine Berechtigung für ${permission.action} auf ${permission.table}`,
        );
      }
    }

    // Alle Permissions erfüllt
    return true;
  }
}
```


### 5. Permissions Decorator

Decorator zur deklarativen Definition von Berechtigungen:

```typescript
import { SetMetadata } from '@nestjs/common';
import { CrudAction } from './enums/crud-action.enum';
import { REQUIRE_PERMISSIONS_KEY, RequiredPermission } from './permissions.guard';

/**
 * Decorator zur Definition erforderlicher Permissions für einen Endpoint
 * 
 * @example
 * @RequirePermissions({ table: 'users', action: CrudAction.READ })
 * @Get()
 * findAll() { ... }
 * 
 * @example Multiple permissions
 * @RequirePermissions(
 *   { table: 'users', action: CrudAction.READ },
 *   { table: 'roles', action: CrudAction.READ }
 * )
 */
export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);

/**
 * Helper-Decorators für häufig verwendete CRUD-Operationen
 */
export const RequireCreate = (table: string) =>
  RequirePermissions({ table, action: CrudAction.CREATE });

export const RequireRead = (table: string) =>
  RequirePermissions({ table, action: CrudAction.READ });

export const RequireUpdate = (table: string) =>
  RequirePermissions({ table, action: CrudAction.UPDATE });

export const RequireDelete = (table: string) =>
  RequirePermissions({ table, action: CrudAction.DELETE });
```


### 6. NocoDBService Erweiterung

Erweitere den NocoDBService um Methoden für Permissions:

```typescript
// Zu NocoDBService hinzufügen
getClient(): AxiosInstance {
  return this.client;
}

getBaseId(): string {
  return this.baseId;
}
```


### 7. Anwendungsbeispiel im Controller

So verwendest du das Permission-System in deinen Controllern:

```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PermissionsGuard } from './permissions/permissions.guard';
import { RequirePermissions, RequireRead, RequireCreate } from './permissions/permissions.decorator';
import { CrudAction } from './permissions/enums/crud-action.enum';

@Controller('users')
@UseGuards(PermissionsGuard)
export class UsersController {
  
  @Get()
  @RequireRead('users')
  async findAll() {
    // Nur Users mit Read-Berechtigung auf 'users'-Tabelle
    return this.usersService.findAll();
  }

  @Post()
  @RequireCreate('users')
  async create(@Body() createUserDto: any) {
    // Nur Users mit Create-Berechtigung auf 'users'-Tabelle
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @RequirePermissions(
    { table: 'users', action: CrudAction.READ },
    { table: 'roles', action: CrudAction.READ }
  )
  async findOne(@Param('id') id: string) {
    // Erfordert Read-Rechte auf users UND roles
    return this.usersService.findOneWithRoles(id);
  }
}
```


### 8. Module Configuration

Binde alles im AppModule zusammen:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { NocoDBService } from './nocodb/nocodb.service';
import { DatabaseInitializationService } from './nocodb/database-initialization.service';
import { PermissionsService } from './permissions/permissions.service';
import { PermissionsGuard } from './permissions/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
  providers: [
    NocoDBService,
    DatabaseInitializationService,
    PermissionsService,
    // Optional: Global Guard aktivieren
    // {
    //   provide: APP_GUARD,
    //   useClass: PermissionsGuard,
    // },
  ],
  exports: [PermissionsService],
})
export class AppModule {}
```


## Management-Endpoints

Erstelle einen Admin-Controller für Permission-Management:

```typescript
@Controller('admin/permissions')
@UseGuards(PermissionsGuard)
export class PermissionsAdminController {
  constructor(private permissionsService: PermissionsService) {}

  @Get('tables')
  @RequireRead('table_permissions')
  async getAllTables() {
    return this.permissionsService.getAllWorkspaceTables();
  }

  @Post('role/:roleId/table/:tableName')
  @RequireCreate('table_permissions')
  async setPermissions(
    @Param('roleId') roleId: number,
    @Param('tableName') tableName: string,
    @Body() permissions: Partial<Record<CrudAction, boolean>>,
  ) {
    await this.permissionsService.setTablePermissions(roleId, tableName, permissions);
    return { message: 'Berechtigungen erfolgreich gesetzt' };
  }

  @Post('role/:roleId/initialize')
  @RequireCreate('table_permissions')
  async initializeRole(
    @Param('roleId') roleId: number,
    @Body() body: { roleName: string; defaultPermissions: any },
  ) {
    await this.permissionsService.initializePermissionsForRole(
      roleId,
      body.roleName,
      body.defaultPermissions,
    );
    return { message: 'Rollen-Berechtigungen initialisiert' };
  }

  @Delete('cache/:userId?')
  @RequireDelete('table_permissions')
  async clearCache(@Param('userId') userId?: number) {
    this.permissionsService.clearCache(userId);
    return { message: 'Cache geleert' };
  }
}
```


## Best Practices

**Caching**: Die Lösung cached User-Permissions für 5 Minuten, um API-Calls zu minimieren. Bei Permission-Änderungen wird der Cache automatisch invalidiert.[^4_3][^4_1]

**OR-Logik bei Rollen**: Wenn ein User mehrere Rollen hat und eine davon Zugriff gewährt, erhält der User Zugriff. Dies ist flexibler als AND-Logik.[^4_2][^4_3]

**Granularität**: Jede Rolle hat für jede Tabelle separate CRUD-Flags, was maximale Flexibilität bietet.[^4_4][^4_1]

**Präfix-Kompatibilität**: Das System berücksichtigt automatisch das konfigurierte Tabellen-Präfix beim Abrufen der Workspace-Tabellen.[^4_5][^4_6]

**Performance**: Der Guard prüft Permissions asynchron und nutzt Caching, um die Latenz gering zu halten.[^4_2][^4_3]

Diese Implementierung bietet dir ein vollständiges, produktionsreifes RBAC-System für deine NestJS-NocoDB-Middleware mit granularen CRUD-Berechtigungen auf Tabellenebene.[^4_1][^4_3][^4_2]
<span style="display:none">[^4_10][^4_11][^4_12][^4_13][^4_14][^4_15][^4_16][^4_17][^4_18][^4_7][^4_8][^4_9]</span>

<div align="center">⁂</div>

[^4_1]: https://docs.nestjs.com/security/authorization

[^4_2]: https://docs.nestjs.com/guards

[^4_3]: https://thomasvds.com/building-an-advanced-rbac-system-in-nest-js/

[^4_4]: https://www.youtube.com/watch?v=BXIQIZBcgmk

[^4_5]: https://nocodb.com/docs/product-docs/developer-resources/rest-apis

[^4_6]: https://nocodb.com/apis/v2/meta

[^4_7]: https://nocodb.com/docs/product-docs/developer-resources/rest-apis/accessing-apis

[^4_8]: https://github.com/nocodb/nocodb

[^4_9]: https://github.com/nocodb/nocodb/releases

[^4_10]: https://github.com/nocodb/nocodb/discussions

[^4_11]: https://docs.nestjs.com/security/authentication

[^4_12]: https://github.com/nocodb/nocodb/issues/9117

[^4_13]: https://docs.nestjs.com/techniques/caching

[^4_14]: https://all-apis.nocodb.com

[^4_15]: https://github.com/nocodb/nocodb/discussions/8956

[^4_16]: https://www.youtube.com/watch?v=iT9NLWdCWYE

[^4_17]: https://www.linkedin.com/posts/ashutosh-fullstackdeveloper_github-ashutoshsnjrolebasedaccessservice-activity-7377311576493756416-LSEt

[^4_18]: https://nocodb.com/docs/product-docs/table-details


---

# Beispielcode in NestJS um Rollenzuordnung für Tabellenberechtigungen zu speichern

Hier ist ein vollständiger Beispielcode für das Speichern und Verwalten von Rollenzuordnungen für Tabellenberechtigungen in NestJS mit Validierung.[^5_1][^5_2]

## DTOs mit Validierung

### 1. Rolle erstellen

```typescript
// src/roles/dto/create-role.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: 'Rollenname darf nicht leer sein' })
  @MinLength(3, { message: 'Rollenname muss mindestens 3 Zeichen lang sein' })
  @MaxLength(50, { message: 'Rollenname darf maximal 50 Zeichen lang sein' })
  roleName: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Beschreibung darf maximal 255 Zeichen lang sein' })
  description?: string;

  @IsBoolean()
  @IsOptional()
  isSystemRole?: boolean = false;
}
```


### 2. Berechtigungen für eine Tabelle setzen

```typescript
// src/permissions/dto/set-table-permissions.dto.ts
import { IsNumber, IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class SetTablePermissionsDto {
  @IsNumber()
  @IsNotEmpty({ message: 'Rollen-ID ist erforderlich' })
  roleId: number;

  @IsString()
  @IsNotEmpty({ message: 'Tabellenname ist erforderlich' })
  tableName: string;

  @IsBoolean()
  canCreate: boolean;

  @IsBoolean()
  canRead: boolean;

  @IsBoolean()
  canUpdate: boolean;

  @IsBoolean()
  canDelete: boolean;
}
```


### 3. Batch-Berechtigungen setzen

```typescript
// src/permissions/dto/batch-permissions.dto.ts
import { IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TablePermissionItem {
  @IsString()
  @IsNotEmpty()
  tableName: string;

  @IsBoolean()
  canCreate: boolean;

  @IsBoolean()
  canRead: boolean;

  @IsBoolean()
  canUpdate: boolean;

  @IsBoolean()
  canDelete: boolean;
}

export class BatchSetPermissionsDto {
  @IsNumber()
  @IsNotEmpty()
  roleId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TablePermissionItem)
  permissions: TablePermissionItem[];
}
```


### 4. Rolle zu User zuweisen

```typescript
// src/users/dto/assign-role.dto.ts
import { IsNumber, IsNotEmpty, IsArray } from 'class-validator';

export class AssignRoleDto {
  @IsNumber()
  @IsNotEmpty({ message: 'User-ID ist erforderlich' })
  userId: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Rollen-ID ist erforderlich' })
  roleId: number;
}

export class AssignMultipleRolesDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  roleIds: number[];
}
```


## Roles Service

```typescript
// src/roles/roles.service.ts
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private nocoDBService: NocoDBService) {}

  /**
   * Erstellt eine neue Rolle
   */
  async createRole(createRoleDto: CreateRoleDto): Promise<any> {
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');

      // Prüfe ob Rolle bereits existiert
      const existingRole = await this.findRoleByName(createRoleDto.roleName);
      if (existingRole) {
        throw new ConflictException(
          `Rolle "${createRoleDto.roleName}" existiert bereits`
        );
      }

      // Erstelle Rolle
      const response = await this.nocoDBService.getClient().post(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          role_name: createRoleDto.roleName,
          description: createRoleDto.description || '',
          is_system_role: createRoleDto.isSystemRole || false,
          created_at: new Date().toISOString(),
        }
      );

      this.logger.log(`Rolle "${createRoleDto.roleName}" erstellt`);
      return response.data;
    } catch (error) {
      this.logger.error('Fehler beim Erstellen der Rolle:', error);
      throw error;
    }
  }

  /**
   * Findet Rolle nach Namen
   */
  async findRoleByName(roleName: string): Promise<any> {
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      
      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          params: {
            where: `(role_name,eq,${roleName})`,
          },
        }
      );

      return response.data.list[^5_0] || null;
    } catch (error) {
      this.logger.error('Fehler beim Suchen der Rolle:', error);
      throw error;
    }
  }

  /**
   * Holt alle Rollen
   */
  async getAllRoles(): Promise<any[]> {
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      
      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${rolesTable.id}/records`
      );

      return response.data.list || [];
    } catch (error) {
      this.logger.error('Fehler beim Abrufen der Rollen:', error);
      throw error;
    }
  }

  /**
   * Löscht eine Rolle
   */
  async deleteRole(roleId: number): Promise<void> {
    try {
      const rolesTable = await this.nocoDBService.getTableByName('roles');
      
      await this.nocoDBService.getClient().delete(
        `/api/v2/tables/${rolesTable.id}/records/${roleId}`
      );

      this.logger.log(`Rolle ${roleId} gelöscht`);
    } catch (error) {
      this.logger.error('Fehler beim Löschen der Rolle:', error);
      throw error;
    }
  }
}
```


## Permissions Management Service

```typescript
// src/permissions/permissions-management.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import { PermissionsService } from './permissions.service';

@Injectable()
export class PermissionsManagementService {
  private readonly logger = new Logger(PermissionsManagementService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Setzt Berechtigungen für eine einzelne Tabelle
   */
  async setTablePermissions(dto: SetTablePermissionsDto): Promise<any> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      // Prüfe ob Eintrag bereits existiert
      const existingResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role_id,eq,${dto.roleId})~and(table_name,eq,${dto.tableName})`,
          },
        }
      );

      const permissionData = {
        role_id: dto.roleId,
        table_name: dto.tableName,
        can_create: dto.canCreate,
        can_read: dto.canRead,
        can_update: dto.canUpdate,
        can_delete: dto.canDelete,
        updated_at: new Date().toISOString(),
      };

      let result;
      
      if (existingResponse.data.list.length > 0) {
        // Update bestehender Eintrag
        const existingId = existingResponse.data.list[^5_0].Id;
        result = await this.nocoDBService.getClient().patch(
          `/api/v2/tables/${permissionsTable.id}/records/${existingId}`,
          permissionData
        );
        
        this.logger.log(
          `Berechtigung aktualisiert: Rolle ${dto.roleId} -> Tabelle ${dto.tableName}`
        );
      } else {
        // Neuer Eintrag
        result = await this.nocoDBService.getClient().post(
          `/api/v2/tables/${permissionsTable.id}/records`,
          {
            ...permissionData,
            created_at: new Date().toISOString(),
          }
        );
        
        this.logger.log(
          `Berechtigung erstellt: Rolle ${dto.roleId} -> Tabelle ${dto.tableName}`
        );
      }

      // Cache invalidieren
      this.permissionsService.clearCache();
      
      return result.data;
    } catch (error) {
      this.logger.error('Fehler beim Setzen der Berechtigungen:', error);
      throw error;
    }
  }

  /**
   * Setzt Berechtigungen für mehrere Tabellen gleichzeitig
   */
  async batchSetPermissions(dto: BatchSetPermissionsDto): Promise<any> {
    this.logger.log(
      `Batch-Update: ${dto.permissions.length} Berechtigungen für Rolle ${dto.roleId}`
    );

    const results = [];

    for (const permission of dto.permissions) {
      const result = await this.setTablePermissions({
        roleId: dto.roleId,
        tableName: permission.tableName,
        canCreate: permission.canCreate,
        canRead: permission.canRead,
        canUpdate: permission.canUpdate,
        canDelete: permission.canDelete,
      });
      
      results.push(result);
    }

    return {
      success: true,
      count: results.length,
      results,
    };
  }

  /**
   * Kopiert Berechtigungen von einer Rolle zu einer anderen
   */
  async copyPermissions(sourceRoleId: number, targetRoleId: number): Promise<any> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      // Hole alle Berechtigungen der Quellrolle
      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role_id,eq,${sourceRoleId})`,
          },
        }
      );

      const sourcePermissions = response.data.list || [];

      this.logger.log(
        `Kopiere ${sourcePermissions.length} Berechtigungen von Rolle ${sourceRoleId} zu ${targetRoleId}`
      );

      // Erstelle Berechtigungen für Zielrolle
      for (const perm of sourcePermissions) {
        await this.setTablePermissions({
          roleId: targetRoleId,
          tableName: perm.table_name,
          canCreate: perm.can_create,
          canRead: perm.can_read,
          canUpdate: perm.can_update,
          canDelete: perm.can_delete,
        });
      }

      return {
        success: true,
        copiedCount: sourcePermissions.length,
      };
    } catch (error) {
      this.logger.error('Fehler beim Kopieren der Berechtigungen:', error);
      throw error;
    }
  }

  /**
   * Löscht alle Berechtigungen einer Rolle
   */
  async deleteRolePermissions(roleId: number): Promise<void> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      // Hole alle Berechtigungen der Rolle
      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role_id,eq,${roleId})`,
          },
        }
      );

      const permissions = response.data.list || [];

      // Lösche jeden Eintrag
      for (const perm of permissions) {
        await this.nocoDBService.getClient().delete(
          `/api/v2/tables/${permissionsTable.id}/records/${perm.Id}`
        );
      }

      this.logger.log(`${permissions.length} Berechtigungen für Rolle ${roleId} gelöscht`);
      
      // Cache invalidieren
      this.permissionsService.clearCache();
    } catch (error) {
      this.logger.error('Fehler beim Löschen der Rollen-Berechtigungen:', error);
      throw error;
    }
  }

  /**
   * Holt alle Berechtigungen einer Rolle
   */
  async getRolePermissions(roleId: number): Promise<any[]> {
    try {
      const permissionsTable = await this.nocoDBService.getTableByName('table_permissions');

      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${permissionsTable.id}/records`,
        {
          params: {
            where: `(role_id,eq,${roleId})`,
          },
        }
      );

      return response.data.list || [];
    } catch (error) {
      this.logger.error('Fehler beim Abrufen der Rollen-Berechtigungen:', error);
      throw error;
    }
  }
}
```


## User Roles Service

```typescript
// src/users/user-roles.service.ts
import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { NocoDBService } from '../nocodb/nocodb.service';
import { AssignRoleDto, AssignMultipleRolesDto } from './dto/assign-role.dto';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class UserRolesService {
  private readonly logger = new Logger(UserRolesService.name);

  constructor(
    private nocoDBService: NocoDBService,
    private permissionsService: PermissionsService,
  ) {}

  /**
   * Weist einem User eine Rolle zu
   */
  async assignRole(dto: AssignRoleDto): Promise<any> {
    try {
      const userRolesTable = await this.nocoDBService.getTableByName('user_roles');

      // Prüfe ob Zuordnung bereits existiert
      const existingResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user_id,eq,${dto.userId})~and(role_id,eq,${dto.roleId})`,
          },
        }
      );

      if (existingResponse.data.list.length > 0) {
        throw new ConflictException(
          `User ${dto.userId} hat bereits Rolle ${dto.roleId}`
        );
      }

      // Erstelle Zuordnung
      const response = await this.nocoDBService.getClient().post(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          user_id: dto.userId,
          role_id: dto.roleId,
          assigned_at: new Date().toISOString(),
        }
      );

      this.logger.log(`Rolle ${dto.roleId} zu User ${dto.userId} zugewiesen`);
      
      // Cache für diesen User invalidieren
      this.permissionsService.clearCache(dto.userId);

      return response.data;
    } catch (error) {
      this.logger.error('Fehler beim Zuweisen der Rolle:', error);
      throw error;
    }
  }

  /**
   * Weist einem User mehrere Rollen zu
   */
  async assignMultipleRoles(dto: AssignMultipleRolesDto): Promise<any> {
    this.logger.log(`Weise ${dto.roleIds.length} Rollen zu User ${dto.userId} zu`);

    const results = [];

    for (const roleId of dto.roleIds) {
      try {
        const result = await this.assignRole({
          userId: dto.userId,
          roleId: roleId,
        });
        results.push(result);
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.warn(`Rolle ${roleId} bereits zugewiesen, überspringe`);
        } else {
          throw error;
        }
      }
    }

    return {
      success: true,
      assignedCount: results.length,
      results,
    };
  }

  /**
   * Entfernt eine Rolle von einem User
   */
  async removeRole(userId: number, roleId: number): Promise<void> {
    try {
      const userRolesTable = await this.nocoDBService.getTableByName('user_roles');

      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user_id,eq,${userId})~and(role_id,eq,${roleId})`,
          },
        }
      );

      if (response.data.list.length === 0) {
        throw new NotFoundException(
          `Rolle ${roleId} ist User ${userId} nicht zugewiesen`
        );
      }

      const assignmentId = response.data.list[^5_0].Id;
      
      await this.nocoDBService.getClient().delete(
        `/api/v2/tables/${userRolesTable.id}/records/${assignmentId}`
      );

      this.logger.log(`Rolle ${roleId} von User ${userId} entfernt`);
      
      // Cache invalidieren
      this.permissionsService.clearCache(userId);
    } catch (error) {
      this.logger.error('Fehler beim Entfernen der Rolle:', error);
      throw error;
    }
  }

  /**
   * Holt alle Rollen eines Users
   */
  async getUserRoles(userId: number): Promise<any[]> {
    try {
      const userRolesTable = await this.nocoDBService.getTableByName('user_roles');
      const rolesTable = await this.nocoDBService.getTableByName('roles');

      const response = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${userRolesTable.id}/records`,
        {
          params: {
            where: `(user_id,eq,${userId})`,
          },
        }
      );

      const userRoleAssignments = response.data.list || [];
      const roleIds = userRoleAssignments.map((ur: any) => ur.role_id);

      if (roleIds.length === 0) {
        return [];
      }

      // Hole Rollen-Details
      const rolesResponse = await this.nocoDBService.getClient().get(
        `/api/v2/tables/${rolesTable.id}/records`,
        {
          params: {
            where: `(Id,in,${roleIds.join(',')})`,
          },
        }
      );

      return rolesResponse.data.list || [];
    } catch (error) {
      this.logger.error('Fehler beim Abrufen der User-Rollen:', error);
      throw error;
    }
  }
}
```


## Controller

```typescript
// src/permissions/permissions-management.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PermissionsManagementService } from './permissions-management.service';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { CreateRoleDto } from '../roles/dto/create-role.dto';
import { SetTablePermissionsDto } from './dto/set-table-permissions.dto';
import { BatchSetPermissionsDto } from './dto/batch-permissions.dto';
import { AssignRoleDto, AssignMultipleRolesDto } from '../users/dto/assign-role.dto';
import { PermissionsGuard } from './permissions.guard';
import { RequireCreate, RequireRead, RequireDelete } from './permissions.decorator';

@Controller('admin/permissions')
@UseGuards(PermissionsGuard)
export class PermissionsManagementController {
  constructor(
    private permissionsManagement: PermissionsManagementService,
    private rolesService: RolesService,
    private userRolesService: UserRolesService,
  ) {}

  // ========== Rollen-Management ==========

  @Post('roles')
  @RequireCreate('roles')
  @HttpCode(HttpStatus.CREATED)
  async createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get('roles')
  @RequireRead('roles')
  async getAllRoles() {
    return this.rolesService.getAllRoles();
  }

  @Delete('roles/:roleId')
  @RequireDelete('roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(@Param('roleId', ParseIntPipe) roleId: number) {
    await this.rolesService.deleteRole(roleId);
  }

  // ========== Berechtigungen setzen ==========

  @Post('table-permissions')
  @RequireCreate('table_permissions')
  async setTablePermissions(@Body() dto: SetTablePermissionsDto) {
    return this.permissionsManagement.setTablePermissions(dto);
  }

  @Post('table-permissions/batch')
  @RequireCreate('table_permissions')
  async batchSetPermissions(@Body() dto: BatchSetPermissionsDto) {
    return this.permissionsManagement.batchSetPermissions(dto);
  }

  @Get('roles/:roleId/permissions')
  @RequireRead('table_permissions')
  async getRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.permissionsManagement.getRolePermissions(roleId);
  }

  @Delete('roles/:roleId/permissions')
  @RequireDelete('table_permissions')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRolePermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    await this.permissionsManagement.deleteRolePermissions(roleId);
  }

  @Post('roles/:sourceRoleId/copy-to/:targetRoleId')
  @RequireCreate('table_permissions')
  async copyPermissions(
    @Param('sourceRoleId', ParseIntPipe) sourceRoleId: number,
    @Param('targetRoleId', ParseIntPipe) targetRoleId: number,
  ) {
    return this.permissionsManagement.copyPermissions(sourceRoleId, targetRoleId);
  }

  // ========== User-Rollen-Zuordnung ==========

  @Post('user-roles/assign')
  @RequireCreate('user_roles')
  async assignRole(@Body() dto: AssignRoleDto) {
    return this.userRolesService.assignRole(dto);
  }

  @Post('user-roles/assign-multiple')
  @RequireCreate('user_roles')
  async assignMultipleRoles(@Body() dto: AssignMultipleRolesDto) {
    return this.userRolesService.assignMultipleRoles(dto);
  }

  @Delete('user-roles/users/:userId/roles/:roleId')
  @RequireDelete('user_roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
  ) {
    await this.userRolesService.removeRole(userId, roleId);
  }

  @Get('users/:userId/roles')
  @RequireRead('user_roles')
  async getUserRoles(@Param('userId', ParseIntPipe) userId: number) {
    return this.userRolesService.getUserRoles(userId);
  }
}
```


## Verwendungsbeispiele

### Rolle erstellen und Berechtigungen setzen

```bash
# 1. Neue Rolle erstellen
POST /admin/permissions/roles
{
  "roleName": "Editor",
  "description": "Kann Inhalte bearbeiten"
}

# Response: { "Id": 2, "role_name": "Editor", ... }

# 2. Berechtigungen für eine Tabelle setzen
POST /admin/permissions/table-permissions
{
  "roleId": 2,
  "tableName": "app_users",
  "canCreate": false,
  "canRead": true,
  "canUpdate": true,
  "canDelete": false
}

# 3. Batch-Berechtigungen für mehrere Tabellen
POST /admin/permissions/table-permissions/batch
{
  "roleId": 2,
  "permissions": [
    {
      "tableName": "app_users",
      "canCreate": false,
      "canRead": true,
      "canUpdate": true,
      "canDelete": false
    },
    {
      "tableName": "app_posts",
      "canCreate": true,
      "canRead": true,
      "canUpdate": true,
      "canDelete": false
    }
  ]
}
```


### User Rolle zuweisen

```bash
# Einzelne Rolle zuweisen
POST /admin/permissions/user-roles/assign
{
  "userId": 5,
  "roleId": 2
}

# Mehrere Rollen zuweisen
POST /admin/permissions/user-roles/assign-multiple
{
  "userId": 5,
  "roleIds": [2, 3]
}
```


## Module einbinden

```typescript
// src/permissions/permissions.module.ts
import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { PermissionsManagementService } from './permissions-management.service';
import { PermissionsManagementController } from './permissions-management.controller';
import { PermissionsGuard } from './permissions.guard';
import { RolesService } from '../roles/roles.service';
import { UserRolesService } from '../users/user-roles.service';
import { NocoDBModule } from '../nocodb/nocodb.module';

@Module({
  imports: [NocoDBModule],
  providers: [
    PermissionsService,
    PermissionsManagementService,
    PermissionsGuard,
    RolesService,
    UserRolesService,
  ],
  controllers: [PermissionsManagementController],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}
```

Diese Implementierung bietet dir vollständige CRUD-Operationen für Rollen, Berechtigungen und User-Zuordnungen mit Validierung durch `class-validator`, strukturierter Fehlerbehandlung und Cache-Management.[^5_2][^5_3][^5_1]
<span style="display:none">[^5_10][^5_11][^5_12][^5_13][^5_14][^5_15][^5_16][^5_17][^5_18][^5_4][^5_5][^5_6][^5_7][^5_8][^5_9]</span>

<div align="center">⁂</div>

[^5_1]: https://docs.nestjs.com/techniques/validation

[^5_2]: https://docs.nestjs.com/pipes

[^5_3]: https://www.ivanstepanian.com/en/blog/custom-validator-nestjs

[^5_4]: https://docs.nestjs.com/techniques/serialization

[^5_5]: https://docs.nestjs.com/openapi/mapped-types

[^5_6]: https://docs.nestjs.com/openapi/cli-plugin

[^5_7]: https://nocodb.com/docs/product-docs/developer-resources/rest-apis/upload-via-api

[^5_8]: https://docs.nestjs.com/graphql/resolvers

[^5_9]: https://github.com/nocodb/nocodb/issues/1440

[^5_10]: https://docs.nestjs.com/techniques/file-upload

[^5_11]: https://github.com/nocodb/nocodb/discussions/1414

[^5_12]: https://stackoverflow.com/questions/77485694/how-to-use-class-validator-decorator-optionally-in-nest-js-dto

[^5_13]: https://github.com/typestack/class-validator

[^5_14]: https://www.youtube.com/watch?v=BzJ_VzecFF4

[^5_15]: https://www.geeksforgeeks.org/nextjs/how-to-validate-nested-objects-with-class-validator-in-nest-js/

[^5_16]: https://community.nocodb.com/t/bulk-insert-webhook-not-sending-rows-data/1112

[^5_17]: https://www.reddit.com/r/nestjs/comments/140nmvb/new_classbased_validation_package_dto_classes/

[^5_18]: https://community.nocodb.com/t/api-v3-fails-to-insert-multiple-records/2112

