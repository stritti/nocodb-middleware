# NocoDB Tabellen-Schema

## Zweck

Diese Middleware benötigt ein kleines Set an NocoDB-Tabellen für Benutzer, Rollen und Tabellenrechte.
Ohne diese Tabellen funktionieren RBAC, Rollen-Zuweisungen und Teile des Bootstrap-Prozesses nicht.

Die Tabellen werden beim Start durch `DatabaseInitializationService` grundsätzlich angelegt.
Wichtig ist aber ein technisches Detail:

**Link-Spalten werden nicht in jedem Fall automatisch erstellt.**
Wenn die NocoDB Meta API die Link-Erzeugung nicht sauber abbildet, müssen diese Beziehungen in der NocoDB-Oberfläche manuell ergänzt werden.

## Überblick

Erforderlich sind diese vier Tabellen:

1. `users`
2. `roles`
3. `user_roles`
4. `table_permissions`

## Tabellen im Detail

### `users`

Zweck:

- Benutzerstammdaten für die Rechteauflösung
- Referenzziel für Rollen-Zuweisungen
- Bootstrap-Admin-Benutzer

Erforderliche Spalten:

| Spalte | Typ | Pflicht | Zweck |
|---|---|---:|---|
| `username` | SingleLineText | ja | Benutzername, wird bei der Rechteauflösung verwendet |
| `email` | Email | nein | Kontaktfeld für den Benutzer |
| `password_hash` | LongText | nein | aktuell nur als Datenfeld für Bootstrap/Altbestand, nicht für einen Login-Flow dieser Middleware |
| `is_active` | Checkbox | nein | Kennzeichnung aktiver Benutzer |

Hinweise:

- Die JWT-Strategie erwartet im Token `sub` und `username`.
- Für die eigentliche Rechteauflösung arbeitet die Middleware mit der numerischen User-ID und dem Feld `username`.
- Diese Middleware bietet keinen eigenen Login. `password_hash` ist daher **kein** Hinweis auf einen eingebauten Passwort-Login.

### `roles`

Zweck:

- Definition fachlicher oder technischer Rollen
- Grundlage für Tabellenberechtigungen

Erforderliche Spalten:

| Spalte | Typ | Pflicht | Zweck |
|---|---|---:|---|
| `role_name` | SingleLineText | ja | eindeutiger Rollenname |
| `description` | LongText | nein | lesbare Beschreibung |
| `is_system_role` | Checkbox | nein | Kennzeichnung von Systemrollen |

Hinweise:

- Beim Start wird mindestens die Rolle `admin` sichergestellt.
- Die API prüft Rollen primär über die numerische Rollen-ID, für Lesbarkeit und Verwaltung ist `role_name` entscheidend.

### `user_roles`

Zweck:

- Zuordnung zwischen Benutzern und Rollen
- Many-to-many-Verknüpfung von `users` und `roles`

Erforderliche Spalten:

| Spalte | Typ | Pflicht | Zweck |
|---|---|---:|---|
| `user` | Link to another record | ja | Verweis auf `users` |
| `role` | Link to another record | ja | Verweis auf `roles` |
| `assigned_at` | DateTime | nein | Zeitpunkt der Zuweisung |

**Kritisch:**

Die Link-Spalten `user` und `role` sind funktional zwingend. Ohne sie schlagen Rollen-Zuweisung und Rechteauflösung fehl.

Erwartete Beziehungen:

- `user_roles.user` → `users`
- `user_roles.role` → `roles`

### `table_permissions`

Zweck:

- CRUD-Berechtigungen je Rolle und Zieltabelle

Erforderliche Spalten:

| Spalte | Typ | Pflicht | Zweck |
|---|---|---:|---|
| `role` | Link to another record | ja | Verweis auf `roles` |
| `table_name` | SingleLineText | ja | Name der NocoDB-Tabelle, für die die Rechte gelten |
| `can_create` | Checkbox | nein | CREATE erlaubt |
| `can_read` | Checkbox | nein | READ erlaubt |
| `can_update` | Checkbox | nein | UPDATE erlaubt |
| `can_delete` | Checkbox | nein | DELETE erlaubt |

Erwartete Beziehung:

- `table_permissions.role` → `roles`

Hinweise:

- Die Rechte werden nicht gegen Tabellen-IDs, sondern gegen `table_name` aufgelöst.
- Der Wert in `table_name` muss zu dem Tabellennamen passen, den die Middleware im Workspace sieht.

## Beziehungen

```text
users (1) ───< user_roles >─── (1) roles
roles (1) ───< table_permissions
```

Praktisch bedeutet das:

- Ein Benutzer kann mehrere Rollen haben.
- Eine Rolle kann mehreren Benutzern zugewiesen sein.
- Eine Rolle kann für viele Tabellen ein eigenes CRUD-Rechteset haben.

## Verhalten beim Start

Beim Start versucht `DatabaseInitializationService` Folgendes:

1. Basistabellen `users` und `roles` anlegen
2. Tabellen `user_roles` und `table_permissions` anlegen
3. erforderliche Link-Spalten prüfen
4. Rolle `admin` sicherstellen
5. Bootstrap-Benutzer sicherstellen
6. Bootstrap-Benutzer der Rolle `admin` zuordnen

## Manuelle Schritte in NocoDB

Prüfe nach dem ersten Start in NocoDB diese Punkte:

### 1. Sind alle vier Tabellen vorhanden?

- `users`
- `roles`
- `user_roles`
- `table_permissions`

### 2. Sind die Link-Spalten vorhanden?

In `user_roles`:

- `user` als Link auf `users`
- `role` als Link auf `roles`

In `table_permissions`:

- `role` als Link auf `roles`

### 3. Stimmen die Spaltennamen exakt?

Die Middleware arbeitet mit festen Feldnamen. Besonders kritisch sind:

- `username`
- `role_name`
- `table_name`
- `user`
- `role`
- `can_create`
- `can_read`
- `can_update`
- `can_delete`

Abweichende Namen führen zu Laufzeitfehlern oder leeren Berechtigungsmengen.

## Beispiel-Datensätze

### Rolle `admin`

| role_name | description | is_system_role |
|---|---|---:|
| `admin` | System Administrator | true |

### Benutzer-Zuweisung

`user_roles`:

| user | role | assigned_at |
|---|---|---|
| Benutzer-ID 1 | Rollen-ID 1 | 2026-04-12T10:00:00.000Z |

### Tabellenrechte

`table_permissions`:

| role | table_name | can_create | can_read | can_update | can_delete |
|---|---|---:|---:|---:|---:|
| Rollen-ID 1 | `users` | true | true | true | true |
| Rollen-ID 1 | `roles` | true | true | true | true |
| Rollen-ID 1 | `table_permissions` | true | true | true | true |
| Rollen-ID 1 | `user_roles` | true | true | true | true |

## Table Prefix beachten

Wenn `NOCODB_TABLE_PREFIX` gesetzt ist, verwendet die Middleware intern weiterhin die logischen Namen wie `users` oder `roles`, sucht in NocoDB aber die physisch präfixierten Tabellen.

Beispiel:

- Konfiguration: `NOCODB_TABLE_PREFIX=app_`
- Physische Tabellen: `app_users`, `app_roles`, `app_user_roles`, `app_table_permissions`

Die Dokumentation in diesem Kapitel verwendet die **logischen** Namen ohne Präfix.

## Bekannte Grenze

Die Middleware prüft beim Start, ob die benötigten Link-Spalten existieren, und loggt fehlende Beziehungen. Sie beendet den Start dabei nicht zwingend mit einem Fehler.

Das bedeutet:

- Die Anwendung kann hochfahren.
- Rollen- und Berechtigungsfunktionen können trotzdem später fehlschlagen.

Deshalb sollte die Tabellenstruktur nach der Initialisierung immer einmal in NocoDB verifiziert werden.
