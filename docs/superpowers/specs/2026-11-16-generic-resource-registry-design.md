# Generic Resource Registry: Design

Status: Vom Benutzer freigegeben und umgesetzt. Ressourcen und Berechtigungen
werden in NocoDB gepflegt; die Live-Datenfreigabe bleibt eine administrative
Aufgabe.

## Ziel und Motivation

Die Middleware soll keine Wurzelpartner-Ressourcen, Feldlisten, Filtertypen oder
Umgebungsvariablen mehr kennen. Neue Ressourcen werden ausschliesslich durch
geschuetzte Konfigurationsdatensaetze in NocoDB angelegt. Bestehende Rollen- und
Tabellenrechte in NocoDB entscheiden ueber den Zugriff.

Die Ressourcenkonfiguration definiert die maximal erlaubte Datenoberflaeche.
Ein Berechtigungseintrag kann diese Oberflaeche einschraenken, aber weder neue
Ressourcen noch zusaetzliche Antwortfelder freigeben. Der NocoDB-API-Token bleibt
eine serverseitige Zugangsinformation.

## Ausgangslage

- `PublicReadService` und `PublicReadController` enthalten drei feste Ressourcen
  und umgehen derzeit die rollenbasierte Tabellenpruefung.
- `PermissionsService` verwendet bereits `roles`, `user_roles` und
  `table_permissions`; Rechte beziehen sich auf logische Tabellennamen.
- `/api/data/:table` ist JWT-geschuetzt und kann mit OAuth-Scopes oder
  Tabellenrechten autorisiert werden. Dieser bestehende Vertrag bleibt erhalten.
- Die Initialisierung verwaltet interne Tabellen und numerische Rollenbeziehungen.
- Tabellenkatalog und Daten-Guard blenden interne Tabellen jeweils explizit aus.
- Der Frontend-Vertrag erwartet `/api/public/<ressource>`, Listen als
  `{ data, meta }` und Details direkt als Objekt.

## Betrachtete Ansaetze

1. Serverseitige JSON-Datei fuer Ressourcen und NocoDB-Tabellen fuer Rechte:
   versionierbar, aber zwei Pflegeorte und zunaechst Neustart bei Aenderungen.
2. Ressourcen und Rechte in geschuetzten NocoDB-Tabellen: ein Pflegeort und
   Konfigurationsaenderungen ohne neues Deployment; benoetigt sichere
   Konfigurationsvalidierung und ein dokumentiertes Aktualisierungsintervall.

Der Benutzer hat Ansatz 2 ausgewaehlt. Kein konfigurierbarer JavaScript-Code,
keine anwendungsspezifischen Plugins und keine Tabellenwahl durch den Browser.

## Umfang

Diese Aenderung ersetzt die bestehende oeffentliche Leseintegration durch ein
generisches, datengetriebenes Modul. Die Tabellenstruktur laesst sich spaeter
erweitern; diese Phase implementiert keine neuen Schreib- oder Login-Flows.

Nicht enthalten sind Row-Level-Security, benutzerspezifische Antwortdaten,
beliebige Joins, frei programmierbare Transformationen, eine neue Admin-UI oder
eine Migration der bisherigen Browser-Anmeldung. Die vorhandenen geschuetzten
Daten- und Admin-Endpunkte bleiben funktional erhalten.

## Konfiguration in NocoDB

Neue interne Tabellen werden wie die vorhandenen Systemtabellen unter
`NOCODB_TABLE_PREFIX` verwaltet. Beziehungen verwenden numerische IDs, keine
NocoDB-Linkfelder. Tabellen werden bei der Initialisierung angelegt bzw.
ergaenzt; daraus folgt noch keine Datenfreigabe.

### api_resources

| Feld            | Bedeutung                                                         |
| --------------- | ----------------------------------------------------------------- |
| `resource_name` | Eindeutiger URL-Name, z. B. `tree-info`; keine reservierten Pfade |
| `table_name`    | Logischer NocoDB-Tabellenname ohne Middleware-Praefix             |
| `enabled`       | Explizite Aktivierung; fehlend oder ungueltig bedeutet gesperrt   |

Der Tabellenname wird wie beim bestehenden Datenzugriff in der konfigurierten
Base aufgeloest. Die dabei aufgeloeste Tabelle ist zugleich das Ziel der
Berechtigungspruefung. Es gibt keinen unabhaengigen, frei zuordenbaren
`permission_table`-Namen, mit dem Rechte auf eine andere Tabelle umgeleitet
werden koennten. Interne Tabellen sind als Ressourcenziel immer verboten.

### api_resource_fields

| Feld             | Bedeutung                                                              |
| ---------------- | ---------------------------------------------------------------------- |
| `resource_id`    | Numerische ID aus `api_resources`                                      |
| `source_field`   | Existierender Feldtitel der Zieltabelle                                |
| `response_field` | Expliziter Name des Felds in der HTTP-Antwort                          |
| `normalization`  | Feste generische Auswahl: `none` oder `lowerFirstDeep`                 |
| `default_json`   | Optionaler JSON-Standardwert bei fehlendem oder nullwertigem Quellwert |

Die Record-ID wird als `id` aus dem NocoDB-Record uebernommen. Sie darf nicht
durch ein Feldmapping ueberschrieben werden. Antwortschluessel sind flach,
eindeutig und duerfen keine Prototype-Schluessel wie `__proto__`, `constructor`
oder `prototype` sein. Ohne gueltige Feldfreigaben ist die Ressource gesperrt.

Der Standardwert `[]` und `lowerFirstDeep` bilden das vorhandene Attachment-
Verhalten datengetrieben ab, ohne einen Sonderfall fuer Baumarten oder Logos.
Fuer Attachment-Objekte bleibt der komplette bewusst freigegebene Feldwert
sichtbar; das ist keine automatische Freigabe beliebiger Tabellenrelationen.

### api_resource_filters

| Feld                  | Bedeutung                                                       |
| --------------------- | --------------------------------------------------------------- |
| `resource_id`         | Numerische ID aus `api_resources`                               |
| `query_param`         | Zugelassener Query-Parameter; `page` und `take` sind reserviert |
| `source_field`        | Existierender Feldtitel der Zieltabelle                         |
| `required`            | Ob der Parameter fuer Listen vorhanden sein muss                |
| `allowed_values_json` | Nichtleere JSON-Liste explizit erlaubter Stringwerte            |

Version 1 unterstuetzt Gleichheitsfilter; mehrere Filter werden mit AND
verknuepft. Der Partner-/Sponsor-Fall entsteht ausschliesslich durch einen
Datensatz mit `query_param=type`, dem tatsaechlichen Quellfeld und den erlaubten
Werten `Partner` und `Sponsor`. Kein frei uebergebenes `where`, `sort`, `fields`,
Tabellenname, Operator oder Ausdruck wird akzeptiert. Parameterlisten und
verschachtelte Query-Werte werden abgewiesen. Filterwerte werden mit den
vorhandenen sicheren NocoDB-Filterhilfen serialisiert.

Filterfelder muessen nicht in der Antwort freigegeben sein. Die Konfiguration
ist deshalb genauso privilegiert wie die Feldfreigabe selbst.

## Berechtigungen und anonyme Leser

Eine reservierte Rolle mit `role_name=anonymous` repraesentiert ausschliesslich
oeffentliche Leser. Es wird kein kuenstlicher Benutzer angelegt, kein JWT aus
dem Frontend erzeugt und keine Rolle aus einem Request-Parameter uebernommen.

Fuer jede oeffentliche Anfrage ist ein gueltiger `can_read=true`-Eintrag in
`table_permissions` fuer diese existierende Rolle und die tatsaechliche
logische Zieltabelle notwendig. Fehlende Rolle, fehlender Eintrag und alle
anderen Werte bedeuten keine Berechtigung. Mehrdeutige Rollendefinitionen
werden abgewiesen. Keine automatische Lesefreigabe bei Initialisierung.

Die Rolle kann bei der Initialisierung ohne Tabellenrechte angelegt werden.
Das ist kein Recht, andere Rollen oder Konfigurationstabellen zu lesen.
Anonyme Schreiboperationen werden in dieser Phase nicht implementiert, auch
nicht bei versehentlich gesetzten `can_create`- oder `can_update`-Werten.

Oeffentliche Endpunkte verwenden immer die anonyme Berechtigungsmenge, auch
wenn ein Authorization-Header mitgeschickt wird. Sie werden nicht automatisch
zu benutzerspezifischen Endpunkten. Geschuetzte Benutzerzugriffe laufen weiter
ueber den bestehenden JWT-Pfad. OAuth-Scopes duerfen keine fehlende anonyme
Freigabe auf einem oeffentlichen Endpunkt ersetzen.

Diese Rechte sind Middleware-Rechte, die in NocoDB gespeichert werden. Sie
sind nicht automatisch identisch mit der nativen NocoDB-Benutzerverwaltung.

## Schutz der Konfigurationsdaten

`api_resources`, `api_resource_fields` und `api_resource_filters` werden in die
zentrale Definition interner Systemtabellen aufgenommen. Daten-Guard,
Tabellenkatalog und Ressourcenvalidierung verwenden dieselbe Sperrliste.
Sie sind niemals regulaere Datenressourcen, auch nicht fuer einen Benutzer
mit einem Wildcard-Scope auf der generischen Datenroute.

Die Pflege erfolgt zunaechst ausschliesslich ueber NocoDB mit entsprechend
beschraenktem administrativem Zugriff. Neue generische Verwaltungsendpunkte
fuer diese drei Tabellen sind nicht Teil dieser Phase. Bestehende geschuetzte
Rollen-/Rechte-Endpunkte bleiben fuer Berechtigungen verwendbar. Die neuen
Tabellen werden in die bestehenden Admin-Systemrechte aufgenommen, erhalten
aber keinerlei nichtadministrative Standardrechte.

## Laden, Validierung und Cache

- Ein validierter Ressourcen-Snapshot wird hoechstens 30 Sekunden verwendet.
  Aenderungen an Ressourcen, Feldern und Filtern wirken ohne Deployment oder
  Neustart spaetestens nach Ablauf dieses Intervalls beim naechsten Zugriff.
- Alle Konfigurationsseiten werden gelesen; die NocoDB-Standardseite darf
  Konfigurationsdatensaetze nicht still abschneiden.
- Die bisher optional unterstuetzte NocoDB-v3-Seitenabfrage wird fuer diese
  Registry-Ladevorgaenge verwendet. Ihre Transportparameter werden getestet.
- Doppelte Ressourcennamen, mehrdeutige Feld-/Filternamen, verwaiste Beziehungen,
  ungueltige JSON-Werte und nicht aufloesbare Tabellen/Felder fuehren zu einer
  nicht nutzbaren Konfiguration. Es gibt keinen Fallback auf alte Wurzelpartner-
  Werte oder einen abgelaufenen erfolgreichen Snapshot.
- Bei unvollstaendiger Aenderung ueber mehrere Tabellen gilt fail-closed. Fuer
  groessere Aenderungen die Ressource deaktivieren und erst zuletzt aktivieren.
  NocoDB bietet hier keine zugesagte atomare Mehrtabellen-Konfiguration.
- Die anonyme Leseberechtigung wird vor jedem Datenzugriff und vor jedem
  Antwort-Cache-Treffer frisch aus NocoDB geprueft. In dieser Phase gibt es
  keinen neuen Berechtigungs-Cache fuer anonyme Zugriffe. Ein Entzug greift
  beim naechsten erfolgreich ausgewerteten Request.
- Ist die frische Berechtigungspruefung nicht moeglich, werden keine Daten aus
  dem Antwort-Cache ausgeliefert. Verfuegbarkeit wird nicht ueber Autorisierung
  gestellt. Der bestehende Benutzerrechte-Cache anderer Routen bleibt unberuehrt.
- Erfolgreiche Datenantworten koennen weiter bis zu 60 Sekunden gecacht werden.
  Der Cache-Key umfasst Ressource, Tabelle, Snapshot-Version, Seite, Filter und
  die oeffentliche Berechtigungsidentitaet. Eine geaenderte Feldfreigabe darf
  nach Aktivierung des neuen Snapshots keine alte Antwort wiederverwenden.

## Generischer HTTP-Vertrag

- `GET /api/public/:resource` fuer Listen.
- `GET /api/public/:resource/:id` fuer Details.
- `page` ab 1, `take` von 1 bis 50; Standardwerte 1 und 25.
- Listenformat `{ data, meta: { page, take, total, pageCount } }`.
- Details als direktes, feldbeschraenktes Objekt.
- Unbekannte oder deaktivierte Ressource bzw. fehlender Datensatz: 404.
- Gueltige Ressource ohne anonyme Leseberechtigung: 403.
- Ungueltige Seiten, IDs oder nicht erlaubte Query-Parameter/-Werte: 400.
- Nicht auswertbare Konfiguration oder Berechtigungsquelle: 503, keine Daten.
- Keine nicht-GET-Methode wird auf dem oeffentlichen Ressourcenpfad registriert.

Ein statischer Controller und eine generische Query-Validierung ersetzen die
heutigen Ressourcenmethoden und den programmierten `PartnerSponsorType`.
Die HTTP-Oberflaeche dokumentiert den generischen Vertrag; die konkreten
Ressourcen sind Daten und werden nicht als hart codierte OpenAPI-Routen erzeugt.

## Migration und Kompatibilitaet

1. Die generischen Systemtabellen und die unberechtigte Rolle `anonymous`
   bereitstellen. Keine Anwendungsressourcen automatisch anlegen.
2. In einer getrennten Wurzelpartner-Anleitung Beispieldatensaetze fuer
   `tree-info`, `locations` und `partner-sponsors` dokumentieren. Tatsaechliche
   logische Tabellennamen anhand der bisherigen IDs im Katalog feststellen;
   keine unbekannten Tabellennamen erraten.
3. Feldmappings, benoetigte Attachment-Standards und den `type`-Filter anlegen.
4. Gewuenschte Leserechte in `table_permissions` fuer `anonymous` setzen.
5. Ressourcen ausdruecklich aktivieren und Listen/Details pruefen.
6. Die Variablen `WURZELPARTNER_*` und ihre Auswertung vollstaendig entfernen;
   keine automatische Rueckfallfreigabe. Die Umstellung erfordert eine
   bewusste Datenmigration und darf nicht als unterbrechungsfrei gelten.

Das generische Middleware-Repository enthaelt keine fest verdrahteten
Wurzelpartner-Datensaetze. Anwendungsspezifische Beispiele gehoeren in das
Frontend-/Deployment-Repository. Der Browser behaelt seine bisherigen
Ressourcenpfade und Fachmodelle. Die zentrale Frontend-Middleware-Abstraktion
verliert ihre feste Ressourcen-/Filter-Typbindung; die Fachservices duerfen
ihre jeweiligen Ressourcennamen weiterhin kennen.

Live-Datenbanken werden nicht durch Agentenbefehle migriert. Zunaechst werden
Code, mockgestuetzte Tests und eine Anleitung geliefert. Die Datenfreigabe
erfolgt durch die verantwortliche Administration.

## Verifikation und Abnahmekriterien

- Eine zusaetzliche, bisher unbekannte Ressource funktioniert allein durch neue
  Konfigurationsdatensaetze und ein explizites Tabellen-Leserecht.
- Ohne Ressource, Felder oder Leserecht liefert keine Route Daten.
- Feldmapping, Standardwerte, Attachment-Normalisierung, erlaubte Enum-Filter,
  Seitengrenzen und Mehrseitenkonfiguration sind getestet.
- Interne Tabellen koennen weder ueber Katalog, generische Datenrouten noch
  ueber gefaelschte Ressourcenkonfiguration veroeffentlicht werden.
- Entzug anonymer Rechte wird auch bei gecachter Datenantwort wirksam.
- Fehler der Konfigurations-/Berechtigungsquelle und ungueltige Datensaetze
  bleiben geschlossen, ohne stale Datenfreigabe.
- Neue Snapshot-Versionen trennen alte Datenantworten nach Feld-/Filteraenderung.
- Bestehende Wurzelpartner-Listen/Details und die 100-Standorte-Abfrage bleiben
  mit entsprechender Konfiguration kompatibel.
- Bestehende JWT-/Scope-geschuetzte Daten- und Admin-Tests bleiben erfolgreich.
- Scoped Formatierung und Lint, Backend-Unit-/HTTP-Tests, Frontend-Tests,
  Typpruefung, Builds und aktualisierte generische OpenAPI-Dateien werden geprueft.
- Ein echter NocoDB-Live-Test und administrative Dateneingaben werden separat
  ausgewiesen und nicht durch reine Mocktests als erledigt behauptet.

## Entscheidungen der Implementierung

Dateiaufteilung, interne Typnamen, begrenzte Konfigurationsgroessen und die
konkrete Snapshot-Versionierung legt die Implementierung passend zum Bestand
fest. Es werden vorhandene Filter-, Cache-, Pagination- und Validierungshilfen
wiederverwendet, keine weitere Policy-Sprache oder Ausfuehrungsumgebung eingefuehrt.
