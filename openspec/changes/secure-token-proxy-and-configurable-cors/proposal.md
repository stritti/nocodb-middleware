## Why

Der NocoDB API-Token darf aus Sicherheitsgründen niemals im Frontend sichtbar werden und muss ausschließlich serverseitig in der Middleware verbleiben. Zusätzlich wird ein konfigurierbares CORS-Konzept benötigt, damit nur erlaubte Origins auf die Middleware zugreifen können.

## What Changes

- Einführung eines sicheren Proxy-Patterns: Frontend kommuniziert nur mit der NestJS-Middleware, nicht direkt mit NocoDB-Token.
- Verbindliche Trennung zwischen internen Middleware-Secrets und externen Client-Requests.
- Konfigurierbare CORS-Policy (Origins, Methods, Headers, Credentials) über Middleware-Konfiguration.
- Definierte Fehlerpfade für blockierte Origins und fehlkonfigurierte Security-Settings.
- Tests für Token-Abschirmung und CORS-Durchsetzung.

## Capabilities

### New Capabilities
- `secure-token-proxy`: Stellt sicher, dass NocoDB-Token nur serverseitig verwendet und nie an Clients weitergegeben werden.
- `configurable-cors-enforcement`: Ermöglicht konfigurierbare CORS-Regeln auf Middleware-Ebene mit nachvollziehbarer Durchsetzung.

### Modified Capabilities
- Keine.

## Impact

- Betroffene Bereiche: `src/main.ts`, `src/config/*`, `src/nocodb/*`, potenziell `src/auth/*` und zugehörige Tests.
- Sicherheit: Reduziertes Risiko für Token-Leakage durch strikte Proxy-Grenze.
- Betrieb: Zusätzliche Umgebungsparameter für CORS-Whitelist und Security-Defaults.
- API-Verhalten: Requests von nicht erlaubten Origins werden konsistent abgelehnt.