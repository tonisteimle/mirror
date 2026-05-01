# Mirror

**Die Sprache für AI-unterstütztes UI-Design.**

Mirror ist eine DSL, die AI versteht _und_ Menschen lesen können. AI generiert Code, Designer verfeinern ihn — ohne Framework-Wissen, ohne Build-Tools.

```mirror
Button "Speichern", bg #2563eb, col white, pad 12 24, rad 6
```

Das ist ein blauer Button. Du siehst es, du verstehst es, du kannst es ändern.

## Quick Start

```bash
npm install
npm run build          # Compiler bauen
npm run studio         # Visual Editor starten (http://localhost:5173)
```

## Beispiel

```mirror
canvas mobile, bg #1a1a1a, col white

// Design Tokens
primary.bg: #2271C1
card.bg:    #1f1f23
card.rad:   8

// Komponente definieren
Card: bg $card, pad 16, rad $card, gap 8

// Komponente verwenden
Card
  Text "Projekttitel", fs 18, weight bold
  Text "Eine Beschreibung des Projekts.", col #888
  Button "Bearbeiten", bg $primary, col white, pad 10 20, rad 6
```

Mehr in der **[Vollreferenz](./docs/MIRROR-TUTORIAL-FULL.md)**.

## Output

Der Compiler kompiliert Mirror nach **DOM-JavaScript** oder **React**:

```bash
mirror-compile app.mir -o dist/app.js          # DOM
mirror-compile app.mir --react -o App.tsx      # React
mirror-compile --project my-app -o dist/app.js # Multi-File-Projekt
```

## Programmatisch

```javascript
import { compile, parse, generateDOM, generateReact } from 'mirror-lang'

const jsCode = compile(`
  primary.bg: #2271C1
  Button "Click me", bg $primary, col white, pad 12, rad 6
`)
```

## Dokumentation

| Datei                                                                | Inhalt                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| **[docs/MIRROR-TUTORIAL-FULL.md](./docs/MIRROR-TUTORIAL-FULL.md)**   | Vollständige DSL-Referenz mit Beispielen (auto-generiert) |
| [docs/generated/dsl-reference.md](./docs/generated/dsl-reference.md) | Compact Schema-Reference (Primitives, Properties)         |
| [docs/generated/properties.md](./docs/generated/properties.md)       | Alle Properties mit Werten und Aliases                    |
| [docs/TEST-FRAMEWORK.md](./docs/TEST-FRAMEWORK.md)                   | Test-Framework (CDP-basiert, kein Playwright)             |
| [CLAUDE.md](./CLAUDE.md)                                             | Kompakte Kurzreferenz (für AI-Tools optimiert)            |
| [CONTRIBUTING.md](./CONTRIBUTING.md)                                 | Beitragen, Code-Style, Testing                            |
| [CHANGELOG.md](./CHANGELOG.md)                                       | Versions-Historie                                         |

Historische Projekt-Dokumente sind unter [`docs/archive/`](./docs/archive/) abgelegt.

## Projekt-Struktur

```
compiler/    Core-Compiler (Lexer, Parser, IR, Backends, Runtime, Validator, Schema)
studio/      Visual Editor (Property Panel, Pickers, Preview, SourceMap)
tests/       Test-Suite (Vitest + CDP-Browser-Tests)
tools/       CLI-Tools (Test-Runner, Demo-Runner, Image-to-Mirror)
packages/    NPM-Pakete (mirror-lang, mcp-server, …)
examples/    Beispiel-Apps (hospital-dashboard, task-app)
docs/        Aktive Dokumentation (Tutorial, Generated Reference)
```

## Lizenz

MIT
