# Error Handling

## Überblick

Globale Fehlerbehandlung erfolgt über `NocoDBExceptionFilter`:
- Datei: `src/nocodb/filters/nocodb-exception.filter.ts`

## Standard-Fehlerformat

```json
{
  "statusCode": 404,
  "timestamp": "2026-01-01T12:00:00.000Z",
  "path": "/api/resource",
  "message": "Record not found",
  "error": "NocoDB Error"
}
```

## Custom Exception

`NocoDBException` (`src/nocodb/exceptions/nocodb.exception.ts`) bietet Helper wie:
- `tableNotFound(tableName)`
- `recordNotFound(tableName, id)`
- `unauthorized(message)`

## Verhalten des Filters

- Formatiert `HttpException` konsistent
- Loggt NocoDB-spezifische Fehler als Warning
- Loggt sonstige HTTP-Fehler als Error
- Unterdrückt typische statische 404-Rauschevents (favicon, icons)

## Geplante Erweiterung (OpenSpec)

- Striktere Fehlerklassifikation für V3 Data/Meta
- Korrelation über Request-ID in allen relevanten Fehlerlogs
- Redaction sensibler Felder in Error-/Logging-Pfaden
