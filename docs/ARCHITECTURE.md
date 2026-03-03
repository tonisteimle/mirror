# Mirror v2 Architektur

> Mirror wird zu einem universellen UI-Format mit JavaScript als Partner.

## Übersicht

```
┌─────────────────────────────────────────────────────────────┐
│                       Mirror IDE                             │
│                   (optional, visuelles Tool)                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │    .mirror    │  ← Textdateien (versionierbar)
                   │    Dateien    │
                   └───────┬───────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                        Compiler                              │
│  ┌─────────┐    ┌──────────┐    ┌─────────────────────────┐ │
│  │ Parser  │ →  │    IR    │ →  │        Backend          │ │
│  │         │    │          │    │  (DOM / React / Static) │ │
│  └─────────┘    └──────────┘    └─────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        ┌────────┐    ┌────────┐    ┌────────┐
        │  DOM   │    │ React  │    │ Static │
        │ (pure) │    │        │    │  HTML  │
        └────────┘    └────────┘    └────────┘
```

---

## Projekt-Struktur (Monorepo)

```
packages/
├── mirror-lang/           # Compiler-Paket
│   ├── src/
│   │   ├── parser/        # Lexer, Parser, AST
│   │   │   ├── lexer.ts
│   │   │   ├── parser.ts
│   │   │   └── ast.ts
│   │   ├── ir/            # Intermediate Representation
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── backends/      # Code-Generatoren
│   │       ├── dom.ts     # Flaggschiff: Pure DOM
│   │       ├── react.ts   # React-Komponenten
│   │       └── static.ts  # Statisches HTML
│   ├── package.json
│   └── tsconfig.json
│
└── mirror-ide/            # IDE-Paket (optional)
    ├── src/
    │   ├── components/    # React-Komponenten
    │   ├── editor/        # CodeMirror Integration
    │   ├── preview/       # Live-Preview
    │   └── ...
    └── package.json
```

---

## DOM-Backend Architektur

### Design-Entscheidungen

| Aspekt | Entscheidung | Begründung |
|--------|--------------|------------|
| **VDOM** | Nein | Keine Abstraktionsschicht nötig |
| **Framework** | Keine Abhängigkeit | Maximale Portabilität |
| **Reaktivität** | Setter → direktes DOM-Update | Minimal, effizient |
| **Listen** | Komplett neu rendern | Einfach, schnell genug |
| **Output** | ES-Modul mit Factory | Standard, tree-shakeable |
| **Runtime** | ~50 Zeilen Hilfsklassen | Minimal footprint |

### Reaktivität via Proxy

```javascript
// Generierter Code (vereinfacht)
const ui = {
  _elements: {},

  get header() {
    return {
      get text() { return this._el.textContent },
      set text(v) { this._el.textContent = v },  // Direkt ins DOM
      _el: ui._elements.header
    }
  }
}
```

Kein Virtual DOM, kein Diffing. Setter schreibt direkt.

### Listen-Handling

```javascript
// Bei Änderung: Komplett neu rendern
set children(items) {
  this._container.innerHTML = ''
  items.forEach(item => {
    this._container.appendChild(renderItem(item))
  })
}
```

Einfach, vorhersagbar, für UI-Prototyping schnell genug.

### Output-Format

```javascript
// Generiert aus app.mirror
export default function createUI() {
  const _elements = {}

  // DOM-Aufbau
  _elements.root = document.createElement('div')
  _elements.header = document.createElement('h1')
  // ...

  // Reaktives Interface
  return {
    header: {
      get text() { return _elements.header.textContent },
      set text(v) { _elements.header.textContent = v }
    },
    render(target) {
      const el = typeof target === 'string'
        ? document.querySelector(target)
        : target
      el.appendChild(_elements.root)
    }
  }
}
```

### Verwendung

```javascript
import createUI from "./app.mirror.js"

const ui = createUI()

ui.header.text = "Hello"      // Reaktiv
ui.button.onclick = () => {}  // Event binding

ui.render("#root")            // Mounten
```

---

## Parser-Architektur

### Pipeline

```
.mirror Source
      │
      ▼
┌─────────────┐
│   Lexer     │  → Token[]
└─────────────┘
      │
      ▼
┌─────────────┐
│   Parser    │  → AST
└─────────────┘
      │
      ▼
┌─────────────┐
│  Validator  │  → AST + Diagnostics
└─────────────┘
      │
      ▼
┌─────────────┐
│    IR       │  → Framework-unabhängig
└─────────────┘
      │
      ▼
┌─────────────┐
│  Backend    │  → JavaScript/HTML
└─────────────┘
```

### Lexer (tokenize)

Wandelt Source-Code in Token-Stream:

```typescript
type TokenType =
  | 'IDENTIFIER'  // Button, Card
  | 'STRING'      // "Hello"
  | 'NUMBER'      // 16, #3B82F6
  | 'COLON'       // :
  | 'AS'          // as
  | 'EXTENDS'     // extends
  | 'NAMED'       // named
  | 'INDENT'      // Einrückung erhöht
  | 'DEDENT'      // Einrückung verringert
  | 'NEWLINE'     // Zeilenende
  | ...
```

### Parser

Wandelt Token-Stream in AST:

```typescript
interface Program {
  tokens: TokenDefinition[]
  components: ComponentDefinition[]
  instances: Instance[]
}

interface ComponentDefinition {
  name: string
  primitive: string | null     // 'frame' | 'text' | etc.
  extends: string | null       // Parent-Komponente
  properties: Property[]
  states: State[]
  events: Event[]
  children: (Instance | Slot)[]
}
```

### IR (Intermediate Representation)

Framework-unabhängige Zwischendarstellung:

```typescript
interface IRNode {
  id: string
  tag: string              // div, span, button, etc.
  properties: IRProperty[]
  styles: IRStyle[]
  events: IREvent[]
  children: IRNode[]
}

interface IRStyle {
  property: string         // CSS property
  value: string            // CSS value
  state?: string           // hover, focus, etc.
}
```

---

## IDE-Architektur (mirror-ide)

### Komponenten

```
┌────────────────────────────────────────────────────────┐
│                       App                               │
├──────────────────────┬─────────────────────────────────┤
│                      │                                  │
│    EditorPanel       │        PreviewPanel             │
│    ┌──────────────┐  │  ┌──────────────────────────┐   │
│    │ CodeMirror   │  │  │     Preview              │   │
│    │              │  │  │  ┌────────────────────┐  │   │
│    │ - Syntax     │  │  │  │  Rendered UI       │  │   │
│    │ - Autocomplete│ │  │  │                    │  │   │
│    │ - Validation │  │  │  │                    │  │   │
│    │              │  │  │  └────────────────────┘  │   │
│    └──────────────┘  │  └──────────────────────────┘   │
│                      │                                  │
├──────────────────────┴─────────────────────────────────┤
│                  Component Library                      │
└────────────────────────────────────────────────────────┘
```

### Datenfluss

```
User Code (DSL)
       │
       ▼
┌──────────────────┐
│ useCodeParsing() │
│ ├─ parse()       │
│ └─ validate()    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ParseResult      │
│ ├─ nodes[]       │  ← AST
│ ├─ registry      │  ← Komponenten
│ ├─ tokens        │  ← Design-Tokens
│ └─ diagnostics   │  ← Fehler
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Preview          │
│ (Live Render)    │
└──────────────────┘
```

---

## Syntax v2 - Zusammenfassung

### Primitiven (eingebaut)

```
frame    → <div>
text     → <span>
input    → <input>
button   → <button>
image    → <img>
link     → <a>
icon     → SVG
```

### Komponenten-Definition

```mirror
// Primitiv-basiert (mit 'as')
Card as frame:
    pad 16, bg surface

// Vererbung (mit 'extends')
DangerButton extends Button:
    bg danger
```

### Tokens

```mirror
// Einzeln
primary: color = #3B82F6

// Gruppiert
spacing:
    sm: size = 4
    md: size = 8
```

### Benannte Instanzen

```mirror
Button named saveBtn "Save"
Input named emailField
```

### States

```mirror
Button as button:
    hover:
        bg primary-hover
    disabled:
        opacity 0.5
```

### Events

```mirror
onclick toggle
onclick select next
onkeydown escape: close
```

### JavaScript Integration

```javascript
import ui from "./app.mirror"

ui.saveBtn.onclick = () => { ... }
ui.header.text = "New Title"  // Reaktiv

ui.render("#root")
```

---

## Migration v1 → v2

### Syntax-Änderungen

| v1 | v2 | Grund |
|----|----|----|
| `Box` | `frame` | Figma-Terminologie |
| `Name as Type` (Instanz) | `Name named instance` | `as` nur für Definition |
| `- Item` (Liste) | `Item` (ohne Prefix) | Vereinfachung |
| `onclick select self` | `onclick select` | Implizites self |
| `ui.btn_onclick` | `ui.btn.onclick` | Natürliche JS-Syntax |

### Was bleibt

- Gesamte Property-Syntax
- Token-System
- States und Events
- Vererbung
- Slots und Flat Access

---

## Technologie-Stack

### Compiler (mirror-lang)

| Komponente | Technologie |
|------------|-------------|
| Sprache | TypeScript |
| Build | tsup / esbuild |
| Tests | Vitest |
| Package | ESM + CJS |

### IDE (mirror-ide)

| Komponente | Technologie |
|------------|-------------|
| Framework | React 18 |
| Editor | CodeMirror 6 |
| Build | Vite |
| State | Custom Hooks |
| Tests | Vitest + Testing Library |

---

## Nächste Schritte

1. **Parser komplettieren** - Alle v2-Features
2. **IR definieren** - Saubere Datenstruktur
3. **DOM-Backend** - Flaggschiff-Generator
4. **Reaktivität** - Proxy-basierte Updates
5. **Import-System** - .mirror → .js Integration

---

*Mirror v2 Architektur - März 2026*
