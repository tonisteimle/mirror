# Mirror Architecture

This document describes the technical architecture of Mirror, a DSL for AI-assisted UI design.

## Overview

Mirror follows a traditional compiler architecture with additional tooling for visual editing:

```
┌─────────────────────────────────────────────────────────────┐
│                     Mirror Source Code                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMPILER PIPELINE                         │
│                                                              │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐ │
│   │  Lexer  │───▶│ Parser  │───▶│   IR    │───▶│ Backend │ │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘ │
│        │              │              │              │        │
│        ▼              ▼              ▼              ▼        │
│     Tokens          AST       SourceMap        JS/HTML      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    MIRROR STUDIO                             │
│                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│   │  Editor  │  │ Preview  │  │  Panels  │  │  Pickers  │  │
│   └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│         ▲              ▲              ▲            ▲        │
│         └──────────────┴──────────────┴────────────┘        │
│                         Event Bus                            │
└─────────────────────────────────────────────────────────────┘
```

## Compiler

Located in `/compiler/`, the compiler transforms Mirror source code into executable JavaScript.

### Lexer (`compiler/parser/lexer.ts`)

The lexer tokenizes Mirror source code into tokens. Key features:
- Indentation-based scoping (Python-like)
- String literals with proper escaping
- Property value parsing (colors, numbers, keywords)

### Parser (`compiler/parser/parser.ts`)

The parser produces an Abstract Syntax Tree (AST). Key concepts:
- **Tokens**: Design variables (`$primary: #3B82F6`)
- **Components**: Reusable definitions (`Button: pad 12, bg blue`)
- **Instances**: Component usage (`Button "Click me"`)
- **States**: Visual variants (`hover:`, `on:`, `active:`)
- **Children**: Nested elements via indentation

### AST (`compiler/parser/ast.ts`)

The AST represents the parsed structure:
```typescript
interface AST {
  tokens: TokenDefinition[]
  components: ComponentDefinition[]
  instances: Instance[]
}

interface Instance {
  type: 'Instance'
  nodeId: string
  component: string
  properties: Property[]
  children: (Instance | Slot)[]
  states: State[]
}
```

### Intermediate Representation (`compiler/ir/`)

The IR transforms the AST for code generation:
- Resolves token references
- Expands component inheritance
- Calculates style values
- Generates unique node IDs

### SourceMap (`compiler/ir/source-map.ts`)

Bidirectional mapping between source positions and AST nodes:
- Maps character positions → node IDs
- Maps node IDs → source ranges
- Enables visual editing (click in preview → edit code)

### Backends

**DOM Backend** (`compiler/backends/dom.ts`):
- Generates vanilla JavaScript
- Runtime handles events, states, reactivity
- Default target for Studio preview

**React Backend** (`compiler/backends/react.ts`):
- Generates React components
- Maps Mirror states to React state
- Outputs TypeScript-compatible JSX

### Schema (`compiler/schema/`)

Single source of truth for the DSL:
- **`dsl.ts`**: Property definitions, primitives, Zag components
- **`properties.ts`**: Property aliases, value types, defaults
- **`component-templates.ts`**: Predefined component code

## Studio

Located in `/studio/`, the visual editor provides real-time editing.

### Core (`studio/core/`)

**State Store** (`state.ts`):
- Single source of truth for application state
- Holds source code, AST, IR, SourceMap
- Emits events on state changes

**Event Bus** (`events.ts`):
- Typed event system for loose coupling
- Components communicate via events
- Enables undo/redo via command pattern

**Commands** (`commands.ts`):
- Encapsulates code modifications
- Supports undo/redo
- Tracks change history

### Editor (`studio/editor/`)

**EditorController**:
- Wraps CodeMirror 6
- Handles syntax highlighting
- Manages cursor position and selection

**TriggerManager**:
- Triggers pickers on specific characters
- `#` → Color picker
- `$` → Token picker
- Icon names → Icon picker

**SyncCoordinator**:
- Synchronizes editor ↔ preview ↔ panels
- Debounces compilation
- Handles selection sync

### Preview (`studio/preview/`)

**PreviewController**:
- Renders compiled output
- Handles click/hover events
- Maps DOM elements to node IDs

**SelectionOverlay**:
- Visual selection indicators
- Resize handles
- Direct manipulation

### Panels (`studio/panels/`)

**PropertyPanel**:
- Shows selected element properties
- Inline editing with pickers
- Real-time updates

**TreePanel**:
- AST visualization
- Navigation by click
- Expand/collapse children

**ComponentPanel**:
- Draggable component palette
- Basic primitives + Zag components
- Drag-to-insert workflow

### Pickers (`studio/pickers/`)

Shared picker components:
- **ColorPicker**: Figma-style color selection
- **TokenPicker**: Token reference autocomplete
- **IconPicker**: Lucide/Material icon search
- **AnimationPicker**: Predefined animations

### Code Modification (`compiler/studio/code-modifier.ts`)

Text-based code modification:
- Updates properties at exact positions
- Adds/removes children
- Maintains formatting and indentation
- Uses SourceMap for position mapping

## Key Design Patterns

### Event-Driven Architecture

Components communicate through a typed event bus:
```typescript
events.emit('selection:changed', { nodeId: 'abc', origin: 'preview' })
events.on('selection:changed', ({ nodeId }) => updatePanel(nodeId))
```

### Command Pattern

All modifications go through commands for undo/redo:
```typescript
commandExecutor.execute(new UpdatePropertyCommand(nodeId, property, value))
commandExecutor.undo()
```

### SourceMap for Bidirectional Editing

The SourceMap enables visual editing:
1. User clicks element in preview
2. SourceMap finds corresponding source position
3. Editor scrolls to and highlights the code
4. PropertyPanel shows element properties

### Single Source of Truth

The DSL schema (`compiler/schema/dsl.ts`) defines:
- All property names and aliases
- Valid value types
- Primitives and their HTML mappings
- Zag components and their slots

## Data Flow

### Compilation Flow

```
Source → Lexer → Tokens → Parser → AST → IR → SourceMap
                                              ↓
                                          Backend
                                              ↓
                                       JavaScript/HTML
```

### Edit Flow

```
User Edit (code/visual)
        ↓
  CodeModifier
        ↓
  Source Update
        ↓
  Recompilation
        ↓
  State Update
        ↓
  Event Emission
        ↓
  UI Update (editor, preview, panels)
```

## Performance Considerations

- **Debounced compilation**: 100ms delay after edits
- **Incremental updates**: Only recompile changed sections
- **SourceMap caching**: Avoid recalculation on selection
- **Virtual scrolling**: Large component panels

## Testing Strategy

- **Unit tests**: Parser, IR transformations, backends
- **Integration tests**: Full compilation pipeline
- **E2E tests**: Visual editing workflows via Playwright

See `tests/compiler/strategie.md` for detailed test strategy.
