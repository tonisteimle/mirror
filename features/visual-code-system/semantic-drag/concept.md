# Semantic Drag - Konzept

Intelligentes Drag & Drop das automatisch die notwendige Code-Struktur generiert.

---

## Vision

Der User zieht ein Element visuell an eine Position. Das System erkennt die Intention und generiert automatisch die minimale Struktur (Wrapper, Container, Layout-Properties) um diese Position zu erreichen.

**Der Unterschied zu Figma:**
- Figma: Positioniert absolut, exportiert unbrauchbaren Code
- Mirror: Positioniert semantisch, generiert sauberen Code

**Der Unterschied zu Vibe Coding:**
- Vibe: "Mach das Element mittig" → AI rät
- Mirror: User zieht in Mitte → System generiert exakt

---

## Grundprinzip

```
// User hat:
App ver, gap 16
  Element1
  Element2  ← User zieht nach rechts
  Element3

// User zieht Element2 nach rechts
// System erkennt: "Geht nicht direkt, braucht Wrapper"
// System generiert:

App ver, gap 16
  Element1
  Box w full, pad left 32    ← Auto-generierter Wrapper
    Element2
  Element3
```

**Regel:** Das Element selbst bleibt unverändert. Die Positionierung übernimmt ein Wrapper.

---

## Drop Zones

### Horizontale Positionierung

Wenn ein Element horizontal verschoben wird, erscheinen Drop Zones:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌─────┐  ┌─────┐  ┌───────────┐  ┌─────┐  ┌─────┐        │
│  │ 16  │  │ 32  │  │  CENTER   │  │ 32  │  │ 16  │        │
│  │     │  │     │  │           │  │     │  │     │        │
│  └─────┘  └─────┘  └───────────┘  └─────┘  └─────┘        │
│                                                             │
│                    [Element] ←── dragging                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Zone-Definitionen

| Zone | Position | Generierter Code |
|------|----------|------------------|
| PAD 16 L | Links außen | `Box w full, pad left 16` |
| PAD 32 L | Links mitte | `Box w full, pad left 32` |
| CENTER | Mitte | `Box w full, center` |
| PAD 32 R | Rechts mitte | `Box w full, pad right 32` |
| PAD 16 R | Rechts außen | `Box w full, pad right 16` |

### Token-aware Zones

Wenn Tokens definiert sind, passen sich die Zones an:

```
// Definierte Tokens:
$spacing.sm: 8
$spacing.md: 16
$spacing.lg: 24
$spacing.xl: 32

// Drop Zones werden:
┌─────┐  ┌─────┐  ┌─────┐  ┌───────┐  ┌─────┐  ┌─────┐  ┌─────┐
│ $sm │  │ $md │  │ $lg │  │CENTER │  │ $lg │  │ $md │  │ $sm │
│  8  │  │ 16  │  │ 24  │  │       │  │ 24  │  │ 16  │  │  8  │
└─────┘  └─────┘  └─────┘  └───────┘  └─────┘  └─────┘  └─────┘
```

Generierter Code nutzt Token:
```
Box w full, pad left $spacing.lg
  Element
```

---

## Visuelle Feedback

### Während Drag

```
┌─────────────────────────────────────────────────────────────┐
│ Element1                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           ┌─────────────────────┐                          │
│           │░░░░░░░░░░░░░░░░░░░░░│  ← Aktive Zone leuchtet  │
│           │░░░  C E N T E R  ░░░│     blau auf             │
│           │░░░░░░░░░░░░░░░░░░░░░│                          │
│           │    ┌──────────┐    │                          │
│           │    │ Element2 │    │  ← Ghost zeigt finale    │
│           │    └──────────┘    │    Position              │
│           └─────────────────────┘                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Zentriert in neuem Container                         │  │
│  │ → Box w full, center                                 │  │ ← Hint
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Element3                                                    │
└─────────────────────────────────────────────────────────────┘
```

### Hint-Box

Zeigt immer:
1. Was passieren wird (menschenlesbar)
2. Der generierte Code (lernt die Syntax)

```
┌──────────────────────────────────────┐
│ Zentriert in neuem Container         │  ← Intention
│                                      │
│ Box w full, center                   │  ← Code
│   Element2                           │
└──────────────────────────────────────┘
```

---

## Keyboard Modifiers

| Modifier | Effekt | Use Case |
|----------|--------|----------|
| (keiner) | Snappt zu Zonen | Normal |
| `Shift` | Pixelgenaue Positionierung | Feintuning |
| `Alt` | Zeigt Token-Namen statt Werte | Token nutzen |
| `Cmd` | Kopiert Element statt verschieben | Duplizieren |
| `Shift+Cmd` | Verschiebt ohne Wrapper | Reihenfolge ändern |

### Shift - Pixelgenau

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ├──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┼──┤      │
│  0  8  16 24 32 40 48 56 64 ...                             │
│                                                             │
│              ▼                                              │
│         [Element] ← Kann auf jeden Pixel                    │
│                                                             │
│  pad left: 47px                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Alt - Token-Vorschau

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │$spacing  │  │$spacing  │  │$spacing  │                  │
│  │   .sm    │  │   .md    │  │   .lg    │                  │
│  │   (8)    │  │   (16)   │  │   (24)   │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Wrapper-Generierung

### Regel: Minimale Struktur

Das System generiert nur was nötig ist:

```
// Nur horizontale Verschiebung → nur pad left/right
Box w full, pad left 32
  Element

// Zentrierung → center
Box w full, center
  Element

// Rechts ausrichten → hor + Spacer ODER hor-right
Box w full, hor-right
  Element
```

### Regel: Bestehende Wrapper nutzen

```
// Vorher:
App ver, gap 16
  Box w full         ← Wrapper existiert bereits
    Element2

// User zieht Element2 nach rechts
// System erkennt: Wrapper existiert!
// System modifiziert nur:

App ver, gap 16
  Box w full, pad left 32   ← Nur Property hinzugefügt
    Element2
```

### Regel: Wrapper entfernen wenn unnötig

```
// Vorher (User hatte nach rechts gezogen):
App ver, gap 16
  Box w full, pad left 32
    Element2

// User zieht zurück nach links (Original-Position)
// System erkennt: Wrapper nicht mehr nötig
// System entfernt Wrapper:

App ver, gap 16
  Element2   ← Wrapper entfernt, Element promoted
```

---

## Spezialfälle

### Mehrere Elemente in einer Reihe

```
// User will Element2 und Element3 nebeneinander

// Vorher:
App ver, gap 16
  Element1
  Element2
  Element3

// User zieht Element3 neben Element2
// System erkennt: Horizontale Anordnung gewünscht

App ver, gap 16
  Element1
  Box hor, gap 16        ← Horizontaler Container
    Element2
    Element3
```

### Element zwischen andere ziehen

```
// User zieht Element3 zwischen Element1 und Element2

// Vorher:
App ver, gap 16
  Element1
  Element2
  Element3  ← ziehen

// Nachher:
App ver, gap 16
  Element1
  Element3   ← Reihenfolge geändert
  Element2
```

Hier kein Wrapper nötig - nur Reihenfolge ändern.

### Verschachtelung

```
// User zieht Element IN ein anderes Element

// Vorher:
App ver, gap 16
  Container
  Element  ← ziehen IN Container

// Nachher:
App ver, gap 16
  Container
    Element  ← Jetzt Kind von Container
```

---

## Technische Umsetzung

### Drop Zone Calculator

```typescript
interface DropZone {
  id: string
  type: 'padding' | 'center' | 'align'
  bounds: DOMRect
  value?: number | string  // padding value or alignment
  token?: string           // if matches a token
}

function calculateDropZones(
  container: HTMLElement,
  tokens: TokenMap
): DropZone[] {
  const rect = container.getBoundingClientRect()
  const zones: DropZone[] = []

  // Spacing values (from tokens or defaults)
  const spacings = getSpacingValues(tokens)
  // e.g. [8, 16, 24, 32]

  // Left padding zones
  let x = 0
  for (const spacing of spacings) {
    zones.push({
      id: `pad-left-${spacing}`,
      type: 'padding',
      bounds: { x, width: spacing - x, ... },
      value: spacing,
      token: findTokenForValue(spacing, tokens)
    })
    x = spacing
  }

  // Center zone
  zones.push({
    id: 'center',
    type: 'center',
    bounds: { x: rect.width * 0.3, width: rect.width * 0.4, ... }
  })

  // Right padding zones (mirror of left)
  // ...

  return zones
}
```

### Structure Generator

```typescript
interface StructureChange {
  type: 'wrap' | 'modify' | 'unwrap' | 'reorder'
  targetNodeId: string
  wrapper?: {
    component: string
    properties: Record<string, any>
  }
  propertyChanges?: Record<string, any>
  newIndex?: number
}

function generateStructure(
  element: IRNode,
  dropZone: DropZone,
  currentParent: IRNode
): StructureChange {

  // Check if wrapper exists
  const existingWrapper = findDirectWrapper(element, currentParent)

  if (dropZone.type === 'center') {
    if (existingWrapper) {
      return {
        type: 'modify',
        targetNodeId: existingWrapper.id,
        propertyChanges: { center: true, pad: undefined }
      }
    } else {
      return {
        type: 'wrap',
        targetNodeId: element.id,
        wrapper: {
          component: 'Box',
          properties: { w: 'full', center: true }
        }
      }
    }
  }

  if (dropZone.type === 'padding') {
    const prop = dropZone.id.includes('left') ? 'pad left' : 'pad right'
    const value = dropZone.token || dropZone.value

    if (existingWrapper) {
      return {
        type: 'modify',
        targetNodeId: existingWrapper.id,
        propertyChanges: { [prop]: value, center: undefined }
      }
    } else {
      return {
        type: 'wrap',
        targetNodeId: element.id,
        wrapper: {
          component: 'Box',
          properties: { w: 'full', [prop]: value }
        }
      }
    }
  }
}
```

### Visual Feedback Renderer

```typescript
class DragFeedbackRenderer {
  private overlay: HTMLElement
  private hintBox: HTMLElement
  private ghostElement: HTMLElement

  showZones(zones: DropZone[]) {
    zones.forEach(zone => {
      const el = this.createZoneElement(zone)
      this.overlay.appendChild(el)
    })
  }

  highlightZone(zone: DropZone) {
    // Dim other zones
    this.overlay.querySelectorAll('.drop-zone')
      .forEach(el => el.classList.remove('active'))

    // Highlight active zone
    const active = this.overlay.querySelector(`[data-zone="${zone.id}"]`)
    active?.classList.add('active')

    // Update hint
    this.updateHint(zone)
  }

  updateHint(zone: DropZone) {
    const intention = this.describeIntention(zone)
    const code = this.generateCodePreview(zone)

    this.hintBox.innerHTML = `
      <div class="hint-intention">${intention}</div>
      <pre class="hint-code">${code}</pre>
    `
  }

  private describeIntention(zone: DropZone): string {
    if (zone.type === 'center') {
      return 'Zentriert in neuem Container'
    }
    if (zone.type === 'padding') {
      const side = zone.id.includes('left') ? 'links' : 'rechts'
      const value = zone.token || `${zone.value}px`
      return `${value} Abstand von ${side}`
    }
  }
}
```

---

## Lerneffekt

Das System lehrt Mirror-Syntax durch Tun:

1. **User zieht Element in die Mitte**
2. **Sieht Hint:** "Box w full, center"
3. **Code erscheint im Editor**
4. **Nächstes Mal:** User tippt direkt `center`

```
Drag #1:  User zieht → sieht "pad left 16"
Drag #2:  User zieht → sieht "pad left 16"
Drag #3:  User denkt "Ich weiß, das ist pad left 16"
Drag #4:  User tippt direkt "pad left 16"
```

---

## Roadmap

### Phase 1: Grundlagen
- [ ] Drop Zone Calculator
- [ ] Horizontale Zones (padding links/rechts, center)
- [ ] Wrapper-Generierung (nur wrappen)
- [ ] Basis-Feedback (Zone highlight)

### Phase 2: Intelligence
- [ ] Token-aware Zones
- [ ] Bestehende Wrapper erkennen und modifizieren
- [ ] Wrapper entfernen wenn unnötig
- [ ] Code-Preview in Hint

### Phase 3: Advanced
- [ ] Keyboard Modifiers (Shift, Alt, Cmd)
- [ ] Vertikale Positionierung
- [ ] Mehrere Elemente gleichzeitig
- [ ] Verschachtelung (Element IN Element ziehen)

### Phase 4: Polish
- [ ] Animierte Übergänge
- [ ] Undo/Redo Integration
- [ ] Tastatur-only Positionierung
- [ ] Touch Support

---

## Abgrenzung

| Feature | Semantic Drag | Direct Manipulation |
|---------|---------------|---------------------|
| Fokus | Position/Layout | Werte (pad, gap, rad) |
| Struktur-Änderung | Ja (Wrapper) | Nein |
| Trigger | Element ziehen | Handle ziehen |
| Output | Neue Nodes | Property-Änderungen |

Beide Features ergänzen sich:
- **Semantic Drag:** Grobe Positionierung, Struktur
- **Direct Manipulation:** Feine Wert-Anpassung
