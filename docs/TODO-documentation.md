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

## Erledigt

### Hohe Priorität

- [x] Schnellstart im README
- [x] Security-Hinweise im README
- [x] klare Beschreibung der Authentifizierungsarchitektur
- [x] Korrektur der widersprüchlichen JWT-Speicherempfehlungen
- [x] Bereinigung der VitePress-Navigation

### Mittlere Priorität

- [x] Nutzung in einem eigenen SPA-Projekt dokumentiert
- [x] Security als eigene Seite dokumentiert
- [x] Deployment als eigene Seite dokumentiert

## Offen

### Nächste sinnvolle Schritte

- [ ] konkrete IdP-Beispiele für Auth0, Firebase und Keycloak
- [ ] Dokumentation der erforderlichen NocoDB-Tabellen
- [ ] Request- und Response-Beispiele für zentrale Endpunkte
- [ ] Hinweise für Multi-Instance-Betrieb mit Redis
- [ ] Audit Logging und Sanitization in der Produktdoku nachziehen
- [ ] optional Beispielprojekt für eine Referenz-SPA

## Begründung für die Änderungen

Die ursprüngliche Version dieses PRs hatte drei zentrale Schwächen:

1. Sie ergänzte Tracking, aber nur teilweise echte Doku.
2. Sie zeigte weiterhin `localStorage`-basierte SPA-Beispiele, obwohl später davon abgeraten wurde.
3. Sie verlinkte in VitePress auf Pfade und Seiten, die so nicht konsistent oder nicht vorhanden waren.

Diese Punkte sind in diesem PR bereinigt.
