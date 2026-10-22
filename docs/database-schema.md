# NocoDB Tabellen-Schema

## Zweck

Diese Middleware benötigt ein kleines Set an NocoDB-Tabellen für Benutzer, Rollen und Tabellenrechte.
Ohne diese Tabellen funktionieren RBAC, Rollen-Zuweisungen und der Bootstrap-Prozess nicht.

Die Tabellen und ihre Felder legt `DatabaseInitializationService` beim Start vollständig über die NocoDB v3 Meta API an. Manuelle Schritte in NocoDB sind nicht nötig. Die Initialisierung ist idempotent: Bei jedem Start werden fehlende Tabellen und Felder ergänzt, vorhandene bleiben unverändert.

Geprüft gegen **NocoDB 0.301.3** (siehe `docker-compose.yml` und den CI-Job „Integration").

## Überblick

1. `users`
2. `roles`
3. `user_roles`
4. `table_permissions`

## Feldnamen

Die NocoDB v3 Data API schlüsselt Datensätze nach dem **Feldtitel**. Die Felder heißen deshalb genau so wie im Code (`username`, `role_name`, …). Wer Felder in der NocoDB-Oberfläche umbenennt, bricht die Middleware: Der nächste Start legt das Feld unter dem erwarteten Namen neu an, die Daten im umbenannten Feld werden nicht mehr gelesen.

## Beziehungen über ID-Felder

Zuordnungen werden als **Zahlenfelder** (`user_id`, `role_id`) gespeichert, nicht als NocoDB-Link-Felder. Grund: In NocoDB v3 lassen sich Link-Felder nicht nach der ID des verknüpften Datensatzes filtern (`(role.id,eq,1)` ist ungültig, `(role,eq,1)` vergleicht die *Anzahl* der Links). Die Rechteprüfung braucht genau diese Filter.

```text
users.Id      ←── user_roles.user_id
roles.Id      ←── user_roles.role_id
roles.Id      ←── table_permissions.role_id
```

- Ein Benutzer kann mehrere Rollen haben, eine Rolle mehreren Benutzern zugewiesen sein.
- Eine Rolle hat pro Tabelle ein eigenes CRUD-Rechteset.

## Tabellen im Detail

### `users`

| Feld | Typ | Zweck |
|---|---|---|
| `username` | SingleLineText | Benutzername |
| `email` | Email | E-Mail |
| `password_hash` | LongText | Hash aus Bootstrap/Provisionierung; die Middleware bietet keinen Passwort-Login |
| `is_active` | Checkbox | Inaktive Benutzer werden bei der JWT-Prüfung abgelehnt |
| `auth_provider` | SingleLineText | `local` oder externer IdP |
| `external_subject` | SingleLineText | `sub` des externen IdP |

Die JWT-Strategie liest den Benutzer über die numerische `Id` aus `sub`.

### `roles`

| Feld | Typ | Zweck |
|---|---|---|
| `role_name` | SingleLineText | eindeutiger Rollenname |
| `description` | LongText | Beschreibung |
| `is_system_role` | Checkbox | Systemrolle |

Beim Start wird die Rolle `admin` sichergestellt.

### `user_roles`

| Feld | Typ | Zweck |
|---|---|---|
| `user_id` | Number | `Id` des Benutzers |
| `role_id` | Number | `Id` der Rolle |
| `assigned_at` | DateTime | Zeitpunkt der Zuweisung |

### `table_permissions`

| Feld | Typ | Zweck |
|---|---|---|
| `role_id` | Number | `Id` der Rolle |
| `table_name` | SingleLineText | **logischer** Tabellenname (ohne Präfix), für den die Rechte gelten |
| `can_create` | Checkbox | CREATE erlaubt |
| `can_read` | Checkbox | READ erlaubt |
| `can_update` | Checkbox | UPDATE erlaubt |
| `can_delete` | Checkbox | DELETE erlaubt |

Nicht gesetzte Rechte gelten als verweigert. Hat ein Benutzer mehrere Rollen, gilt die Vereinigung ihrer Rechte.

## Verhalten beim Start

1. Fehlende Systemtabellen mit allen Feldern anlegen
2. In vorhandenen Systemtabellen fehlende Felder ergänzen
3. Rolle `admin` sicherstellen
4. Für `admin` volle Rechte auf die vier Systemtabellen sicherstellen

Schlägt das Anlegen einer Tabelle fehl, wird der Seed übersprungen und der Fehler geloggt.

Den ersten Admin-Benutzer legt `POST /api/bootstrap/admin` an (siehe [API](./api.md)).

## Beispiel-Datensätze

`table_permissions` nach dem ersten Start (Rolle `admin` hat die `Id` 1):

| role_id | table_name | can_create | can_read | can_update | can_delete |
|---:|---|---:|---:|---:|---:|
| 1 | `users` | true | true | true | true |
| 1 | `roles` | true | true | true | true |
| 1 | `user_roles` | true | true | true | true |
| 1 | `table_permissions` | true | true | true | true |

## Table Prefix

Mit `NOCODB_TABLE_PREFIX` sucht und erstellt die Middleware Tabellen unter dem präfixierten **Titel**, arbeitet intern und in der API aber mit den logischen Namen.

- Konfiguration: `NOCODB_TABLE_PREFIX=app_`
- Tabellen in NocoDB: `app_users`, `app_roles`, `app_user_roles`, `app_table_permissions`
- In `table_permissions.table_name`, im Tabellenkatalog und in der Daten-API: `users`, `customers`, …

Eigene Tabellen sind bei gesetztem Präfix nur erreichbar, wenn ihr Titel das Präfix trägt.

## Umstieg von früheren Versionen

Versionen bis 0.7.x haben Tabellen mit menschenlesbaren Titeln (`Users`, `Table Permissions`) und Link-Felder (`user`, `role`) angelegt. Gegen NocoDB v3 waren diese Daten über die Middleware ohnehin nicht nutzbar. Beim ersten Start einer neueren Version entstehen die Tabellen unter den neuen Titeln neu. Alte Tabellen mit diesen Titeln können nach Prüfung in NocoDB gelöscht werden.

Wird eine alte Tabelle trotzdem als Systemtabelle erkannt (z. B. weil ihr physischer Name `user_roles` bzw. `table_permissions` lautet und die NocoDB-Version `table_name` liefert), **bricht der Start mit einer Fehlermeldung ab**. Die Middleware ergänzt die Tabelle in diesem Fall bewusst nicht um leere Zahlenfelder, denn dann hätten alle Benutzer, auch Administratoren, still ihre Rechte verloren. Abhilfe, je nach Datenlage:

- **Zuordnungen übernehmen:** In NocoDB die Zahlenfelder anlegen (`user_roles`: `user_id`, `role_id`; `table_permissions`: `role_id`, jeweils Typ *Number*) und pro Zeile mit der `Id` des verknüpften Benutzers bzw. der verknüpften Rolle füllen. Danach neu starten. Die Link-Felder dürfen bestehen bleiben, gelesen werden nur die Zahlenfelder.
- **Neu beginnen:** Die alten Tabellen umbenennen oder löschen. Beim Start entstehen sie neu, der erste Admin wird per `POST /api/bootstrap/admin` angelegt.
