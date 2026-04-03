# mirror-lang

> Mirror DSL Compiler - UI as Code

Mirror ist eine domänenspezifische Sprache (DSL) für schnelles UI-Prototyping. Dieses Paket enthält den Compiler, der `.mirror` Dateien in verschiedene Outputs transformiert.

## Installation

```bash
npm install mirror-lang
```

## Verwendung

```javascript
import { parse, generateDOM } from 'mirror-lang'

const source = `
Button as button:
    pad 8 16, bg #3B82F6, col white, rad 4

Button "Click me"
`

// Parsen
const ast = parse(source)

// DOM-Code generieren
const code = generateDOM(ast)
```

## API

### `parse(source: string): AST`

Parst Mirror-Source-Code und gibt einen Abstract Syntax Tree zurück.

### `toIR(ast: AST): IR`

Transformiert den AST in eine framework-unabhängige Intermediate Representation.

### `generateDOM(ast: AST): string`

Generiert Pure-JavaScript-Code für DOM-Manipulation.

### `generateReact(ast: AST): string`

Generiert React-Komponenten-Code.

### `generateStatic(ast: AST): string`

Generiert statisches HTML.

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
// Tokens
primary: color = #3B82F6
sm: size = 4

// Komponenten-Definition (primitiv-basiert)
Card as frame:
    pad 16, bg surface, rad 8

// Vererbung
DangerButton extends Button:
    bg danger

// Instanzen
Card
    Text "Hello World"

// Benannte Instanzen
Button name saveBtn "Save"

// States
Button as button:
    hover:
        bg primary-hover

// Events
Button as button:
    onclick toggle Menu
```

## Lizenz

MIT
