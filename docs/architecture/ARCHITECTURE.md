# Mirror Studio Architektur

## Übersicht

Mirror ist ein DSL-Compiler für Rapid UI Prototyping mit einem integrierten Studio für bidirektionales Editing. Die Architektur ist modular aufgebaut mit klarer Trennung zwischen Compiler-Core und Studio-Runtime.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Mirror Studio                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │   Editor   │  │  Preview   │  │   Panels   │  │      Pickers       │ │
│  │ (CodeMirror)│  │   (DOM)    │  │ Property/  │  │ Color/Token/Icon/ │ │
│  │            │  │            │  │ Tree/Files │  │    Animation       │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────────┬──────────┘ │
│        │               │               │                    │            │
│        └───────────────┴───────────────┴────────────────────┘            │
│                                │                                         │
│                    ┌───────────┴───────────┐                             │
│                    │    SyncCoordinator    │                             │
│                    │ (Bidirectional Sync)  │                             │
│                    └───────────┬───────────┘                             │
│                                │                                         │
│  ┌─────────────────────────────┼─────────────────────────────┐          │
│  │                      Core Layer                            │          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐   │          │
│  │  │  State  │  │ Events  │  │Commands │  │  Executor   │   │          │
│  │  │ (Store) │  │  (Bus)  │  │(Undo/   │  │ (History)   │   │          │
│  │  │         │  │         │  │ Redo)   │  │             │   │          │
│  │  └─────────┘  └─────────┘  └─────────┘  └─────────────┘   │          │
│  └───────────────────────────────────────────────────────────┘          │
│                                │                                         │
│  ┌─────────────────────────────┼─────────────────────────────┐          │
│  │                     Modules Layer                          │          │
│  │  ┌─────────────────┐      ┌─────────────────┐             │          │
│  │  │  File Manager   │      │    Compiler     │             │          │
│  │  │ (Storage/API)   │      │ (Prelude/Build) │             │          │
│  │  └─────────────────┘      └─────────────────┘             │          │
│  └───────────────────────────────────────────────────────────┘          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                          Compiler Pipeline                               │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────────────┐ │
│  │  Lexer  │ ───► │ Parser  │ ───► │   IR    │ ───► │    Backends     │ │
│  │         │      │  (AST)  │      │         │      │ DOM/React/Static│ │
│  └─────────┘      └─────────┘      └─────────┘      └─────────────────┘ │
│                                          │                               │
│                                    ┌─────┴─────┐                        │
│                                    │ SourceMap │                        │
│                                    └───────────┘                        │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Projekt-Struktur

```
src/                          # Core Compiler (TypeScript)
├── parser/                   # Lexer & Parser → AST
│   ├── lexer.ts              # Tokenization, Indentation Tracking
│   └── index.ts              # Recursive Descent Parser
├── ir/                       # AST → IR Transformation
│   ├── index.ts              # IR Builder, SourceMap
│   └── types.ts              # IR Type Definitions
├── backends/                 # IR → Code Generation
│   ├── dom.ts                # DOM JavaScript Generator
│   ├── react.ts              # React/JSX Generator
│   ├── static.ts             # Static HTML Generator
│   └── framework.ts          # Framework-agnostic Base
├── runtime/                  # Browser Runtime
│   ├── dom-runtime.ts        # Event Handling, State Machine
│   └── mirror-runtime.ts     # Core Runtime Functions
├── studio/                   # Studio Support (Bidirectional Editing)
│   ├── code-modifier.ts      # Code Transformations
│   ├── source-map.ts         # Position Mappings
│   ├── property-extractor.ts # Extract Properties from IR
│   └── line-property-parser.ts # Parse Properties from Lines
├── schema/                   # Property Schema
│   └── properties.ts         # Property Definitions & Validation
├── llm/                      # LLM Integration
│   └── mirror-system-prompt.ts # System Prompt for AI
└── preprocessor.ts           # Multi-File Combining

studio/                       # Studio Runtime (TypeScript)
├── core/                     # State Management
│   ├── state.ts              # Reactive Store (Single Source of Truth)
│   ├── events.ts             # Event Bus
│   ├── commands.ts           # Command Definitions
│   ├── command-executor.ts   # Undo/Redo Stack
│   ├── context.ts            # Dependency Injection
│   └── selection-adapter.ts  # Selection State Adapter
├── modules/                  # Feature Modules
│   ├── file-manager/         # File Operations & Storage
│   │   ├── index.ts          # File Manager API
│   │   ├── file-operations.ts # CRUD Operations
│   │   ├── file-store.ts     # Reactive File Store
│   │   └── storage.ts        # LocalStorage/API Adapters
│   └── compiler/             # Compiler Wrapper
│       ├── index.ts          # Compile API
│       └── prelude-builder.ts # Multi-File Prelude
├── pickers/                  # UI Pickers
│   ├── base/                 # Base Classes
│   │   ├── picker.ts         # BasePicker Class
│   │   └── keyboard-nav.ts   # Keyboard Navigation
│   ├── color/                # Color Picker
│   │   ├── index.ts          # ColorPicker Class
│   │   └── palette.ts        # Color Palettes (Tailwind, Material, etc.)
│   ├── token/                # Token Picker ($variables)
│   │   └── index.ts          # TokenPicker Class
│   ├── icon/                 # Icon Picker
│   │   ├── index.ts          # IconPicker Class
│   │   └── icon-data.ts      # 1700+ Lucide Icons
│   └── animation/            # Animation Picker
│       ├── index.ts          # AnimationPicker Class
│       └── presets.ts        # 20+ Animation Presets
├── panels/                   # UI Panels
│   ├── property/             # Property Panel
│   │   ├── index.ts          # PropertyPanel Class
│   │   ├── ui-renderer.ts    # UI Generation
│   │   └── change-handler.ts # Property Change Logic
│   ├── tree/                 # AST Tree Panel
│   │   └── index.ts          # TreePanel Class
│   └── files/                # File Panel
│       └── index.ts          # FilePanel Class
├── preview/                  # Preview System
│   ├── index.ts              # PreviewController
│   └── renderer.ts           # DOM Renderer
├── sync/                     # Synchronization
│   ├── index.ts              # Exports
│   ├── sync-coordinator.ts   # Editor ↔ Preview ↔ Panel Sync
│   └── component-line-parser.ts # Parse Component Lines
├── editor/                   # Editor Module
│   ├── index.ts              # EditorController (CodeMirror Wrapper)
│   └── inline-token-handler.ts # Inline Token Definition ($name: value)
├── autocomplete/             # Completions
│   ├── index.ts              # Completion Logic
│   └── codemirror.ts         # CodeMirror Integration
├── llm/                      # LLM Integration
│   └── index.ts              # LLM API & Context
├── bootstrap.ts              # Initialization & Integration
├── app.js                    # Legacy UI (~8200 Lines)
├── index.html                # Entry Point
└── styles.css                # Styling
```

---

## Architektur-Prinzipien

### 1. Single Source of Truth
```typescript
// studio/core/state.ts
const state = createStore<StudioState>({
  source: '',
  ast: null,
  ir: null,
  sourceMap: null,
  selection: { nodeId: null, origin: 'editor' },
  // ...
})

// Subscribe to changes
state.subscribe((newState, prevState) => {
  if (newState.selection !== prevState.selection) {
    updateUI(newState.selection)
  }
})

// Update state
actions.setSelection('node_1', 'preview')
```

### 2. Unidirektionaler Datenfluss
```
User Action → Command → State Change → Event → UI Update
     │                      │              │
     │                      │              └── EventBus dispatches
     │                      └── Store updates reactively
     └── CommandExecutor records for undo/redo
```

### 3. Command Pattern für Undo/Redo
```typescript
// Jede Änderung als Command
const command = new SetPropertyCommand({
  nodeId: 'node_1',
  property: 'bg',
  value: '#FF5500'
})

executor.execute(command)  // Execute & record
executor.undo()            // Rollback
executor.redo()            // Re-apply
```

### 4. Event-Driven Communication
```typescript
// Loose coupling via events
events.emit('selection:changed', { nodeId, origin })

events.on('selection:changed', ({ nodeId, origin }) => {
  propertyPanel.show(nodeId)
  editor.scrollToLine(sourceMap.getLine(nodeId))
})
```

### 5. Bidirektionales Editing via SourceMap
```typescript
// SourceMap verbindet IR-Nodes mit Source-Positionen
const line = sourceMap.getLineForNode('node_1')  // Node → Line
const nodeId = sourceMap.getNodeAtLine(5)        // Line → Node

// CodeModifier wendet Änderungen präzise an
codeModifier.updateProperty('node_1', 'bg', '#FF0000')
```

---

## Module im Detail

### Core (`studio/core/`)

| Modul | Datei | Verantwortlichkeit |
|-------|-------|-------------------|
| **State** | `state.ts` | Reaktiver Store, Actions, Selectors |
| **Events** | `events.ts` | Event Bus für lose Kopplung |
| **Commands** | `commands.ts` | SetProperty, Insert, Delete, Move Commands |
| **Executor** | `command-executor.ts` | Undo/Redo Stack, History Management |
| **Context** | `context.ts` | Dependency Injection, Test Support |
| **Selection Adapter** | `selection-adapter.ts` | Selection State Abstraction |

### Pickers (`studio/pickers/`)

| Picker | Features |
|--------|----------|
| **ColorPicker** | Custom HSV, Tailwind/Material/Open Paletten, Hex Input, Eyedropper |
| **TokenPicker** | Token-Kontext ($name.bg), Kategorien, Preview |
| **IconPicker** | 1700+ Lucide Icons, Suche, Recent Icons |
| **AnimationPicker** | 20+ Presets (Fade, Slide, Scale, etc.), Timeline Editor |

### Panels (`studio/panels/`)

| Panel | Features |
|-------|----------|
| **PropertyPanel** | Layout, Size, Spacing, Border, Color, Typography Sections |
| **TreePanel** | AST Hierarchie, Selection, Drag & Drop |
| **FilePanel** | Multi-File Support, Create/Delete/Rename |

### Modules (`studio/modules/`)

| Modul | Features |
|-------|----------|
| **FileManager** | LocalStorage/API Storage, Multi-Project, Auto-Save |
| **Compiler** | Prelude Builder, Multi-File Compilation, Error Handling |

---

## Datenfluss

### Compilation Pipeline

```
Source Code (.mirror)
    │
    ▼
┌─────────────────────────────────────────┐
│ Lexer                                    │
│ - Tokenization (COMPONENT, PROPERTY,     │
│   VALUE, INDENT, DEDENT, ...)            │
│ - Position Metadata für SourceMap        │
└────────────────┬────────────────────────┘
                 │ Token[]
                 ▼
┌─────────────────────────────────────────┐
│ Parser                                   │
│ - Recursive Descent                      │
│ - Component/Property Recognition         │
│ - State & Event Handling                 │
│ - Error Recovery                         │
└────────────────┬────────────────────────┘
                 │ AST
                 ▼
┌─────────────────────────────────────────┐
│ IR Transformer                           │
│ - Node ID Assignment (node_1, node_2)    │
│ - SourceMap Building (Line ↔ Node)       │
│ - Property Normalization                 │
│ - Token Resolution                       │
└────────────────┬────────────────────────┘
                 │ IR + SourceMap
                 ▼
┌─────────────────────────────────────────┐
│ Backend (DOM/React/Static)               │
│ - Code Generation                        │
│ - Runtime Bundling                       │
│ - Event Wiring                           │
│ - State Machine Setup                    │
└────────────────┬────────────────────────┘
                 │ JavaScript/JSX/HTML
                 ▼
            [ Executable ]
```

### Selection Flow

```
Preview Click on Element
    │
    ▼
PreviewController.handleClick(event)
    │
    ├──► Extract nodeId from data-node attribute
    │
    ▼
SyncCoordinator.handleSelectionChange(nodeId, 'preview')
    │
    ├──► actions.setSelection(nodeId, 'preview')
    │        │
    │        ▼
    │    state.set({ selection: { nodeId, origin: 'preview' } })
    │        │
    │        ▼
    │    events.emit('selection:changed', { nodeId, origin })
    │
    ├──► Get line from SourceMap
    │        │
    │        ▼
    │    EditorController.scrollToLineAndSelect(line)
    │
    └──► PropertyPanel.show(nodeId)
             │
             ▼
         Extract properties from IR + display UI
```

### Property Change Flow

```
PropertyPanel Input Change (e.g., bg color)
    │
    ▼
ChangeHandler.handleChange(property, value)
    │
    ▼
Create SetPropertyCommand
    │
    ▼
executor.execute(command)
    │
    ├──► Record previous value for undo
    │
    ▼
CodeModifier.updateProperty(nodeId, property, value)
    │
    ▼
Calculate CodeChange { from, to, insert }
    │
    ▼
EditorView.dispatch({ changes, annotations })
    │
    ├──► Annotation marks change as "from panel"
    │
    ▼
EditorController.onContentChange(newSource)
    │
    ▼
compile(newSource)
    │
    ▼
updateStudioState(ast, ir, sourceMap)
    │
    ▼
Preview re-renders with new values
```

---

## State Schema

```typescript
interface StudioState {
  // Source & Compilation
  source: string                    // Current file content
  ast: AST | null                   // Parsed syntax tree
  ir: IR | null                     // Intermediate representation
  sourceMap: SourceMap | null       // Position mappings
  errors: ParseError[]              // Compilation errors

  // Selection
  selection: {
    nodeId: string | null           // Selected element ID
    origin: SelectionOrigin         // 'editor' | 'preview' | 'panel' | 'keyboard'
  }
  breadcrumb: BreadcrumbItem[]      // Ancestor chain for navigation

  // Editor State
  cursor: { line: number; column: number }
  editorHasFocus: boolean

  // File Management
  currentFile: string               // Active file name
  files: Record<string, string>     // Multi-file content cache
  fileTypes: Record<string, FileType>

  // UI State
  panels: { left: boolean; right: boolean }
  mode: 'mirror' | 'react'          // Editor mode
  preludeOffset: number             // Line offset for multi-file compilation
}

type SelectionOrigin = 'editor' | 'preview' | 'panel' | 'keyboard'
type FileType = 'layout' | 'component' | 'tokens' | 'data'
```

---

## Event System

### Definierte Events

| Event | Payload | Trigger |
|-------|---------|---------|
| `source:changed` | `{ source, origin }` | Code-Änderung |
| `selection:changed` | `{ nodeId, origin }` | Element-Selection |
| `breadcrumb:changed` | `{ breadcrumb }` | Selection Update |
| `editor:cursor-moved` | `{ line, column }` | Cursor-Bewegung |
| `preview:element-clicked` | `{ nodeId, element }` | Preview Click |
| `panel:property-changed` | `{ nodeId, property, value }` | Panel Input |
| `compile:requested` | `{}` | Compile Trigger |
| `compile:completed` | `{ ast, ir, sourceMap }` | Compile Done |
| `compile:error` | `{ errors }` | Compile Failed |
| `command:executed` | `{ command }` | Command Run |
| `command:undone` | `{ command }` | Undo |
| `command:redone` | `{ command }` | Redo |
| `file:changed` | `{ filename, content }` | File Modified |
| `file:selected` | `{ filename }` | File Switched |

### Event Usage Pattern

```typescript
// Subscribe
const unsubscribe = events.on('selection:changed', ({ nodeId, origin }) => {
  // Handle selection change
})

// Emit
events.emit('selection:changed', { nodeId: 'node_1', origin: 'preview' })

// Cleanup
unsubscribe()
```

---

## Command System

### Command Interface

```typescript
interface Command {
  type: CommandType
  description: string
  execute(): CommandResult
  undo(): CommandResult
}

interface CommandResult {
  success: boolean
  error?: string
}

type CommandType =
  | 'SET_PROPERTY'
  | 'REMOVE_PROPERTY'
  | 'INSERT_COMPONENT'
  | 'DELETE_NODE'
  | 'MOVE_NODE'
  | 'UPDATE_SOURCE'
  | 'BATCH'
```

### Verfügbare Commands

| Command | Funktion | Undo-Strategie |
|---------|----------|----------------|
| `SetPropertyCommand` | Property setzen/ändern | Speichert oldValue |
| `RemovePropertyCommand` | Property entfernen | Speichert oldLine |
| `InsertComponentCommand` | Kind-Element hinzufügen | Speichert insertion point |
| `DeleteNodeCommand` | Element löschen | Speichert gelöschten Content |
| `MoveNodeCommand` | Element verschieben | Speichert Source & Target |
| `UpdateSourceCommand` | Freie Code-Änderung | Speichert oldSource |
| `RecordedChangeCommand` | CodeMirror Change | Speichert Transaction |
| `BatchCommand` | Mehrere Commands | Rollback bei Fehler |

### Usage

```typescript
// Execute with automatic undo support
const result = executor.execute(new SetPropertyCommand({
  nodeId: 'node_1',
  property: 'bg',
  value: '#ff0000'
}))

// Undo/Redo
executor.undo()
executor.redo()

// Check availability
if (executor.canUndo()) { /* ... */ }
```

---

## Picker-Architektur

Alle Picker erben von `BasePicker`:

```typescript
abstract class BasePicker<T> {
  protected container: HTMLElement
  protected config: PickerConfig
  protected state: PickerState

  abstract render(): void
  abstract handleSelect(item: T): void

  show(position: PickerPosition): void
  hide(): void
  isVisible(): boolean
}
```

### Keyboard Navigation

```typescript
class KeyboardNav {
  constructor(config: KeyboardNavConfig)

  handleKeyDown(event: KeyboardEvent): boolean
  setItems(items: HTMLElement[]): void
  selectIndex(index: number): void
  getSelectedIndex(): number
}
```

### Integration in Editor

```typescript
// Hash trigger für ColorPicker
const hashColorTriggerExtension = EditorView.updateListener.of(update => {
  if (lastChar === '#' && afterColorProperty(line)) {
    showColorPicker(position, { hashTrigger: true })
  }
})

// Dollar trigger für TokenPicker
const tokenPanelTriggerExtension = EditorView.updateListener.of(update => {
  if (lastChar === '$') {
    showTokenPicker(position, { context: getPropertyContext() })
  }
})
```

---

## Multi-File Compilation

### File Types & Order

```typescript
const DIRECTORY_ORDER = ['data', 'tokens', 'components', 'layouts']

// Files werden in dieser Reihenfolge kombiniert
// 1. data/     - Daten-Definitionen
// 2. tokens/   - Design Tokens ($name: value)
// 3. components/ - Wiederverwendbare Komponenten
// 4. layouts/  - Haupt-Layouts
```

### Prelude Builder

```typescript
// Kombiniert alle Dateien außer der aktuellen
const prelude = buildPrelude({
  files: allFiles,
  currentFile: 'index.mirror',
  fileOrder: DIRECTORY_ORDER
})

// Tracked Line-Offset für SourceMap
const preludeLines = countPreludeLines(prelude)
```

---

## Build Output

```
dist/
├── index.js              # ESM Bundle (Node.js)
├── index.d.ts            # TypeScript Declarations
└── browser/
    └── index.global.js   # IIFE Bundle (Browser, 485KB)

studio/
└── dist/
    ├── index.js          # Studio Runtime Bundle (415KB)
    └── index.d.ts        # Studio Type Declarations
```

---

## Dependencies

| Package | Version | Verwendung |
|---------|---------|------------|
| `@codemirror/view` | ^6.x | Editor View |
| `@codemirror/state` | ^6.x | Editor State |
| `@codemirror/commands` | ^6.x | Editor Commands |
| `@codemirror/autocomplete` | ^6.x | Completions |
| `tsup` | ^8.x | Bundler |
| `vitest` | ^1.x | Testing |
| `typescript` | ^5.x | Type System |

**Keine Runtime-Framework-Dependencies** (React, Vue, Svelte) - reines TypeScript/JavaScript.

---

## Testing

```bash
npm test                    # Alle Tests
npm test -- --watch         # Watch Mode
npm test -- studio/         # Nur Studio Tests
npm test -- src/parser/     # Nur Parser Tests
```

### Test-Struktur

```
src/__tests__/
├── e2e/                    # End-to-End Compiler Tests
├── runtime/                # Runtime Tests
├── studio/                 # Studio Integration Tests
├── llm/                    # LLM Integration Tests
└── playwright/             # Browser Tests

studio/__tests__/           # Studio Unit Tests
studio/*/\__tests__/        # Module-specific Tests
```

---

## Deployment

```bash
./deploy.sh                 # Build & Deploy to production
```

Deploy-Schritte:
1. `npm run build` - Compiler bauen
2. `npm run build:studio` - Studio Runtime bauen
3. Upload zu Server via SFTP

**Cache Busting**: Bei Änderungen an `studio/app.js` oder `studio/styles.css` Version in `studio/index.html` erhöhen (`?v=N`)

---

## Weiterführende Dokumentation

- [Migration Plan](./MIGRATION-PLAN.md) - Refactoring-Plan für app.js Modularisierung
- [Module Specifications](./MODULES.md) - Detaillierte Interface-Definitionen
- [Testing Strategy](./TESTING.md) - Test-Konzept und Best Practices
