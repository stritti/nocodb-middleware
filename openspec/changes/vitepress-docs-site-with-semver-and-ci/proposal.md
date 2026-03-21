## Why

Die Projektdokumentation liegt bereits in `docs/`, ist aber noch nicht als konsistente Website mit Release-fähigem Build und Deploy-Prozess aufgesetzt. Eine VitePress-basierte Doku-Site mit semver-basierter Versionsanzeige und GitHub Action schafft einen reproduzierbaren, automatisierten Publikationspfad.

## What Changes

- Einführung einer VitePress-Dokumentationswebsite auf Basis der vorhandenen Inhalte aus `docs/`.
- Einführung eines Build- und Deploy-Workflows per GitHub Actions für die Doku-Site.
- Einführung einer semver-konformen Versionsquelle und Anzeige der aktuellen Versionsnummer in der Dokumentation.
- Definition von Regeln für konsistente Navigation, Seitenstruktur und Build-Validierung.
- Tests/Checks für Doku-Build und CI-Pipeline (inkl. Fehlerfall bei ungültiger Version/Build).

## Capabilities

### New Capabilities
- `vitepress-docs-generation`: Generiert eine statische Doku-Website aus dem `docs/`-Ordner mit VitePress.
- `docs-github-actions-pipeline`: Baut und publiziert die Doku-Site automatisiert über GitHub Actions.
- `semver-version-in-docs`: Nutzt semver-basierte Projektversion und bindet sie sichtbar in die Dokumentation ein.

### Modified Capabilities
- Keine.

## Impact

- Betroffene Bereiche: `docs/`, `package.json` (Version/Script-Integration), neue VitePress-Konfiguration, `.github/workflows/*`.
- Build/CI: Zusätzlicher Doku-Build in der Pipeline, optionaler Deploy-Job.
- Betrieb: Dokumentationsrelease wird nachvollziehbar an die aktuelle semver-Version gekoppelt.
- Entwicklererlebnis: Zentrale, browserfähige Dokumentation statt lose Einzeldateien.