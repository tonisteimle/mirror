# Visual Layout Controls

Neue Elemente haben bereits Layout-Defaults die visuell per Maus angepasst werden.

## Vision

```
User erstellt: Box
                │
                ▼
System setzt:   Box ver gap 8 pad 16
                │
                ▼
Preview zeigt:  ┌──────────────────────┐
                │ ←──── pad 16 ────→   │
                │  ┌────────────────┐  │
                │  │    Child 1     │  │
                │  └────────────────┘  │
                │        ↕ gap 8       │
                │  ┌────────────────┐  │
                │  │    Child 2     │  │
                │  └────────────────┘  │
                └──────────────────────┘
                │
                ▼
Maus-Controls:  Drag Edges für Padding
                Drag zwischen Children für Gap
                Click Toggle für hor/ver
```

## Prinzip

**Jedes neue Element ist sofort "fertig"** - nicht leer, sondern mit sinnvollen Defaults die visuell anpassbar sind.

---

## Default-Sets nach Element-Typ

### Container (Box, View, etc.)

```mirror
Box ver gap 8 pad 16
```

**Visuelle Controls:**
```
┌─────────────────────────────────────┐
│  ↔  Padding-Handle (drag)           │
│ ┌───────────────────────────────┐   │
│ │                               │   │
│ │         Content Area          │ ↕ │
│ │                               │   │
│ └───────────────────────────────┘   │
│            ↕ Gap-Handle             │
│ ┌───────────────────────────────┐   │
│ │         Content Area          │   │
│ └───────────────────────────────┘   │
│                              [⇄][⇅] │ ← Layout Toggle
└─────────────────────────────────────┘
```

### Text

```mirror
Text "Placeholder" size 16
```

**Visuelle Controls:**
```
┌─────────────────────┐
│ Placeholder Text    │──→ Drag für Size
└─────────────────────┘
  │
  └─ Doppelklick: Inline Edit
```

### Button

```mirror
Button "Action" pad 12 24 rad 8
```

**Visuelle Controls:**
```
    ┌─────────────────┐
    │     Action      │
    └─────────────────┘
    │ ↑               │
    │ │ Corner-Drag   │
    │ │ für Radius    │
    └─┘               │
  ←───────────────────→
     Edge-Drag für Padding
```

### Image

```mirror
Image w 200 h 150 fit cover rad 8
```

**Visuelle Controls:**
```
┌─────────────────────┐
│                   ○─┼─ Corner: Radius
│      [Image]        │
│                     │
└──────────────────●──┘
                   │
                   └─ Resize Handle
```

---

## Interaktive Controls

### 1. Padding Handles

```
┌──────────────────────────────────────┐
│                                      │
│  ┌──────────────────────────────┐    │
│  │                              │    │
←──│           Content            │──→   Drag horizontal
│  │                              │    │
│  └──────────────────────────────┘    │
│                                      │
↑                                      ↓   Drag vertical
└──────────────────────────────────────┘

Drag Edge:      Ändert einzelne Seite (pad left 24)
Shift+Drag:     Ändert beide Seiten (pad 24 horizontal)
Cmd+Drag:       Ändert alle Seiten (pad 24)
```

### 2. Gap Handle

```
┌────────────────────┐
│      Child 1       │
└────────────────────┘
         ↕            ← Drag vertical für gap
    ═════════════     ← Visueller Indikator
         ↕
┌────────────────────┐
│      Child 2       │
└────────────────────┘

Drag:           Ändert gap (gap 16)
Snap:           Magnetisch zu 4, 8, 12, 16, 24, 32
```

### 3. Layout Toggle

```
┌────────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐       │
│ │    │ │    │ │    │ [⇄]   │ ← Click: hor
│ └────┘ └────┘ └────┘       │
└────────────────────────────┘
              ↓ Click
┌────────────────────────────┐
│ ┌────────────────────┐     │
│ │                    │     │
│ └────────────────────┘     │
│ ┌────────────────────┐[⇅]  │ ← Click: ver
│ │                    │     │
│ └────────────────────┘     │
└────────────────────────────┘
```

### 4. Radius Handle

```
     ╭──────────────────╮
     │                  │
○────│      Box         │
│    │                  │
│    ╰──────────────────╯
│
└─ Drag Corner: Radius ändern

Drag näher zur Ecke:  rad 4
Drag weiter weg:      rad 24
Shift+Drag:           rad full (Circle)
```

### 5. Size Handles

```
┌─────────────────────────●  ← Corner: Proportional
│                         │
│         Element         ●  ← Edge: Nur Breite
│                         │
└─────────────────────────┘
           ●
           │
           └─ Edge: Nur Höhe

Drag:           Pixel-Wert (w 200)
Alt+Drag:       Prozent (w 50%)
Double-Click:   Toggle full/auto
```

---

## Visual Feedback

### Hover State

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   Gestrichelte Outline
  ┌─────────────────────────┐
│ │       pad: 16           │ │  Wert-Label erscheint
  │   ┌───────────────┐     │
│ │   │    Content    │     │ │
  │   └───────────────┘     │
│ │         gap: 8          │ │  Wert-Label erscheint
  │   ┌───────────────┐     │
│ │   │    Content    │     │ │
  │   └───────────────┘     │
│ └─────────────────────────┘ │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

### Active Drag State

```
┌──────────────────────────────┐
│ ██████████████████████████████│← Farbige Fläche zeigt
│ ██       pad: 24          ██ │  Padding-Bereich
│ ██ ┌────────────────────┐ ██ │
│ ██ │                    │ ██ │
│ ██ │      Content       │ ██ │
│ ██ │                    │ ██ │
│ ██ └────────────────────┘ ██ │
│ ██████████████████████████████│
└──────────────────────────────┘
         ↑
         Live-Update beim Drag
```

### Snap Indicators

```
         │ 16px
         │
┌────────┼────────────────────┐
│        │                    │
│        │  Magnetische Linie │
│        │                    │
└────────┼────────────────────┘
         │
         │ Standard-Snap-Punkte:
         │ 4, 8, 12, 16, 24, 32, 48, 64
```

---

## Keyboard Modifiers

| Modifier | Effekt |
|----------|--------|
| `Shift` | Symmetrisch (beide Seiten) |
| `Cmd` | Alle Seiten |
| `Alt` | Prozent statt Pixel |
| `Ctrl` | Feiner Snap (1px statt 4px) |

## Keyboard Shortcuts

| Taste | Aktion |
|-------|--------|
| `H` | Toggle hor/ver |
| `P` | Focus Padding (Arrow Keys ändern) |
| `G` | Focus Gap (Arrow Keys ändern) |
| `R` | Focus Radius (Arrow Keys ändern) |
| `↑↓←→` | +/- 1px (mit Shift: 8px) |

---

## Code-Sync

### Bidirektional

```
┌─────────────────┐        ┌─────────────────┐
│  Visual Drag    │ ◄────► │  Code Update    │
│  pad: 16 → 24   │        │  pad 16 → pad 24│
└─────────────────┘        └─────────────────┘
         │                          │
         └──────────┬───────────────┘
                    │
                    ▼
            Live Preview Update
```

### Debouncing

```typescript
// Während Drag: Nur Preview updaten
// Nach Drag-End: Code schreiben

let dragTimeout: number

function onDrag(property: string, value: number) {
  updatePreviewOnly(property, value)

  clearTimeout(dragTimeout)
  dragTimeout = setTimeout(() => {
    commitToCode(property, value)
  }, 100)
}
```

---

## Technische Implementierung

### Overlay-Architektur

```
┌─────────────────────────────────────┐
│           Preview Layer             │  z-index: 1
│  ┌─────────────────────────────┐    │
│  │        Actual UI            │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│          Control Layer             │  z-index: 2
│  ○───────────────────────────────○  │  Handles
│  │                               │  │
│  │     Invisible Drag Zones      │  │
│  │                               │  │
│  ○───────────────────────────────○  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│         Feedback Layer             │  z-index: 3
│                                     │
│  [pad: 24]   [gap: 16]              │  Labels
│                                     │
└─────────────────────────────────────┘
```

### Komponenten-Struktur

```
studio/
├── preview/
│   └── visual-controls/
│       ├── ControlOverlay.ts       # Container für alle Controls
│       ├── PaddingHandles.ts       # Padding-Manipulation
│       ├── GapHandle.ts            # Gap zwischen Children
│       ├── LayoutToggle.ts         # hor/ver Switch
│       ├── RadiusHandle.ts         # Border-Radius
│       ├── SizeHandles.ts          # Width/Height
│       ├── SnapEngine.ts           # Magnetisches Snapping
│       ├── FeedbackLayer.ts        # Labels, Highlights
│       └── KeyboardHandler.ts      # Keyboard Modifiers
```

### State

```typescript
interface VisualControlState {
  selectedElement: string | null
  activeControl: 'padding' | 'gap' | 'radius' | 'size' | null
  dragStart: { x: number; y: number } | null
  currentValue: number
  previewValue: number  // Während Drag
  modifier: {
    shift: boolean
    cmd: boolean
    alt: boolean
  }
}
```

### Handle Detection

```typescript
function getHandleAtPoint(x: number, y: number, element: Element): Handle | null {
  const rect = element.getBoundingClientRect()
  const threshold = 10 // px

  // Check corners first (higher priority)
  if (isNearCorner(x, y, rect, threshold)) {
    return { type: 'radius', corner: getCorner(x, y, rect) }
  }

  // Check edges
  if (isNearEdge(x, y, rect, threshold)) {
    return { type: 'padding', edge: getEdge(x, y, rect) }
  }

  // Check gap zones (between children)
  const gapZone = findGapZone(x, y, element)
  if (gapZone) {
    return { type: 'gap', index: gapZone.index }
  }

  return null
}
```

---

## Default-Werte

### Nach Element-Typ

```typescript
const ELEMENT_DEFAULTS: Record<string, Properties> = {
  Box: {
    layout: 'ver',
    gap: 8,
    padding: 16,
  },
  Card: {
    layout: 'ver',
    gap: 12,
    padding: 16,
    radius: 12,
    bg: 'white',
    shadow: 'sm',
  },
  Button: {
    padding: [12, 24],  // y, x
    radius: 8,
  },
  Input: {
    padding: [12, 16],
    radius: 8,
    border: '1 $border',
    width: 'full',
  },
  Header: {
    layout: 'hor',
    spread: true,
    padding: [0, 16],
    height: 60,
  },
  // ...
}
```

### Smart Inference

```typescript
function inferDefaults(elementName: string, context: Context): Properties {
  // 1. Check explicit defaults
  if (ELEMENT_DEFAULTS[elementName]) {
    return ELEMENT_DEFAULTS[elementName]
  }

  // 2. Infer from name
  if (elementName.endsWith('List')) {
    return { layout: 'ver', gap: 8 }
  }
  if (elementName.endsWith('Row')) {
    return { layout: 'hor', gap: 8 }
  }
  if (elementName.endsWith('Grid')) {
    return { layout: 'grid', cols: 3, gap: 16 }
  }

  // 3. Infer from context
  if (context.parent?.layout === 'hor') {
    return { layout: 'ver' } // Alternate
  }

  // 4. Generic fallback
  return { layout: 'ver', gap: 8, padding: 16 }
}
```

---

## Implementierungs-Roadmap

### Phase 1: Core Handles (2 Wochen)
- [ ] Control Overlay System
- [ ] Padding Handles (drag edges)
- [ ] Gap Handle (drag between children)
- [ ] Visual Feedback (labels, highlights)
- [ ] Code Sync

### Phase 2: Advanced Controls (1-2 Wochen)
- [ ] Layout Toggle Button
- [ ] Radius Handles (corners)
- [ ] Size Handles (edges/corners)

### Phase 3: Polish (1 Woche)
- [ ] Snap Engine (magnetisch)
- [ ] Keyboard Modifiers (Shift, Cmd, Alt)
- [ ] Keyboard Shortcuts (H, P, G, R)

### Phase 4: Smart Defaults (1 Woche)
- [ ] Element-Type Defaults
- [ ] Name-based Inference
- [ ] Context-based Inference

---

## Zusammenspiel mit anderen Features

### + Direct Manipulation
Visual Layout Controls sind Teil der Direct Manipulation Vision.

### + Smart Defaults
Defaults kommen aus dem Smart Defaults System.

### + Live AI Copilot
AI kann Defaults vorschlagen, Controls ermöglichen Feintuning.

### + Structure First
Nach Struktur-Phase: Visual Controls für Layout-Tuning.

---

## Beispiel-Workflow

```
1. User tippt: ProfileCard
                    │
2. System:          │ Smart Defaults
                    ▼
   ProfileCard ver gap 12 pad 16 rad 12 bg white shadow

3. Preview zeigt mit Controls:
   ┌─────────────────────────────┐
   │  ○                       ○  │ ← Radius Handles
   │  ┌───────────────────────┐  │
   │  │       Avatar          │  │
   │  └───────────────────────┘  │
   │           ↕ gap             │ ← Gap Handle
   │  ┌───────────────────────┐  │
   │  │        Name           │  │
   │  └───────────────────────┘  │
   │  ○                       ○  │
   └─────────────────────────────┘
     ↔ Padding Handles

4. User dragt Gap-Handle:  gap 12 → gap 16
5. User dragt Radius:      rad 12 → rad 8
6. User clickt Layout:     ver → hor (für Avatar neben Name)

7. Finaler Code:
   ProfileCard hor gap 16 pad 16 rad 8 bg white shadow
```

**Zeit: ~10 Sekunden für perfektes Layout.**
