# Drag & Drop Verhalten

Dieses Dokument beschreibt das erwartete Verhalten beim Drag & Drop von Komponenten im Preview.

## Übersicht

Das Verhalten unterscheidet sich fundamental je nach Container-Typ:

| Container-Typ | Layout | Drop-Verhalten |
|---------------|--------|----------------|
| Vertical (`ver`) | Flex Column | Insertion zwischen Kindern |
| Horizontal (`hor`) | Flex Row | Insertion zwischen Kindern |
| Position (`pos`, `stacked`) | Absolute | Freie Platzierung mit x/y |

---

## 1. Vertical / Horizontal Container

### 1.1 Container mit bestehenden Kindern

**Visuelles Feedback:**
- Kein Ghost-Element am Cursor
- **Insertion Indicator**: Linie zwischen Kindern zeigt Drop-Position
- Indicator-Farbe: Blau (`#3b82f6`) oder Theme-Akzent

**Indicator-Positionierung:**
```
Vertical Container:
┌─────────────────────────┐
│  ┌─────────────────┐    │
│  │     Child 1     │    │
│  └─────────────────┘    │
│  ══════════════════ ← Indicator (horizontal)
│  ┌─────────────────┐    │
│  │     Child 2     │    │
│  └─────────────────┘    │
└─────────────────────────┘

Horizontal Container:
┌──────────────────────────────┐
│  ┌───────┐ ║ ┌───────┐       │
│  │Child 1│ ║ │Child 2│       │
│  └───────┘ ║ └───────┘       │
│            ↑                 │
│       Indicator (vertical)   │
└──────────────────────────────┘
```

**Berechnung der Position:**
- Cursor Y (vertical) oder X (horizontal) wird mit Kindmitte verglichen
- Oberhalb/Links der Mitte → vor diesem Kind
- Unterhalb/Rechts der Mitte → nach diesem Kind

**Code-Änderung beim Drop:**
```
// Vorher
Box ver
  Text "Eins"
  Text "Drei"

// Drop "Zwei" zwischen "Eins" und "Drei"
Box ver
  Text "Eins"
  Text "Zwei"    ← Eingefügt an Index 1
  Text "Drei"
```

### 1.2 Leerer Container (keine Kinder)

**Visuelles Feedback:**
- Container zeigt **keine** sichtbare Unterteilung
- Beim Bewegen des Elements erscheint ein **Snap-Indicator**
- Indicator zeigt die Position, an der das Element platziert wird
- Indicator snappt in eine von 9 logischen Zonen (3×3)

```
Logische Zonen (unsichtbar):
┌────────────────────────────┐
│  TL    │   TC    │   TR    │
├────────┼─────────┼─────────┤
│  ML    │   MC    │   MR    │
├────────┼─────────┼─────────┤
│  BL    │   BC    │   BR    │
└────────────────────────────┘

Visuell sichtbar: Nur der Indicator
┌────────────────────────────┐
│                            │
│                            │
│          ┌─────┐           │
│          │ ▢▢▢ │ ← Indicator snappt zur Cursor-Zone
│          └─────┘           │
│                            │
└────────────────────────────┘
```

**Wichtig: Parent wird modifiziert, nicht das Kind**

Das `align` Property wird auf dem **Container** gesetzt, nicht auf dem Kind-Element:

```
// Vorher: Leerer Container
Box ver

// Drop in rechte Mitte → Parent bekommt align
Box ver, align right    ← align auf PARENT gesetzt
  Button "Neu"          ← Kind hat KEIN align
```

**Sektions-Mapping zu Parent-Properties:**

| Zone | Vertical Container | Horizontal Container |
|------|-------------------|---------------------|
| TL | `align top left` | `align top left` |
| TC | `align top` | `align top center` |
| TR | `align top right` | `align top right` |
| ML | `align left` | `align center left` |
| MC | `center` | `center` |
| MR | `align right` | `align center right` |
| BL | `align bottom left` | `align bottom left` |
| BC | `align bottom` | `align bottom center` |
| BR | `align bottom right` | `align bottom right` |

### 1.3 Edge Cases

**Verschachtelte Container:**
- Tiefster Container unter Cursor ist Ziel
- Wenn Cursor nahe am Rand → Parent-Container als Ziel

**Drag über eigenen Parent:**
- Element kann zwischen Geschwistern verschoben werden
- Aber nicht in sich selbst gedroppt werden

---

## 2. Position Container

### 2.1 Grundverhalten

**Visuelles Feedback:**
- **Ghost-Element** folgt dem Cursor
- Ghost ist semi-transparent (50% Opacity)
- Original-Element bleibt sichtbar (bei Move) oder nicht (bei neuer Komponente)

**Ghost muss exakt sein:**
- **Exakte Größe**: Ghost hat identische Dimensionen wie das Original
- **Exakte Position**: Ghost springt NICHT beim Drag-Start

**Offset-Berechnung (kritisch für gutes UX):**

Wenn User ein Element in der Mitte greift, bleibt der Cursor in der Mitte des Ghosts.
Wenn User am Rand greift, bleibt der Cursor am Rand.

```
Greifpunkt speichern:
┌─────────────────────────────┐
│  ┌─────────┐                │
│  │    ✕    │ ← User klickt hier (Mitte)
│  └─────────┘                │
│                             │
│  Offset = Cursor - Element.TopLeft
│         = (55, 25) - (40, 20) = (15, 5)
└─────────────────────────────┘

Beim Bewegen:
┌─────────────────────────────┐
│                             │
│       ┌─────────┐           │
│       │    ✕    │ ← Cursor bleibt relativ gleich
│       └─────────┘           │
│                             │
│  Ghost.TopLeft = Cursor - Offset
│                = (120, 80) - (15, 5) = (105, 75)
└─────────────────────────────┘
```

**Falsch (springender Ghost):**
```
User greift Element am rechten Rand:
┌─────────┐
│       ✕ │ ← Klick
└─────────┘

Ghost springt so dass Cursor in Mitte ist:
    ┌─────────┐
    │    ✕    │ ← FALSCH! Ghost ist "gesprungen"
    └─────────┘
```

**Richtig (stabiler Ghost):**
```
User greift Element am rechten Rand:
┌─────────┐
│       ✕ │ ← Klick
└─────────┘

Ghost behält relativen Greifpunkt:
┌─────────┐
│       ✕ │ ← RICHTIG! Cursor bleibt am rechten Rand
└─────────┘
```

### 2.2 Grid-Snapping

**Wenn Grid aktiviert (z.B. 8px):**
- Ghost-Position wird auf Grid gerundet
- Visuelles Grid kann eingeblendet werden

```
Grid 8px:
┌────┬────┬────┬────┬────┐
│    │    │    │    │    │
├────┼────┼────┼────┼────┤
│    │    │ ┌──┴──┐ │    │
├────┼────┼─┤ghost├─┼────┤
│    │    │ └──┬──┘ │    │
├────┼────┼────┼────┼────┤
│    │    │    │    │    │
└────┴────┴────┴────┴────┘
         ↑
    Snapped to 8px grid
```

### 2.3 Smart Guides

**Alignment-Guides zu Geschwister-Elementen:**

| Guide-Typ | Beschreibung |
|-----------|--------------|
| Edge | Linke/Rechte/Obere/Untere Kante alignt |
| Center | Horizontale oder vertikale Mitte alignt |
| Spacing | Gleicher Abstand wie zwischen anderen Elementen |

```
Smart Guide Beispiel:
┌─────────────────────────────┐
│  ┌─────┐                    │
│  │  A  │                    │
│  └─────┘                    │
│     ↓ ← Vertical Guide      │
│  ┌ ─ ─ ┐                    │
│  │ghost│ ← Alignt mit A     │
│  └ ─ ─ ┘                    │
│                             │
└─────────────────────────────┘
```

**Guide-Visualisierung:**
- Dünne Linie (1-2px)
- Farbe: Pink/Magenta (`#ec4899`) oder Theme
- Erstreckt sich zwischen den alignten Elementen

### 2.4 Code-Änderung beim Drop

```
// Neue Komponente droppen
Box pos
  Text "Bestehend", x 10, y 10
  Button "Neu", x 150, y 80    ← Neu mit Koordinaten

// Bestehende verschieben
Box pos
  Text "Verschoben", x 200, y 120    ← x/y aktualisiert
```

---

## 3. Drag-Quellen

### 3.1 Komponenten-Palette

**Drag Start:**
- Mousedown auf Palette-Item startet Drag
- Sofort "pending" Phase (noch nicht aktiv)
- Nach 3px Bewegung → "dragging" Phase

**Drag-Daten:**
```typescript
{
  type: 'palette',
  componentName: 'Button',
  properties: 'w 100, h 40'  // Default-Properties
}
```

### 3.2 Bestehendes Element im Preview

**Drag Start:**
- Mousedown auf Element (wenn selektiert oder nach kurzer Verzögerung)
- Original-Rect wird gespeichert
- Alt-Key gedrückt → Duplizieren statt Verschieben

**Drag-Daten:**
```typescript
{
  type: 'element',
  nodeId: 'abc123',
  rect: { x: 100, y: 50, width: 120, height: 40 }
}
```

---

## 4. Drag-Phasen

```
┌─────────┐    ┌─────────┐    ┌──────────┐    ┌──────────┐
│  IDLE   │───▶│ PENDING │───▶│ DRAGGING │───▶│ COMPLETE │
└─────────┘    └─────────┘    └──────────┘    └──────────┘
     ▲              │              │               │
     │              ▼              ▼               │
     │         (< 3px)        (mouseup)            │
     │              │              │               │
     └──────────────┴──────────────┴───────────────┘
                      cancel / reset
```

| Phase | Beschreibung |
|-------|--------------|
| `idle` | Kein Drag aktiv |
| `pending` | Mousedown, aber < 3px Bewegung |
| `dragging` | Aktiver Drag, visuelle Feedback sichtbar |
| `complete` | Drag beendet, Drop wird ausgeführt |

---

## 5. Modifier Keys

| Taste | Effekt |
|-------|--------|
| `Alt` | Duplizieren statt Verschieben |
| `Shift` | Bewegung auf eine Achse beschränken (nur X oder Y) |
| `Cmd/Ctrl` | Grid-Snapping temporär deaktivieren |

---

## 6. Implementierungs-Hinweise

### Reine Models (ohne DOM)

```typescript
// DragState - Lifecycle und Positionen
const state = createDragState({ gridSize: 8 })
state.start(source, { x: 100, y: 100 })
state.move({ x: 150, y: 120 })
state.setTarget({ nodeId: 'container', placement: 'inside' })
const result = state.complete()

// DropZone - Ziel-Erkennung
const zone = findDropZone(cursor, candidates)
// → { nodeId, placement, insertionIndex?, absolutePosition? }

// Snap - Snapping-Berechnung
const snapped = calculateSnap(position, context)
// → { position, guides, snapped }
```

### Controller (dünne DOM-Schicht)

```typescript
class DragController {
  private state = createDragState()

  handleMouseDown(e: MouseEvent) {
    const source = this.getSourceFromElement(e.target)
    const position = this.clientToCanvas(e)
    this.state.start(source, position)
  }

  handleMouseMove(e: MouseEvent) {
    const position = this.clientToCanvas(e)
    this.state.move(position)
    this.updateVisuals()
  }

  handleMouseUp(e: MouseEvent) {
    const result = this.state.complete()
    if (result) this.applyDrop(result)
  }
}
```

---

## 7. Offene Fragen

- [ ] Soll Drag & Drop zwischen verschiedenen Containern erlaubt sein?
- [ ] Wie verhält sich Drag bei `wrap` Containern?
- [ ] Soll es eine "Drag Handle" Option geben (nur an bestimmter Stelle greifbar)?
- [ ] Verhalten bei `grid` Container (CSS Grid)?
