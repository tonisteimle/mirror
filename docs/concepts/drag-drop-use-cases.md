# Drag & Drop Use Cases

Vollständiges Verzeichnis aller Anwendungsfälle für das Drag & Drop System.

---

## Übersicht

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DRAG SOURCES                                  │
├─────────────────────────────────────────────────────────────────────┤
│  ComponentPanel          │  Preview/Canvas                          │
│  ─────────────────       │  ───────────────                          │
│  • Primitives (Frame,    │  • Bestehende Elemente                    │
│    Text, Button, ...)    │  • Komponenten-Instanzen                  │
│  • Zag Components        │  • Verschachtelte Strukturen              │
│  • Templates             │                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DROP TARGETS                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Layout Type    │  Strategy              │  Ergebnis                │
│  ─────────────  │  ────────────────────  │  ─────────────────────── │
│  flex (ver)     │  FlexWithChildren      │  Insertion zwischen      │
│  flex (hor)     │  FlexWithChildren      │  Kindern (insertionIndex)│
│  flex (leer)    │  SimpleInside          │  Erstes Kind             │
│  positioned     │  AbsolutePosition      │  x/y Koordinaten         │
│  none (leaf)    │  NonContainer          │  before/after Sibling    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Component Panel → Preview (Add)

### UC-ADD-01: Primitives in leeren Container droppen

**Szenario:** User zieht `Button` aus Panel in leeren `Frame`

```
Ausgangszustand:
Frame gap 8
  // leer

Nach Drop:
Frame gap 8
  Button "Button"
```

| Aspekt | Wert |
|--------|------|
| Source | `palette` |
| Target Layout | `flex` |
| Has Children | `false` |
| Strategy | `SimpleInsideStrategy` |
| Visual | Outline (blau gestrichelt) |
| Insertion Index | `0` |

---

### UC-ADD-02: Primitive zwischen bestehende Kinder einfügen

**Szenario:** User zieht `Text` zwischen zwei Buttons

```
Ausgangszustand:
Frame gap 8
  Button "A"
  Button "B"    ← Cursor hier zwischen

Nach Drop:
Frame gap 8
  Button "A"
  Text "Text"   ← Neu eingefügt
  Button "B"
```

| Aspekt | Wert |
|--------|------|
| Source | `palette` |
| Target Layout | `flex` (vertical) |
| Has Children | `true` |
| Strategy | `FlexWithChildrenStrategy` |
| Visual | Insertion Line (horizontal, blau) |
| Insertion Index | `1` |

---

### UC-ADD-03: Primitive am Ende einer Liste einfügen

**Szenario:** User zieht `Icon` ans Ende einer vertikalen Liste

```
Ausgangszustand:
Frame ver, gap 8
  Text "Item 1"
  Text "Item 2"
  Text "Item 3"
               ← Cursor hier unten

Nach Drop:
Frame ver, gap 8
  Text "Item 1"
  Text "Item 2"
  Text "Item 3"
  Icon "star"   ← Neu am Ende
```

| Aspekt | Wert |
|--------|------|
| Strategy | `FlexWithChildrenStrategy` |
| Visual | Insertion Line nach letztem Kind |
| Insertion Index | `3` (= Anzahl Kinder) |

---

### UC-ADD-04: Primitive in horizontalen Container einfügen

**Szenario:** User zieht `Button` in horizontale Row

```
Ausgangszustand:
Frame hor, gap 8
  Button "A"    Button "B"    Button "C"
                    ↑ Cursor hier

Nach Drop:
Frame hor, gap 8
  Button "A"    Button "Neu"    Button "B"    Button "C"
```

| Aspekt | Wert |
|--------|------|
| Target Layout | `flex` (horizontal) |
| Strategy | `FlexWithChildrenStrategy` |
| Visual | Insertion Line (vertikal, blau) |
| Direction | `horizontal` |
| Insertion Index | `1` |

---

### UC-ADD-05: Primitive in Stacked/Absolute Container

**Szenario:** User zieht `Frame` in einen `stacked` Container

```
Ausgangszustand:
Frame stacked, w 400, h 300
  // leer oder andere Elemente

Nach Drop (Cursor bei x:150, y:100):
Frame stacked, w 400, h 300
  Frame x 150, y 100
    // Neuer Frame mit Koordinaten
```

| Aspekt | Wert |
|--------|------|
| Target Layout | `positioned` |
| Strategy | `AbsolutePositionStrategy` |
| Visual | Ghost (lila, halbtransparent) |
| Result | `placement: 'absolute'`, `position: {x, y}` |

---

### UC-ADD-06: Zag Component einfügen

**Szenario:** User zieht `Dialog` aus Panel

```
Ausgangszustand:
Frame gap 16
  Text "Willkommen"

Nach Drop:
Frame gap 16
  Text "Willkommen"
  Dialog
    Trigger: Button "Open"
    Content: Frame pad 16
      Text "Dialog Content"
```

| Aspekt | Wert |
|--------|------|
| Component Type | Zag Component |
| Default Structure | Template mit Slots |
| Default Size | `400 × 300` |

---

### UC-ADD-07: Component auf Leaf-Element (Non-Container)

**Szenario:** User zieht `Button` auf ein `Text` Element

```
Ausgangszustand:
Frame gap 8
  Text "Vorher"
  Text "Ziel"     ← Cursor auf diesem Text
  Text "Nachher"

Nach Drop (linke Hälfte des Text):
Frame gap 8
  Text "Vorher"
  Button "Neu"    ← Vor Text eingefügt
  Text "Ziel"
  Text "Nachher"
```

| Aspekt | Wert |
|--------|------|
| Target Layout | `none` (Text ist kein Container) |
| Strategy | `NonContainerStrategy` |
| Placement | `before` oder `after` |
| Actual Target | Parent Frame |

---

## 2. Preview → Preview (Move/Reorder)

### UC-MOVE-01: Element innerhalb desselben Containers verschieben

**Szenario:** User zieht Button von Position 0 zu Position 2

```
Ausgangszustand:
Frame gap 8
  Button "A"    ← Drag von hier
  Button "B"
  Button "C"    ← Drop hier nach

Nach Drop:
Frame gap 8
  Button "B"
  Button "C"
  Button "A"    ← Verschoben ans Ende
```

| Aspekt | Wert |
|--------|------|
| Source | `canvas` (nodeId des Buttons) |
| Operation | `moveNode` |
| Same Parent | `true` |
| Index Adjustment | Automatisch (source index berücksichtigt) |

---

### UC-MOVE-02: Element in anderen Container verschieben

**Szenario:** User zieht Element aus einem Frame in einen anderen

```
Ausgangszustand:
Frame name "left", gap 8
  Button "A"
  Button "B"    ← Drag
Frame name "right", gap 8
  Text "X"

Nach Drop:
Frame name "left", gap 8
  Button "A"
Frame name "right", gap 8
  Text "X"
  Button "B"    ← Hierhin verschoben
```

| Aspekt | Wert |
|--------|------|
| Source Parent | `left` |
| Target Parent | `right` |
| Operation | `moveNode` mit neuem Parent |

---

### UC-MOVE-03: Element in verschachtelte Struktur verschieben

**Szenario:** Element wird in tief verschachtelte Hierarchy verschoben

```
Ausgangszustand:
Frame
  Card
    Header
      Text "Title"
    Body            ← Drop Target
      // leer
  Button "Move me"  ← Drag Source

Nach Drop:
Frame
  Card
    Header
      Text "Title"
    Body
      Button "Move me"  ← Jetzt in Body
```

| Aspekt | Wert |
|--------|------|
| Depth Change | Element geht tiefer in Hierarchy |
| Target Detection | Nächster Container am Cursor |

---

### UC-MOVE-04: Alt+Drag = Duplizieren

**Szenario:** User hält Alt und zieht Element

```
Ausgangszustand:
Frame gap 8
  Button "Original"  ← Alt + Drag

Nach Drop:
Frame gap 8
  Button "Original"  ← Bleibt
  Button "Original"  ← Kopie erstellt
```

| Aspekt | Wert |
|--------|------|
| Modifier | `Alt` Key pressed |
| Operation | `duplicate` statt `moveNode` |
| State Machine Event | `ALT_KEY_DOWN` / `ALT_KEY_UP` |

---

### UC-MOVE-05: Absolute Position ändern

**Szenario:** Element in stacked Container repositionieren

```
Ausgangszustand:
Frame stacked
  Box x 50, y 50    ← Drag von hier

Nach Drop (Cursor bei x:200, y:150):
Frame stacked
  Box x 200, y 150  ← Neue Position
```

| Aspekt | Wert |
|--------|------|
| Layout | `positioned` |
| Operation | `updateNodePosition` oder `moveNodeAbsolute` |
| Coordinates | Container-relative |

---

### UC-MOVE-06: Von Flex nach Absolute verschieben

**Szenario:** Element wechselt Layout-Kontext

```
Ausgangszustand:
Frame ver, gap 8
  Button "A"
  Button "B"        ← Drag
Frame stacked, w 300, h 200
  // leer

Nach Drop (bei x:100, y:80):
Frame ver, gap 8
  Button "A"
Frame stacked, w 300, h 200
  Button "B", x 100, y 80  ← Mit Koordinaten
```

| Aspekt | Wert |
|--------|------|
| Source Layout | `flex` |
| Target Layout | `positioned` |
| Properties Added | `x`, `y` |

---

### UC-MOVE-07: Von Absolute nach Flex verschieben

**Szenario:** Element verlässt absolute Positionierung

```
Ausgangszustand:
Frame stacked
  Button x 100, y 50  ← Drag
Frame ver, gap 8
  Text "Item"

Nach Drop:
Frame stacked
  // leer
Frame ver, gap 8
  Text "Item"
  Button            ← Ohne x/y (entfernt)
```

| Aspekt | Wert |
|--------|------|
| Source Layout | `positioned` |
| Target Layout | `flex` |
| Properties Removed | `x`, `y` |

---

## 3. Stacked/Absolute Positioning (Detailliert)

Stacked Container ermöglichen freie Positionierung mit x/y Koordinaten. Dieser Abschnitt beschreibt alle spezifischen Use Cases.

### UC-ABS-01: Element in leeren Stacked Container droppen

**Szenario:** User zieht `Button` in einen leeren stacked Container

```
Ausgangszustand:
Frame stacked, w 400, h 300
  // komplett leer

Cursor Position: x=200, y=150 (Mitte)

Nach Drop:
Frame stacked, w 400, h 300
  Button x 200, y 150
```

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│            ┌──────────┐              │
│            │  Button  │ ← Drop hier  │
│            └──────────┘              │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Target Layout | `positioned` |
| Strategy | `AbsolutePositionStrategy` |
| Visual | Ghost (lila, zentriert unter Cursor) |
| Koordinaten | Relativ zum Container (nicht Screen) |
| Code Result | `Button x 200, y 150` |

---

### UC-ABS-02: Element neben bestehendes Element positionieren

**Szenario:** User positioniert zweites Element neben erstem

```
Ausgangszustand:
Frame stacked, w 400, h 300
  Box x 50, y 50, w 80, h 80

Cursor Position: x=200, y=50

Nach Drop:
Frame stacked, w 400, h 300
  Box x 50, y 50, w 80, h 80
  Button x 200, y 50              ← Neue Position
```

```
┌──────────────────────────────────────┐
│                                      │
│   ┌────────┐      ┌──────────┐      │
│   │  Box   │      │  Button  │ ←NEW │
│   │ (alt)  │      │  (neu)   │      │
│   └────────┘      └──────────┘      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Besonderheit | Kein Einfluss auf bestehende Elemente |
| Z-Index | Neues Element oben (später im Code = höher) |
| Überlappung | Erlaubt, keine Kollisionsprüfung |

---

### UC-ABS-03: Badge auf Icon (Overlay Pattern)

**Szenario:** Typisches UI-Pattern - Badge-Zähler auf Icon

```
Ausgangszustand:
Frame stacked, w 44, h 44
  Icon "bell", x 10, y 10

Cursor Position: x=30, y=0 (oben rechts)

Nach Drop:
Frame stacked, w 44, h 44
  Icon "bell", x 10, y 10
  Frame x 30, y 0, w 18, h 18, bg #ef4444, rad 99
    Text "3", col white, fs 10
```

```
┌─────────────────┐
│      ┌───┐      │
│      │ 3 │ ← Badge oben rechts
│   ┌──┴───┴──┐   │
│   │  🔔    │   │
│   │  Icon   │   │
│   └─────────┘   │
└─────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Pattern | Overlay/Badge |
| Typische Größe | Badge 18×18, Icon 24×24 |
| Position | Offset vom Icon-Container |
| Z-Order | Badge nach Icon im Code |

---

### UC-ABS-04: Überlappende Elemente (Z-Index)

**Szenario:** Mehrere Elemente überlappen sich

```
Frame stacked, w 300, h 200
  Frame x 20, y 20, w 100, h 100, bg blue    ← Unten (erstes)
  Frame x 60, y 60, w 100, h 100, bg green   ← Mitte
  Frame x 100, y 100, w 100, h 100, bg red   ← Oben (letztes)
```

```
┌─────────────────────────────────────┐
│                                     │
│   ┌──────────┐                      │
│   │  BLUE    │                      │
│   │    ┌─────┴────┐                 │
│   └────┤  GREEN   │                 │
│        │    ┌─────┴────┐            │
│        └────┤   RED    │            │
│             │  (oben)  │            │
│             └──────────┘            │
└─────────────────────────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Z-Order Regel | Später im Code = höher im Stack |
| Explizites z | `z 10` Property möglich |
| Drag Behavior | Oberstes Element wird gegriffen |

---

### UC-ABS-05: Element im Stacked Container repositionieren

**Szenario:** Bestehendes Element an neue Position ziehen

```
Ausgangszustand:
Frame stacked, w 400, h 300
  Button x 50, y 50    ← Drag von hier

Cursor bewegt sich zu: x=250, y=180

Nach Drop:
Frame stacked, w 400, h 300
  Button x 250, y 180  ← Neue Koordinaten
```

```
Vorher:                      Nachher:
┌────────────────────┐       ┌────────────────────┐
│ ┌────────┐         │       │                    │
│ │ Button │         │  →    │                    │
│ └────────┘         │       │         ┌────────┐ │
│                    │       │         │ Button │ │
└────────────────────┘       └─────────┴────────┴─┘
```

| Aspekt | Wert |
|--------|------|
| Operation | `updateNodePosition` |
| Code Change | Nur x/y Werte ändern sich |
| Visual | Ghost folgt Cursor |

---

### UC-ABS-06: Palette-Drop mit Default-Größe

**Szenario:** Element aus Panel hat Default-Size für Ghost

```
User zieht "Dialog" aus ComponentPanel

Ghost-Anzeige während Drag:
┌───────────────────────────────────────┐
│                                       │
│       ┌─────────────────────┐         │
│       │                     │         │
│       │   Dialog-Ghost      │ 400×300 │
│       │   (lila, 60% opa)   │         │
│       │                     │         │
│       └─────────────────────┘         │
│                                       │
└───────────────────────────────────────┘
```

| Component | Default Width | Default Height |
|-----------|---------------|----------------|
| Frame | 100 | 100 |
| Button | 100 | 40 |
| Input | 200 | 40 |
| Dialog | 400 | 300 |
| Card | 280 | 200 |

---

### UC-ABS-07: Canvas-Element in Stacked verschieben (Layout-Wechsel)

**Szenario:** Element aus Flex-Layout wird in Stacked verschoben

```
Ausgangszustand:
Frame ver, gap 8
  Button "A"
  Button "B"        ← Drag dieses Element

Frame stacked, w 300, h 200
  Icon x 10, y 10

Cursor Position im stacked: x=150, y=100

Nach Drop:
Frame ver, gap 8
  Button "A"
                    ← B ist weg

Frame stacked, w 300, h 200
  Icon x 10, y 10
  Button "B", x 150, y 100   ← Mit neuen Koordinaten
```

| Aspekt | Wert |
|--------|------|
| Layout-Wechsel | flex → positioned |
| Properties Added | `x 150, y 100` |
| Properties Removed | (keine, Flex hat keine Position) |
| Operation | `moveNodeAbsolute` |

---

### UC-ABS-08: Stacked-Element in Flex verschieben (Layout-Wechsel)

**Szenario:** Element verlässt absolute Positionierung

```
Ausgangszustand:
Frame stacked, w 300, h 200
  Button x 100, y 50    ← Drag

Frame ver, gap 8
  Text "Item 1"
  Text "Item 2"

Nach Drop (zwischen Items):
Frame stacked, w 300, h 200
                        ← Button ist weg

Frame ver, gap 8
  Text "Item 1"
  Button                ← Ohne x/y!
  Text "Item 2"
```

| Aspekt | Wert |
|--------|------|
| Layout-Wechsel | positioned → flex |
| Properties Removed | `x`, `y` werden entfernt |
| Visual während Drag | Ghost → Line (wechselt!) |

---

### UC-ABS-09: Präzise Ecken-Positionierung

**Szenario:** Element an Container-Ecke positionieren

```
Frame stacked, w 200, h 150

4 Ecken-Positionen:
┌─────────────────────────────────────┐
│ ┌────┐                     ┌────┐  │
│ │ TL │                     │ TR │  │
│ │0,0 │                     │180,0│ │
│ └────┘                     └────┘  │
│                                     │
│ ┌────┐                     ┌────┐  │
│ │ BL │                     │ BR │  │
│ │0,130│                   │180,130││
│ └────┘                     └────┘  │
└─────────────────────────────────────┘
```

| Position | x | y | Berechnung |
|----------|---|---|------------|
| Top-Left | 0 | 0 | Cursor nahe Ecke |
| Top-Right | containerW - elementW | 0 | 200-20=180 |
| Bottom-Left | 0 | containerH - elementH | 150-20=130 |
| Bottom-Right | containerW - elementW | containerH - elementH | |

---

### UC-ABS-10: Mehrere Elemente als Gruppe positionieren

**Szenario:** Toolbar oder Button-Gruppe im Stacked

```
Frame stacked, w 400, h 60

Toolbar am oberen Rand:
┌──────────────────────────────────────────┐
│ ┌──────┐ ┌──────┐ ┌──────┐              │
│ │ Save │ │ Edit │ │ Del  │              │
│ │ x=10 │ │ x=80 │ │x=150 │              │
│ └──────┘ └──────┘ └──────┘              │
└──────────────────────────────────────────┘

Mirror Code:
Frame stacked, w 400, h 60
  Button "Save", x 10, y 10
  Button "Edit", x 80, y 10
  Button "Delete", x 150, y 10
```

| Aspekt | Wert |
|--------|------|
| Pattern | Manuelle Toolbar |
| Alternative | Flex-Container als Kind von Stacked |
| Alignment | Manuell über x-Werte |

---

### UC-ABS-11: Stacked Container in Stacked Container (Nested)

**Szenario:** Verschachtelte absolute Positionierung

```
Frame stacked, w 400, h 300
  Frame stacked, x 50, y 50, w 200, h 150    ← Inner stacked
    Icon x 10, y 10                          ← Relativ zu Inner!
    Button x 80, y 100
```

```
┌──────────────────────────────────────────┐
│                                          │
│   ┌─────────────────────────┐            │
│   │ Inner (x=50, y=50)      │            │
│   │  ┌────┐                 │            │
│   │  │Icon│ (x=10 von Inner)│            │
│   │  └────┘                 │            │
│   │           ┌──────┐      │            │
│   │           │Button│      │            │
│   │           └──────┘      │            │
│   └─────────────────────────┘            │
│                                          │
└──────────────────────────────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Koordinaten-Referenz | Immer relativ zum direkten Parent |
| Inner Icon Position | x=10 relativ zu Inner, nicht zu Outer |
| Absolute Screen-Position | 50+10 = 60 vom Outer-Rand |

---

### UC-ABS-12: Ghost-Zentrierung unter Cursor

**Szenario:** Ghost wird zentriert unter Cursor angezeigt

```
Element-Größe: 100×40
Cursor-Position: x=200, y=150

Ghost-Position:
  left = cursorX - width/2 = 200 - 50 = 150
  top  = cursorY - height/2 = 150 - 20 = 130

┌───────────────────────────────────────┐
│                                       │
│              ┌─────────────┐          │
│              │    Ghost    │          │
│              │   100×40    │          │
│              │      ✕      │ ← Cursor │
│              └─────────────┘          │
│                                       │
└───────────────────────────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Ghost X | `cursor.x - element.width / 2` |
| Ghost Y | `cursor.y - element.height / 2` |
| Drop Position | Cursor-Position (zentriert) |

---

### UC-ABS-13: Scroll im Stacked Container

**Szenario:** Stacked Container mit Scroll

```
Frame stacked, w 300, h 200, scroll
  // Inhalt größer als Container
  Frame x 50, y 50, w 400, h 300   ← Größer!

Wenn gescrollt:
  scrollLeft = 100
  scrollTop = 50

Drop-Berechnung:
  x = cursorX - containerRect.left + scrollLeft
  y = cursorY - containerRect.top + scrollTop
```

| Aspekt | Wert |
|--------|------|
| Scroll-Korrektur | `+ scrollLeft`, `+ scrollTop` |
| Visual Position | Screen-Koordinaten |
| Code Position | Container-relative + Scroll |

---

### UC-ABS-14: Zoom-Korrektur bei Absolute

**Szenario:** Preview ist gezoomt (z.B. 50%)

```
Preview Zoom: 0.5 (50%)
Cursor Screen-Position: x=200, y=150
Container Screen-Position: left=100, top=100

Berechnung:
  relativeX = (200 - 100) / 0.5 = 200
  relativeY = (150 - 100) / 0.5 = 100

Code Result:
  Button x 200, y 100   ← Skalierte Koordinaten
```

| Aspekt | Wert |
|--------|------|
| Zoom Factor | `previewZoom` (0.5 = 50%) |
| Formel | `(cursor - containerOffset) / zoom` |
| Wichtig | Code-Koordinaten sind immer 1:1 |

---

### UC-ABS-15: Alt+Drag Duplicate in Stacked

**Szenario:** Element duplizieren mit Alt-Key

```
Ausgangszustand:
Frame stacked, w 300, h 200
  Button x 50, y 50    ← Alt + Drag

Cursor bewegt sich zu: x=150, y=100

Nach Drop:
Frame stacked, w 300, h 200
  Button x 50, y 50    ← Original bleibt!
  Button x 150, y 100  ← Kopie an neuer Position
```

| Aspekt | Wert |
|--------|------|
| Operation | `duplicate` + Position |
| Original | Unverändert |
| Kopie | Neue x/y Koordinaten |

---

## 4. Layout-Typen im Detail

### Layout: Flex Vertical (Standard)

```
Frame gap 8
  ┌─────────────┐
  │   Child 1   │
  ├─────────────┤  ← Insertion Line (horizontal)
  │   Child 2   │
  ├─────────────┤  ← Insertion Line (horizontal)
  │   Child 3   │
  └─────────────┘
```

| Property | Wert |
|----------|------|
| CSS | `display: flex; flex-direction: column` |
| Gap | `gap: 8px` |
| Insertion Line | Horizontal, volle Breite |
| Index Calculation | Y-Achse, Child-Mittelpunkte |

---

### Layout: Flex Horizontal

```
Frame hor, gap 8
  ┌───────┬───────┬───────┐
  │ Child │ Child │ Child │
  │   1   │   2   │   3   │
  └───────┴───────┴───────┘
      ↑       ↑
  Insertion Lines (vertikal)
```

| Property | Wert |
|----------|------|
| CSS | `display: flex; flex-direction: row` |
| Insertion Line | Vertikal, volle Höhe |
| Index Calculation | X-Achse, Child-Mittelpunkte |

---

### Layout: Positioned/Stacked

```
Frame stacked, w 400, h 300
  ┌──────────────────────────────────┐
  │                                  │
  │    ┌─────┐                       │
  │    │ x,y │ ← Freie Positionierung│
  │    └─────┘                       │
  │                                  │
  │              ┌─────┐             │
  │              │Ghost│ ← Cursor    │
  │              └─────┘             │
  └──────────────────────────────────┘
```

| Property | Wert |
|----------|------|
| CSS | `position: relative` (Container), `position: absolute` (Kinder) |
| Visual | Ghost (lila, halbtransparent) |
| Coordinates | Relativ zum Container |
| DSL Properties | `x`, `y` |

---

### Layout: Grid

```
Frame grid 3, gap 8
  ┌─────┬─────┬─────┐
  │  1  │  2  │  3  │
  ├─────┼─────┼─────┤
  │  4  │  5  │ ←── │ Drop in Zelle
  └─────┴─────┴─────┘
```

| Property | Wert |
|----------|------|
| CSS | `display: grid` |
| Strategy | Wie Flex (FlexWithChildren) |
| Besonderheit | Zellen-basierte Platzierung |

---

### Layout: None (Leaf Elements)

```
┌─────────────────────────────────┐
│  Parent Frame                   │
│  ┌─────────┬─────────┬────────┐ │
│  │  Text   │  Text   │  Text  │ │
│  │   A     │   B     │   C    │ │
│  └─────────┴─────────┴────────┘ │
│       ↑         ↑               │
│   before B  after B             │
└─────────────────────────────────┘
```

| Property | Wert |
|----------|------|
| Kann Kinder haben? | Nein |
| Strategy | `NonContainerStrategy` |
| Placement | `before` oder `after` |
| Actual Target | Parent des Leaf Elements |

---

## 4. Children-Handling

### UC-CHILD-01: Container erkennt Kinder

```typescript
interface DropTarget {
  hasChildren: boolean  // true wenn [data-mirror-id] Kinder existieren
  layoutType: LayoutType
  direction: Direction
}
```

**Detection Logic:**
1. Finde alle direkten Kinder mit `[data-mirror-id]`
2. Filtere Text-Nodes und Whitespace
3. `hasChildren = children.length > 0`

---

### UC-CHILD-02: Insertion Index Berechnung

**Vertikaler Container:**
```
Cursor Y Position:
  ┌─────────┐ midpoint = 50
  │ Child 0 │
  └─────────┘
  ── Cursor bei Y=60 → Index = 1 ──
  ┌─────────┐ midpoint = 110
  │ Child 1 │
  └─────────┘
```

**Algorithmus:**
```typescript
for (let i = 0; i < childRects.length; i++) {
  const midpoint = childRects[i].y + childRects[i].height / 2
  if (cursor.y < midpoint) {
    return i  // Insert before this child
  }
}
return childRects.length  // Insert at end
```

---

### UC-CHILD-03: Gap zwischen Kindern

**Visual Positioning mit Gap:**
```
Child 0     Gap=8    Child 1
┌───────┐          ┌───────┐
│       │          │       │
└───────┘          └───────┘
        ↑
   Insertion Line mittig im Gap
```

**Line Position:**
```typescript
const lineY = childRects[i-1].y + childRects[i-1].height + gap/2
```

---

### UC-CHILD-04: Leerer Container

**Wenn keine Kinder:**
```
┌─────────────────────┐
│  ┌─ ─ ─ ─ ─ ─ ─ ┐  │
│  │               │  │  ← Gestrichelter Outline
│  │    DROP       │  │
│  │    HERE       │  │
│  └─ ─ ─ ─ ─ ─ ─ ┘  │
└─────────────────────┘
```

| Aspekt | Wert |
|--------|------|
| Strategy | `SimpleInsideStrategy` |
| Visual | Outline (blau, gestrichelt) |
| Insertion Index | `0` |

---

## 5. Visual Feedback Typen

### Visual: Insertion Line

```
┌─────────────────────┐
│     Child 0         │
├─────────────────────┤  ← Blaue Linie, 2px hoch
│     Child 1         │     volle Container-Breite
└─────────────────────┘
```

| Property | Wert |
|----------|------|
| Farbe | `#2271C1` (Primary Blue) |
| Dicke | `2px` |
| Orientierung | Horizontal (ver) / Vertikal (hor) |
| Länge | Container-Breite/-Höhe |

---

### Visual: Ghost (Absolute)

```
┌──────────────────────────┐
│                          │
│      ┌──────────┐        │
│      │  Ghost   │ ← Unter Cursor
│      │  100x40  │   zentriert
│      └──────────┘
│                          │
└──────────────────────────┘
```

| Property | Wert |
|----------|------|
| Farbe | `#7c3aed` (Purple) |
| Opacity | `0.6` |
| Größe | Element-Größe oder `DEFAULT_SIZES` |
| Position | Unter Cursor, zentriert |

---

### Visual: Container Outline

```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│                          │
│   Leerer Container       │  ← Gestrichelter Rahmen
│   für Drop bereit        │
│                          │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

| Property | Wert |
|----------|------|
| Farbe | `#2271C1` (Primary Blue) |
| Stil | `dashed` |
| Dicke | `2px` |
| Inset | `4px` vom Container-Rand |

---

### Visual: Parent Highlight

```
┌─────────────────────────┐ ← Zusätzlicher Outline
│  Parent Container       │    zeigt Ziel-Container
│  ┌───────────────────┐  │
│  │ Drop Target Area  │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

| Property | Wert |
|----------|------|
| Zweck | Zeigt welcher Container den Drop erhält |
| Farbe | Blau, leicht transparent |
| Timing | Erscheint bei `over-target` State |

---

## 6. State Machine Transitions

### Vollständiger State Flow

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  IDLE ──DRAG_START──► DRAGGING ◄──┐                         │
│                          │        │                          │
│                    TARGET_FOUND   │                          │
│                          │        │                          │
│                          ▼        │                          │
│                     OVER_TARGET ──┘                          │
│                          │     TARGET_LOST                   │
│                          │                                   │
│                     DRAG_END                                 │
│                          │                                   │
│                          ▼                                   │
│                      DROPPED ──► Effects ausführen           │
│                          │                                   │
│                          ▼                                   │
│                        IDLE                                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Events

| Event | Auslöser | Effekt |
|-------|----------|--------|
| `DRAG_START` | mousedown + Bewegung | Startet Drag |
| `DRAG_MOVE` | mousemove | Aktualisiert Cursor |
| `TARGET_FOUND` | Element unter Cursor ist gültiges Ziel | Zeigt Visual |
| `TARGET_LOST` | Kein gültiges Ziel mehr | Versteckt Visual |
| `TARGET_UPDATED` | Cursor bewegt sich im Ziel | Aktualisiert Index |
| `DRAG_END` | mouseup | Führt Drop aus |
| `DRAG_CANCEL` | Escape / dragend | Bricht ab |
| `ALT_KEY_DOWN` | Alt gedrückt | Aktiviert Duplicate Mode |
| `ALT_KEY_UP` | Alt losgelassen | Deaktiviert Duplicate Mode |

---

## 7. Edge Cases & Spezialfälle

### EC-01: Drop auf sich selbst

**Verhindert:** Element kann nicht in sich selbst gedroppt werden

```typescript
if (source.nodeId === target.nodeId) {
  return null  // Kein gültiges Target
}
```

---

### EC-02: Drop auf eigenes Kind

**Verhindert:** Würde zirkuläre Referenz erzeugen

```typescript
if (isDescendantOf(target.nodeId, source.nodeId)) {
  return null
}
```

---

### EC-03: Zoom-Korrektur

**Koordinaten werden für Zoom skaliert:**

```typescript
const scale = previewZoom || 1
const adjustedX = (cursor.x - containerRect.left) / scale
const adjustedY = (cursor.y - containerRect.top) / scale
```

---

### EC-04: Scroll-Korrektur

**Container-Scroll wird berücksichtigt:**

```typescript
const adjustedX = cursor.x + container.scrollLeft
const adjustedY = cursor.y + container.scrollTop
```

---

### EC-05: Mode Switch Debouncing

**80ms Verzögerung beim Wechsel flex ↔ absolute:**

```typescript
// Verhindert Flackern bei schnellen Bewegungen
debounce(switchMode, 80)
```

---

### EC-06: Außerhalb des Containers

**Wenn Cursor den Container verlässt:**

```
┌─────────────────┐
│    Container    │
│                 │
└─────────────────┘
        ↓ Cursor hier draußen

→ TARGET_LOST Event
→ Visuals versteckt
→ State: DRAGGING (nicht mehr OVER_TARGET)
```

---

## 8. Default Sizes (Palette Drops)

Wenn Elemente aus dem Panel gezogen werden, haben sie vordefinierte Größen für den Ghost:

| Component | Width | Height |
|-----------|-------|--------|
| Button | 100 | 40 |
| Input | 200 | 40 |
| Textarea | 200 | 100 |
| Text | 80 | 24 |
| Icon | 24 | 24 |
| Image | 150 | 100 |
| Frame | 100 | 100 |
| Dialog | 400 | 300 |
| Select | 200 | 40 |
| Tabs | 300 | 200 |
| Card | 280 | 200 |
| Table | 400 | 200 |

---

## 9. Code Modifier Operationen

### Für Palette Drops (Add)

```typescript
// Flex Layout
codeModifier.addChild(parentId, componentName, {
  position: insertionIndex,
  properties: defaultProps
})

// Absolute Layout
codeModifier.addChildAbsolute(parentId, componentName, {
  x, y
}, {
  properties: defaultProps
})
```

### Für Canvas Moves

```typescript
// Flex Layout
codeModifier.moveNode(sourceId, targetId, placement, insertionIndex)
// placement: 'inside' | 'before' | 'after'

// Absolute Layout
codeModifier.moveNodeAbsolute(sourceId, targetId, { x, y })

// Position Update (gleicher Container)
codeModifier.updateNodePosition(nodeId, { x, y })
```

### Für Duplicate (Alt+Drag)

```typescript
codeModifier.duplicate(sourceId, targetId, insertionIndex)
```

---

## 10. Zusammenfassung Matrix

| Use Case | Source | Target Layout | Strategy | Visual | Operation |
|----------|--------|---------------|----------|--------|-----------|
| Add to empty flex | palette | flex (empty) | SimpleInside | Outline | addChild(0) |
| Add between children | palette | flex (children) | FlexWithChildren | Line | addChild(i) |
| Add to stacked | palette | positioned | AbsolutePosition | Ghost | addChildAbsolute |
| Add on leaf | palette | none | NonContainer | Line | addChild before/after |
| Move in same container | canvas | flex | FlexWithChildren | Line | moveNode |
| Move to other container | canvas | flex | FlexWithChildren | Line | moveNode |
| Move to stacked | canvas | positioned | AbsolutePosition | Ghost | moveNodeAbsolute |
| Duplicate | canvas+Alt | any | * | * | duplicate |
| Reposition absolute | canvas | positioned | AbsolutePosition | Ghost | updatePosition |

---

## 11. Testbarkeit der Use Cases

Die Hexagonale Architektur macht **jeden Use Case direkt testbar** ohne DOM oder Browser.

### Architektur-Prinzip

```
┌──────────────────────────────────────────────────────────────────┐
│                         PURE CORE                                 │
│  ┌──────────────────┐   ┌──────────────────┐                     │
│  │  State Machine   │   │    Strategies    │  ← Kein DOM!        │
│  │  (transitions)   │   │  (calculations)  │    Pure Functions   │
│  └──────────────────┘   └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Ports (Interfaces)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         ADAPTERS                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │ MockAdapters │   │ DOMAdapters  │   │ NativeAdapter│         │
│  │  (Tests)     │   │ (Production) │   │ (Panel)      │         │
│  └──────────────┘   └──────────────┘   └──────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Test-Kategorien

| Kategorie | Was wird getestet | Wie | Datei |
|-----------|-------------------|-----|-------|
| **Unit** | State Machine Transitions | Pure Function Calls | `state-machine.test.ts` |
| **Unit** | Strategy Calculations | Mock Rects + Cursor | `strategies/*.test.ts` |
| **Integration** | Controller + Ports | Mock Adapters | `drag-drop-controller.test.ts` |
| **Integration** | Full Flow | Mock Adapters | `drag-drop-integration.test.ts` |
| **E2E** | Real Browser | Playwright | `drag-drop-e2e.test.ts` |

---

### Beispiel: UC-ADD-02 testen (Primitive zwischen Kinder)

**Use Case:** User zieht `Text` zwischen zwei Buttons

```typescript
// tests/studio/drag-drop/strategies/flex-with-children.test.ts

describe('FlexWithChildrenStrategy', () => {
  it('UC-ADD-02: calculates insertion index between children', () => {
    // ARRANGE - Kein DOM nötig, nur Rects
    const strategy = new FlexWithChildrenStrategy()

    const childRects: ChildRect[] = [
      { id: 'btn-a', x: 0, y: 0, width: 100, height: 40 },    // midpoint y=20
      { id: 'btn-b', x: 0, y: 48, width: 100, height: 40 },   // midpoint y=68
    ]

    const target: DropTarget = {
      nodeId: 'frame-1',
      layoutType: 'flex',
      direction: 'vertical',
      hasChildren: true
    }

    // ACT - Cursor zwischen den Kindern (y=40)
    const cursor = { x: 50, y: 40 }
    const result = strategy.calculate(cursor, target, mockSource, childRects)

    // ASSERT
    expect(result.insertionIndex).toBe(1)  // Nach btn-a, vor btn-b
    expect(result.placement).toBe('inside')
  })
})
```

---

### Beispiel: UC-ABS-05 testen (Repositionieren)

**Use Case:** Element im Stacked Container repositionieren

```typescript
// tests/studio/drag-drop/strategies/absolute-position.test.ts

describe('AbsolutePositionStrategy', () => {
  it('UC-ABS-05: calculates new position relative to container', () => {
    // ARRANGE
    const strategy = new AbsolutePositionStrategy()

    const containerRect: Rect = { x: 100, y: 100, width: 400, height: 300 }

    const target: DropTarget = {
      nodeId: 'stacked-frame',
      layoutType: 'positioned',
      hasChildren: true
    }

    // ACT - Cursor bei Screen x=350, y=280
    const cursor = { x: 350, y: 280 }
    const result = strategy.calculate(cursor, target, mockSource, [], containerRect)

    // ASSERT - Relativ zum Container
    expect(result.placement).toBe('absolute')
    expect(result.position).toEqual({
      x: 250,  // 350 - 100
      y: 180   // 280 - 100
    })
  })
})
```

---

### Beispiel: UC-ABS-14 testen (Zoom-Korrektur)

```typescript
describe('AbsolutePositionStrategy with zoom', () => {
  it('UC-ABS-14: applies zoom correction to coordinates', () => {
    const strategy = new AbsolutePositionStrategy()

    const containerRect = { x: 100, y: 100, width: 400, height: 300 }
    const zoom = 0.5  // 50%

    // Screen cursor at 200, 150
    const cursor = { x: 200, y: 150 }

    const result = strategy.calculate(cursor, target, source, [], containerRect, { zoom })

    // Position should be scaled up
    expect(result.position).toEqual({
      x: (200 - 100) / 0.5,  // = 200
      y: (150 - 100) / 0.5   // = 100
    })
  })
})
```

---

### Beispiel: State Machine Transitions testen

```typescript
// tests/studio/drag-drop/state-machine.test.ts

describe('DragDropStateMachine', () => {
  it('transitions idle → dragging on DRAG_START', () => {
    const state = createInitialState()

    const event: DragEvent = {
      type: 'DRAG_START',
      source: { type: 'palette', componentName: 'Button' },
      cursor: { x: 100, y: 100 }
    }

    const result = transition(state, event)

    expect(result.state).toBe('dragging')
    expect(result.context.source).toEqual(event.source)
    expect(result.effects).toContainEqual({ type: 'NOTIFY_DRAG_START' })
  })

  it('emits EXECUTE_DROP effect on DRAG_END over target', () => {
    const state = createStateInOverTarget(mockTarget, mockResult)

    const event: DragEvent = { type: 'DRAG_END' }
    const result = transition(state, event)

    expect(result.state).toBe('dropped')
    expect(result.effects).toContainEqual({
      type: 'EXECUTE_DROP',
      source: state.context.source,
      result: mockResult
    })
  })
})
```

---

### Beispiel: Full Flow mit Mock Adapters

```typescript
// tests/studio/drag-drop/drag-drop-integration.test.ts

describe('DragDrop Full Flow', () => {
  it('UC-ADD-02: adds element between children', async () => {
    // ARRANGE - Mock Adapters (kein DOM!)
    const mockPorts = createMockPorts()
    const controller = new DragDropController(mockPorts)

    // Setup: Frame mit 2 Kindern
    mockPorts.layout.setChildRects('frame-1', [
      { id: 'btn-a', x: 0, y: 0, width: 100, height: 40 },
      { id: 'btn-b', x: 0, y: 48, width: 100, height: 40 },
    ])
    mockPorts.targetDetection.setTarget({
      nodeId: 'frame-1',
      layoutType: 'flex',
      direction: 'vertical',
      hasChildren: true
    })

    // ACT - Simuliere Drag-Flow
    mockPorts.events.simulateDragStart({
      type: 'palette',
      componentName: 'Text'
    }, { x: 50, y: 40 })

    mockPorts.events.simulateDragMove({ x: 50, y: 40 })
    mockPorts.events.simulateDragEnd()

    // ASSERT - Execution wurde aufgerufen
    expect(mockPorts.execution.getLastCall()).toEqual({
      source: { type: 'palette', componentName: 'Text' },
      result: {
        target: expect.objectContaining({ nodeId: 'frame-1' }),
        placement: 'inside',
        insertionIndex: 1
      }
    })

    // ASSERT - Visuals wurden gezeigt
    expect(mockPorts.visual.getIndicatorHistory()).toContainEqual({
      type: 'line',
      direction: 'horizontal'
    })
  })
})
```

---

### Beispiel: Layout-Wechsel testen (UC-ABS-07)

```typescript
describe('Layout Context Switch', () => {
  it('UC-ABS-07: adds x/y when moving from flex to stacked', async () => {
    const mockPorts = createMockPorts()
    const controller = new DragDropController(mockPorts)

    // Source: Canvas element in flex container
    const source = { type: 'canvas', nodeId: 'btn-b' }

    // Target: Stacked container
    mockPorts.targetDetection.setTarget({
      nodeId: 'stacked-frame',
      layoutType: 'positioned',
      hasChildren: true
    })
    mockPorts.layout.setContainerRect('stacked-frame', {
      x: 0, y: 0, width: 300, height: 200
    })

    // ACT
    mockPorts.events.simulateDragStart(source, { x: 50, y: 50 })
    mockPorts.events.simulateDragMove({ x: 150, y: 100 })
    mockPorts.events.simulateDragEnd()

    // ASSERT
    const execution = mockPorts.execution.getLastCall()
    expect(execution.result.placement).toBe('absolute')
    expect(execution.result.position).toEqual({ x: 150, y: 100 })
  })
})
```

---

### Use Case → Test Mapping

| Use Case | Test Typ | Zu testen |
|----------|----------|-----------|
| **UC-ADD-01** | Unit | `SimpleInsideStrategy.calculate()` |
| **UC-ADD-02** | Unit | `FlexWithChildrenStrategy.calculate()` |
| **UC-ADD-05** | Unit | `AbsolutePositionStrategy.calculate()` |
| **UC-ADD-07** | Unit | `NonContainerStrategy.calculate()` |
| **UC-MOVE-04** | Integration | Alt-Key Event + duplicate |
| **UC-ABS-04** | Unit | Z-Index/Reihenfolge |
| **UC-ABS-07** | Integration | Layout-Wechsel flex→positioned |
| **UC-ABS-08** | Integration | Layout-Wechsel positioned→flex |
| **UC-ABS-13** | Unit | Scroll-Korrektur |
| **UC-ABS-14** | Unit | Zoom-Korrektur |
| **State Transitions** | Unit | `transition(state, event)` |
| **Visual Feedback** | Integration | Mock Visual Port |
| **Full E2E** | E2E | Playwright |

---

### Vorteile der Architektur

| Aspekt | Vorteil |
|--------|---------|
| **Pure State Machine** | Keine Mocks nötig, pure function tests |
| **Pure Strategies** | Input → Output, deterministisch |
| **Mock Ports** | Vollständige Kontrolle über alle Abhängigkeiten |
| **No DOM Required** | Tests laufen in Millisekunden |
| **Deterministic** | Same input = same output |
| **Effect-based** | Side effects als Daten, nicht als Aufrufe |

---

## Verwandte Dokumente

- [Drag-Drop Architecture](./drag-drop-architecture.md) - Technische Architektur
- [Drag-Drop Absolute Positioning](./drag-drop-absolute-positioning.md) - Absolute Positionierung Spec

