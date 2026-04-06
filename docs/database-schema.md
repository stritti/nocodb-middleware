# Datenbankschema – NocoDB Middleware

Dieses Dokument beschreibt alle NocoDB-Tabellen, Spalten und Beziehungen, die von der
NocoDB Middleware vorausgesetzt werden. Die Tabellen werden beim Start der Anwendung durch
den `DatabaseInitializationService` automatisch angelegt (falls noch nicht vorhanden).
**Verknüpfungsspalten (Link-Columns) müssen jedoch manuell in der NocoDB-UI erstellt
werden** – siehe [Manuelle Einrichtung der Link-Columns](#manuelle-einrichtung-der-link-columns).

---

## Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Tabelle: `users`](#tabelle-users)
3. [Tabelle: `roles`](#tabelle-roles)
4. [Tabelle: `user_roles`](#tabelle-user_roles)
5. [Tabelle: `table_permissions`](#tabelle-table_permissions)
6. [Beziehungsdiagramm](#beziehungsdiagramm)
7. [Manuelle Einrichtung der Link-Columns](#manuelle-einrichtung-der-link-columns)
8. [Standard-Seed-Daten](#standard-seed-daten)
9. [Tabellen-Präfix](#tabellen-präfix)
10. [Hinweise zur Produktionsreife](#hinweise-zur-produktionsreife)

---

## Überblick

Das Berechtigungssystem der Middleware basiert auf vier NocoDB-Tabellen:

| Tabelle             | Titel             | Zweck                                                         |
|---------------------|-------------------|---------------------------------------------------------------|
| `users`             | Users             | Benutzerkonten                                                |
| `roles`             | Roles             | Rollendefinitionen                                            |
| `user_roles`        | User Roles        | Many-to-Many-Verknüpfung zwischen Benutzern und Rollen        |
| `table_permissions` | Table Permissions | CRUD-Berechtigungen einer Rolle für eine bestimmte Tabelle    |

---

## Tabelle: `users`

Speichert alle Benutzerkonten, die sich gegenüber der Middleware authentifizieren können.

| Spaltenname     | Titel           | NocoDB-Typ       | Pflicht | Beschreibung                                                  |
|-----------------|-----------------|------------------|---------|---------------------------------------------------------------|
| `id`            | Id              | (Auto, NocoDB)   | –       | Automatisch generierter numerischer Primärschlüssel           |
| `username`      | Username        | SingleLineText   | ✅      | Eindeutiger Benutzername                                      |
| `email`         | Email           | Email            | ✅      | E-Mail-Adresse des Benutzers                                  |
| `password_hash` | Password Hash   | LongText         | ✅      | Gehashtes Passwort (SHA-256; in Produktion: bcrypt verwenden) |
| `is_active`     | Is Active       | Checkbox         | –       | `true` = Konto aktiv; `false` = Konto gesperrt                |

**Eindeutigkeits-Constraints:** `username` und `email` müssen jeweils eindeutig sein (wird
von der Anwendungslogik sichergestellt, nicht durch NocoDB selbst).

---

## Tabelle: `roles`

Speichert die definierten Rollen im System.

| Spaltenname      | Titel           | NocoDB-Typ       | Pflicht | Beschreibung                                                              |
|------------------|-----------------|------------------|---------|---------------------------------------------------------------------------|
| `id`             | Id              | (Auto, NocoDB)   | –       | Automatisch generierter numerischer Primärschlüssel                       |
| `role_name`      | Role Name       | SingleLineText   | ✅      | Eindeutiger Rollenname (3–50 Zeichen, alphanumerisch, Leerzeichen, `_`, `-`) |
| `description`    | Description     | LongText         | –       | Optionale Beschreibung der Rolle (max. 255 Zeichen)                       |
| `is_system_role` | Is System Role  | Checkbox         | –       | `true` = Systemrolle, die nicht gelöscht werden darf                      |

**Eindeutigkeits-Constraint:** `role_name` muss eindeutig sein (wird von der
Anwendungslogik sichergestellt).

---

## Tabelle: `user_roles`

Verknüpfungstabelle (Junction Table) für die Many-to-Many-Beziehung zwischen `users` und
`roles`.

| Spaltenname   | Titel       | NocoDB-Typ           | Pflicht | Beschreibung                                                              |
|---------------|-------------|----------------------|---------|---------------------------------------------------------------------------|
| `id`          | Id          | (Auto, NocoDB)       | –       | Automatisch generierter numerischer Primärschlüssel                       |
| `user`        | User        | LinkToAnotherRecord  | ✅      | **Manuell anlegen** – Verknüpfung zur Tabelle `users`                     |
| `role`        | Role        | LinkToAnotherRecord  | ✅      | **Manuell anlegen** – Verknüpfung zur Tabelle `roles`                     |
| `assigned_at` | Assigned At | DateTime             | –       | Zeitstempel der Rollenzuweisung (ISO 8601)                                |

> ⚠️ Die Spalten `user` und `role` sind **LinkToAnotherRecord**-Spalten und müssen **manuell
> in der NocoDB-UI** angelegt werden. Weitere Schritte siehe
> [Manuelle Einrichtung der Link-Columns](#manuelle-einrichtung-der-link-columns).

---

## Tabelle: `table_permissions`

Definiert, welche CRUD-Operationen eine Rolle auf einer bestimmten Tabelle ausführen darf.

| Spaltenname  | Titel        | NocoDB-Typ           | Pflicht | Beschreibung                                              |
|--------------|--------------|----------------------|---------|-----------------------------------------------------------|
| `id`         | Id           | (Auto, NocoDB)       | –       | Automatisch generierter numerischer Primärschlüssel       |
| `role`       | Role         | LinkToAnotherRecord  | ✅      | **Manuell anlegen** – Verknüpfung zur Tabelle `roles`     |
| `table_name` | Table Name   | SingleLineText       | ✅      | Name der Zieltabelle (z. B. `products`, `orders`)         |
| `can_create` | Can Create   | Checkbox             | –       | Erstellberechtigung – CREATE erlaubt (Standard: `false`)  |
| `can_read`   | Can Read     | Checkbox             | –       | Leseberechtigung – READ erlaubt (Standard: `false`)       |
| `can_update` | Can Update   | Checkbox             | –       | Schreibberechtigung – UPDATE erlaubt (Standard: `false`)  |
| `can_delete` | Can Delete   | Checkbox             | –       | Löschberechtigung – DELETE erlaubt (Standard: `false`)    |

> ⚠️ Die Spalte `role` ist eine **LinkToAnotherRecord**-Spalte und muss **manuell in der
> NocoDB-UI** angelegt werden. Weitere Schritte siehe
> [Manuelle Einrichtung der Link-Columns](#manuelle-einrichtung-der-link-columns).
>
> Alle Checkbox-Spalten sind standardmäßig `false` (Deny-by-default-Prinzip).

---

## Beziehungsdiagramm

```
┌──────────────────────────┐
│          users           │
│  id  │ username │ email  │
└────────────┬─────────────┘
             │ 1
             │
             │ N
┌────────────▼─────────────────────────┐
│             user_roles               │
│  id  │ user (→users) │ role (→roles) │
│      │ assigned_at                   │
└────────────────────┬─────────────────┘
                     │ N
                     │
                     │ 1
          ┌──────────▼──────────────────────────────┐
          │                roles                    │
          │  id  │ role_name │ description │ ...    │
          └──────────────────┬──────────────────────┘
                             │ 1
                             │
                             │ N
          ┌──────────────────▼──────────────────────────────────────┐
          │                  table_permissions                       │
          │  id  │ role (→roles) │ table_name │ can_* (4× Checkbox) │
          └─────────────────────────────────────────────────────────┘
```

**Beziehungen im Detail:**

| Von                  | Nach                | Typ           | Beschreibung                                               |
|----------------------|---------------------|---------------|------------------------------------------------------------|
| `users`              | `user_roles`        | One-to-Many   | Ein Benutzer kann mehrere Rollenzuweisungen haben          |
| `roles`              | `user_roles`        | One-to-Many   | Eine Rolle kann mehreren Benutzern zugewiesen sein         |
| `users` ↔ `roles`   | via `user_roles`    | Many-to-Many  | Benutzer und Rollen sind über `user_roles` verknüpft       |
| `roles`              | `table_permissions` | One-to-Many   | Eine Rolle kann Berechtigungen für mehrere Tabellen haben  |

---

## Manuelle Einrichtung der Link-Columns

Link-Columns (Typ `LinkToAnotherRecord`) können **nicht über die NocoDB-API** angelegt
werden und müssen einmalig manuell in der NocoDB-UI erstellt werden.

### Erforderliche Link-Columns

| Tabelle             | Spaltenname | Ziel-Tabelle | Beschreibung                        |
|---------------------|-------------|--------------|-------------------------------------|
| `user_roles`        | `user`      | `users`      | Verknüpft Zuweisung mit Benutzer    |
| `user_roles`        | `role`      | `roles`      | Verknüpft Zuweisung mit Rolle       |
| `table_permissions` | `role`      | `roles`      | Verknüpft Berechtigung mit Rolle    |

### Schritt-für-Schritt-Anleitung

1. Öffne die NocoDB-UI im Browser (Standard: `http://localhost:8080`).
2. Navigiere zu deiner Base (Datenbank).
3. **Für `user_roles.user → users`:**
   - Öffne die Tabelle **User Roles**.
   - Klicke auf **+ Spalte hinzufügen**.
   - Wähle als Typ **Links** (= `LinkToAnotherRecord`).
   - Setze den Spaltennamen auf `user`.
   - Wähle als Ziel-Tabelle **Users**.
   - Wähle den Beziehungstyp **Has Many** (User hat viele User-Roles).
   - Klicke **Speichern**.
4. **Für `user_roles.role → roles`:**
   - Öffne die Tabelle **User Roles**.
   - Klicke auf **+ Spalte hinzufügen**.
   - Wähle als Typ **Links**.
   - Setze den Spaltennamen auf `role`.
   - Wähle als Ziel-Tabelle **Roles**.
   - Wähle den Beziehungstyp **Has Many** (Role hat viele User-Roles).
   - Klicke **Speichern**.
5. **Für `table_permissions.role → roles`:**
   - Öffne die Tabelle **Table Permissions**.
   - Klicke auf **+ Spalte hinzufügen**.
   - Wähle als Typ **Links**.
   - Setze den Spaltennamen auf `role`.
   - Wähle als Ziel-Tabelle **Roles**.
   - Wähle den Beziehungstyp **Has Many** (Role hat viele Table-Permissions).
   - Klicke **Speichern**.
6. Starte die Anwendung neu. Der `DatabaseInitializationService` prüft beim Start, ob alle
   Link-Columns vorhanden sind, und gibt eine Fehlermeldung aus, wenn noch welche fehlen.

> **Tipp:** Wenn Link-Columns fehlen, gibt die Anwendung beim Start eine detaillierte
> Fehlermeldung mit konkreten Anweisungen aus (erkennbar an `⚠️ MISSING LINK COLUMNS`).

---

## Standard-Seed-Daten

Der `DatabaseInitializationService` legt beim ersten Start automatisch folgende Datensätze
an, sofern sie noch nicht existieren:

### Admin-Rolle

| Feld             | Wert                    |
|------------------|-------------------------|
| `role_name`      | `admin`                 |
| `description`    | `System Administrator`  |
| `is_system_role` | `true`                  |

### Admin-Benutzer

| Feld            | Wert                                        |
|-----------------|---------------------------------------------|
| `username`      | `admin`                                     |
| `email`         | `admin@example.com`                         |
| `password_hash` | SHA-256-Hash von `password123` (⚠️ ändern!) |
| `is_active`     | `true`                                      |

> ⚠️ **Sicherheitshinweis:** Das Standard-Passwort `password123` muss vor dem
> Produktions-Deployment geändert werden. Außerdem sollte `password_hash` in der Produktion
> mit **bcrypt** (konfigurierbar über `BCRYPT_ROUNDS`, mind. 12 Runden) statt SHA-256
> gehasht werden.

### Rollenzuweisung

Dem Admin-Benutzer wird beim Seeding automatisch die Admin-Rolle zugewiesen
(`user_roles`-Eintrag).

---

## Tabellen-Präfix

Alle Tabellennamen können optional mit einem Präfix versehen werden, um Namenskollisionen
in einer gemeinsam genutzten NocoDB-Base zu vermeiden.

**Konfiguration:** Umgebungsvariable `NOCODB_TABLE_PREFIX`

```env
NOCODB_TABLE_PREFIX=myapp_
```

Mit diesem Präfix lauten die Tabellennamen:

| Logischer Name      | Tatsächlicher Tabellenname |
|---------------------|---------------------------|
| `users`             | `myapp_users`             |
| `roles`             | `myapp_roles`             |
| `user_roles`        | `myapp_user_roles`        |
| `table_permissions` | `myapp_table_permissions` |

> **Hinweis:** Die Anwendung behandelt den Präfix intern transparent. Alle API-Aufrufe und
> Konfigurationen verwenden weiterhin die logischen Namen ohne Präfix.

---

## Hinweise zur Produktionsreife

| Punkt                   | Status    | Empfehlung                                                                     |
|-------------------------|-----------|--------------------------------------------------------------------------------|
| Passwort-Hashing        | ⚠️ Offen  | SHA-256 durch **bcrypt** ersetzen; Anzahl der Runden über `BCRYPT_ROUNDS` (mind. 12) konfigurieren |
| Link-Columns            | ⚠️ Manuell | Einmalig in der NocoDB-UI anlegen (siehe Anleitung oben)                      |
| Standard-Passwort       | ⚠️ Offen  | `password123` des Admin-Benutzers nach dem ersten Start ändern                |
| Eindeutigkeits-Indizes  | ⚠️ Offen  | NocoDB unterstützt keine nativen Unique-Constraints; Duplikate werden per Code verhindert |
| Automatisches Setup     | 💡 Geplant | Bootstrap-Skript oder erweiterter `DatabaseInitializationService` mit Link-Column-Erstellung |
