## ADDED Requirements

### Requirement: Systemtabellen mit NocoDB-Standardfeldtypen definieren
Das System MUST die Tabellen für Benutzer, Rollen und Berechtigungen mit NocoDB-typischen Feldtypen und klaren Feldbezeichnungen bereitstellen.

#### Scenario: Erstinitialisierung der Systemtabellen
- **WHEN** die Middleware in einer neuen Umgebung startet
- **THEN** das System MUST alle erforderlichen Systemtabellen mit den definierten Standardfeldern anlegen

### Requirement: Feldkonventionen für UI-Bearbeitung einhalten
Das System SHALL Feldnamen und Titel so bereitstellen, dass sie in der NocoDB-Oberfläche verständlich und direkt bearbeitbar sind.

#### Scenario: Admin bearbeitet Benutzerdatensatz in NocoDB
- **WHEN** ein Admin einen Benutzerdatensatz in der NocoDB-UI öffnet
- **THEN** das System MUST lesbare und semantisch eindeutige Felder für die Bearbeitung bereitstellen

### Requirement: Relationen zwischen Systemtabellen über LinkToAnotherRecord modellieren
Das System MUST Verknüpfungen zwischen Benutzern, Rollen und Berechtigungen über NocoDB `LinkToAnotherRecord`-Felder modellieren, sodass Beziehungen in NocoDB nachvollziehbar sind.

#### Scenario: Rolle wird einem Benutzer zugeordnet
- **WHEN** eine Benutzer-Rollen-Zuordnung erstellt wird
- **THEN** das System MUST die Beziehung über das vorgesehene `LinkToAnotherRecord`-Feld in der Systemtabellenstruktur persistieren

### Requirement: Numerische Fremdschlüssel nicht als primäres Relationsmodell nutzen
Das System SHALL Relationstabellen nicht primär über rohe Number-Fremdschlüssel modellieren, wenn eine `LinkToAnotherRecord`-Beziehung für denselben Zweck vorgesehen ist.

#### Scenario: Neues Relationsfeld wird für User-Roles angelegt
- **WHEN** die Middleware das Schema für Benutzer-Rollen-Beziehungen bereitstellt
- **THEN** das System MUST ein `LinkToAnotherRecord`-Feld anlegen und MUST NOT ausschließlich auf numerische `user_id`/`role_id`-Spalten als primäres Relationsmodell setzen