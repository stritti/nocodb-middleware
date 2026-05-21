## ADDED Requirements

### Requirement: XSS-Sanitization für alle Text-Eingabefelder
Die Middleware SHALL alle String-Felder in eingehenden Request-Bodies (Create/Update) automatisch auf XSS-Vektoren prüfen und bereinigen, bevor Daten an NocoDB weitergeleitet werden.

#### Scenario: Script-Tag in Benutzername
- **GIVEN** ein Client sendet einen Create-Request mit einem username, der `<script>alert('xss')</script>` enthält
- **WHEN** der Request die Sanitization-Pipe passiert
- **THEN** wird der Script-Tag entfernt und der bereinigte String (`alert('xss')`) an NocoDB gesendet

#### Scenario: Event-Handler in Beschreibung
- **GIVEN** ein Client sendet einen Update-Request mit einer description, die `<img src=x onerror=alert(1)>` enthält
- **WHEN** der Request die Sanitization-Pipe passiert
- **THEN** wird der Event-Handler entfernt und nur `<img src=x>` (oder je nach Allowlist) behalten

#### Scenario: Sicheres HTML bleibt erhalten (mit Allowlist)
- **GIVEN** `XSS_ALLOWED_TAGS=b,i` ist konfiguriert
- **WHEN** ein Client `<b>fett</b><script>evil()</script>` sendet
- **THEN** bleibt `<b>fett</b>` erhalten, der Script-Tag wird entfernt

### Requirement: Konfigurierbare Allowlist
Die Middleware SHALL eine Konfigurationsmöglichkeit (`XSS_ALLOWED_TAGS`) bereitstellen, um bestimmte HTML-Tags zu erlauben. Der Standardwert ist leer (keine HTML-Tags erlaubt).

#### Scenario: Allowlist wirkt
- **GIVEN** `XSS_ALLOWED_TAGS=a,img` ist gesetzt
- **WHEN** ein Client `<a href="https://example.com">Link</a><img src="valid.jpg">` sendet
- **THEN** bleiben beide Tags erhalten

#### Scenario: Allowlist blockiert nicht-konfigurierte Tags
- **GIVEN** `XSS_ALLOWED_TAGS=b` ist gesetzt
- **WHEN** ein Client `<b>fett</b><i>kursiv</i>` sendet
- **THEN** wird das `<i>`-Tag entfernt, `<b>` bleibt erhalten
