# Structure First

Schnelles Scaffolding der UI-Hierarchie vor dem Styling.

## Problem

Beim UI-Prototyping ist der erste Schritt immer:
1. **Struktur** - Was enthält was?
2. **Layout** - Horizontal oder vertikal?
3. **Dimensionen** - Wie groß?
4. **Spacing** - Welche Abstände?

Erst danach kommen Farben, Fonts, Details.

**Aktuell:** Alles gleichzeitig definieren → Mental overhead.

**Ziel:** Struktur in Sekunden, Details später.

---

## Ansätze

### 1. Outline Mode

Wie ein Dokument-Outliner. Einrückung = Verschachtelung.

```
App
  Header
    Logo
    Nav
  Main
    Sidebar
    Content
      Card
      Card
      Card
  Footer
```

**Interaktion:**
- `Enter` → Neues Element (Sibling)
- `Tab` → Einrücken (Child)
- `Shift+Tab` → Ausrücken (Parent level)
- `Up/Down` → Navigieren
- `Space` → Layout toggle (hor/ver)

**Live Preview:**
```
┌─────────────────────────────────┐
│ Header: [Logo] [Nav]            │
├─────────┬───────────────────────┤
│ Sidebar │ Card  Card  Card      │
│         │                       │
├─────────┴───────────────────────┤
│ Footer                          │
└─────────────────────────────────┘
```

---

### 2. Box Sketch Mode

Zeichnen mit Tastatur oder Maus.

```
┌──────────────────────────────┐
│ ┌────────────────────────┐   │
│ │        Header          │   │
│ └────────────────────────┘   │
│ ┌──────┐ ┌───────────────┐   │
│ │ Side │ │    Content    │   │
│ │      │ │               │   │
│ └──────┘ └───────────────┘   │
└──────────────────────────────┘
```

**Konvertiert zu:**
```mirror
App ver
  Header w full
  Box hor
    Sidebar w 200
    Content w full
```

**Tools:**
- Rechteck-Tool für Container
- Drag für Größe
- Drop in andere Boxen für Nesting

---

### 3. Quick Structure Syntax

Minimal-Syntax nur für Struktur:

```
// Struktur-Modus (kein Styling)
App [
  Header [Logo | Nav]
  Main [
    Sidebar
    Content [Card Card Card]
  ]
  Footer
]

// Legende:
// [ ] = Container (ver default)
// |   = Horizontal trennung
// Leerzeichen = Sibling
```

**Expandiert zu vollständigem Code:**
```mirror
App ver
  Header hor spread
    Logo
    Nav
  Main hor
    Sidebar
    Content ver gap 16
      Card
      Card
      Card
  Footer
```

---

### 4. Dimension Shortcuts

Schnelle Größen-Definition:

```
App
  Header h:60
  Main h:full [
    Sidebar w:200
    Content w:full
  ]
  Footer h:auto
```

**Shortcuts:**
| Input | Bedeutung |
|-------|-----------|
| `w:200` | width 200px |
| `w:full` | width 100% |
| `w:1/3` | width 33% |
| `h:auto` | height auto |
| `h:full` | height 100% |
| `p:16` | padding 16 |
| `g:8` | gap 8 |

---

### 5. Template Blocks

Vordefinierte Struktur-Patterns:

```
┌─────────────────────────────────────┐
│ Structure Templates                 │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────┐  ┌─────────┐            │
│ │ Holy    │  │ Sidebar │            │
│ │ Grail   │  │ Layout  │            │
│ └─────────┘  └─────────┘            │
│                                     │
│ ┌─────────┐  ┌─────────┐            │
│ │ Card    │  │ Split   │            │
│ │ Grid    │  │ View    │            │
│ └─────────┘  └─────────┘            │
│                                     │
│ ┌─────────┐  ┌─────────┐            │
│ │ Header  │  │ Modal   │            │
│ │ + List  │  │ Dialog  │            │
│ └─────────┘  └─────────┘            │
│                                     │
└─────────────────────────────────────┘
```

**Holy Grail:**
```mirror
Page ver h full
  Header h 60
  Main hor h full
    Sidebar w 240
    Content w full
    Aside w 200
  Footer h 60
```

**Card Grid:**
```mirror
Grid cols 3 gap 16
  Card
  Card
  Card
  Card
  Card
  Card
```

---

### 6. Structure Panel

Dediziertes Panel für Hierarchie-Management:

```
┌─────────────────────────────────────┐
│ Structure                      [+]  │
├─────────────────────────────────────┤
│                                     │
│ ▼ App                    ver  full  │
│   ▼ Header               hor  h:60  │
│       Logo                          │
│       Nav                           │
│   ▼ Main                 hor  full  │
│     ► Sidebar            ver  w:200 │
│     ▼ Content            ver  full  │
│         Card                        │
│         Card                        │
│         Card                        │
│   ► Footer               hor  h:60  │
│                                     │
├─────────────────────────────────────┤
│ Quick Actions:                      │
│ [Wrap] [Unwrap] [Hor] [Ver] [Grid]  │
└─────────────────────────────────────┘
```

**Interaktionen:**
- Drag & Drop für Reorder
- Inline-Editing für Namen
- Toggle hor/ver direkt
- Dimensionen inline ändern

---

## Empfohlene Kombination

### Primary: Outline Mode + Shortcuts

```
┌─────────────────────┬───────────────────────┐
│ Structure Editor    │ Live Preview          │
├─────────────────────┼───────────────────────┤
│                     │                       │
│ App                 │ ┌─────────────────┐   │
│   Header h:60 hor   │ │ Header          │   │
│     Logo            │ ├────────┬────────┤   │
│     Nav             │ │Sidebar │Content │   │
│   Main hor          │ │        │        │   │
│     Sidebar w:200   │ │        │        │   │
│     Content         │ ├────────┴────────┤   │
│       Card          │ │ Footer          │   │
│       Card          │ └─────────────────┘   │
│   Footer h:60       │                       │
│                     │                       │
├─────────────────────┴───────────────────────┤
│ [Tab] Nest  [Space] Layout  [Enter] New     │
└─────────────────────────────────────────────┘
```

### Workflow

```
1. STRUKTUR (Outline Mode)
   - Elemente anlegen
   - Hierarchie durch Einrückung
   - ~30 Sekunden

2. LAYOUT (Space to toggle)
   - hor/ver pro Container
   - ~10 Sekunden

3. DIMENSIONEN (Inline shortcuts)
   - w:, h:, p:, g:
   - ~20 Sekunden

4. EXPAND (Cmd+E)
   - Generiert vollständigen Mirror-Code
   - Wechsel in normalen Editor

5. STYLE (Property Panel)
   - Farben, Fonts, Details
   - So lange wie nötig
```

---

## Technische Implementierung

### Outline Parser

```typescript
interface OutlineNode {
  name: string
  layout?: 'hor' | 'ver' | 'grid'
  dimensions?: {
    w?: string
    h?: string
    p?: string
    g?: string
  }
  children: OutlineNode[]
  indent: number
}

function parseOutline(text: string): OutlineNode[] {
  const lines = text.split('\n')
  const root: OutlineNode[] = []
  const stack: { node: OutlineNode; indent: number }[] = []

  for (const line of lines) {
    const indent = line.search(/\S/)
    const content = line.trim()
    if (!content) continue

    const node = parseOutlineNode(content)
    node.indent = indent

    // Find parent based on indent
    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (stack.length) {
      stack[stack.length - 1].node.children.push(node)
    } else {
      root.push(node)
    }

    stack.push({ node, indent })
  }

  return root
}

function parseOutlineNode(content: string): OutlineNode {
  // Parse: "Header h:60 hor"
  const parts = content.split(/\s+/)
  const name = parts[0]
  const node: OutlineNode = { name, children: [], indent: 0 }

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    if (part === 'hor' || part === 'ver' || part === 'grid') {
      node.layout = part
    } else if (part.includes(':')) {
      const [key, value] = part.split(':')
      node.dimensions = node.dimensions || {}
      node.dimensions[key as keyof typeof node.dimensions] = value
    }
  }

  return node
}
```

### Code Generator

```typescript
function generateMirrorCode(nodes: OutlineNode[], indent = 0): string {
  const spaces = '  '.repeat(indent)
  let code = ''

  for (const node of nodes) {
    code += spaces + node.name

    // Layout
    if (node.layout) {
      code += ' ' + node.layout
    }

    // Dimensions
    if (node.dimensions) {
      if (node.dimensions.w) code += ` w ${expandDimension(node.dimensions.w)}`
      if (node.dimensions.h) code += ` h ${expandDimension(node.dimensions.h)}`
      if (node.dimensions.p) code += ` pad ${node.dimensions.p}`
      if (node.dimensions.g) code += ` gap ${node.dimensions.g}`
    }

    code += '\n'

    // Children
    if (node.children.length) {
      code += generateMirrorCode(node.children, indent + 1)
    }
  }

  return code
}

function expandDimension(dim: string): string {
  if (dim === 'full') return 'full'
  if (dim.includes('/')) {
    const [num, denom] = dim.split('/')
    return `${Math.round(100 * parseInt(num) / parseInt(denom))}%`
  }
  return dim
}
```

### Keyboard Handler

```typescript
const outlineKeymap = {
  'Enter': () => insertSibling(),
  'Tab': () => indentNode(),
  'Shift-Tab': () => outdentNode(),
  'Space': () => toggleLayout(),
  'ArrowUp': () => moveFocus(-1),
  'ArrowDown': () => moveFocus(1),
  'Alt-ArrowUp': () => moveNode(-1),
  'Alt-ArrowDown': () => moveNode(1),
  'Cmd-E': () => expandToFullCode(),
  'Cmd-D': () => duplicateNode(),
  'Backspace': () => deleteNode(),
}
```

---

## UI Modes

### Mode Toggle

```
┌───────────────────────────────────┐
│ [Structure] [Code] [Preview]      │  ← Mode Tabs
├───────────────────────────────────┤
│                                   │
│   Editor content based on mode    │
│                                   │
└───────────────────────────────────┘
```

| Mode | Fokus | Editor |
|------|-------|--------|
| **Structure** | Hierarchie, Layout | Outline Editor |
| **Code** | Vollständige Syntax | CodeMirror |
| **Preview** | Visual | Direct Manipulation |

### Seamless Transition

```
Structure Mode:
  App
    Header hor
    Main hor
      Sidebar
      Content

      ↓ Cmd+E (Expand)

Code Mode:
  App ver
    Header hor spread
      // Add components here
    Main hor gap 16
      Sidebar w 240
      Content w full
```

---

## Smart Defaults in Structure Mode

Basierend auf Namen automatische Defaults:

| Name | Auto-Layout | Auto-Dimension |
|------|-------------|----------------|
| Header | hor spread | h 60, w full |
| Footer | hor | h 60, w full |
| Sidebar | ver | w 240 |
| Content | ver | w full |
| Nav | hor | gap 16 |
| Card | ver | pad 16 |
| Grid | grid cols 3 | gap 16 |
| List | ver | gap 8 |
| Form | ver | gap 16 |
| Modal | ver | w 400, pad 24 |

---

## Implementierungs-Roadmap

### Phase 1: Outline Parser + Generator (1 Woche)
- [ ] Outline Syntax Parser
- [ ] Dimension Shortcuts (w:, h:, p:, g:)
- [ ] Code Generator
- [ ] Basic Keyboard Navigation

### Phase 2: Structure Editor UI (1-2 Wochen)
- [ ] Outline Editor Komponente
- [ ] Live Preview Sync
- [ ] Keyboard Shortcuts (Tab, Space, Enter)
- [ ] Drag & Drop Reorder

### Phase 3: Smart Defaults (1 Woche)
- [ ] Name-based Auto-Layout
- [ ] Name-based Auto-Dimensions
- [ ] Override UI

### Phase 4: Templates (1 Woche)
- [ ] Template Gallery
- [ ] Insert Template
- [ ] Save as Template

### Phase 5: Integration (1 Woche)
- [ ] Mode Toggle (Structure/Code/Preview)
- [ ] Seamless Transition
- [ ] Undo/Redo

---

## Vergleich mit Alternativen

| Feature | Mirror Structure | Figma Auto Layout | HTML/CSS |
|---------|------------------|-------------------|----------|
| Hierarchie | Einrückung | Frame nesting | Tag nesting |
| Layout | Space toggle | Panel click | CSS property |
| Dimensionen | Inline shortcuts | Panel | CSS property |
| Lernkurve | Minimal | Niedrig | Hoch |
| Speed | Sehr schnell | Schnell | Langsam |

---

## Offene Fragen

1. **Separater Mode oder Overlay?** Structure Mode vs. immer verfügbar
2. **Grid Support?** `grid cols:3` Syntax?
3. **Responsive?** Breakpoints in Structure Mode?
4. **Import?** Figma Frame Hierarchie importieren?
