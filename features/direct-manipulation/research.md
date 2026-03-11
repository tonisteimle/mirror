# Direct Manipulation - Research

Analyse von Libraries, innovativen Ansätzen und Flex-Layout-Herausforderungen.

---

## 1. Libraries

### Tier 1: Spezialisiert für Visual Editors

| Library | Downloads/Woche | Stärken | Schwächen |
|---------|-----------------|---------|-----------|
| **[Moveable](https://github.com/daybrush/moveable)** | 115k | Resize, Rotate, Warp, Snapping, Grouping | Komplex, viele Features |
| **[interact.js](https://interactjs.io/)** | 443k | Leichtgewichtig, DOM-agnostisch, Inertia | Kein UI, nur Events |
| **[Konva](https://konvajs.org/)** | 200k+ | Canvas-basiert, React/Vue Support | Nicht für DOM-Manipulation |

### Tier 2: Drag & Drop fokussiert

| Library | Fokus | Gut für |
|---------|-------|---------|
| **[dnd-kit](https://dndkit.com/)** | Modern React DnD | Sortable Lists, Nested |
| **[SortableJS](https://sortablejs.github.io/Sortable/)** | Sorting | Reorder, Multi-Container |
| **[Gridstack.js](https://gridstackjs.com/)** | Dashboard Layouts | Resizable Grid Items |

### Tier 3: Full Frameworks

| Framework | Beschreibung |
|-----------|--------------|
| **[Craft.js](https://craft.js.org/)** | React Page Builder Framework |
| **[GrapesJS](https://grapesjs.com/)** | Web Builder Framework |
| **[Builder.io](https://www.builder.io/)** | Visual CMS/Editor |

### Empfehlung für Mirror

```
interact.js (Events) + Custom Overlay (UI) + Mirror Runtime (Sync)
```

**Warum interact.js:**
- DOM-agnostisch: "The library doesn't even do any moving at all!"
- Wir entscheiden, was passiert (Update Mirror Code, nicht DOM)
- Snapping, Inertia, Multi-Touch eingebaut
- 443k Downloads, battle-tested

**Alternative: Moveable**
- Mehr out-of-the-box UI
- Gruppierung von Elementen
- Aber: Mehr Overhead, weniger Kontrolle

---

## 2. Innovative Ansätze

### 2.1 Figma's Dual-Mode Paradigma

Figma unterscheidet klar:

| Modus | Verhalten | Anwendung |
|-------|-----------|-----------|
| **Constraints** | Objekt → Frame | Absolute Positionierung |
| **Auto Layout** | Frame → Objekte | Flexbox-ähnlich |

**Key Insight:**
> "You can't apply constraints to child objects in an auto layout frame"

Das heißt: Entweder absolut ODER relativ, nie gemischt (außer "Ignore auto layout").

**Für Mirror:**
```mirror
// Absolute (constraints)
Box w 400 h 300
  Button abs top 20 right 20    // absolute positioning

// Relative (auto layout)
Box ver gap 16
  Button                        // flow positioning
  Button
```

### 2.2 Webflow's Constraint Visualization

[Webflow](https://webflow.com) zeigt während Drag:

```
┌─────────────────────────────────┐
│                                 │
│   ┌─────────┐                   │
│   │ Element │←── 24px ──→│      │
│   └─────────┘                   │
│        ↑                        │
│       16px                      │
│        ↓                        │
└─────────────────────────────────┘
      Live Constraint-Anzeige
```

### 2.3 Framer's Code-Sync

> "You can clearly see how your manipulation affects the code"

Framer zeigt Code-Änderungen in Echtzeit während Manipulation:

```
┌────────────────────┬────────────────────┐
│      Preview       │       Code         │
│                    │                    │
│  [Dragging...]     │  padding: 16       │
│                    │  padding: 17  ←─┐  │
│                    │  padding: 18    │  │
│                    │  padding: 19    │  │
│                    │                 │  │
│                    │    Live Update ─┘  │
└────────────────────┴────────────────────┘
```

### 2.4 Constraint-Based Direct Manipulation

**Revolutionärer Ansatz:** Nicht Position manipulieren, sondern Constraints.

```
Traditionell:               Constraint-Based:
─────────────               ─────────────────
Drag Box →                  Drag Constraint-Handle →
  x: 100 → 150                margin-left: 20 → 50

Position ändert sich,       Regel ändert sich,
aber keine Semantik         Layout bleibt konsistent
```

**Beispiel:**

```
┌─────────────────────────────────────────┐
│                                         │
│  ○────────────────────────○             │
│  │        Header          │             │
│  ○────────────────────────○             │
│            ↕ gap: 16                    │
│  ┌────────────────────────┐             │
│  │        Content         │             │
│  └────────────────────────┘             │
│                                         │
└─────────────────────────────────────────┘

Drag auf Gap-Bereich → Ändert gap-Property, nicht Position
```

---

## 3. Flex Layout Herausforderungen

### Das Problem

In Flex-Layouts haben Elemente keine feste Position:

```
┌────────────────────────────────────────┐
│  [A]  [B]  [C]                         │  justify: start
│                                        │
│  [A]      [B]      [C]                 │  justify: space-between
│                                        │
│        [A]  [B]  [C]                   │  justify: center
└────────────────────────────────────────┘

Gleiche Elemente, verschiedene Positionen
→ Was passiert wenn ich [B] nach rechts ziehe?
```

### Lösungsansätze

#### Ansatz 1: Property-Manipulation statt Position

**Nicht:** "Wo ist das Element?"
**Sondern:** "Welche Properties beeinflussen das Element?"

```
Flex Container (hor spread)
├── A (flex: 0)
├── B (flex: 1)  ← User zieht B breiter
└── C (flex: 0)

Resultat: B flex: 1 → flex: 2
Nicht: B width: 100 → 200
```

#### Ansatz 2: Semantic Handles

Zeige Handles für das, was man ändern KANN:

```
┌───────────────────────────────────────────────────┐
│                                                   │
│  ┌──────┐   ↔   ┌──────┐   ↔   ┌──────┐          │
│  │  A   │ gap   │  B   │ gap   │  C   │   ←flex  │
│  └──────┘       └──────┘       └──────┘          │
│      │              │              │              │
│      ▼              ▼              ▼              │
│   (keine)        flex:1→       (keine)            │
│                                                   │
│  ════════════════════════════════════════         │
│              ↑ Container Gap Handle               │
└───────────────────────────────────────────────────┘

Handles zeigen, WAS änderbar ist:
- Gap zwischen Items
- Flex-Grow für flexible Items
- Alignment für Container
```

#### Ansatz 3: Mode-Switch

Verschiedene Modi für verschiedene Manipulationen:

```
[Layout Mode]     → Gap, Alignment, Direction
[Size Mode]       → Width, Height, Flex
[Position Mode]   → Nur für absolute Elemente
[Spacing Mode]    → Padding, Margin
```

#### Ansatz 4: Intelligente Interpretation

System interpretiert Drag-Intention:

```typescript
function interpretDrag(element: Element, delta: Vector): PropertyChange[] {
  const parent = element.parentElement
  const layout = getLayout(parent)

  if (layout === 'flex-row') {
    // Horizontal drag in row = might mean:
    // 1. Change gap (if near edge)
    // 2. Change flex-grow (if in middle)
    // 3. Reorder (if dragged past sibling)

    if (isNearLeftEdge(delta)) {
      return [{ property: 'margin-left', delta: delta.x }]
    }
    if (isNearRightEdge(delta)) {
      return [{ property: 'flex-grow', delta: delta.x / 100 }]
    }
    if (isPastSibling(element, delta)) {
      return [{ type: 'reorder', newIndex: calculateNewIndex(element, delta) }]
    }
  }

  // Vertical drag in row = probably alignment change
  if (layout === 'flex-row' && Math.abs(delta.y) > Math.abs(delta.x)) {
    return [{ property: 'align-self', value: inferAlignment(delta.y) }]
  }
}
```

#### Ansatz 5: Visual Affordances

Zeige visuell, was passieren WIRD:

```
VORHER (hovering gap area):
┌─────────────────────────────────────┐
│  [A]  │ ← Hover │  [B]              │
│       ▓▓▓▓▓▓▓▓▓▓                    │
│       Gap Zone highlighted          │
└─────────────────────────────────────┘

WÄHREND DRAG:
┌─────────────────────────────────────┐
│  [A]  │←───────────→│  [B]          │
│       │   gap: 48    │              │
│       │  (was: 16)   │              │
└─────────────────────────────────────┘

ALTERNATIVE WÄHREND DRAG:
┌─────────────────────────────────────┐
│  Preview: gap 48                     │
│  ───────────────                     │
│  [A]            [B]                  │
│       ↑ Ghost Preview               │
└─────────────────────────────────────┘
```

---

## 4. Mirror-Spezifische Lösung

### Konzept: "Semantic Direct Manipulation"

Mirror kennt die Semantik des Codes. Wir nutzen das.

```mirror
Header hor spread pad 16 h 60
  Logo w 120
  Nav hor gap 16
    Link "Home"
    Link "About"
  Button "Login"
```

**Was ist manipulierbar?**

| Element | Manipulierbar | Handles |
|---------|---------------|---------|
| Header | padding, height, gap* | Edges, Bottom |
| Logo | width, height | Right edge |
| Nav | gap | Between children |
| Links | - (Text only) | None |
| Button | padding | Edges |

*gap nur wenn Children > 1

### Visual Overlay System

```typescript
interface ManipulationOverlay {
  // Für jedes selektierte Element
  element: MirrorElement

  handles: {
    // Edges für Padding/Size
    edges: EdgeHandle[]

    // Corners für Radius
    corners: CornerHandle[]

    // Between children für Gap
    gaps: GapHandle[]

    // Special für Layout
    layout?: LayoutToggle
  }

  // Live feedback
  feedback: {
    currentProperty: string
    currentValue: string
    previewValue: string
  }
}
```

### Interaction Flow

```
1. SELECT Element
   └→ Overlay erscheint mit relevanten Handles

2. HOVER Handle
   └→ Tooltip zeigt aktuelle Property + Wert
   └→ Cursor ändert sich (resize, ew-resize, etc.)

3. DRAG Handle
   └→ Live Preview im Preview-Panel
   └→ Ghost-Value im Code-Editor
   └→ Snapping zu sinnvollen Werten (8, 16, 24...)

4. RELEASE
   └→ Code wird geschrieben
   └→ Undo-Step erstellt
   └→ Overlay aktualisiert

5. KEYBOARD während Drag
   └→ Shift: Constrain to axis / larger steps
   └→ Alt: Disable snapping
   └→ Cmd: Apply to all sides
```

### Edge Cases

#### Verschachtelte Flex

```mirror
Row hor gap 16              // Outer flex
  Column ver gap 8          // Inner flex
    Item
    Item
  Column ver gap 8
    Item
    Item
```

**Lösung:** Tiefste Selektion gewinnt, aber Parent-Handles sind als "secondary" sichtbar:

```
┌─────────────────────────────────────────┐
│ Row (hor gap 16)              ○ ○ ○ ○   │  ← Faded handles
│ ┌───────────────┐ ┌───────────────┐     │
│ │ Column        │ │ Column        │     │
│ │ ┌───────────┐ │ │ ┌───────────┐ │     │
│ │ │ Item ◉────┼─┤ │ │ Item      │ │     │  ← Selected
│ │ └───────────┘ │ │ └───────────┘ │     │
│ │       ↕8      │ │       ↕8      │     │
│ │ ┌───────────┐ │ │ ┌───────────┐ │     │
│ │ │ Item      │ │ │ │ Item      │ │     │
│ │ └───────────┘ │ │ └───────────┘ │     │
│ └───────────────┘ └───────────────┘     │
│         ↔ 16 (Row gap)                  │  ← Clickable but faded
└─────────────────────────────────────────┘
```

#### Dynamische Größen (flex-grow)

```mirror
Row hor
  Sidebar w 200        // Fixed
  Content grow         // Flexible
  Panel w 300          // Fixed
```

**Lösung:** Content zeigt keinen Width-Handle, sondern "grow indicator":

```
┌────────────────────────────────────────────────────┐
│ ┌──────┐  ┌──────────────────────────┐  ┌───────┐ │
│ │ 200  │  │         grow             │  │  300  │ │
│ │ ←──→ │  │ ════════════════════════ │  │ ←───→ │ │
│ │      │  │ ^ Flex indicator         │  │       │ │
│ └──────┘  └──────────────────────────┘  └───────┘ │
│   ↔              (no width handle)          ↔     │
└────────────────────────────────────────────────────┘
```

Drag auf grow-Element → ändert flex-grow-Wert (1, 2, 3...) oder konvertiert zu fixed width.

---

## 5. Implementation Roadmap

### Phase 1: Foundation (2 Wochen)

```
- [ ] interact.js Integration
- [ ] Overlay Rendering System
- [ ] Handle Detection (welcher Handle unter Cursor?)
- [ ] Basic Drag → Property Update
- [ ] Preview Sync während Drag
```

### Phase 2: Property Handlers (2 Wochen)

```
- [ ] Padding Handles (all edges)
- [ ] Size Handles (width, height)
- [ ] Gap Handle (between children)
- [ ] Radius Handles (corners)
```

### Phase 3: Flex Support (2 Wochen)

```
- [ ] Layout Detection (hor/ver/grid)
- [ ] Semantic Handle Placement
- [ ] Flex-Grow Manipulation
- [ ] Reorder via Drag
```

### Phase 4: Polish (1 Woche)

```
- [ ] Snapping System
- [ ] Keyboard Modifiers
- [ ] Visual Feedback (ghosts, guides)
- [ ] Multi-Select Support
```

---

## 6. Zusammenfassung

### Key Decisions

1. **Library:** interact.js für Events, Custom für UI
2. **Philosophy:** Semantic manipulation (Properties, nicht Pixel)
3. **Flex Handling:** Contextual handles basierend auf Layout-Typ
4. **Feedback:** Live Preview + Code-Sync + Visual Guides

### Innovation

Mirror's Vorteil: Wir kennen die DSL-Semantik.

```
Andere Tools:           Mirror:
─────────────           ───────
CSS Properties          Mirror Properties
↓                       ↓
Unknown structure       Known structure (AST)
↓                       ↓
Generic manipulation    Semantic manipulation
```

Wir manipulieren nicht "CSS", sondern "Mirror Code" - und können daher intelligentere Handles und Feedback bieten.

---

## Sources

- [interact.js](https://interactjs.io/) - Drag, resize, gestures
- [Moveable](https://github.com/daybrush/moveable) - All-in-one manipulation
- [Konva](https://konvajs.org/) - Canvas 2D library
- [Webflow Flexbox](https://flexbox.webflow.com/) - Visual CSS builder
- [Figma Auto Layout Guide](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout)
- [Framer Innovation](https://designerfund.medium.com/design-everything-a456eadd6e90)
- [npm trends comparison](https://npmtrends.com/interact.js-vs-interactjs-vs-movable-vs-moveable)
