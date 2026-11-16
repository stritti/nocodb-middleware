# API

Diese Seite beschreibt den aktuellen API-Stand der Middleware inklusive Auth-Modi und Beispiel-Requests.

## Basis-URLs

- API Prefix: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- Statische Spezifikation: `openapi.yaml` im Repository Root

## Authentifizierung

### 1. JWT für geschützte Endpunkte

```http
Authorization: Bearer <jwt>
```

Minimal erwartete JWT Claims (aus `JwtStrategy`):

```json
{
  "sub": 123,
  "username": "alice",
  "roles": ["admin"]
}
```

### 2. Bootstrap-Token für Initial-Admin

Der Endpoint `POST /api/bootstrap/admin` nutzt **kein JWT**, sondern den Header:

```http
x-bootstrap-token: <BOOTSTRAP_ADMIN_TOKEN>
```

## Kernendpunkte

### Konfigurierbare öffentliche Ressourcen

`GET /api/public/:resource` und `GET /api/public/:resource/:id` veröffentlichen
nur ausdrücklich konfigurierte Lesezugriffe. Ressourcennamen, Zieltabelle,
Feldmapping und Filter werden in NocoDB gepflegt, nicht im Middleware-Code oder
in anwendungsspezifischen Umgebungsvariablen. Der NocoDB-Token bleibt serverseitig.

Beim Start werden drei **leere interne Tabellen** und die Rolle `anonymous`
ohne Tabellenrechte angelegt. Es wird nichts automatisch öffentlich. Die
Tabellen tragen gegebenenfalls `NOCODB_TABLE_PREFIX`; ihre Pflege erfolgt mit
administrativen Rechten direkt in NocoDB, nicht über die generische Daten-API.

| Tabelle                | Felder                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `api_resources`        | `resource_name`, `table_name`, `enabled`                                                            |
| `api_resource_fields`  | `resource_id` (Number), `source_field`, `response_field`, `normalization`, `default_json`           |
| `api_resource_filters` | `resource_id` (Number), `query_param`, `source_field`, `required` (Checkbox), `allowed_values_json` |

`resource_name` muss `[a-z][a-z0-9-]{0,62}` entsprechen und eindeutig sein.
`table_name` ist der tatsächliche logische Tabellenname ohne Präfix, derselbe
Name wie in `table_permissions`. Interne Tabellen sind auch unter anderen
Ressourcennamen verboten. Quellfelder müssen existieren; ihre Titel dürfen
wie Tabellennamen Buchstaben, Ziffern, Leerzeichen, `_` und `-` enthalten.

Feldzeilen geben nur die expliziten Antwortfelder frei. `id` ist automatisch
vorhanden und darf nicht überschrieben werden. Antwortnamen entsprechen
`[A-Za-z][A-Za-z0-9_]{0,63}`; Prototype-Schlüssel und doppelte Antwortnamen sind
verboten. `normalization` muss `none` oder `lowerFirstDeep` sein; letzteres
normalisiert rekursiv die Anfangsbuchstaben von Objektschlüsseln, etwa bei
Attachments. Dabei wird der gesamte ausgewählte Feldwert freigegeben.
`default_json` ist optionaler JSON-Text (maximal 16 KiB), z. B. `[]`, und gilt
bei fehlendem oder nullwertigem Quellwert. Ohne Feldzeilen keine Freigabe.

Filterzeilen erlauben feste Stringwerte mit Gleichheit und AND-Verknüpfung.
Die dekodierten Werte bleiben bis zur festen Enum-Prüfung unverändert; eine
HTML-Umwandlung darf etwa `Tools & Plants` nicht in einen anderen Wert ändern.
`allowed_values_json` enthält eine nichtleere JSON-Stringliste, z. B.
`["Tools","Plants"]`. Filterfeldtitel sind auf Buchstaben des ASCII-Alphabets,
Ziffern, `_` und `-` begrenzt; Werte dürfen keine doppelten Anführungszeichen,
Steuerzeichen oder äußeren Leerzeichen enthalten. Filterparameter verwenden
dieselbe Namensregel wie Antwortfelder; `page` und `take` sind reserviert.
Kein beliebiges `where`, `sort`, `fields`, Tabellenname oder Operator ist erlaubt.

Beispiel einer zusätzlichen Ressource, ausschließlich als Dateneingabe:

1. `api_resources`: `resource_name=inventory`, `table_name=inventory`,
   `enabled=false`. Die tatsächliche numerische ID notieren, etwa `7`.
2. `api_resource_fields`: `resource_id=7`, `source_field=Name`,
   `response_field=label`, `normalization=none`; `default_json` leer lassen.
3. Optional `api_resource_filters`: `resource_id=7`, `query_param=category`,
   `source_field=Category`, `required=false`, `allowed_values_json=["Tools","Plants"]`.
4. ID der Rolle `anonymous` ermitteln. In `table_permissions` genau eine Zeile
   für diese `role_id` und `table_name=inventory` anlegen: `can_read=true`,
   `can_create=false`, `can_update=false`, `can_delete=false`.
5. Erst nach Prüfung der freigegebenen Daten `enabled=true` setzen.

```bash
curl 'http://localhost:3000/api/public/inventory?category=Tools&page=1&take=25'
curl 'http://localhost:3000/api/public/inventory/1'
```

Listen liefern `{ "data": [{ "id": 1, "label": "Spade" }], "meta": {
"page": 1, "take": 25, "total": 1, "pageCount": 1 } }`, Details direkt das
Objekt. `page` beginnt bei 1; `take` ist 1 bis 50, Standardwerte sind 1 und 25.
Erforderliche konfigurierte Filter gelten nur für Listen. Detailabrufe
akzeptieren keine Query-Parameter. IDs sind positive sichere Ganzzahlen.

Die aktivierte Ressourcenkonfiguration wird höchstens **30 Sekunden** verwendet;
Änderungen werden danach beim nächsten Request ohne Neustart geladen.
Konfigurationsseiten werden vollständig gelesen, begrenzt auf weniger als
10.000 Zeilen je Tabelle. Ungültige, doppelte oder verwaiste Datensätze und
nicht auflösbare Felder/Tabellen sperren den Snapshot. Bei größeren Änderungen
zuerst deaktivieren und zuletzt aktivieren; Mehrtabellenänderungen sind nicht
atomar. Ein fehlgeschlagenes Neuladen verwendet keinen abgelaufenen Snapshot.

Die Berechtigung der existierenden, eindeutigen Rolle `anonymous` wird dagegen
**vor jeder Anfrage frisch geprüft, auch vor Antwort-Cache-Treffern**.
Fehlende Rolle oder fehlendes boolesches `can_read=true` bedeutet keine Freigabe.
Doppelte Rollen oder Berechtigungseinträge werden nicht zusammengeführt, sondern
abgewiesen. Ein Rechteentzug wirkt auf nachfolgende erfolgreich geprüfte
Anfragen; bereits laufende Anfragen werden nicht nachträglich abgebrochen.
Ein mitgesendetes JWT erweitert die öffentlichen Rechte nicht. Das sind von der
Middleware ausgewertete Tabellenrechte, nicht die native NocoDB-Benutzerverwaltung.

Erfolgreiche Antworten werden bis zu 60 Sekunden gecacht; Snapshot-Version,
Ressource, Tabelle, Seite und Filter trennen die Cache-Einträge. Eine neue
Feldfreigabe verwendet keine alte projizierte Antwort. Bei Fehlern der Rechte-
oder Konfigurationsquelle werden keine gecachten Daten ausgeliefert.

Der gesamte öffentliche Pfad sendet zusätzlich `Cache-Control: no-store`, auch
bei Fehlerantworten. Reverse-Proxys/CDNs müssen diesen Header respektieren und
dürfen für `/api/public/*` keinen eigenen Response-Cache erzwingen. Nur der
autorisierungsabhängige Server-Cache darf die Nutzdaten wiederverwenden.

- 400: ungültige Pagination, ID, Filter oder zusätzliche Query-Parameter.
- 403: keine anonyme Lesefreigabe.
- 404: unbekannte/deaktivierte Ressource oder fehlender Datensatz.
- 503: ungültige/nicht verfügbare Ressourcen- oder Berechtigungsdaten.

Die globale Rate-Begrenzung gilt weiterhin. `CORS_ORIGINS` auf die tatsächliche
Frontend-Origin setzen; CORS ist keine Zugriffskontrolle für andere HTTP-Clients.
Es gibt keine öffentlichen Schreiboperationen. Bestehende JWT-/Scope-geschützte
`/api/data/:table`- und Admin-Routen bleiben unverändert autorisiert. Neue
Ressourcen benötigen weder Codeänderung noch neues Deployment.

### Health

- `GET /api/health`
- Auth: nein

```bash
curl http://localhost:3000/api/health
```

Beispielantwort:

```json
{
  "status": "ok",
  "timestamp": "2026-04-13T12:00:00.000Z",
  "uptime": 123.456
}
```

### Bootstrap Admin

- `POST /api/bootstrap/admin`
- Auth: `x-bootstrap-token`

```bash
curl -X POST http://localhost:3000/api/bootstrap/admin \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: <BOOTSTRAP_ADMIN_TOKEN>" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "StrongP@ssword123!"
  }'
```

Beispielantwort:

```json
{
  "success": true,
  "userId": 1,
  "username": "admin",
  "created": true
}
```

### RBAC: Rollen und Berechtigungen

Basispfad: `/api/admin/permissions`

- `POST /roles`
- `GET /roles`
- `DELETE /roles/:roleId`
- `POST /table-permissions`
- `POST /table-permissions/batch`
- `GET /roles/:roleId/permissions`
- `DELETE /roles/:roleId/permissions`
- `POST /roles/:sourceRoleId/copy-to/:targetRoleId`
- `POST /user-roles/assign`
- `POST /user-roles/assign-multiple`
- `DELETE /user-roles/users/:userId/roles/:roleId`
- `GET /users/:userId/roles`

Hinweis: Neben JWT greift auf diesen Endpunkten zusätzlich der `PermissionsGuard` mit `@Require*`-Decorators.

Beispiel: Rollen abrufen

```bash
curl http://localhost:3000/api/admin/permissions/roles \
  -H "Authorization: Bearer <jwt>"
```

Beispiel: Tabellenberechtigung setzen

```bash
curl -X POST http://localhost:3000/api/admin/permissions/table-permissions \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 1,
    "tableName": "users",
    "canCreate": true,
    "canRead": true,
    "canUpdate": true,
    "canDelete": false
  }'
```

Beispiel: Rolle einem User zuweisen

```bash
curl -X POST http://localhost:3000/api/admin/permissions/user-roles/assign \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 42,
    "roleId": 1
  }'
```

### Tabellenkatalog (Admin)

- `GET /api/meta/tables`
- Auth: JWT + Rolle `admin`

```bash
curl http://localhost:3000/api/meta/tables \
  -H "Authorization: Bearer <jwt>"
```

Antwort: `[{ "id": "m1a2b3", "tableName": "customers", "title": "app_customers" }]`

- `tableName` ist der **logische** Name ohne `NOCODB_TABLE_PREFIX`. Diesen Namen verwenden Tabellenrechte (`tableName` in `/admin/permissions/table-permissions`).
- Erlaubt sind Tabellennamen aus Buchstaben, Ziffern, Leerzeichen, `_` und `-` (1–255 Zeichen, ohne Leerzeichen am Anfang oder Ende), z. B. `Customer Orders`. Dieselbe Regel gilt für Tabellenrechte. Tabellen mit anderen Zeichen im Namen (etwa `"` oder `/`) erscheinen nicht im Katalog, weil sich für sie keine Rechte vergeben lassen.
- `title` ist der Tabellentitel in NocoDB.
- Systemtabellen (`users`, `roles`, `user_roles`, `table_permissions`, `api_resources`, `api_resource_fields`, `api_resource_filters`) werden nicht gelistet. Bei gesetztem Präfix erscheinen nur Tabellen mit diesem Präfix.

### Daten-API (Records)

Generischer CRUD-Zugriff auf eigene NocoDB-Tabellen. `:table` ist der Tabellenname ohne Präfix.
Er muss dem tatsächlichen logischen Tabellentitel entsprechen; physische
Aliasnamen werden hier nicht auf andere Tabellen umgeleitet. Die aufgelösten
Titel und physischen Namen werden zusätzlich auf Systemtabellen geprüft.

| Methode  | Pfad                   | Aktion   | Antwort              |
| -------- | ---------------------- | -------- | -------------------- |
| `GET`    | `/api/data/:table`     | `read`   | `{ list, pageInfo }` |
| `GET`    | `/api/data/:table/:id` | `read`   | Datensatz            |
| `POST`   | `/api/data/:table`     | `create` | `201` + Datensatz    |
| `PATCH`  | `/api/data/:table/:id` | `update` | Datensatz            |
| `DELETE` | `/api/data/:table/:id` | `delete` | `204`                |

Query-Parameter für die Liste: `where` (NocoDB-Filter, z. B. `(Name,eq,Alice)`), `sort` (z. B. `-CreatedAt`), `limit` (1–100, Default 25), `offset` (Default 0). `pageInfo.totalRows` ist die Anzahl aller Treffer des Filters, unabhängig von `limit`/`offset`.

**Autorisierung pro Tabelle und Aktion**, sonst `403`. Erlaubt ist ein Request, wenn eins von beiden zutrifft:

- Der JWT enthält einen passenden Scope: `customers:read`, `customers:*`, `*:read` oder `*:*`.
- Eine Rolle des Benutzers hat das Recht in `table_permissions` (siehe RBAC oben).

Alle oben genannten Systemtabellen einschließlich der drei Ressourcenkonfigurationstabellen sind über diese API nicht erreichbar und liefern `404`, ebenso unbekannte Tabellen und ungültige Namen. Auch Wildcard-Scopes umgehen diese Sperre nicht. Ein fehlender Datensatz liefert bei `GET`, `PATCH` und `DELETE` ebenfalls `404`.

**Validierung des Bodys** (`POST`/`PATCH`), sonst `400`:

- Der Body muss ein nicht-leeres JSON-Objekt sein. Schlüssel sind die Feldtitel der Tabelle.
- Felder, die es in der Tabelle nicht gibt, werden abgelehnt (`Unknown fields: …`).
- Von NocoDB verwaltete Felder sind schreibgeschützt (`Read-only fields: …`): `id`, ID, AutoNumber, Formula, Rollup, Lookup, Links, CreatedTime/LastModifiedTime, CreatedBy/LastModifiedBy, Barcode, QrCode, Button. Verknüpfungen werden nicht über diese API gepflegt.
- Lehnt NocoDB einen Wert ab (z. B. ungültige E-Mail), antwortet die API mit `400`.

Nicht-numerische IDs liefern ebenfalls `400`, ebenso `where`- oder `sort`-Ausdrücke, die NocoDB nicht verarbeiten kann. Für `:table` gilt dieselbe Namensregel wie im Tabellenkatalog (Leerzeichen URL-kodiert, z. B. `/api/data/Customer%20Orders`).

Tabellen-ID und Felder werden pro Tabelle 60 Sekunden gecacht: Neu angelegte Tabellen sind sofort erreichbar, neue Felder einer bereits genutzten Tabelle spätestens nach 60 Sekunden.

```bash
curl "http://localhost:3000/api/data/customers?where=(Name,eq,Alice)&limit=10" \
  -H "Authorization: Bearer <jwt>"

curl -X POST http://localhost:3000/api/data/customers \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"Name": "Bob"}'
```

## Validierung und Fehlerformat

Globale `ValidationPipe` ist aktiv:

- `whitelist: true`
- `forbidNonWhitelisted: true`
- `transform: true`

Fehler werden über den globalen `NocoDBExceptionFilter` vereinheitlicht.
Details: `docs/error-handling.md`.
