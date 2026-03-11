# Clickable Code

Jeder Wert im Editor ist klickbar und inline editierbar.

## Vision

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  header hor spread pad 16 h 56 bg #1a1a2e col white             │
│         ─── ────── ─── ── ─ ── ── ─────── ─── ─────             │
│          │    │     │  │  │  │  │    │     │    │               │
│          │    │     │  │  │  │  │    │     │    └─ Click: Color │
│          │    │     │  │  │  │  │    │     └────── Click: Color │
│          │    │     │  │  │  │  │    └──────────── Click: Color │
│          │    │     │  │  │  │  └───────────────── Click: Number│
│          │    │     │  │  │  └──────────────────── Keyword      │
│          │    │     │  │  └─────────────────────── Click: Number│
│          │    │     │  └────────────────────────── Keyword      │
│          │    │     └───────────────────────────── Click: Number│
│          │    └─────────────────────────────────── Keyword Menu │
│          └──────────────────────────────────────── Keyword Menu │
│                                                                 │
│  Alles ist klickbar. Alles ist editierbar.                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Konzept

**Code = UI**

Der Editor ist nicht nur Text, sondern eine interaktive Oberfläche. Jeder Token hat einen Typ und öffnet den passenden Editor.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Button "Kaufen" pad 12 24 bg $primary rad 8 bold      │
│         ────────     ── ──    ────────     ─           │
│            │          │  │       │         │           │
│            │          │  │       │         └─ Number   │
│            │          │  │       └─────────── Token    │
│            │          │  └─────────────────── Number   │
│            │          └────────────────────── Number   │
│            └───────────────────────────────── String   │
│                                                        │
│  Click → Passender Inline-Editor öffnet                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Wert-Typen & Editoren

### 1. Zahlen → Number Input / Scrubber

```
pad [16]          ← Click öffnet Input
    ────
    │
    ├─ Tippen: Direkteingabe
    ├─ ↑/↓: +/- 1
    ├─ Shift+↑/↓: +/- 8
    ├─ Drag horizontal: Scrubben
    └─ Enter: Bestätigen

Visuell beim Hover:
pad 16
    ══  ← Underline zeigt "klickbar"
```

### 2. Farben → Color Picker

```
bg #3B82F6        ← Click öffnet Picker
   ───────
   │
   └─ Inline Color Picker
      ┌─────────────────────┐
      │ ■ $primary          │
      │ ■ $secondary        │
      │ ───────────────     │
      │ [  Color Wheel  ]   │
      │ [  Hex Input    ]   │
      └─────────────────────┘

Visuell beim Hover:
bg #3B82F6
   ■══════  ← Farbquadrat + Underline
```

### 3. Tokens → Token Picker

```
pad $spacing-md   ← Click öffnet Picker
    ───────────
    │
    └─ Token Picker mit Preview
       ┌──────────────────────┐
       │ $spacing-xs    4px   │
       │ $spacing-sm    8px   │
       │ $spacing-md   16px ← │
       │ $spacing-lg   24px   │
       │ $spacing-xl   32px   │
       └──────────────────────┘

Visuell beim Hover:
pad $spacing-md
    ═══════════  ← Token-Styling + Underline
    └─ 16px      ← Resolved Value als Tooltip
```

### 4. Keywords → Dropdown Menu

```
hor               ← Click öffnet Menu
───
│
└─ Layout Options
   ┌─────────────────┐
   │ ● hor       ━━━ │
   │ ○ ver       ┃   │
   │ ○ grid      ⊞   │
   │ ○ stacked   ▣   │
   └─────────────────┘

Visuell beim Hover:
hor
═══  ← Underline
```

### 5. Strings → Inline Text Edit

```
"Kaufen"          ← Click aktiviert Edit
────────
│
└─ Text wird selektiert
   │
   ├─ Direkt tippen
   ├─ Enter: Bestätigen
   └─ Esc: Abbrechen

Visuell beim Hover:
"Kaufen"
 ══════  ← Underline (ohne Anführungszeichen)
```

### 6. Property-Namen → Property Picker

```
pad               ← Click zeigt Alternativen
───
│
└─ Related Properties
   ┌─────────────────────┐
   │ pad      All sides  │
   │ padx     Horizontal │
   │ pady     Vertical   │
   │ padt     Top        │
   │ padr     Right      │
   │ padb     Bottom     │
   │ padl     Left       │
   └─────────────────────┘
```

---

## Interaktions-Details

### Hover-State

```css
.clickable-value {
  cursor: pointer;
  position: relative;
}

.clickable-value::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 1px;
  background: currentColor;
  opacity: 0;
  transition: opacity 0.15s;
}

.clickable-value:hover::after {
  opacity: 0.5;
}

.clickable-value:hover {
  background: rgba(59, 130, 246, 0.1);
}
```

### Click-Verhalten

```typescript
function handleClick(token: Token, position: Position) {
  const type = detectValueType(token)

  switch (type) {
    case 'number':
      showNumberInput(token, position)
      break
    case 'color':
      showColorPicker(token, position)
      break
    case 'token':
      showTokenPicker(token, position)
      break
    case 'keyword':
      showKeywordMenu(token, position)
      break
    case 'string':
      activateInlineEdit(token, position)
      break
  }
}
```

### Keyboard Navigation

```
Tab           → Nächster klickbarer Wert
Shift+Tab     → Vorheriger klickbarer Wert
Enter/Space   → Öffne Editor für fokussierten Wert
Esc           → Schließe Editor, zurück zu Code
```

---

## Typ-Erkennung

### Automatisch nach Kontext

```typescript
const VALUE_PATTERNS = {
  // Nach Property-Name
  'bg': 'color',
  'col': 'color',
  'boc': 'color',
  'pad': 'number',
  'gap': 'number',
  'w': 'dimension',
  'h': 'dimension',
  'rad': 'number',
  'bor': 'border',
  'size': 'number',
  'opacity': 'number',

  // Nach Wert-Format
  '#[0-9a-fA-F]+': 'color',
  'rgb\\(': 'color',
  '\\$[a-z-]+': 'token',
  '^\\d+$': 'number',
  '^\\d+%$': 'percentage',
  '^".*"$': 'string',
}

function detectValueType(token: Token, context: PropertyContext): ValueType {
  // 1. Check property context
  if (context.property && VALUE_PATTERNS[context.property]) {
    return VALUE_PATTERNS[context.property]
  }

  // 2. Check value format
  for (const [pattern, type] of Object.entries(VALUE_PATTERNS)) {
    if (new RegExp(pattern).test(token.value)) {
      return type as ValueType
    }
  }

  // 3. Check if it's a known keyword
  if (KEYWORDS.includes(token.value)) {
    return 'keyword'
  }

  return 'unknown'
}
```

### Keyword-Gruppen

```typescript
const KEYWORD_GROUPS = {
  layout: ['hor', 'ver', 'grid', 'stacked', 'wrap'],
  alignment: ['center', 'spread', 'start', 'end'],
  size: ['full', 'hug', 'auto', 'fit'],
  display: ['show', 'hide', 'visible', 'hidden'],
  font: ['bold', 'italic', 'underline', 'normal'],
  cursor: ['pointer', 'default', 'text', 'move'],
}

// Bei Click auf 'hor' → zeige nur layout-Gruppe
```

---

## Dimension-Editor

Spezieller Editor für `w` und `h`:

```
w 200             ← Click
  ───
  │
  └─ Dimension Picker
     ┌────────────────────────┐
     │ [200    ] px    ▼      │
     │ ─────────────────      │
     │ ○ full    100%         │
     │ ○ hug     fit-content  │
     │ ○ auto    auto         │
     │ ○ 1/2     50%          │
     │ ○ 1/3     33%          │
     │ ○ 1/4     25%          │
     │ ─────────────────      │
     │ min: [    ]  max: [    ]│
     └────────────────────────┘
```

---

## Border-Editor

Compound-Editor für `bor`:

```
bor 1 #333        ← Click auf Property
─── ─ ────
│   │   │
│   │   └─ Click: Color Picker
│   └───── Click: Number (Width)
└───────── Click: Border Picker
           ┌────────────────────┐
           │ Width:  [1] px     │
           │ Style:  ● solid    │
           │         ○ dashed   │
           │         ○ dotted   │
           │ Color:  ■ #333     │
           │ ─────────────────  │
           │ Sides:             │
           │ [T] [R] [B] [L]    │
           └────────────────────┘
```

---

## Live Preview

Während Editing wird Preview live aktualisiert:

```
┌─────────────────────────────────┬─────────────────────────────────┐
│ Editor                          │ Preview                         │
│                                 │                                 │
│ Button "Kaufen" rad [8]         │  ┌─────────────────┐            │
│                       ↑         │  │     Kaufen      │            │
│                       │         │  └─────────────────┘            │
│                   Scrubbing     │         ↑                       │
│                       │         │         │                       │
│                       ▼         │         ▼                       │
│ Button "Kaufen" rad [16]        │  ╭─────────────────╮            │
│                                 │  │     Kaufen      │            │
│                                 │  ╰─────────────────╯            │
│                                 │                                 │
│ Live Update während Drag!       │                                 │
└─────────────────────────────────┴─────────────────────────────────┘
```

---

## Cmd+Click für Direktsprung

```
bg $primary       ← Cmd+Click
   ────────
   │
   └─ Springt zur Token-Definition

      // tokens.mirror
      $primary: #3B82F6  ← Cursor hier
```

---

## Technische Implementierung

### CodeMirror Decorations

```typescript
import { Decoration, DecorationSet, EditorView } from '@codemirror/view'

// Clickable Markers für alle Werte
const clickableValuePlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view)
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = []

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to)
      const tokens = tokenize(text, from)

      for (const token of tokens) {
        if (isClickableValue(token)) {
          decorations.push(
            Decoration.mark({
              class: `clickable-${token.type}`,
              attributes: {
                'data-value': token.value,
                'data-type': token.type,
              }
            }).range(token.from, token.to)
          )
        }
      }
    }

    return Decoration.set(decorations)
  }
}, {
  decorations: v => v.decorations,
  eventHandlers: {
    click: (e, view) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('clickable-value')) {
        e.preventDefault()
        const type = target.dataset.type
        const pos = view.posAtDOM(target)
        openEditorForType(type, pos, view)
      }
    }
  }
})
```

### Popup Positioning

```typescript
function showPopupAt(view: EditorView, pos: number, content: HTMLElement) {
  const coords = view.coordsAtPos(pos)
  if (!coords) return

  const popup = document.createElement('div')
  popup.className = 'clickable-popup'
  popup.appendChild(content)

  // Position below the value
  popup.style.left = `${coords.left}px`
  popup.style.top = `${coords.bottom + 4}px`

  // Flip if near edge
  requestAnimationFrame(() => {
    const rect = popup.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      popup.style.left = `${window.innerWidth - rect.width - 8}px`
    }
    if (rect.bottom > window.innerHeight) {
      popup.style.top = `${coords.top - rect.height - 4}px`
    }
  })

  document.body.appendChild(popup)
  return popup
}
```

### Value Update

```typescript
function updateValue(view: EditorView, from: number, to: number, newValue: string) {
  view.dispatch({
    changes: { from, to, insert: newValue },
    // Behalte Selection für weitere Edits
    selection: { anchor: from, head: from + newValue.length }
  })
}
```

---

## Scrubbing für Zahlen

Horizontal Drag auf Zahlen:

```typescript
function enableScrubbing(element: HTMLElement, onChange: (delta: number) => void) {
  let startX: number
  let startValue: number

  element.addEventListener('mousedown', (e) => {
    if (e.altKey) { // Alt+Drag für Scrubbing
      startX = e.clientX
      startValue = parseFloat(element.dataset.value || '0')

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)

      element.classList.add('scrubbing')
      document.body.style.cursor = 'ew-resize'
    }
  })

  function onMove(e: MouseEvent) {
    const delta = e.clientX - startX
    const step = e.shiftKey ? 0.1 : 1
    const newValue = startValue + delta * step
    onChange(Math.round(newValue))
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    element.classList.remove('scrubbing')
    document.body.style.cursor = ''
  }
}
```

**Visuelles Feedback beim Scrubbing:**

```
pad 16
    ──────────────────────────────→
    │          Drag              │
    ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ →

    [================|====] 16
    Virtueller Slider während Drag
```

---

## Workflow-Beispiel

```
1. User sieht:        Button "Save" pad 12 bg #3B82F6 rad 8
                                        ── ─────────
                                        │      │
                                        │      └─ Hover: Farbquadrat
                                        └──────── Hover: Underline

2. User klickt:       Button "Save" pad [12] bg #3B82F6 rad 8
                                        ────
                                        Number-Input aktiv

3. User tippt "16":   Button "Save" pad [16] bg #3B82F6 rad 8
                                        ────
                                        Live Preview updated

4. User drückt Tab:   Button "Save" pad 16 bg [#3B82F6] rad 8
                                           ──────────
                                           Color Picker öffnet

5. User wählt:        Button "Save" pad 16 bg $primary rad 8
                                           ────────
                                           Token statt Hex

6. Fertig:            Button "Save" pad 16 bg $primary rad 8
                      Alle Werte geändert ohne Tippen!
```

**Zeit: ~5 Sekunden für 3 Änderungen**

---

## Vergleich

| Ansatz | Klicks | Tastenanschläge | Kontext-Wechsel |
|--------|--------|-----------------|-----------------|
| **Clickable Code** | 3 | 2 | 0 |
| Property Panel | 6+ | 0 | 3 (Editor → Panel → Editor) |
| Manuell tippen | 0 | 20+ | 0 |

---

## Implementierungs-Roadmap

### Phase 1: Basis (1 Woche)
- [ ] Token-Erkennung und Dekoration
- [ ] Hover-Styling
- [ ] Click-Handler Infrastruktur

### Phase 2: Editoren (1-2 Wochen)
- [ ] Number Input
- [ ] Color Picker Integration
- [ ] Token Picker Integration
- [ ] Keyword Dropdowns

### Phase 3: Advanced (1 Woche)
- [ ] Scrubbing für Zahlen
- [ ] Keyboard Navigation (Tab durch Werte)
- [ ] Compound Editors (Border, Shadow)
- [ ] Cmd+Click für Token-Jump

### Phase 4: Polish (1 Woche)
- [ ] Live Preview Sync
- [ ] Undo/Redo Integration
- [ ] Animation/Transitions
- [ ] Edge Cases (Multi-Cursor, Selections)

---

## Zusammenspiel mit anderen Features

### + Inline Defaults
Ghost-Text nutzt dieselbe Clickable-Infrastruktur.

### + Smart Defaults
Keyword-Menus können "empfohlene" Option markieren.

### + Live AI Copilot
AI kann Werte vorschlagen, User klickt zur Bestätigung.

### + Property Panel
Panel für Discovery, Clickable Code für schnelle Edits.

```
Discovery:       Property Panel (alle Optionen sehen)
Quick Edit:      Clickable Code (bekannte Werte ändern)
```

---

## Edge Cases

### Mehrere Werte hintereinander

```
pad 12 24         ← Welcher Wert bei Click?
    ── ──
    │   │
    │   └─ Click auf "24": Nur diesen editieren
    └───── Click auf "12": Nur diesen editieren

    Click auf "pad": Compound Editor für alle
```

### Verschachtelte Tokens

```
bg $colors.primary.500
   ────────────────────
   │
   └─ Click: Token Picker mit Hierarchie
      ┌──────────────────────┐
      │ ▼ $colors            │
      │   ▼ primary          │
      │       50             │
      │       100            │
      │       500  ←         │
      │       900            │
      │   ► secondary        │
      │   ► neutral          │
      └──────────────────────┘
```

### Selektierter Text

```
Button "Save" pad 12 bg #3B82F6
              ──────────────────
              │ Selection aktiv
              │
              └─ Keine Clickable-Actions
                 Normal Text-Selection
```

---

## Konfiguration

```typescript
interface ClickableCodeConfig {
  enabled: boolean
  hoverDelay: number          // ms vor Hover-Styling
  scrubModifier: 'alt' | 'cmd' | 'shift'
  tabNavigation: boolean      // Tab durch Werte
  livePreview: boolean        // Sync während Edit
  popupPosition: 'below' | 'above' | 'auto'
}

const DEFAULT_CONFIG: ClickableCodeConfig = {
  enabled: true,
  hoverDelay: 0,
  scrubModifier: 'alt',
  tabNavigation: true,
  livePreview: true,
  popupPosition: 'auto',
}
```
