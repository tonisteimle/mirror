# Grid Positioning - Konzept

User definiert ein Page-Level Grid. Beim Verschieben von Elementen erkennt das System automatisch welche Grid-Position gemeint ist.

---

## Vision

Designer arbeiten mit Grids wie in Figma: Ein Raster über die ganze Seite, das als Guide dient. Elemente werden auf diesem Grid platziert und können mehrere Spalten spannen.

**Das Grid ist kein CSS-Konstrukt** - es ist ein visueller Guide der sauberen Code generiert.

---

## Page-Level Grid vs Container Grid

### Das Designer-Paradigma (NEU)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Margin                                                            Margin │
│   ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐                                 │
│   │1 │2 │3 │4 │5 │6 │7 │8 │9 │10│11│12│   ← Faint grid lines            │
│   │  │  │  │  │  │  │  │  │  │  │  │  │     always visible               │
│   │  │  │  │  │  │  │  │  │  │  │  │  │                                  │
│   │  │  │  │  │  │  │  │  │  │  │  │  │                                  │
│   │  │  │  │  │  │  │  │  │  │  │  │  │                                  │
│   │  │  │  │  │  │  │  │  │  │  │  │  │                                  │
│   │  │  │  │  │  │  │  │  │  │  │  │  │                                  │
│   └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘                                  │
│ Margin                                                            Margin │
└──────────────────────────────────────────────────────────────────────────┘
```

**Wichtige Unterschiede:**

| Aspekt | Container Grid | Page Grid (Designer) |
|--------|----------------|---------------------|
| Scope | Pro Container | Über ganze Seite |
| Definition | Im Code (`App grid 12`) | Global/Einmalig |
| Sichtbarkeit | Optional | Immer sichtbar (faint) |
| CSS Output | `display: grid` | Kann verschieden sein |
| Elemente | Grid-Children | Unabhängig positioniert |

---

## Grid Definition

### In Mirror Studio

User definiert das Page Grid über Settings:

```
┌────────────────────────────────────────┐
│ Page Grid Settings                     │
├────────────────────────────────────────┤
│                                        │
│ Columns:    [12    ]                   │
│ Gap:        [16 px ]                   │
│ Margin:     [24 px ]                   │
│                                        │
│ [x] Show grid lines                    │
│ [x] Snap to grid                       │
│                                        │
└────────────────────────────────────────┘
```

### Oder im Code (Optional)

```mirror
// Page-Level Grid Definition
@grid 12, gap 16, margin 24

// Rest des Codes
App
  Header
  Content
  Footer
```

---

## Wie Designer mit Grids arbeiten

### Schritt 1: Grid ist immer da

Das Grid liegt über der gesamten Seite als feine Hintergrundlinien:

```
┌──────────────────────────────────────────────────────────────────────────┐
│      │      │      │      │      │      │      │      │      │          │
│      │      │      │      │      │      │      │      │      │          │
│   ┌──────────────────────────────────────────────────────────────┐      │
│   │                         Header                                │      │
│   └──────────────────────────────────────────────────────────────┘      │
│      │      │      │      │      │      │      │      │      │          │
│      │      │      │      │      │      │      │      │      │          │
│   ┌────────────┐   │      │   ┌──────────────────────────────┐  │      │
│   │            │   │      │   │                              │  │      │
│   │  Sidebar   │   │      │   │         Content              │  │      │
│   │            │   │      │   │                              │  │      │
│   └────────────┘   │      │   └──────────────────────────────┘  │      │
│      │      │      │      │      │      │      │      │      │          │
└──────────────────────────────────────────────────────────────────────────┘
       ↑                                                     ↑
       Grid lines (semi-transparent, always visible)
```

### Schritt 2: Elemente platzieren

User platziert Content. Das System erkennt Grid-Positionen:

```
User zieht "Header" und lässt los

┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│1 │2 │3 │4 │5 │6 │7 │8 │9 │10│11│12│
├──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┤
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ ← Highlight: Spalte 1-12
│░░░░░░░░░░░ HEADER ░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘

System generiert: Header span 12
```

### Schritt 3: Elemente spannen mehrere Spalten

User will, dass Content über Spalten 4-12 geht:

```
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│1 │2 │3 │4 │5 │6 │7 │8 │9 │10│11│12│
├──┼──┼──┼──┴──┴──┴──┴──┴──┴──┴──┴──┤
│  │  │  │░░░░░░░░░░░░░░░░░░░░░░░░░░│
│Side   │░░░░░░░░░ CONTENT ░░░░░░░░░│ ← Spalte 4-12 highlighted
│bar    │░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──┴──┴──┴──────────────────────────┘

System generiert: Content span 9, start 4
```

### Schritt 4: Merging - Elemente zusammenfassen

User hat zwei Elemente und will sie zu einem Container machen:

```
VORHER: Zwei separate Elemente

┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │  │  │  │  │  │  │  │  │  │
├──┴──┼──┴──┴──┴──┴──┼──┴──┴──┴──┴──┤
│     │              │              │
│Card1│    Card2     │    Card3     │
│     │              │              │
└─────┴──────────────┴──────────────┘

AKTION: User wählt Card1 + Card2, klickt "Merge"

NACHHER: Ein Container der beide Spalten spannt

┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │  │  │  │  │  │  │  │  │  │
├──┴──┴──┴──┴──┴──┴──┼──┴──┴──┴──┴──┤
│                    │              │
│   CardContainer    │    Card3     │
│   ├─Card1──Card2─┤│              │
└────────────────────┴──────────────┘

Code:
CardContainer span 8, hor, gap 16
  Card1
  Card2
Card3 span 4
```

---

## Grid = Rechtecke (Zellen)

Ein Grid besteht aus Spalten UND Rows, also aus Rechtecken:

```
Grid 12 Spalten × 4 Rows = 48 Zellen

┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 1
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 2
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 3
├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │  │  │  │  │  │  │  Row 4
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
 1  2  3  4  5  6  7  8  9 10 11 12
```

---

## Jede Zelle hat 9 Zonen

Jedes Grid-Rechteck hat selbst 9 Positionierungs-Zonen (3×3):

```
┌─────────────────────────────────┐
│ TL      │    TC     │      TR  │
│    ·    │     ·     │     ·    │
├─────────┼───────────┼──────────┤
│ ML      │    MC     │      MR  │
│    ·    │     ·     │     ·    │
├─────────┼───────────┼──────────┤
│ BL      │    BC     │      BR  │
│    ·    │     ·     │     ·    │
└─────────────────────────────────┘

TL = Top-Left      TC = Top-Center      TR = Top-Right
ML = Mid-Left      MC = Mid-Center      MR = Mid-Right
BL = Bottom-Left   BC = Bottom-Center   BR = Bottom-Right
```

---

## Zwei-Ebenen-Positionierung

Beim Drop passieren zwei Dinge:

### Ebene 1: Welche Zellen?

Das System erkennt, welche Grid-Zellen das Element spannen wird:

```
┌──┬──┬──┬──┬──┬──┐
│  │  │░░│░░│░░│  │   Element ist groß
├──┼──┼░░┼░░┼░░┼──┤   → spannt 3 Spalten × 2 Rows
│  │  │░░│░░│░░│  │
├──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │  │
└──┴──┴──┴──┴──┴──┘

→ Code: span 3, row-span 2, start 3, row 1
```

### Ebene 2: Wo innerhalb der Fläche?

Innerhalb der gespannten Fläche: In welcher der 9 Zonen?

```
Gespannte Fläche (3×2 Zellen):

┌─────────────────────────────────┐
│         │           │ ┌──────┐ │
│    ·    │     ·     │ │ Elem │ │  ← Element in TOP-RIGHT
├─────────┼───────────┼─└──────┘─┤
│         │           │          │
│    ·    │     ·     │     ·    │
└─────────────────────────────────┘

→ Code: span 3, row-span 2, start 3, align top-right
        (oder: Wrapper mit pad-top, pad-right)
```

### Hierarchie

```
Page Grid (12 × 4)
└── Gespannte Zellen [col 3-5, row 1-2]
    └── Zone innerhalb [TOP-RIGHT]
        └── Element
```

### Code-Generierung

| Zellen | Zone | Generierter Code |
|--------|------|------------------|
| span 3, row 1 | center | `span 3, center` |
| span 3, row 1-2 | top-right | `span 3, row-span 2, align top right` |
| span 6, row 2 | bottom-center | `span 6, row 2, align bottom center` |

---

## Grid-Operationen

### 1. Platzieren auf Grid

```
User zieht Element → System erkennt:
                     1. Welche Zellen (basierend auf Element-Größe)
                     2. Welche Zone (basierend auf Cursor-Position)
                   → Code wird generiert
```

### 2. Größe ändern (Span)

```
User zieht Kante → Snappt zu Grid-Linien
                 → Spalten-Span oder Row-Span ändert sich
                 → Code wird aktualisiert
```

### 3. Verschieben auf Grid

```
User zieht Element → Bewegt sich auf Grid
                   → Start-Spalte/Row ändert sich
                   → Zone innerhalb kann sich auch ändern
```

### 4. Zone wechseln (Fein-Positionierung)

```
Element ist platziert → User zieht innerhalb der gespannten Fläche
                      → Zone wechselt (z.B. center → top-left)
                      → Alignment-Code wird angepasst
```

### 5. Merging

```
User wählt mehrere Elemente → Cmd+G
                            → Container spannt alle betroffenen Zellen
                            → Kinder werden relativ positioniert
```

### 6. Unmerging

```
User wählt Container → Cmd+Shift+G
                     → Container wird aufgelöst
                     → Kinder werden direkt auf Grid platziert
```

---

## Visuelles Feedback

### Grid Overlay Styles

```css
/* Faint background lines - always visible */
.grid-line {
  stroke: rgba(0, 0, 0, 0.05);
  stroke-width: 1;
}

/* Highlighted during drag */
.grid-cell-highlight {
  fill: rgba(59, 130, 246, 0.1);  /* Blue */
  stroke: rgba(59, 130, 246, 0.3);
}

/* Snap indicator */
.grid-snap-line {
  stroke: rgba(59, 130, 246, 0.8);
  stroke-width: 2;
  stroke-dasharray: 4 4;
}
```

### Während Drag

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│      │      │      │      │      │      │      │            │
│      │      │      │      │      │      │      │            │
│      │      │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │      │            │
│      │      │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │      │ ← Ziel     │
│      │      │ ░░░░░░ [Element] ░░░░░░░░░ │      │   Zellen   │
│      │      │ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │      │   highlight│
│      │      │      │      │      │      │      │            │
│      │      │      │      │      │      │      │            │
│                                                              │
│  ┌──────────────────────────────────────┐                   │
│  │ span 6, start 3                      │ ← Live Code Hint  │
│  └──────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Code-Generierung

### Einfache Platzierung

```mirror
// Element auf Spalte 1-6
Header span 6

// Element auf Spalte 7-12
Sidebar span 6, start 7

// Element über alle Spalten
Footer span 12
```

### Container mit Span

```mirror
// Container spannt mehrere Spalten, Kinder darin
ContentArea span 9, start 4
  hor, gap 16
  Card
  Card
  Card
```

### Zentriert

```mirror
// System erkennt: Element ist mittig
Content span 8, center
```

---

## Unterschied zu CSS Grid

**CSS Grid:**
```css
.parent {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}
.child {
  grid-column: span 6;
}
```

**Page Grid (Designer-Tool):**
- Das Grid existiert nur als visueller Guide
- Elemente können trotzdem `display: flex` oder `display: block` sein
- Der Span wird zur Position/Breite berechnet

**Mirror kann beides:**
```mirror
// Option 1: CSS Grid (wenn Parent Grid hat)
App grid 12, gap 16
  Header span 12      // → grid-column: span 12

// Option 2: Page Grid (Position-based)
App
  Header w col(12)    // → width: calc(12/12 * 100%)
```

---

## Workflow-Beispiele

### Beispiel 1: Landing Page

```
1. User aktiviert Grid (12 Spalten, 24px Gap, 48px Margin)

2. User zieht Header → Snappt zu voller Breite
   Code: Header span 12

3. User zieht Hero → Snappt zu Spalte 2-11
   Code: Hero span 10, start 2

4. User zieht Features-Container → Spalte 1-12
   User zieht 3 Feature Cards rein
   Code:
   Features span 12
     hor, gap 24
     FeatureCard
     FeatureCard
     FeatureCard

5. User zieht Footer → Volle Breite
   Code: Footer span 12
```

### Beispiel 2: Dashboard

```
1. Grid: 12 Spalten

2. User platziert Sidebar links (Spalte 1-2)
   Code: Sidebar span 2

3. User platziert Main rechts (Spalte 3-12)
   Code: Main span 10, start 3

4. Im Main: User aktiviert Sub-Grid
   User platziert Widgets
   Code:
   Main span 10, start 3
     grid 3, gap 16
     Widget
     Widget
     Widget
```

---

## Tastatur-Modifiers

| Modifier | Effekt |
|----------|--------|
| (normal) | Snappt zu Grid-Spalten |
| `Shift` | Feinere Snapping (halbe Spalten) |
| `Alt` | Frei positionieren (ignoriert Grid) |
| `Cmd` | Nur verschieben (Span beibehalten) |
| `Cmd+G` | Merge ausgewählte Elemente |
| `Cmd+Shift+G` | Unmerge Container |

---

## Responsive Grids

### Breakpoint-aware

```
Desktop (1200px+):  12 Spalten, 24px Gap
Tablet (768px):     8 Spalten, 16px Gap
Mobile (320px):     4 Spalten, 8px Gap
```

### Code mit Breakpoints

```mirror
Sidebar span 2 @md:span 4 @sm:span full
Content span 10 @md:span 4 @sm:span full
```

### Visuelles Umschalten

```
┌──────────────────────────────────────┐
│ Preview          [Desktop ▼] [Grid]  │
├──────────────────────────────────────┤
│                                      │
│  Wähle: Desktop | Tablet | Mobile    │
│                                      │
│  Grid passt sich automatisch an      │
│                                      │
└──────────────────────────────────────┘
```

---

## Technische Umsetzung

### PageGrid Service

```typescript
interface PageGridConfig {
  columns: number
  gap: number
  margin: number
  breakpoints?: {
    tablet?: { columns: number, gap: number }
    mobile?: { columns: number, gap: number }
  }
}

class PageGridService {
  private config: PageGridConfig

  // Berechne welche Spalte eine X-Position trifft
  getColumnAtX(x: number, viewportWidth: number): number {
    const availableWidth = viewportWidth - (2 * this.config.margin)
    const columnWidth = (availableWidth - (this.config.columns - 1) * this.config.gap) / this.config.columns
    const relativeX = x - this.config.margin
    return Math.floor(relativeX / (columnWidth + this.config.gap)) + 1
  }

  // Berechne Span aus Element-Breite
  getSpanFromWidth(width: number, viewportWidth: number): number {
    const columnWidth = this.getColumnWidth(viewportWidth)
    return Math.round(width / (columnWidth + this.config.gap))
  }

  // Generiere Code für Position
  generateCode(startCol: number, span: number, totalColumns: number): string {
    if (span === totalColumns && startCol === 1) {
      return `span ${span}`  // Volle Breite, kein start nötig
    }

    // Check für Zentrierung
    const endCol = startCol + span - 1
    const leftSpace = startCol - 1
    const rightSpace = totalColumns - endCol

    if (Math.abs(leftSpace - rightSpace) <= 1) {
      return `span ${span}, center`
    }

    if (startCol === 1) {
      return `span ${span}`
    }

    return `span ${span}, start ${startCol}`
  }
}
```

### Grid Overlay Component

```typescript
class GridOverlay {
  private svg: SVGElement
  private grid: PageGridService

  render(container: HTMLElement) {
    const rect = container.getBoundingClientRect()
    const { columns, gap, margin } = this.grid.config

    // Clear existing
    this.svg.innerHTML = ''

    // Draw column guides
    const columnWidth = this.grid.getColumnWidth(rect.width)

    for (let i = 0; i < columns; i++) {
      const x = margin + i * (columnWidth + gap)

      // Column background (very faint)
      this.drawRect(x, 0, columnWidth, rect.height, 'column-bg')

      // Column number (top)
      this.drawText(x + columnWidth / 2, 12, String(i + 1), 'column-label')
    }

    // Draw margin guides
    this.drawLine(margin, 0, margin, rect.height, 'margin-line')
    this.drawLine(rect.width - margin, 0, rect.width - margin, rect.height, 'margin-line')
  }

  highlightRange(startCol: number, endCol: number) {
    // Highlight während Drag
  }
}
```

---

## Roadmap

### Phase 1: Grid Basics
- [ ] PageGridService (Spaltenberechnung)
- [ ] Grid Overlay (faint lines)
- [ ] Grid Settings UI

### Phase 2: Platzieren
- [ ] Snap to Grid beim Drag
- [ ] Live Highlight
- [ ] Code-Generierung (span, start)

### Phase 3: Manipulation
- [ ] Resize mit Grid-Snap
- [ ] Verschieben auf Grid
- [ ] Merge/Unmerge

### Phase 4: Polish
- [ ] Responsive Grid (Breakpoints)
- [ ] Center-Erkennung
- [ ] Keyboard Modifiers
- [ ] Sub-Grids

---

## Zusammenfassung

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    PAGE GRID PARADIGM                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │   Grid ist ein visueller Guide, kein CSS-Konstrukt     │   │
│  │                                                         │   │
│  │   • Definiert einmal: Columns, Gap, Margin             │   │
│  │   • Immer sichtbar als feine Linien                    │   │
│  │   • Elemente snappen zu Grid-Positionen                │   │
│  │   • System generiert entsprechenden Code               │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   PLACE     │  │   RESIZE    │  │   MERGE     │             │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤             │
│  │ Element auf │  │ Kante       │  │ Mehrere     │             │
│  │ Grid ziehen │  │ ziehen      │  │ Elemente    │             │
│  │             │  │             │  │ gruppieren  │             │
│  │ → span,     │  │ → span      │  │             │             │
│  │   start     │  │   ändern    │  │ → Container │             │
│  │             │  │             │  │   erstellen │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│                          ↓                                      │
│                                                                 │
│                 ┌────────────────┐                              │
│                 │  Mirror Code   │                              │
│                 │                │                              │
│                 │ Header span 12 │                              │
│                 │ Content span 8 │                              │
│                 │ Sidebar span 4 │                              │
│                 └────────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
