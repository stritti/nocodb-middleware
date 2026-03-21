## ADDED Requirements

### Requirement: NocoDB Token bleibt serverseitig isoliert
Die Middleware MUST den NocoDB API-Token ausschließlich serverseitig verarbeiten und darf ihn in keiner Client-Response, keinem öffentlichen Endpoint und keiner Frontend-konfigurierbaren Nutzlast offenlegen.

#### Scenario: Client ruft Datenendpoint auf
- **WHEN** ein Frontend-Client einen Middleware-Endpoint aufruft, der NocoDB-Daten proxied
- **THEN** die Middleware MUST den NocoDB-Token intern verwenden und keinen Token-Wert im Response-Payload oder in Response-Headern zurückgeben

### Requirement: Secret-Sanitization in Fehler- und Loggingpfaden
Die Middleware SHALL alle Fehler- und Logausgaben so sanitizen, dass keine NocoDB-Secrets oder tokennahe sensible Metadaten ausgegeben werden.

#### Scenario: Upstream-Fehler enthält sensitive Details
- **WHEN** NocoDB mit einem Fehler antwortet, der sensitive Felder enthalten könnte
- **THEN** die Middleware MUST sensible Inhalte redigieren und nur freigegebene Fehlerdetails protokollieren/ausliefern

### Requirement: Proxy-only Zugriff auf NocoDB
Die Middleware MUST das Zugriffsmuster so erzwingen, dass Clients ausschließlich über Middleware-Endpunkte mit NocoDB-Daten interagieren.

#### Scenario: Frontend versucht direkten Token-Zugriff
- **WHEN** ein Client versucht, tokenbezogene Konfiguration oder direkte Auth-Informationen zu erhalten
- **THEN** die Middleware MUST den Zugriff verweigern und keine tokenbezogenen Informationen offenlegen