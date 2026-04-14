# TODO Dokumentation

## Stand des PR #38

Dieser Pull Request ist nicht mehr nur ein Tracking-Dokument.
Er enthält jetzt konkrete Überarbeitungen an der eigentlichen Dokumentation.

### In diesem PR umgesetzt

- README strukturell überarbeitet
- Architekturgrenze klar dokumentiert: JWT-Validierung ja, Login nein
- widersprüchliche Hinweise zur Token-Speicherung bereinigt
- Developer Guide auf SPA-Integration und Erweiterbarkeit fokussiert
- VitePress-Navigation auf reale Seiten und korrekte Routen umgestellt
- neue Seiten für Security und Deployment ergänzt
- Dokumentation der erforderlichen NocoDB-Tabellen ergänzt

## Erledigt

### Hohe Priorität

- [x] Schnellstart im README
- [x] Security-Hinweise im README
- [x] klare Beschreibung der Authentifizierungsarchitektur
- [x] Korrektur der widersprüchlichen JWT-Speicherempfehlungen
- [x] Bereinigung der VitePress-Navigation
- [x] Dokumentation der erforderlichen NocoDB-Tabellen und Beziehungen

### Mittlere Priorität

- [x] Nutzung in einem eigenen SPA-Projekt dokumentiert
- [x] Security als eigene Seite dokumentiert
- [x] Deployment als eigene Seite dokumentiert

## Offen

### Nächste sinnvolle Schritte

- [ ] konkrete IdP-Beispiele für Auth0, Firebase und Keycloak
- [x] Request- und Response-Beispiele für zentrale Endpunkte
- [ ] Hinweise für Multi-Instance-Betrieb mit Redis
- [ ] Audit Logging und Sanitization in der Produktdoku nachziehen
- [ ] optional Beispielprojekt für eine Referenz-SPA

## Nachgezogen in dieser Vervollständigung

- API-Doku um konkrete cURL-Beispiele und Beispielantworten ergänzt
- Bootstrap-Admin-Authentifizierung (`x-bootstrap-token`) explizit dokumentiert
- URL-Konsistenz in README/Guides korrigiert (`/api/docs`, `/api/health`, `/api/...`)

## Begründung für die Änderungen

Die ursprüngliche Version dieses PRs hatte drei zentrale Schwächen:

1. Sie ergänzte Tracking, aber nur teilweise echte Doku.
2. Sie zeigte weiterhin `localStorage`-basierte SPA-Beispiele, obwohl später davon abgeraten wurde.
3. Sie verlinkte in VitePress auf Pfade und Seiten, die so nicht konsistent oder nicht vorhanden waren.

Danach fehlte noch ein weiterer zentraler Baustein:

4. Die erforderlichen NocoDB-Tabellen und Link-Beziehungen waren nicht als eigene Referenz dokumentiert.

Diese Punkte sind in diesem PR bereinigt.
