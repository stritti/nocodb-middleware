# Security

## Grundsatz

Die Middleware erhöht die Sicherheit gegenüber einem direkten Frontend-Zugriff auf NocoDB, ersetzt aber keine vollständige Sicherheitsarchitektur.
Sie validiert JWTs, erzwingt RBAC, setzt Security Header und limitiert Requests.
Login, Session-Verwaltung, Token-Rotation und Browser-Speicherung von Tokens bleiben Architekturentscheidungen des integrierenden Systems.

## Kritische Architekturpunkte

### 1. JWT-Ausstellung

Diese Middleware stellt keine Tokens aus.
Ein externer Identity Provider oder Auth-Service ist erforderlich.

Zusatz: Die Middleware kann mit `AUTH_PROVIDER=local|external` zwischen lokalem und externem JWT-Validierungsmodus umschalten. Bei `external` gilt fail-closed: ohne `EXTERNAL_JWT_SECRET` startet die Anwendung nicht.

#### Schlüssel und Algorithmen

- HMAC-Secrets (`JWT_SECRET`, `EXTERNAL_JWT_SECRET` bei `HS*`) müssen mindestens 32 Byte lang sein. Bekannte Platzhalter wie `your_jwt_secret_here` werden abgelehnt; die Anwendung startet dann nicht. Wer das Secret kennt, kann beliebige `sub`- und `scope`-Claims ausstellen, es ist also ein Generalschlüssel.
- Im External-Modus wird der Algorithmus aus dem Schlüssel abgeleitet: RSA-Public-Key ergibt `RS256`, EC-Public-Key `ES256`, sonst `HS256`. Eine explizite Liste in `EXTERNAL_JWT_ALGORITHMS` darf `HS*` nicht mit `RS*`/`PS*`/`ES*` mischen.
- Lokale Tokens werden gegen `JWT_ISSUER` und `JWT_AUDIENCE` geprüft, wenn diese gesetzt sind.
- JWKS (automatische Schlüsselrotation beim IdP) wird noch nicht unterstützt. Bei einer Rotation muss `EXTERNAL_JWT_SECRET` aktualisiert und die Middleware neu gestartet werden.

### 2. Token-Speicherung im Frontend

Für diese Middleware ist die Frage nicht nur, **ob** ein Token sicher gespeichert wird, sondern auch **wie** es zur Middleware gelangt.

- Bearer Token im Header funktioniert direkt.
- `httpOnly` Cookies funktionieren nur direkt, wenn ein vorgeschalteter BFF oder Gateway daraus serverseitig wieder einen Bearer Token macht oder die Middleware erweitert wird.
- Eine reine Cookie-Empfehlung ohne diese Einschränkung wäre fachlich falsch.

### 3. NocoDB API Token

`NOCODB_API_TOKEN` ist ein Backend-Secret.
Es darf nie im Browser, in mobilen Clients oder in öffentlich ausgelieferten Build-Artefakten landen.

## Empfohlene Sicherheitsmuster

### Muster A: Browser-SPA mit In-Memory Access Token

Geeignet für interne Werkzeuge oder kontrollierte Umgebungen.

- IdP-SDK im Frontend
- Access Token nur im Speicher
- kurzes Token-Lifetime-Modell
- strikte CSP und XSS-Härtung im Frontend

### Muster B: BFF oder Auth-Gateway

Geeignet für öffentliche produktive Systeme.

- Refresh Token in `httpOnly`, `Secure`, `SameSite` Cookies
- Session- und Refresh-Logik serverseitig
- Middleware wird nur serverseitig mit Bearer Token aufgerufen

## Checkliste vor Produktion

### Secrets

- [ ] `JWT_SECRET` nicht im Repo
- [ ] `NOCODB_API_TOKEN` nicht im Frontend
- [ ] `BOOTSTRAP_ADMIN_TOKEN` nur kurzzeitig und kontrolliert genutzt
- [ ] Secrets in Secret Store oder sicherem CI/CD-Mechanismus hinterlegt

### Transport und Browser

- [ ] HTTPS überall außerhalb lokaler Entwicklung
- [ ] `CORS_ORIGINS` explizit gesetzt
- [ ] Kein Wildcard-CORS in Produktion
- [ ] Browser-Frontend auf XSS-Risiken geprüft

### Anwendung

- [ ] Swagger- und Admin-Endpunkte bewusst freigegeben oder geschützt (`/api/docs`, `/api/admin/*`)
- [ ] RBAC-Rollen und Tabellenrechte geprüft
- [ ] Claim-Schema (`sub`, `scope`) mit IdP abgestimmt; Rollen werden nur in `user_roles` gepflegt, ein `roles`-Claim wird ignoriert
- [ ] Rate Limits an erwartete Last angepasst
- [ ] Logging aktiviert
- [ ] `/api/health` in Monitoring eingebunden

### IdP-Wechsel

- [ ] `AUTH_PROVIDER` nur kontrolliert per Deployment ändern
- [ ] vor Umschaltung Secrets für Zielprovider validieren
- [ ] nach Umschaltung Auth- und Berechtigungs-Regressionstests ausführen
- [ ] Rollback-Weg dokumentieren (`AUTH_PROVIDER` zurücksetzen + Neustart)

### Betrieb

- [ ] Rotation für Secrets definiert
- [ ] Backups und Wiederherstellung für NocoDB geklärt
- [ ] Alarmierung für Fehler und Ausfälle vorhanden
- [ ] Tracing oder Metriken für kritische Pfade aktiviert

## Bereits im Projekt vorhanden

- `helmet` Security Header
- JWT-Validierung, global für alle Routen (siehe [Authentifizierung standardmäßig](#authentifizierung-standardmäßig))
- RBAC
- Input-Validierung über DTOs
- **XSS-Input-Sanitization** über `@SanitizeHtml()` Decorator (mittels `sanitize-html`)
- **CORS-Validierung** mit Startup-Warnungen bei Wildcard- oder Localhost-Origins in Production
- Rate Limiting
- Logging
- Health Check
- optionale OpenTelemetry-Integration

## Noch offene Sicherheitslücken oder Verbesserungen

Aus `docs/product-readiness.md` ergeben sich vor allem diese Punkte:

- kein Audit Log für schreibende Operationen
- keine Retry-Strategie gegenüber NocoDB-Ausfällen
- kein Redis-Cache für mehrere Instanzen
- keine dedizierten Metriken wie `/metrics`

## Abhängigkeits-Scanning mit OSV-Scanner

[OSV-Scanner](https://github.com/google/osv-scanner) von Google scannt die Lockfiles gegen die [OSV-Datenbank](https://osv.dev) und ergänzt damit `npm audit`, Trivy, Snyk und Dependency Review im Workflow [`.github/workflows/security-audit.yml`](../.github/workflows/security-audit.yml) (Job **OSV-Scanner (OSV.dev)**).

- Gescannt werden `package-lock.json` (Middleware) und `client/package-lock.json` (Client-Library).
- Der Job läuft bei jedem PR, Push auf `main`, wöchentlich per Schedule und manuell; er benötigt kein Token.
- Alle Findings landen als SARIF (Kategorie `osv-scanner`) im GitHub-Tab „Security → Code scanning“ und als Tabelle in der Job-Zusammenfassung.
- Der Job schlägt fehl bei **HIGH/CRITICAL in Produktionsabhängigkeiten** (das Produktionsimage wird mit `npm ci --only=production` gebaut). Dev-only-Findings werden berichtet, blockieren aber nicht; Dependabot und Dependency Review kümmern sich um deren Aktualisierung.

Lokal läuft derselbe Check mit:

```bash
npm run security:osv
```

Dabei lädt `scripts/osv-scan.sh` die gepinnte Version `v2.7.1` (SHA-256-Verifikation über die Release-Checksummen) nach `node_modules/.cache/osv-scanner/`, scannt beide Lockfiles und wertet das JSON-Ergebnis mit `scripts/osv-report.mjs` aus. Voraussetzung ist die authentifizierte GitHub CLI (`gh`).

Die Auswertung ist über Umgebungsvariablen konfigurierbar:

- `OSV_FAIL_ON` – kommaseparierte Severities, die fehlschlagen (Default: `CRITICAL,HIGH`)
- `OSV_FAIL_ON_DEV=true` – dev-only Findings ebenfalls hart fehlschlagen lassen

Bekannte, akzeptierte Schwachstellen können über eine `osv-scanner.toml` ignoriert werden (automatisch pro Lockfile-Verzeichnis erkannt, siehe [OSV-Scanner Configuration](https://google.github.io/osv-scanner/configuration/)); jede Ausnahme sollte mit einer Begründung dokumentiert werden.

## Authentifizierung standardmäßig

Der `JwtAuthGuard` ist als globaler Guard (`APP_GUARD`) registriert. **Jede Route erfordert einen gültigen JWT**, auch wenn am Controller kein `@UseGuards` steht. Ein vergessener Guard kann einen Endpoint damit nicht mehr versehentlich öffnen.

Bewusst offene Routen werden mit `@Public()` markiert, am Handler oder am ganzen Controller:

```typescript
import { Public } from '../auth/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {}
```

Aktuell öffentlich (alle Routen liegen unter dem globalen Präfix `/api`):

| Route | Grund |
|---|---|
| `GET /api` | API-Info |
| `GET /api/health` | Health Checks von Load Balancer und Container |
| `POST /api/bootstrap/admin` | Kein JWT, stattdessen über den Header `x-bootstrap-token` geschützt |

Autorisierung kommt zusätzlich per Controller-Guard dazu. Globale Guards laufen zuerst, `req.user` ist also gesetzt:

```typescript
@UseGuards(RolesGuard)        // oder PermissionsGuard
@Controller('admin/...')
```

`@Public()` nur einsetzen, wenn der Endpoint wirklich ohne Anmeldung erreichbar sein muss oder anders geschützt ist.

## XSS Input Sanitization

Seit dem `xss-cors-hardening` Branch wird HTML-Sanitization über einen `@SanitizeHtml()` Decorator bereitgestellt.

### Funktionsweise

Der Decorator nutzt `class-transformer`'s `@Transform()` in Kombination mit `sanitize-html`, um HTML-Tags aus String-Feldern zu entfernen, bevor sie die Validierung durchlaufen.
Standardmäßig werden **alle** HTML-Tags entfernt (nur Plain Text bleibt erhalten).

### Verwendung

```typescript
import { SanitizeHtml } from '../../common/decorators/sanitize-html.decorator';

class CreatePostDto {
  @SanitizeHtml()
  title: string;
}
```

### Angewendete DTOs

| DTO | Feld | Beschreibung |
| --- | ---- | ------------ |
| `CreateExampleDto` | `title` | Freitext-Titel |
| `UpdateExampleDto` | `title` | (über PartialType von CreateExampleDto) |
| `CreateRoleDto` | `description` | Optionale Rollenbeschreibung |
| `ProvisionUserDto` | `username` | Benutzername |
| `BootstrapAdminDto` | `username` | Admin-Benutzername |

### Benutzerdefinierte Optionen

Falls ausnahmsweise bestimmte HTML-Tags erlaubt werden sollen, können `sanitize-html`-Optionen übergeben werden:

```typescript
@SanitizeHtml({ allowedTags: ['b', 'i', 'em'] })
description: string;
```

## CORS-Validierung

Die CORS-Konfiguration wird jetzt beim Startup validiert:

- **Leere `CORS_ORIGINS`**: Loggt eine Warnung, dass CORS deaktiviert ist
- **Wildcard `*`**: Loggt eine Warnung (nie in Production verwenden)
- **Localhost in Production**: Loggt eine Warnung
- **Korrekte Konfiguration**: Loggt die aktivierten Origins

Die Konfiguration erfolgt weiterhin über die `CORS_ORIGINS` Environment-Variable (komma-separierte Liste).

## Externe Referenzen

- OWASP JWT Cheat Sheet
- OWASP ASVS
- OWASP Cheat Sheet Series zu CORS, Logging und Secrets Management
