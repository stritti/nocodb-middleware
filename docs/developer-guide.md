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

## Vorteile gegenüber direktem NocoDB-Zugriff

Die Middleware **validiert** JWTs, stellt sie aber **nicht** selbst aus.
Es gibt keinen eingebauten Login-Endpoint und keine Session-Verwaltung per Cookie.

Praktisch bedeutet das:

<<<<<<< HEAD
Die Middleware bietet gegenüber dem direkten Zugriff auf NocoDB erhebliche Vorteile:

### **🚀 Vorteile gegenüber direktem NocoDB-Zugriff**

| Vorteil                   | Direkter NocoDB-Zugriff | Mit nocodb-middleware                   |
| ------------------------- | ----------------------- | --------------------------------------- |
| **JWT-Authentifizierung** | ❌ Nicht integriert     | ✅ Integriert mit Passport.js           |
| **RBAC**                  | ⚠️ Nur NocoDB-Rollen    | ✅ Erweiterbare Table-Level Permissions |
| **Caching**               | ❌ Nicht verfügbar      | ✅ In-Memory Cache mit TTL              |
| **Rate Limiting**         | ❌ Nicht verfügbar      | ✅ Konfigurierbar (100 req/15min)       |
| **Security Headers**      | ❌ Nicht automatisch    | ✅ Helmet.js integriert                 |
| **API-Dokumentation**     | ❌ Nicht verfügbar      | ✅ Swagger UI + OpenAPI                 |
| **Input-Validation**      | ⚠️ Teilweise            | ✅ class-validator + class-transformer  |
| **Logging**               | ⚠️ Basis                | ✅ Request/Response + Duration Tracking |
| **Fehlerbehandlung**      | ⚠️ NocoDB-Fehler        | ✅ Strukturierte Exception-Filter       |
| **Metriken**              | ❌ Nicht verfügbar      | ✅ OpenTelemetry (optional)             |
| **URL-Abstraktion**       | ❌ NocoDB-URLs          | ✅ Eigene API-Endpunkte                 |
| **CORS-Kontrolle**        | ⚠️ Basis                | ✅ Whitelist-basierte Konfiguration     |

### **🔐 Security-Vorteile**

1. **Secret Isolation**: API-Token werden NIE an das Frontend weitergegeben
2. **Token-Validierung**: JWTs werden serverseitig validiert, nicht im Browser
3. **Granulare Berechtigungen**: Table-Level CRUD-Rechte statt nur Rollen
4. **Angriffserkennung**: Rate Limiting schützt vor Brute-Force und DoS
5. **Audit-Logging**: Vollständige Request-Historie für Security-Audits

### **📊 Performance-Vorteile**

1. **Caching**: GET-Requests werden gecached (60s TTL)
2. **Request-Optimierung**: Batch-Operationen möglich
3. **Lastverteilung**: Entlastet NocoDB-Instanz

### **💡 Architectur-Vorteile**

1. **Unabhängigkeit**: Frontend entkoppelt von NocoDB-Version
2. **Erweiterbarkeit**: Eigenes Repository-Pattern für Custom-Logik
3. # **Flexibilität**: Eigene Business-Logic ohne NocoDB-Einschränkungen

- Ein externer Identity Provider oder Auth-Service erzeugt das Access Token.
- Die Middleware erwartet `Authorization: Bearer <token>`.
- Das Frontend oder ein BFF/Gateway entscheidet, wie Token bezogen und gespeichert werden.
  > > > > > > > origin/feature/docu-todo

## Empfohlene Integrationsmuster

### 1. Browser-SPA mit externem IdP-SDK

Geeignet für interne Tools oder einfache Architekturen.

<<<<<<< HEAD
**Datenfluss:**

1. Der Nutzer loggt sich im Frontend ein (z.B. über OAuth oder einen Auth-Service).
2. Das Frontend erhält ein **JWT-Token** und sendet es mit jeder API-Anfrage an die Middleware.
3. Die Middleware **validiert das Token**, prüft die Berechtigungen und leitet die Anfrage an NocoDB weiter.
4. Die Antwort wird an den Nutzer zurückgegeben – ggf. aus dem Cache.
5. # **Logging und Monitoring** erfassen alle Requests und Antworten.

- Das Frontend nutzt ein SDK wie Auth0, Firebase oder Keycloak JS.
- Das Access Token wird bevorzugt **nur im Speicher** gehalten.
- API-Aufrufe schicken das Token als Bearer Header an die Middleware.
  > > > > > > > origin/feature/docu-todo

Vorteil:

- Direkter und einfacher Aufbau.

<<<<<<< HEAD

### **🔹 Voraussetzungen**

- Node.js (v18+)
- NestJS (v10+)
- NocoDB-Instanz (lokal oder cloud)
- NocoDB-API-Token und Base-ID

### **🔹 Schritt 1: Middleware klonen und installieren**

=======
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

> > > > > > > origin/feature/docu-todo

```bash
git clone https://github.com/stritti/nocodb-middleware.git
cd nocodb-middleware
npm install
cp .env.example .env
```

<<<<<<< HEAD

### **🔹 Schritt 2: `.env` konfigurieren**

# Erstelle eine `.env`-Datei basierend auf `.env.example`:

### Minimale `.env`

> > > > > > > origin/feature/docu-todo

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

<<<<<<< HEAD

### **🔹 Schritt 3: Middleware starten**

=======

### Start

> > > > > > > origin/feature/docu-todo

```bash
npm run start:dev
```

<<<<<<< HEAD

- Die Middleware läuft auf `http://localhost:3000`.
- # **Swagger UI:** `http://localhost:3000/api`
  > > > > > > > origin/feature/docu-todo

Danach:

- Swagger UI unter `http://localhost:3000/api/docs`
- API-Info unter `http://localhost:3000/api`
- Health Check unter `http://localhost:3000/api/health`

## SPA-Anbindung

<<<<<<< HEAD

#### **1. Authentifizierung im Frontend**

```javascript
// pages/login.js
import { useState } from 'react';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    // Externer Auth-Service (z.B. Firebase, Auth0, etc.)
    const response = await fetch('https://dein-auth-service.com/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const { token } = await response.json();
    localStorage.setItem('jwtToken', token);
    router.push('/dashboard');
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

#### **2. API-Aufrufe mit JWT**

````javascript
// utils/api.js
export const fetchNocoDB = async (endpoint) => {
  const token = localStorage.getItem('jwtToken');
  if (!token) throw new Error('Kein Token vorhanden');

  const response = await fetch(`http://localhost:3000/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
=======
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
>>>>>>> origin/feature/docu-todo
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

<<<<<<< HEAD
#### **3. Nutzerdaten anzeigen (React)**

```javascript
// components/UserList.js
import { useEffect, useState } from 'react';
import { getUsers } from '../utils/api';

export default function UserList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
=======
  return response.json() as Promise<T>;
>>>>>>> origin/feature/docu-todo
}
````

### React mit In-Memory Token

````ts
import { createContext, useContext, useMemo, useState } from 'react'

<<<<<<< HEAD
#### **1. Authentifizierung (Vuex)**

```javascript
// store/auth.js
export default {
  actions: {
    async login({ commit }, { email, password }) {
      const response = await fetch('https://dein-auth-service.com/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const { token } = await response.json();
      localStorage.setItem('jwtToken', token);
      commit('SET_TOKEN', token);
    },
  },
};
````

#### **2. API-Aufrufe (Vue)**

```javascript
// services/nocodb.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('jwtToken')}`,
  },
});
=======
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

````ts
import axios from 'axios';

export function createApiClient(getAccessToken: () => string | null) {
  const api = axios.create({
    baseURL: 'http://localhost:3000',
  });
>>>>>>> origin/feature/docu-todo

  api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

<<<<<<< HEAD
---

### **🔹 Beispiel: Angular**

#### **1. Authentifizierung (Angular Service)**

```typescript
// auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private token = localStorage.getItem('jwtToken');

  constructor(private http: HttpClient) {}

  async login(email: string, password: string) {
    const response = await this.http
      .post<{
        token: string;
      }>('https://dein-auth-service.com/login', { email, password })
      .toPromise();
    localStorage.setItem('jwtToken', response.token);
  }
}
````

#### **2. API-Aufrufe (Angular HttpClient)**

```typescript
// nocodb.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class NocoDBService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  async getUsers() {
    return this.http.get(`${this.apiUrl}/users`).toPromise();
  }
}
```

---

## **📌 Konfiguration und Deployment**

### **🔹 NocoDB-Tabellen anbinden**

Die Middleware nutzt das **Repository-Pattern** für NocoDB. Du kannst eigene Tabellen einbinden, indem du:

1. **Ein neues Repository erstellen:**

   ```typescript
   // src/repositories/user.repository.ts
   import { Injectable } from '@nestjs/common';
   import { BaseRepository } from './base.repository';
   import { NocoDBService } from '../nocodb/nocodb.service';

   @Injectable()
   export class UserRepository extends BaseRepository {
     constructor(private readonly nocodb: NocoDBService) {
       super(nocodb, 'users'); // 'users' = Tabellenname in NocoDB
     }
   }
   ```

2. **Einen neuen Controller erstellen:**

   ```typescript
   // src/users/users.controller.ts
   import { Controller, Get } from '@nestjs/common';
   import { UserRepository } from '../repositories/user.repository';

   @Controller('users')
   export class UsersController {
     constructor(private readonly userRepo: UserRepository) {}

     @Get()
     async findAll() {
       return this.userRepo.findAll();
     }
   }
   ```

---

### **🔹 Deployment-Optionen**

| Option                                  | Beschreibung                                             |
| --------------------------------------- | -------------------------------------------------------- |
| **🐳 Docker**                           | Einfache Containerisierung für Kubernetes, AWS ECS, etc. |
| **☁️ Cloud (Vercel, Netlify, Railway)** | Serverless-Deployment mit Edge-Funktionen                |
| **🖥️ VPS (Ubuntu, Debian)**             | Traditionelles Deployment auf einem eigenen Server       |
| **🔧 CI/CD (GitHub Actions)**           | Automatisierte Deployments                               |

#### \*\*🔹 Dockerfile (Beispiel)

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

#### **🔹 docker-compose.yml (Beispiel)**

```yaml
version: '3.8'
services:
  nocodb-middleware:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NOCODB_API_URL=http://nocodb:8080
      - NOCODB_API_TOKEN=${NOCODB_API_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=http://localhost:3000
    depends_on:
      - nocodb

  nocodb:
    image: nocodb/nocodb:latest
    ports:
      - '8080:8080'
    environment:
      - NC_DB=sqlite:///data/noco.db
    volumes:
      - ./data:/data
```

---

## **📌 Best Practices und Sicherheitshinweise**

### **🔹 JWT-Tokens sicher speichern**

- **Nicht im `localStorage`** (XSS-Angriffrisiko)! **Empfohlen:** `httpOnly`-Cookies oder Secure Storage (z.B. `@auth0/auth0-react`).

### **🔹 CORS-Origins sicher konfigurieren**

```env
CORS_ORIGINS=https://deine-spa-app.de,https://staging.deine-spa-app.de
```

- **Vermeide `*` in Produktion!**

### **🔹 Rate Limiting anpassen**

```typescript
// src/middleware/rate-limit.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
=======
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
>>>>>>> origin/feature/docu-todo

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

<<<<<<< HEAD

### **🔹 Input-Validation erzwingen**

````typescript
// src/users/dto/create-user.dto.ts
import { IsString, IsEmail, IsInt } from 'class-validator';
=======
## Sicherheit bei Token-Speicherung
>>>>>>> origin/feature/docu-todo

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
````

<<<<<<< HEAD

### **🔹 Secrets sicher verwalten**

- **Nicht in Git committen!** Nutze `.env` und GitHub Secrets.
- **Beispiel für GitHub Actions:**
  ```yaml
  env:
    NOCODB_API_TOKEN: ${{ secrets.NOCODB_API_TOKEN }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
  ```
  =======

## Deployment-Varianten

> > > > > > > origin/feature/docu-todo

### Docker

Im Repository sind `Dockerfile` und `docker-compose.yml` vorhanden.
Für lokale und einfache produktive Setups ist das der naheliegende Startpunkt.

<<<<<<< HEAD
| Fehler | Ursache | Lösung |
| ----------------- | ----------------------------------------- | ------------------------------------------------------ |
| **403 Forbidden** | Falsches JWT oder fehlende Berechtigungen | Prüfe den Token und die RBAC-Konfiguration |
| **404 Not Found** | Falsche API-URL oder Tabellenname | Prüfe `NOCODB_API_URL` und `NOCODB_BASE_ID` |
| **CORS-Error** | Falsche `CORS_ORIGINS`-Konfiguration | Aktualisiere `.env` oder die Middleware-Konfiguration |
| **Rate Limited** | Zu viele Anfragen | Erhöhe die Rate-Limit-Grenzen oder optimiere deine App |
=======

### VPS oder Container-Plattform

> > > > > > > origin/feature/docu-todo

Wichtig sind dabei:

- Reverse Proxy mit HTTPS
- restriktive CORS-Konfiguration
- Secret-Verwaltung außerhalb des Repos
- Logging und Health Checks
- optional OpenTelemetry

Details stehen in `docs/deployment.md`.

## Fehlerbilder

<<<<<<< HEAD

## **📌 Ressourcen und Links**

- **[GitHub Repository](https://github.com/stritti/nocodb-middleware)**
- **[NocoDB Dokumentation](https://docs.nocodb.com/)**
- **[NestJS Dokumentation](https://docs.nestjs.com/)**
- # **[JWT Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)**
  | Problem                | Wahrscheinliche Ursache         | Prüfung                                 |
  | ---------------------- | ------------------------------- | --------------------------------------- |
  | 401 Unauthorized       | JWT fehlt oder ist ungültig     | Bearer Header, Secret, Ablaufzeit       |
  | 403 Forbidden          | Rolle oder Tabellenrecht fehlt  | RBAC-Konfiguration und Guards           |
  | 429 Too Many Requests  | Rate Limit greift               | Lastprofil und Middleware-Konfiguration |
  | 404 Not Found          | Falscher Pfad oder Tabellenname | Controller-Route und Repository         |
  | CORS-Fehler im Browser | Origin nicht freigegeben        | `CORS_ORIGINS` prüfen                   |
  > > > > > > > origin/feature/docu-todo

## Nächste sinnvolle Doku-Bausteine

<<<<<<< HEAD
**🔹 Brauchst du Hilfe bei der Integration oder hast du Fragen zur Dokumentation?**
Ich kann dir **konkrete Code-Beispiele** oder **Mermaid-Diagramme** für deine spezifische Use-Case erstellen!
=======
Aus Sicht von Integratoren fehlen mittelfristig noch:

- konkrete IdP-Beispiele für Auth0, Firebase und Keycloak
- eine Dokumentation der erforderlichen NocoDB-Tabellen
- request/response Beispiele pro zentralem Endpoint
- Hinweise für Multi-Instance-Betrieb mit Redis statt In-Memory-Cache

## API-Referenz

Für konkrete Endpoint-Beispiele und Payloads siehe `docs/api.md`.

> > > > > > > origin/feature/docu-todo
