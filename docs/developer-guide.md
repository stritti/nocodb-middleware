# **🚀 Entwicklerguide: nocodb-middleware**

**Zielgruppe:**
Entwickler, die NocoDB als Backend für ihre **SPA-App** nutzen möchten und eine **robuste, sichere Middleware** suchen.

---

## **📌 Einführung**

Die **nocodb-middleware** ist eine **NestJS-basierte Middleware**, die NocoDB als Backend für deine **Single-Page-Application (SPA)** bereitstellt. Sie bietet:

| Feature                                 | Beschreibung                                             |
| --------------------------------------- | -------------------------------------------------------- |
| **🔒 JWT-Authentifizierung**            | Sichere Authentifizierung für deine API-Endpunkte        |
| **📊 RBAC (Role-Based Access Control)** | Feingranulare Zugriffsrechte auf Tabellenebene           |
| **⚡ Caching**                          | Schnelle API-Antworten für read-intensive Operationen    |
| **🛡️ Sicherheitsfeatures**              | Helmet, Rate Limiting, Input-Validation, OpenAPI/Swagger |
| **📝 API-Dokumentation**                | Automatische Swagger-UI und statische `openapi.yaml`     |
| **🚦 Monitoring**                       | Logging, Health Checks, OpenTelemetry                    |

---

## **📌 Warum nocodb-middleware für deine SPA nutzen?**

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
3. **Flexibilität**: Eigene Business-Logic ohne NocoDB-Einschränkungen

---

## **📌 Architekturübersicht**

```mermaid
graph TD
    A[Frontend (SPA)] -->|HTTPS| B[NestJS Middleware]
    B -->|JWT Token| C[Nutzer]
    B -->|Request| D[NocoDB API]
    D -->|Response| B
    B -->|Cached Response| A
    B -->|Logging| E[Logging]
    B -->|Health Check| F[/health]
    B -->|OpenAPI| G[Swagger UI]
```

**Datenfluss:**

1. Der Nutzer loggt sich im Frontend ein (z.B. über OAuth oder einen Auth-Service).
2. Das Frontend erhält ein **JWT-Token** und sendet es mit jeder API-Anfrage an die Middleware.
3. Die Middleware **validiert das Token**, prüft die Berechtigungen und leitet die Anfrage an NocoDB weiter.
4. Die Antwort wird an den Nutzer zurückgegeben – ggf. aus dem Cache.
5. **Logging und Monitoring** erfassen alle Requests und Antworten.

---

## **📌 Schnellstart: Middleware in 5 Minuten einrichten**

### **🔹 Voraussetzungen**

- Node.js (v18+)
- NestJS (v10+)
- NocoDB-Instanz (lokal oder cloud)
- NocoDB-API-Token und Base-ID

### **🔹 Schritt 1: Middleware klonen und installieren**

```bash
git clone https://github.com/stritti/nocodb-middleware.git
cd nocodb-middleware
npm install
```

### **🔹 Schritt 2: `.env` konfigurieren**

Erstelle eine `.env`-Datei basierend auf `.env.example`:

```env
# NocoDB Connection
NOCODB_API_URL=http://localhost:8080
NOCODB_API_TOKEN=your_api_token_here
NOCODB_BASE_ID=your_base_id_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=1d

# CORS Origins (kommagetrennte Liste)
CORS_ORIGINS=http://localhost:3000,https://deine-spa-app.de

# Server Port
PORT=3000
```

### **🔹 Schritt 3: Middleware starten**

```bash
npm run start:dev
```

- Die Middleware läuft auf `http://localhost:3000`.
- **Swagger UI:** `http://localhost:3000/api`

---

## **📌 Integration in deine SPA-App**

### **🔹 Beispiel: React + Next.js**

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

```javascript
// utils/api.js
export const fetchNocoDB = async (endpoint) => {
  const token = localStorage.getItem('jwtToken');
  if (!token) throw new Error('Kein Token vorhanden');

  const response = await fetch(`http://localhost:3000/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('API-Aufruf fehlgeschlagen');
  return await response.json();
};

// Beispiel: Nutzerdaten abrufen
export const getUsers = async () => {
  return await fetchNocoDB('users');
};
```

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
}
```

---

### **🔹 Beispiel: Vue.js**

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
```

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

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};
```

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
```

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

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 Minuten
      max: 100, // 100 Anfragen pro Window
      message: 'Zu viele Anfragen, bitte versuche es später erneut.',
    });
    limiter(req, res, next);
  }
}
```

### **🔹 Input-Validation erzwingen**

```typescript
// src/users/dto/create-user.dto.ts
import { IsString, IsEmail, IsInt } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  age: number;
}
```

### **🔹 Secrets sicher verwalten**

- **Nicht in Git committen!** Nutze `.env` und GitHub Secrets.
- **Beispiel für GitHub Actions:**
  ```yaml
  env:
    NOCODB_API_TOKEN: ${{ secrets.NOCODB_API_TOKEN }}
    JWT_SECRET: ${{ secrets.JWT_SECRET }}
  ```

---

## **📌 Häufige Fehler und Lösungen**

| Fehler            | Ursache                                   | Lösung                                                 |
| ----------------- | ----------------------------------------- | ------------------------------------------------------ |
| **403 Forbidden** | Falsches JWT oder fehlende Berechtigungen | Prüfe den Token und die RBAC-Konfiguration             |
| **404 Not Found** | Falsche API-URL oder Tabellenname         | Prüfe `NOCODB_API_URL` und `NOCODB_BASE_ID`            |
| **CORS-Error**    | Falsche `CORS_ORIGINS`-Konfiguration      | Aktualisiere `.env` oder die Middleware-Konfiguration  |
| **Rate Limited**  | Zu viele Anfragen                         | Erhöhe die Rate-Limit-Grenzen oder optimiere deine App |

---

## **📌 Nächste Schritte**

1. **🔧 Middleware testen:** Starte die Middleware lokal und prüfe die Swagger-UI.
2. **🚀 Frontend integrieren:** Baue die API-Aufrufe in deine SPA-App ein.
3. **🛡️ Sicherheit prüfen:** Teste die Authentifizierung und RBAC mit verschiedenen Nutzern.
4. **📦 Deployen:** Stelle die Middleware in deiner bevorzugten Umgebung bereit.

---

## **📌 Ressourcen und Links**

- **[GitHub Repository](https://github.com/stritti/nocodb-middleware)**
- **[NocoDB Dokumentation](https://docs.nocodb.com/)**
- **[NestJS Dokumentation](https://docs.nestjs.com/)**
- **[JWT Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)**

---

**🔹 Brauchst du Hilfe bei der Integration oder hast du Fragen zur Dokumentation?**
Ich kann dir **konkrete Code-Beispiele** oder **Mermaid-Diagramme** für deine spezifische Use-Case erstellen!
