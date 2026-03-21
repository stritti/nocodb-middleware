## ADDED Requirements

### Requirement: Konfigurierbare CORS-Allowlist
Die Middleware MUST eine konfigurierbare CORS-Allowlist für Origins unterstützen und nur Requests von erlaubten Origins akzeptieren.

#### Scenario: Request von erlaubter Origin
- **WHEN** ein Browser-Request mit einer Origin aus der konfigurierten Allowlist eingeht
- **THEN** die Middleware MUST die CORS-Antwortheader gemäß Konfiguration setzen und den Request weiterverarbeiten

### Requirement: Ablehnung nicht erlaubter Origins
Die Middleware MUST Requests von nicht erlaubten Origins nach definierter Security-Policy blockieren.

#### Scenario: Request von nicht erlaubter Origin
- **WHEN** ein Browser-Request mit einer Origin außerhalb der konfigurierten Allowlist eingeht
- **THEN** die Middleware MUST den Zugriff gemäß CORS-Policy ablehnen

### Requirement: Konfigurierbare Methoden, Header und Credentials
Die Middleware SHALL CORS-Methoden, erlaubte Header und Credentials-Verhalten über Konfiguration steuern.

#### Scenario: Credentials für erlaubte Origin aktiviert
- **WHEN** eine erlaubte Origin einen CORS-Request mit Credentials stellt und Credentials aktiviert sind
- **THEN** die Middleware MUST die zugehörigen CORS-Header konsistent zur Konfiguration liefern

### Requirement: Sichere Defaults bei Fehlkonfiguration
Die Middleware MUST bei unvollständiger oder ungültiger CORS-Konfiguration restriktive Defaults anwenden und dies protokollieren.

#### Scenario: CORS-Konfiguration fehlt in Produktionsumgebung
- **WHEN** die Anwendung ohne gültige CORS-Allowlist startet
- **THEN** die Middleware MUST einen restriktiven Sicherheitsmodus aktivieren und einen klaren Konfigurationshinweis loggen

### Requirement: CORS darf nicht global permissiv aktiviert werden
Die Middleware MUST CORS nicht global ohne Policy aktivieren und stattdessen ausschließlich konfigurierte Regeln anwenden.

#### Scenario: Service startet ohne explizite CORS-Policy
- **WHEN** beim Start keine explizite Allowlist/Policy aufgelöst werden kann
- **THEN** die Middleware MUST einen restriktiven Modus anwenden und MUST NOT eine globale permissive CORS-Konfiguration aktivieren