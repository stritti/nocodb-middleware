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
- [ ] Claim-Schema (`sub`, `roles`, `scope`) mit IdP abgestimmt
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
- JWT-Validierung
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
