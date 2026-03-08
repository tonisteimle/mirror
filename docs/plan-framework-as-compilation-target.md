# Plan: Framework als Compilation Target

## Ziel

Der Mirror Compiler generiert Code für verschiedene Backends: Pure JavaScript (DOM), React Components, oder statisches HTML.

## Status

### Implementiert ✅

| Backend | Datei | Status |
|---------|-------|--------|
| DOM (JavaScript) | `src/backends/dom.ts` | ✅ Vollständig |
| React | `src/backends/react.ts` | ✅ Vollständig |
| Static HTML | `src/backends/static.ts` | ✅ Vollständig |
| Framework | `src/backends/framework.ts` | ✅ Vollständig |

### Architektur

```
Mirror DSL (.mirror)
    ↓ parse()
AST (Abstract Syntax Tree)
    ↓ toIR()
IR (Intermediate Representation)
    ↓
┌─────────────┬─────────────┬─────────────┐
│ generateDOM │generateReact│generateStatic│
└─────────────┴─────────────┴─────────────┘
    ↓              ↓              ↓
Pure JavaScript  React JSX    Static HTML
```

---

## DOM Backend ✅

**Status:** Vollständig implementiert

**Output:**
```javascript
// Generated JavaScript
const { createUI } = (() => {
  // ... runtime code

  function createUI() {
    const node_1 = document.createElement('div')
    Object.assign(node_1.style, { background: '#fff', padding: '16px' })
    // ...
    return { root: node_1, ... }
  }

  return { createUI }
})()

createUI()
```

**Features:**
- ✅ Alle Properties (Layout, Spacing, Colors, etc.)
- ✅ States (hover, focus, highlighted, selected, etc.)
- ✅ Events (onclick, onhover, keyboard events)
- ✅ Actions (toggle, show, hide, select, highlight)
- ✅ Conditionals (if/else)
- ✅ Iterations (each...in)
- ✅ Keyboard Navigation
- ✅ Selection Binding
- ✅ Animations

**Dateien:**
- `src/backends/dom.ts` (~60KB)

---

## React Backend ✅

**Status:** Vollständig implementiert

**Output:**
```jsx
import React from 'react'

function Card({ children }) {
  return (
    <div style={{ background: '#fff', padding: '16px' }}>
      {children}
    </div>
  )
}

export function App() {
  return (
    <Card>
      <span>Hello World</span>
    </Card>
  )
}
```

**Features:**
- ✅ Functional Components
- ✅ Props Passing
- ✅ Event Handlers
- ✅ useState für States
- ✅ Conditional Rendering
- ✅ List Rendering mit map()

**Dateien:**
- `src/backends/react.ts`

---

## Static HTML Backend ✅

**Status:** Vollständig implementiert

**Output:**
```html
<div style="background: #fff; padding: 16px;">
  <span>Hello World</span>
</div>
```

**Features:**
- ✅ Inline Styles
- ✅ Nested Elements
- ✅ Static Content

**Dateien:**
- `src/backends/static.ts`

---

## Framework Backend ✅

**Status:** Vollständig implementiert

Alternative M()-basierte Runtime für LLM-Integration.

**Output:**
```javascript
import { M } from 'mirror-runtime'

const ui = M('Box', { bg: '#fff', pad: 16 }, [
  M('Text', 'Hello', { weight: 'bold' })
])

M.render(ui, document.body)
```

**Dateien:**
- `src/backends/framework.ts`

---

## IR (Intermediate Representation) ✅

**Status:** Vollständig implementiert

Framework-unabhängige Zwischenrepräsentation.

```typescript
interface IR {
  tokens: Map<string, TokenValue>
  components: Map<string, IRComponent>
  instances: IRInstance[]
  sourceMap: SourceMap
}

interface IRNode {
  type: string
  name: string
  primitive: string | null
  properties: IRProperty[]
  styles: IRStyle[]
  states: IRState[]
  events: IREvent[]
  children: IRNode[]
  sourcePosition: SourcePosition
}
```

**Features:**
- ✅ Source Maps für bidirektionales Editing
- ✅ Property zu CSS Mapping
- ✅ State Aggregation
- ✅ Event Normalisierung

**Dateien:**
- `src/ir/index.ts`
- `src/ir/types.ts`

---

## Tests ✅

| Bereich | Tests | Status |
|---------|-------|--------|
| E2E (alle Properties) | ~800 | ✅ |
| Parser | ~100 | ✅ |
| IR | ~50 | ✅ |
| DOM Backend | ~100 | ✅ |
| Runtime | ~50 | ✅ |

---

## API Übersicht

```typescript
// Main exports from mirror-lang
export { parse } from './parser'
export { toIR } from './ir'
export { generateDOM } from './backends/dom'
export { generateReact } from './backends/react'
export { generateStatic } from './backends/static'
export { generateFramework } from './backends/framework'
export { compile, compileProject } from './'

// Usage
import { compile } from 'mirror-lang'

const jsCode = compile(`
  Card: pad 16, bg #333
  Card
    Text "Hello"
`)
```

---

## Nächste Schritte

1. **TypeScript Definitions** - Auto-generierte .d.ts aus .mirror
2. **Source Maps** - JavaScript Source Maps für Debugging
3. **Incremental Compilation** - Nur geänderte Teile neu kompilieren
4. **Bundler Plugins** - Vite/esbuild/webpack Integration

---

*Stand: März 2026*
