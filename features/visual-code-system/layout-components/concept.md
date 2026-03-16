# Layout Components - Konzept

Vorgefertigte Layout-Strukturen mit Slots die per Drag & Drop gefüllt werden.

---

## Vision

Statt jedes Layout von Grund auf zu bauen, wählt der User ein Layout-Template aus einer Bibliothek. Die Slots sind sichtbare Drop-Zonen. Der User füllt sie mit Komponenten. Der Code entsteht automatisch.

**Lerneffekt:** User sieht wie Layouts in Mirror strukturiert sind und kann sie später selbst schreiben.

---

## Slot-Syntax

### Definition

```mirror
// Slot = Platzhalter mit Name und optionalen Default-Properties
TwoColumn: =
  Box hor, gap 24, w full
    Left:                    // ← Slot "Left"
      Box ver, gap 16
    Right:                   // ← Slot "Right"
      Box ver, gap 16, w 300
```

### Nutzung

```mirror
TwoColumn
  Left                       // ← Füllt Slot "Left"
    Card
    Card
  Right                      // ← Füllt Slot "Right"
    Sidebar
```

### Leere Slots

```mirror
// Leerer Slot hat Default-Inhalt oder ist leer
TwoColumn
  Left
    Card
  // Right bleibt leer → zeigt Placeholder oder nichts
```

---

## Vorgefertigte Layouts

### Basis-Layouts

```mirror
// Zentrierter Content
Centered: =
  Box w full, h full, center
    Content:

// Volle Breite mit max-width
Container: =
  Box w full, center
    Content:
      Box maxw 1200, w full, padx 24
```

### Page Layouts

```mirror
// Classic Header/Content/Footer
PageLayout: =
  Box ver, h full, w full
    Header:
      Box w full, h 64, bg #fff, shadow sm
    Main:
      Box full, scroll
    Footer:
      Box w full, h auto, bg #f5f5f5

// Sidebar Layout
SidebarLayout: =
  Box hor, h full, w full
    Sidebar:
      Box w 260, h full, ver, gap 8, bg #f5f5f5, pad 16
    Content:
      Box full, pad 24, scroll
```

### Komplexe Layouts

```mirror
// Holy Grail (Header, Footer, 3 Spalten)
HolyGrail: =
  Box ver, h full
    Header:
      Box w full, h 64
    Box hor, full
      NavLeft:
        Box w 200, h full
      Main:
        Box full
      AsideRight:
        Box w 250, h full
    Footer:
      Box w full, h 48

// Dashboard
Dashboard: =
  Box ver, h full
    TopBar:
      Box w full, h 56, hor, spread, padx 16, bg #1a1a2e
    Box hor, full
      Sidebar:
        Box w 240, ver, gap 4, pad 8, bg #16213e
      Content:
        Box full, pad 24, bg #f0f0f0
```

### Grid Layouts

```mirror
// 2-Spalten Grid
TwoColumn: =
  Box hor, gap 24, w full
    Left:
      Box ver, gap 16, full
    Right:
      Box ver, gap 16, full

// 3-Spalten Grid
ThreeColumn: =
  Box hor, gap 24, w full
    Col1:
      Box ver, gap 16, full
    Col2:
      Box ver, gap 16, full
    Col3:
      Box ver, gap 16, full

// Sidebar + Content
ContentWithSidebar: =
  Box hor, gap 24, w full
    Content:
      Box ver, gap 16, full
    Sidebar:
      Box ver, gap 16, w 300
```

### Card Layouts

```mirror
// Card mit Header und Content
Card: =
  Box ver, bg #fff, rad 8, shadow sm
    Header:
      Box pad 16, bor bottom 1 #eee
    Content:
      Box pad 16

// Card mit Image
MediaCard: =
  Box ver, bg #fff, rad 8, shadow sm, clip
    Image:
      Box h 200, bg #ddd
    Content:
      Box pad 16, ver, gap 8
```

---

## Drag & Drop Workflow

### 1. Layout wählen

```
┌─────────────────────────────────────────────────────────────┐
│ Layout Library                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ ┌─┬───┐ │  │ ┌─────┐ │  │ ┌─┬─┬─┐ │  │ ┌─────┐ │       │
│  │ │ │   │ │  │ ├─────┤ │  │ ├─┼─┼─┤ │  │ │┌─┬─┐│ │       │
│  │ │ │   │ │  │ │     │ │  │ │ │ │ │ │  │ │└─┴─┘│ │       │
│  │ └─┴───┘ │  │ ├─────┤ │  │ └─┴─┴─┘ │  │ └─────┘ │       │
│  │Sidebar  │  │ Page   │  │ 3-Column │  │ Cards  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2. Slots als Drop Zones

```
┌─────────────────────────────────────────────────────────────┐
│ Canvas                                                      │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SidebarLayout                                       │   │
│  │ ┌───────────────┬───────────────────────────────┐  │   │
│  │ │               │                               │  │   │
│  │ │   SIDEBAR     │         CONTENT               │  │   │
│  │ │               │                               │  │   │
│  │ │ ░░░░░░░░░░░░ │   ░░░░░░░░░░░░░░░░░░░░░░░░   │  │   │
│  │ │ Drop here    │   Drop here                   │  │   │
│  │ │ ░░░░░░░░░░░░ │   ░░░░░░░░░░░░░░░░░░░░░░░░   │  │   │
│  │ │               │                               │  │   │
│  │ └───────────────┴───────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Komponenten in Slots ziehen

```
┌──────────────────┐     ┌─────────────────────────────────────┐
│ Components       │     │ Canvas                              │
├──────────────────┤     │                                     │
│                  │     │  ┌─────────────────────────────┐   │
│ [NavMenu] ───────────► │  │ SidebarLayout               │   │
│                  │     │  │ ┌───────────┬───────────────┐│   │
│ [Card]           │     │  │ │ Sidebar   │   Content     ││   │
│                  │     │  │ │           │               ││   │
│ [Button]         │     │  │ │ [NavMenu] │               ││   │
│                  │     │  │ │           │               ││   │
│ [Table]      ────────► │  │ │           │   [Table]     ││   │
│                  │     │  │ └───────────┴───────────────┘│   │
│ [Form]           │     │  └─────────────────────────────────┘│
│                  │     │                                     │
└──────────────────┘     └─────────────────────────────────────┘
```

### 4. Code entsteht automatisch

```mirror
// Resultierender Code:
SidebarLayout
  Sidebar
    NavMenu
  Content
    Table
```

---

## Visuelle Slot-Indikatoren

### Leerer Slot

```
┌─────────────────────────────────────┐
│                                     │
│    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐       │
│    ╎                       ╎       │
│    ╎    + Drop Content     ╎       │  ← Gestrichelte Linie
│    ╎         here          ╎       │  ← Plus-Icon
│    ╎                       ╎       │  ← Label
│    └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘       │
│                                     │
└─────────────────────────────────────┘
```

### Slot mit Hover (während Drag)

```
┌─────────────────────────────────────┐
│                                     │
│    ┌━━━━━━━━━━━━━━━━━━━━━━━┓       │
│    ┃░░░░░░░░░░░░░░░░░░░░░░░┃       │  ← Blauer Rand
│    ┃░░░  Drop "Card"    ░░░┃       │  ← Blaue Füllung
│    ┃░░░░░░░░░░░░░░░░░░░░░░░┃       │  ← Zeigt was gedroppt wird
│    ┗━━━━━━━━━━━━━━━━━━━━━━━┛       │
│                                     │
└─────────────────────────────────────┘
```

### Slot mit Inhalt

```
┌─────────────────────────────────────┐
│                                     │
│    ┌───────────────────────┐       │
│    │ Card                  │       │  ← Gefüllter Slot
│    │   Title               │       │
│    │   Description         │       │
│    └───────────────────────┘       │
│                                     │
│    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐       │  ← Weiterer Drop möglich
│    ╎     + Add more        ╎       │    (unter bestehendem)
│    └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘       │
│                                     │
└─────────────────────────────────────┘
```

---

## Component Library UI

### Kategorien

```
┌─────────────────────────────────────┐
│ Component Library                   │
├─────────────────────────────────────┤
│ ▼ Layouts                           │
│   ├─ PageLayout                     │
│   ├─ SidebarLayout                  │
│   ├─ TwoColumn                      │
│   ├─ ThreeColumn                    │
│   └─ Dashboard                      │
│                                     │
│ ▼ Cards                             │
│   ├─ Card                           │
│   ├─ MediaCard                      │
│   └─ StatCard                       │
│                                     │
│ ▼ Navigation                        │
│   ├─ NavMenu                        │
│   ├─ Tabs                           │
│   └─ Breadcrumb                     │
│                                     │
│ ▼ Forms                             │
│   ├─ Form                           │
│   ├─ InputField                     │
│   └─ Select                         │
│                                     │
│ ▼ Data Display                      │
│   ├─ Table                          │
│   ├─ List                           │
│   └─ DataGrid                       │
│                                     │
└─────────────────────────────────────┘
```

### Preview on Hover

```
┌─────────────────────────────────────┐
│ ▼ Layouts                           │
│   ├─ SidebarLayout ◄── Hover        │
│   │    ┌───────────────────┐        │
│   │    │ ┌───┬───────────┐ │        │
│   │    │ │   │           │ │ ← Mini Preview
│   │    │ │   │           │ │
│   │    │ └───┴───────────┘ │        │
│   │    └───────────────────┘        │
│   ├─ TwoColumn                      │
│   └─ Dashboard                      │
└─────────────────────────────────────┘
```

---

## Custom Layouts

### User erstellt eigene

```mirror
// User definiert eigenes Layout
MyAppLayout: =
  Box ver, h full
    Box hor, h 56, spread, padx 16, bg $brand.primary
      Logo:
      NavActions:
    Box hor, full
      Box w 200, ver, gap 8, bg #f5f5f5
        NavItems:
      Box full, pad 24
        PageContent:
```

### Speichern in Library

```
┌─────────────────────────────────────┐
│ Component Library                   │
├─────────────────────────────────────┤
│ ▼ My Components ← User-defined     │
│   ├─ MyAppLayout                    │
│   ├─ MyCard                         │
│   └─ MyButton                       │
│                                     │
│ ▼ Layouts                           │
│   ├─ ...                            │
└─────────────────────────────────────┘
```

---

## Integration mit Semantic Drag

Layout Components + Semantic Drag arbeiten zusammen:

```
1. User zieht Layout auf Canvas
   → SidebarLayout erscheint mit Slots

2. User zieht Card in Content-Slot
   → Card erscheint in Content

3. User zieht Card nach rechts INNERHALB des Slots
   → Semantic Drag aktiviert
   → Drop Zones erscheinen (padding, center, etc.)
   → Wrapper wird generiert wenn nötig
```

**Code-Entwicklung:**

```mirror
// Schritt 1: Layout
SidebarLayout

// Schritt 2: Card in Content
SidebarLayout
  Content
    Card

// Schritt 3: Card nach rechts (Semantic Drag)
SidebarLayout
  Content
    Box w full, pad left 32    ← Auto-generiert
      Card
```

---

## Technische Umsetzung

### Slot-Erkennung im IR

```typescript
interface IRNode {
  type: string
  name?: string
  properties: Record<string, any>
  children?: IRNode[]
  isSlot?: boolean           // ← Slot-Flag
  slotName?: string          // ← Name des Slots
}

function identifySlots(node: IRNode): IRNode {
  // Slot = Name endet mit : und hat keine direkte Zuweisung
  if (node.name?.endsWith(':') && !node.properties.assignment) {
    node.isSlot = true
    node.slotName = node.name.replace(':', '')
  }
  return node
}
```

### Drop Zone für Slots

```typescript
interface SlotDropZone extends DropZone {
  slotName: string
  parentComponent: string
  acceptedTypes?: string[]   // Optional: nur bestimmte Komponenten
  maxChildren?: number       // Optional: Limit
}

function createSlotDropZones(layoutNode: IRNode): SlotDropZone[] {
  const zones: SlotDropZone[] = []

  // Finde alle Slots im Layout
  const slots = findSlots(layoutNode)

  slots.forEach(slot => {
    const element = getElementForNode(slot)
    if (!element) return

    zones.push({
      id: `slot-${slot.slotName}`,
      type: 'slot',
      slotName: slot.slotName,
      parentComponent: layoutNode.name,
      bounds: element.getBoundingClientRect(),
      isEmpty: !slot.children?.length
    })
  })

  return zones
}
```

### Component Library State

```typescript
interface ComponentLibrary {
  categories: ComponentCategory[]
  userComponents: ComponentDefinition[]
}

interface ComponentCategory {
  name: string
  components: ComponentDefinition[]
}

interface ComponentDefinition {
  name: string
  code: string           // Mirror code
  preview?: string       // SVG preview
  slots?: string[]       // Available slots
  tags?: string[]        // For search
}

// Built-in layouts
const BUILTIN_LAYOUTS: ComponentCategory = {
  name: 'Layouts',
  components: [
    {
      name: 'SidebarLayout',
      code: `Box hor, h full, w full
  Sidebar:
    Box w 260, h full, ver, gap 8, bg #f5f5f5, pad 16
  Content:
    Box full, pad 24, scroll`,
      slots: ['Sidebar', 'Content'],
      preview: '<svg>...</svg>'
    },
    // ... more layouts
  ]
}
```

---

## Lerneffekt

### Vom Drag zum Code

```
Woche 1:  User zieht SidebarLayout, füllt Slots
          → Sieht Code entstehen

Woche 2:  User versteht: "SidebarLayout hat Sidebar und Content"
          → Tippt manchmal direkt

Woche 3:  User denkt: "Ich brauche eigenes Layout"
          → Kopiert SidebarLayout, modifiziert

Woche 4:  User schreibt eigene Layouts von Grund auf
          → Braucht Library nur noch für Inspiration
```

### Code immer sichtbar

```
┌──────────────────────────┬──────────────────────────┐
│ Preview                  │ Code                     │
│                          │                          │
│ ┌───────┬────────────┐   │ SidebarLayout            │
│ │       │            │   │   Sidebar                │
│ │ Nav   │   Card     │   │     NavMenu              │
│ │ Menu  │            │   │   Content                │
│ │       │            │   │     Card                 │
│ └───────┴────────────┘   │       Text "Hello"       │
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

User sieht IMMER wie der Code aussieht, der durch Drag & Drop entsteht.

---

## Roadmap

### Phase 1: Basis-Library
- [ ] 5-10 eingebaute Layouts definieren
- [ ] Slot-Erkennung im Parser
- [ ] Library UI (Liste mit Kategorien)
- [ ] Drag aus Library auf Canvas

### Phase 2: Slot Drop Zones
- [ ] Slot-Visualisierung (leer/gefüllt)
- [ ] Drop Zone Highlighting
- [ ] Drop-Feedback ("Dropping Card into Content")

### Phase 3: User Components
- [ ] "Save as Component" Funktion
- [ ] User-Kategorie in Library
- [ ] Component bearbeiten/löschen

### Phase 4: Advanced
- [ ] Slot-Constraints (nur bestimmte Komponenten)
- [ ] Nested Layouts
- [ ] Component Variants
- [ ] Import/Export von Component Libraries

---

## Zusammenspiel der Features

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   LAYOUT COMPONENTS     SEMANTIC DRAG     DIRECT MANIP.    │
│   ─────────────────     ─────────────     ─────────────    │
│                                                             │
│   Layout wählen    →    Positionieren  →   Feintuning      │
│   Slots füllen          in Slots           der Werte       │
│                                                             │
│   Grobe Struktur        Wrapper            pad 16 → 24     │
│                         generieren         gap 8 → 12      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Workflow:
1. SidebarLayout aus Library ziehen
2. Card in Content-Slot ziehen
3. Card nach rechts schieben (Semantic Drag → Wrapper)
4. Padding feinjustieren (Direct Manipulation → Handle)
```
