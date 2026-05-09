# Entwicklerguide

## Zielbild

`nocodb-middleware` ist eine NestJS-Schicht zwischen Clients und NocoDB. Sie bündelt Authentifizierungsprüfung, rollenbasierte Berechtigungen, Rate Limiting, Logging, Caching und eine dokumentierte REST-API.

Die Middleware ist sinnvoll, wenn du:

- NocoDB nicht direkt aus dem Frontend ansprechen willst
- den `NOCODB_API_TOKEN` serverseitig isolieren musst
- Tabellenrechte zentral erzwingen willst
- eine stabile API-Schicht vor NocoDB brauchst

## Authentifizierungsmodell

Die Middleware validiert Bearer-JWTs. Sie stellt keine Login-Sessions aus und verwaltet keine Refresh Tokens.

Unterstützte Betriebsarten:

- `AUTH_PROVIDER=local`: JWTs werden mit `JWT_SECRET` validiert; der User wird in NocoDB nachgeladen und muss aktiv sein.
- `AUTH_PROVIDER=external`: JWTs werden mit `EXTERNAL_JWT_SECRET` validiert; optional können Issuer und Audience geprüft werden.

## Sicherheitsregeln

- `NOCODB_API_TOKEN` nie an Browser-Clients geben.
- `CORS_ORIGINS` in Produktion restriktiv setzen.
- Swagger ist in Produktion deaktiviert.
- Bootstrap-Admin nur über den geschützten Bootstrap-Endpunkt mit `BOOTSTRAP_ADMIN_TOKEN` anlegen.
- Debug- und Löschskripte sind vom Production-Build ausgeschlossen.

## Lokaler Schnellstart

```bash
npm install
cp .env.example .env
npm run start:dev
```

Minimale Konfiguration:

```env
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here
JWT_SECRET=your_jwt_secret_here
CORS_ORIGINS=http://localhost:3000
```

Danach:

- API: `http://localhost:3000/api`
- Swagger in Development: `http://localhost:3000/api/docs`
- Health Check: `http://localhost:3000/api/health`

## Frontend-Integration

Clients senden den Access Token mit jeder Anfrage:

```ts
export async function apiRequest<T>(
  path: string,
  accessToken: string,
): Promise<T> {
  const response = await fetch(`http://localhost:3000${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
```

Für produktive Browser-Anwendungen ist ein BFF/Auth-Gateway empfehlenswert, damit Refresh Tokens in `httpOnly` Cookies bleiben können und der Browser den Access Token nicht dauerhaft speichern muss.

## Eigene Ressourcen ergänzen

Neue NocoDB-Tabellen bindest du typischerweise über Repository, Service und Controller an. Achte darauf, alle schreibenden oder sensiblen Endpunkte mit Guards und DTO-Validation abzusichern.

```ts
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../nocodb/repositories/base.repository';
import { NocoDBService } from '../nocodb/nocodb.service';

@Injectable()
export class UsersRepository extends BaseRepository {
  constructor(nocodbService: NocoDBService) {
    super(nocodbService, 'users');
  }
}
```

## Betrieb

Wichtige Produktionspunkte:

- HTTPS über Reverse Proxy erzwingen
- Secrets über Secret-Manager oder sichere Environment-Verwaltung bereitstellen
- Health Checks und strukturiertes Logging aktiv halten
- OpenTelemetry optional an Collector anbinden
- Migration/Schema-Initialisierung bewusst betreiben und nicht als Ersatz für kontrollierte Datenmigrationen behandeln

## Fehlerbilder

| Problem                | Wahrscheinliche Ursache         | Prüfung                                 |
| ---------------------- | ------------------------------- | --------------------------------------- |
| 401 Unauthorized       | JWT fehlt oder ist ungültig     | Bearer Header, Secret, Ablaufzeit       |
| 403 Forbidden          | Rolle oder Tabellenrecht fehlt  | RBAC-Konfiguration und Guards           |
| 429 Too Many Requests  | Rate Limit greift               | Lastprofil und Middleware-Konfiguration |
| 404 Not Found          | Falscher Pfad oder Tabellenname | Controller-Route und Repository         |
| CORS-Fehler im Browser | Origin nicht freigegeben        | `CORS_ORIGINS` prüfen                   |

## API-Referenz

Für konkrete Endpoint-Beispiele und Payloads siehe `docs/api.md` und die generierte OpenAPI-Spezifikation im Repository-Root.
