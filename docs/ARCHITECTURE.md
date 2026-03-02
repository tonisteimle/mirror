# Mirror DSL Architecture

> Mirror ist eine DSL für schnelles UI-Prototyping. Dieses Dokument beschreibt die technische Architektur.

## Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Projektstruktur](#projektstruktur)
3. [Datenfluss](#datenfluss)
4. [Parser System](#parser-system)
5. [Generator System](#generator-system)
6. [Editor System](#editor-system)
7. [Validation System](#validation-system)
8. [State Management](#state-management)
9. [Design Patterns](#design-patterns)

---

## Übersicht

Mirror transformiert eine domänenspezifische Sprache (DSL) in React-Komponenten mit Live-Preview. Die Architektur besteht aus folgenden Kernmodulen:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Editor    │ ──▶ │   Parser    │ ──▶ │  Generator  │ ──▶ │   Preview   │
│ (CodeMirror)│     │   (AST)     │     │   (React)   │     │   (DOM)     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                   │
       │                   ▼
       │            ┌─────────────┐
       └────────────│ Validation  │
                    └─────────────┘
```

---

## Projektstruktur

```
src/
├── parser/                 # DSL → AST
│   ├── lexer/             # Tokenisierung
│   ├── component-parser/  # Komponenten-Syntax
│   ├── property-parser.ts # Property-Parsing
│   ├── state-parser.ts    # State-Definitionen
│   ├── events-parser.ts   # Event-Handler
│   └── types.ts           # AST-Typen
│
├── generator/             # AST → React
│   ├── react-generator.tsx
│   ├── primitives/        # Button, Input, Icon, etc.
│   ├── behaviors/         # Dropdown, FormField, etc.
│   ├── styles/            # CSS-Komposition
│   ├── events/            # Event-Handling
│   └── contexts/          # Runtime-Kontexte
│
├── editor/                # Code-Editor
│   ├── codemirror-adapter.ts
│   ├── dsl-syntax.ts      # Syntax-Highlighting
│   ├── dsl-autocomplete.ts
│   └── keymaps.ts
│
├── dsl/                   # DSL Schema & Validation
│   ├── schema/            # Modulares Schema (aufgeteilt)
│   │   ├── types.ts       # Type-Definitionen
│   │   ├── components.ts  # Primitive Components (Box, Text, etc.)
│   │   ├── properties.ts  # Property-Definitionen
│   │   ├── events.ts      # Event-Definitionen
│   │   ├── actions.ts     # Action-Definitionen
│   │   ├── states.ts      # State-Definitionen
│   │   ├── animations.ts  # Animation-Definitionen
│   │   ├── keywords.ts    # Keyword-Definitionen
│   │   └── index.ts       # Re-exports
│   ├── master-schema.ts   # Haupt-Schema + Helpers
│   ├── normalizer.ts      # Property-Normalisierung
│   └── schema-validator.ts # Validierung
│
├── components/            # React UI-Komponenten
├── hooks/                 # Custom Hooks
├── services/              # Error-Handling, Logger, Utilities
├── lib/                   # Errors, Analysis, Context
└── library/               # Component Library
```

---

## Datenfluss

### Code → Parse → Render

```
User Code (DSL)
       │
       ▼
┌──────────────────┐
│ EditorPanel      │
│ onChange()       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ useCodeParsing() │
│ ├─ merge code    │
│ ├─ debounce      │
│ └─ parse()       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ ParseResult      │
│ ├─ nodes[]       │  ← AST-Knoten
│ ├─ registry      │  ← Komponenten-Definitionen
│ ├─ tokens        │  ← Token-Definitionen
│ └─ diagnostics   │  ← Fehler/Warnungen
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Validation       │
│ unifiedValidate()│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ React Generator  │
│ generateElement()│
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Preview          │
│ Live Render      │
└──────────────────┘
```

---

## Parser System

### Module

| Modul | Verantwortlichkeit |
|-------|-------------------|
| `lexer/` | Tokenisierung (COMPONENT, PROPERTY, VALUE) |
| `component-parser/` | Komponenten-Syntax, Vererbung, Kinder |
| `property-parser.ts` | Properties (padding, color, size) |
| `definition-parser.ts` | `$token` und `Component:` Definitionen |
| `state-parser.ts` | State-Blöcke (hover, active, custom) |
| `events-parser.ts` | Event-Handler und Actions |
| `expression-parser.ts` | Ausdrücke für Conditionals |
| `children-parser.ts` | Slots, Conditionals, Iterators |

### AST-Struktur

```typescript
interface ASTNode {
  type: 'component'
  name: string                    // Button, Card, etc.
  id: string
  properties: DSLProperties       // pad, bg, col, etc.
  content?: string                // Text-Inhalt
  children: ASTNode[]

  // Optional
  extends?: string                // Vererbung
  instanceName?: string           // named Instance
  states?: StateDefinition[]      // hover, active, etc.
  eventHandlers?: EventHandler[]  // onclick, onchange
  condition?: Conditional         // if $x
  iteration?: Iterator            // each $item in $list
}
```

### ParseResult

```typescript
interface ParseResult {
  nodes: ASTNode[]                              // Gerenderte Komponenten
  registry: Map<string, ComponentTemplate>      // Definitionen
  tokens: Map<string, TokenValue>               // Token-Werte
  errors: ParseIssue[]
  diagnostics: Diagnostic[]
  centralizedEvents: CentralizedEventHandler[]
}
```

---

## Generator System

### Module

| Modul | Verantwortlichkeit |
|-------|-------------------|
| `react-generator.tsx` | Haupt-Generator, Orchestrierung |
| `primitives/` | Button, Input, Icon, Image, Link |
| `behaviors/` | Dropdown, FormField, Toggle |
| `styles/` | DSL → CSS Konvertierung |
| `events/` | Event-Handler Attachment |
| `contexts/` | State, Registry, Typography |
| `renderers/` | Conditional, Iterator, DataBinding |

### Render-Flow

```typescript
generateReactElement(nodes: ASTNode[]) {
  for (node of nodes) {
    // 1. Primitive prüfen
    if (isPrimitive(node)) → renderPrimitive()

    // 2. Conditional prüfen
    if (node.condition) → ConditionalRenderer

    // 3. Iterator prüfen
    if (node.iteration) → IteratorRenderer

    // 4. Library-Komponente prüfen
    if (isLibraryComponent(node)) → SafeLibraryRenderer

    // 5. Custom Component
    → Rekursiv Kinder rendern
    → State-Styles anwenden
    → Event-Handler attachieren
  }

  return React.Element
}
```

### Primitives

| Primitive | HTML-Element |
|-----------|-------------|
| `Button` | `<button>` |
| `Input` | `<input>` |
| `Textarea` | `<textarea>` |
| `Icon` | `<span>` + SVG |
| `Image` | `<img>` |
| `Link` | `<a>` |

### Library Components

Komplexere Komponenten werden aus einer externen Component Library (`_template` Projekt) geladen.
Die Library bietet vorgefertigte Templates für Navigation, Forms, Buttons etc.

---

## Editor System

### Module

| Modul | Verantwortlichkeit |
|-------|-------------------|
| `codemirror-adapter.ts` | CodeMirror 6 Wrapper |
| `dsl-syntax.ts` | Syntax-Highlighting |
| `dsl-autocomplete.ts` | Context-aware Autocomplete |
| `keymaps.ts` | Keyboard Shortcuts |
| `number-scrubbing.ts` | Drag-to-adjust Numbers |
| `semantic-selection.ts` | Smart Selection |
| `shorthand-expansion.ts` | p → padding |
| `color-swatches.ts` | Inline Color Indicators |

### Editor-Interface

```typescript
interface IEditor {
  getValue(): string
  setValue(value: string): void
  getSelection(): string
  replaceSelection(text: string): void
  getCursorPosition(): { line: number, ch: number }
  setCursorPosition(pos: Position): void
  focus(): void
  on(event: string, handler: Function): void
}
```

---

## Validation System

### Pipeline

```
Code
  │
  ▼
┌──────────────────┐
│ Syntax Check     │  ← Syntaxfehler erkennen
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Semantic Check   │  ← Semantische Fehler
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Value Validation │  ← Wertebereichsprüfung
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Auto-Correction  │  ← Automatische Korrekturen
└────────┬─────────┘
         │
         ▼
ValidationResult
```

### Module

| Modul | Verantwortlichkeit |
|-------|-------------------|
| `pipeline/` | Validierungs-Orchestrierung |
| `core/` | DiagnosticBuilder, Error Codes |
| `correctors/` | Auto-Korrektur-Module |
| `dsl-schema.ts` | Property/Event-Definitionen |

---

## State Management

### useAppState

Aggregiert alle Domain-Hooks:

```typescript
useAppState() {
  // Code
  layoutCode, componentsCode, tokensCode, dataCode

  // Parsing
  parsing: UseCodeParsingReturn

  // Pages
  pageManager: { pages, currentPageId, switchToPage }

  // Editor
  editor: { activeTab, highlightLine, autoCompleteMode }

  // History
  history: { undo(), redo() }

  // Settings
  pickerModeEnabled, useTokenMode, expandShorthand

  // Project
  projectStorage: { save(), load() }
}
```

### Hook-Hierarchie

```
useAppState
├── useCodeParsing      ← Parsing-Logik
├── useEditorState      ← Editor-Tab-State
├── usePageManager      ← Seiten-Verwaltung
├── useHistory          ← Undo/Redo
├── useProjectStorage   ← Persistenz
└── usePanel            ← Panel-Sizing
```

---

## Design Patterns

### Parser Delegation

Jedes Parser-Modul hat eine spezifische Verantwortlichkeit:
- Lexer tokenisiert
- ComponentParser parst Komponenten
- PropertyParser parst Properties

### Factory Pattern

```typescript
createEditorExtensions()  // Editor-Extensions
createComponentDefinition() // Komponenten
CodeMirrorFactory.create() // Editor-Instanzen
```

### Hook Composition

Domain-Hooks werden in useAppState komponiert:
```typescript
const appState = useAppState()
// statt: useCodeParsing() + useEditorState() + usePageManager() + ...
```

### Context-Based DI

```typescript
<BehaviorRegistryProvider>
  <ComponentRegistryProvider>
    <Preview />
  </ComponentRegistryProvider>
</BehaviorRegistryProvider>
```

### Visitor Pattern

Generator besucht AST-Knoten rekursiv:
```typescript
for (node of nodes) {
  if (isPrimitive(node)) → handlePrimitive()
  if (isConditional(node)) → handleConditional()
  // ...
}
```

### Lazy Loading

```typescript
const LazyPromptPanel = lazy(() => import('./PromptPanel'))
const LazyIconPicker = lazy(() => import('./IconPicker'))
```

---

## Performance

| Optimierung | Beschreibung |
|-------------|--------------|
| Debounced Parsing | 250ms Debounce bei Code-Änderungen |
| Memoization | React.memo auf Preview, PreviewContainer |
| Lazy Components | PromptPanel, IconPicker on-demand |
| Code Splitting | Tokens, Components, Layout getrennt |
| Preview Override | Instant Feedback für Picker |
| Cursor Suppression | Diagnostics auf aktiver Zeile unterdrückt |

---

## Test-Architektur

```
src/__tests__/
├── parser/           # Parser Unit Tests
│   ├── basics/
│   ├── components/
│   ├── properties/
│   ├── states/
│   └── events/
├── generator/        # Generator Tests
│   ├── rendering/
│   ├── styles/
│   └── behaviors/
├── features/         # Feature Integration Tests
├── examples/         # Real-World Examples
└── docu/            # Documentation Tests

e2e/
├── specs/           # E2E Specs
└── pages/           # Page Objects
```

---

## Zusammenfassung

Die Mirror-Architektur ermöglicht:

- **Schnelles Prototyping** durch DSL → React Kompilierung
- **Hohe Flexibilität** durch erweiterbaren Parser und Generator
- **Qualitätssicherung** durch mehrstufige Validierung
- **Exzellente UX** durch Live-Preview und intelligenten Editor
- **Skalierbarkeit** durch modulares Design
