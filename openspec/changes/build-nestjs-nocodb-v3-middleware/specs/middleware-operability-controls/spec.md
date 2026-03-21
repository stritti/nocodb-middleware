## ADDED Requirements

### Requirement: Konfigurierbares Rate-Limiting für NocoDB-Aufrufe
Die Middleware MUST ausgehende NocoDB-Aufrufe durch konfigurierbares Rate-Limiting schützen, um API-Überlastung und Throttling-Spitzen zu reduzieren.

#### Scenario: Burst von Schreibanfragen
- **WHEN** in kurzer Zeit mehr Requests eingehen als das konfigurierte Limit erlaubt
- **THEN** die Middleware MUST Aufrufe kontrolliert drosseln und definierte Fehlerpfade einhalten

### Requirement: Caching für leselastige Pfade
Die Middleware SHALL für definierte Read-Pfade ein Cache-Verhalten mit TTL unterstützen, um Latenz und Last auf NocoDB zu senken.

#### Scenario: Wiederholter Read-Request innerhalb TTL
- **WHEN** derselbe Lesezugriff innerhalb der konfigurierten TTL erneut angefragt wird
- **THEN** die Middleware MUST das Ergebnis aus dem Cache liefern, sofern keine Invalidierung stattgefunden hat

### Requirement: Einheitliche Fehler- und Logging-Policy
Die Middleware MUST für NocoDB-nahe Fehler eine einheitliche Fehlerstruktur und korrelierbare Logs bereitstellen.

#### Scenario: Upstream-Timeout bei NocoDB
- **WHEN** ein Request an NocoDB wegen Timeout fehlschlägt
- **THEN** die Middleware MUST einen klassifizierten Fehler zurückgeben und einen korrelierten Logeintrag mit Ursache und Kontext erzeugen

### Requirement: Request-Context und Traceability über Middleware
Die Middleware MUST für eingehende Requests einen konsistenten Request-Context bereitstellen, einschließlich `x-request-id` sowie Benutzerkontext-Headern für nachgelagerte Verarbeitung.

#### Scenario: Request ohne vorhandene Request-ID
- **WHEN** ein eingehender Request keine Request-ID enthält
- **THEN** die Middleware MUST eine eindeutige `x-request-id` erzeugen und für Logging/Downstream-Verarbeitung verfügbar machen

### Requirement: Standalone-Betrieb als Container-Service
Die Middleware MUST als eigenständiger Service lauffähig sein und ein Docker-Image bereitstellen, das ohne Quellcode-Mount in einer Zielumgebung gestartet werden kann.

#### Scenario: Containerstart in Zielumgebung
- **WHEN** das bereitgestellte Docker-Image mit gültigen Umgebungsvariablen gestartet wird
- **THEN** die Middleware MUST betriebsbereit hochfahren und Anfragen auf dem konfigurierten Port bedienen

### Requirement: Konsistente NocoDB-Konfigurationsvariablen
Die Middleware MUST für NocoDB-Meta- und Data-Aufrufe konsistente Umgebungsvariablen verwenden, sodass Compose-, Container- und Runtime-Konfiguration dasselbe Basisidentifikationsfeld nutzen.

#### Scenario: Konfiguration für Base-ID wird gesetzt
- **WHEN** die Middleware in Docker mit gesetzter NocoDB-Basiskennung startet
- **THEN** das System MUST dieselbe Variable konsistent in Initialisierung, Services und Laufzeitzugriffen verwenden

### Requirement: Container-Härtung und Health-Check
Die Middleware SHALL im Container mit minimalen Laufzeitrechten betrieben werden und einen Health-Check für Orchestrierungssysteme bereitstellen.

#### Scenario: Orchestrator prüft Servicezustand
- **WHEN** ein Container-Orchestrator den Servicezustand über den Health-Endpunkt prüft
- **THEN** das System MUST einen eindeutigen Healthy/Unhealthy-Status liefern und unter einem nicht privilegierten Laufzeitkontext betrieben werden

### Requirement: Graceful Shutdown im Standalone-Betrieb
Die Middleware MUST bei Prozessbeendigung offene Verbindungen und laufende Requests kontrolliert herunterfahren, damit Deployments und Container-Restarts ohne inkonsistente Zustände erfolgen.

#### Scenario: Container erhält Stop-Signal
- **WHEN** der laufende Container ein reguläres Stop-/Terminate-Signal erhält
- **THEN** die Middleware MUST einen geordneten Shutdown ausführen und den Prozess erst nach Abschluss der definierten Shutdown-Sequenz beenden
