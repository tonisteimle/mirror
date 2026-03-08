# mirror-lang

> Mirror DSL Compiler - UI as Code

Mirror ist eine domänenspezifische Sprache (DSL) für schnelles UI-Prototyping. Dieses Paket enthält den Compiler, der `.mirror` Dateien in verschiedene Outputs transformiert.

## Installation

```bash
npm install mirror-lang
```

## Verwendung

```javascript
import { compile, parse, generateDOM, generateReact, generateStatic } from 'mirror-lang'

const source = `
$primary: #3B82F6

Button: pad 8 16, bg $primary, col white, rad 4

Button "Click me"
`

// Einfache Kompilierung
const code = compile(source)

// Oder schrittweise
const ast = parse(source)
const domCode = generateDOM(ast)      // Pure JavaScript
const reactCode = generateReact(ast)  // React Komponenten
const htmlCode = generateStatic(ast)  // Statisches HTML
```

## API

### `compile(source: string): string`

Kompiliert Mirror-Source-Code direkt zu JavaScript (DOM-Backend).

### `parse(source: string): AST`

Parst Mirror-Source-Code und gibt einen Abstract Syntax Tree zurück.

### `toIR(ast: AST): IRResult`

Transformiert den AST in eine framework-unabhängige Intermediate Representation.

### `generateDOM(ast: AST): string`

Generiert Pure-JavaScript-Code für DOM-Manipulation. Zero Dependencies.

### `generateReact(ast: AST): string`

Generiert React-Komponenten-Code.

### `generateStatic(ast: AST): string`

Generiert statisches HTML.

### `compileProject(options: CompileProjectOptions): string`

Kompiliert ein Multi-File Mirror-Projekt mit fester Verzeichnisstruktur:
- `data/` → Datenquellen
- `tokens/` → Design Tokens
- `components/` → Komponentendefinitionen
- `layouts/` → Seiten-Layouts

## AST-Struktur

```typescript
interface Program {
  type: 'Program'
  tokens: TokenDefinition[]
  components: ComponentDefinition[]
  instances: Instance[]
}

interface ComponentDefinition {
  type: 'Component'
  name: string
  primitive: string | null    // 'frame', 'text', 'button', etc.
  extends: string | null      // Parent-Komponente
  properties: Property[]
  states: State[]
  events: Event[]
  children: (Instance | Slot)[]
}
```

## Syntax-Übersicht

```mirror
// Tokens (Design-Variablen)
$primary: #3B82F6
$sm: 4

// Komponenten-Definition (auf Primitiv basiert)
Card: pad 16, bg $surface, rad 8

// Vererbung (mit as)
DangerButton as Button: bg #EF4444

// Instanzen
Card
    Text "Hello World"

// Benannte Instanzen
Button named saveBtn "Save"

// States
Button:
    state hover bg #2563EB

// Events
Button:
    onclick toggle Menu
```

## Backends

| Backend | Output | Verwendung |
|---------|--------|------------|
| `generateDOM` | Pure JavaScript | Standard, zero dependencies |
| `generateReact` | React Components | Integration in React-Projekte |
| `generateStatic` | HTML | SSG, SSR, statische Seiten |

## Lizenz

MIT
