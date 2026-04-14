# Entwicklerguide

## Zielbild

`nocodb-middleware` ist eine NestJS-Schicht zwischen deiner Anwendung und NocoDB.
Sie übernimmt Authentifizierungsprüfung, Berechtigungen, Rate Limiting, Logging, Caching und eine einheitliche API-Oberfläche.

Sie ist besonders sinnvoll, wenn du:

- NocoDB nicht direkt aus dem Frontend ansprechen willst
- Rollen und Tabellenrechte zentral erzwingen willst
- eine dokumentierte REST-API für mehrere Clients brauchst
- Querschnittsthemen wie Logging, Fehlerformat und Tracing an einer Stelle bündeln willst

## Architekturentscheidung: JWT ja, Login nein

Die Middleware **validiert** JWTs, stellt sie aber **nicht** selbst aus.
Es gibt keinen eingebauten Login-Endpoint und keine Session-Verwaltung per Cookie.

Praktisch bedeutet das:

- Ein externer Identity Provider oder Auth-Service erzeugt das Access Token.
- Die Middleware erwartet `Authorization: Bearer <token>`.
- Das Frontend oder ein BFF/Gateway entscheidet, wie Token bezogen und gespeichert werden.

## Empfohlene Integrationsmuster

### 1. Browser-SPA mit externem IdP-SDK

Geeignet für interne Tools oder einfache Architekturen.

- Das Frontend nutzt ein SDK wie Auth0, Firebase oder Keycloak JS.
- Das Access Token wird bevorzugt **nur im Speicher** gehalten.
- API-Aufrufe schicken das Token als Bearer Header an die Middleware.

Vorteil:

- Direkter und einfacher Aufbau.

Nachteil:

- Token ist im Browser-Kontext vorhanden.
- XSS bleibt das zentrale Risiko.

### 2. BFF oder Auth-Gateway

Geeignet für produktive öffentliche Anwendungen.

- Login und Refresh Token laufen über einen separaten Backend-Dienst.
- Refresh Tokens liegen in `httpOnly` Cookies.
- Der BFF ruft diese Middleware serverseitig mit Bearer Token auf.

Vorteil:

- Das Browser-Frontend sieht das Access Token nicht direkt.
- Token-Rotation und Session-Management bleiben serverseitig.

Nachteil:

- Zusätzliche Komponente und etwas mehr Betriebsaufwand.

## Was du vermeiden solltest

- `NOCODB_API_TOKEN` im Frontend
- `CORS_ORIGINS=*` in Produktion
- JWTs dauerhaft in `localStorage`, wenn das Risiko nicht bewusst akzeptiert ist
- direkte Kopplung des Frontends an NocoDB ohne zusätzliche Rechteprüfung
- Annahme, dass diese Middleware Login, Logout und Cookie-Sessions bereits löst

## Schnellstart für lokale Entwicklung

### Voraussetzungen

- Node.js 22 oder kompatibel zur aktuellen Projektkonfiguration
- laufende NocoDB-Instanz
- NocoDB API Token
- Base ID für Meta API v3
- JWT Secret zur Validierung deiner Access Tokens

### Installation

```bash
git clone https://github.com/stritti/nocodb-middleware.git
cd nocodb-middleware
npm install
cp .env.example .env
```

### Minimale `.env`

```env
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here

JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d
CORS_ORIGINS=http://localhost:3000

PORT=3000
LOG_DIR=logs
```

### Start

```bash
npm run start:dev
```

Danach:

- Swagger UI unter `http://localhost:3000/api/docs`
- API-Info unter `http://localhost:3000/api`
- Health Check unter `http://localhost:3000/api/health`

## SPA-Anbindung

### Minimales Frontend-API-Client-Beispiel

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

### React mit In-Memory Token

```ts
import { createContext, useContext, useMemo, useState } from 'react'

type AuthContextValue = {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const value = useMemo(() => ({ accessToken, setAccessToken }), [accessToken])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

Das Beispiel zeigt bewusst nur einen Speicher im laufenden Prozess.
Für echte Login-Flows sollte das Token aus einem IdP-SDK stammen und erneuert werden, ohne es dauerhaft im Browser abzulegen.

### Vue mit Axios-Interceptor

```ts
import axios from 'axios';

export function createApiClient(getAccessToken: () => string | null) {
  const api = axios.create({
    baseURL: 'http://localhost:3000',
  });

  api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return api;
}
```

### Angular mit HttpInterceptor

```ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<any> {
    const token = this.authService.getAccessToken();

    if (!token) {
      return next.handle(req);
    }

    return next.handle(
      req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      }),
    );
  }
}
```

## Sicherheit bei Token-Speicherung

### Einordnung

Für **diese** Middleware gilt:

- Sie erwartet standardmäßig Bearer Token im Header.
- Ein `httpOnly` Cookie allein reicht nicht, solange nicht ein vorgeschalteter BFF oder Proxy daraus serverseitig einen Bearer Header erzeugt.
- Ein Cookie-Beispiel ohne diese zusätzliche Komponente wäre in dieser Dokumentation irreführend.

### Empfehlung

- Für eine reine Browser-SPA: Token möglichst nur im Speicher halten und das jeweilige IdP-SDK nutzen.
- Für produktive öffentliche Systeme: BFF oder Auth-Gateway vorsehen.
- `localStorage` nur dann einsetzen, wenn das XSS-Risiko bewusst bewertet und akzeptiert wurde.

## Eigene Ressourcen ergänzen

Die Middleware nutzt ein Repository-Muster.
Neue Tabellen bindest du in der Regel so an:

1. Repository ableiten
2. Service ergänzen
3. Controller ergänzen
4. Guards und Rechte prüfen
5. Swagger-Dekoratoren ergänzen

### Beispiel-Repository

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

## Deployment-Varianten

### Docker

Im Repository sind `Dockerfile` und `docker-compose.yml` vorhanden.
Für lokale und einfache produktive Setups ist das der naheliegende Startpunkt.

### VPS oder Container-Plattform

Wichtig sind dabei:

- Reverse Proxy mit HTTPS
- restriktive CORS-Konfiguration
- Secret-Verwaltung außerhalb des Repos
- Logging und Health Checks
- optional OpenTelemetry

Details stehen in `docs/deployment.md`.

## Fehlerbilder

| Problem                | Wahrscheinliche Ursache         | Prüfung                                 |
| ---------------------- | ------------------------------- | --------------------------------------- |
| 401 Unauthorized       | JWT fehlt oder ist ungültig     | Bearer Header, Secret, Ablaufzeit       |
| 403 Forbidden          | Rolle oder Tabellenrecht fehlt  | RBAC-Konfiguration und Guards           |
| 429 Too Many Requests  | Rate Limit greift               | Lastprofil und Middleware-Konfiguration |
| 404 Not Found          | Falscher Pfad oder Tabellenname | Controller-Route und Repository         |
| CORS-Fehler im Browser | Origin nicht freigegeben        | `CORS_ORIGINS` prüfen                   |

## Nächste sinnvolle Doku-Bausteine

Aus Sicht von Integratoren fehlen mittelfristig noch:

- konkrete IdP-Beispiele für Auth0, Firebase und Keycloak
- eine Dokumentation der erforderlichen NocoDB-Tabellen
- request/response Beispiele pro zentralem Endpoint
- Hinweise für Multi-Instance-Betrieb mit Redis statt In-Memory-Cache

## API-Referenz

Für konkrete Endpoint-Beispiele und Payloads siehe `docs/api.md`.
