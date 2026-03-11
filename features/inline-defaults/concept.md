# Inline Defaults

Sofortige Defaults im Code-Editor mit klickbaren Feldern.

## Konzept

```
User tippt:     header |
                       ↓ Space
Editor zeigt:   header w full h 36 spread pad $m
                       ─────────────────────────
                       Ghost-Text (grau)
                       │
                       └─ Tab: Akzeptieren
                       └─ Esc: Verwerfen
                       └─ Klick auf Wert: Bearbeiten
                       └─ Weiter tippen: Überschreiben
```

## Interaktion

### 1. Trigger

```
header    ← Name getippt
header |  ← Space gedrückt
header w full h 36 spread pad $m
       └──────────────────────── Ghost erscheint sofort
```

**Trigger:** Space nach Komponenten-Name (Zeilenanfang)

### 2. Tab = Akzeptieren

```
header w full h 36 spread pad $m     (Ghost)
            ↓ Tab
header w full h 36 spread pad $m     (Echter Code)
                                |    (Cursor am Ende)
```

### 3. Klick auf Wert = Inline Edit

```
header w full h 36 spread pad $m
              ──
              ↓ Klick
header w full h [36] spread pad $m
                ────
                Input-Feld, fokussiert
                ↓ 48 + Enter
header w full h 48 spread pad $m
```

### 4. Klick auf Token = Picker

```
header w full h 36 spread pad $m
                              ──
                              ↓ Klick
                        ┌─────────────┐
                        │ $xs    4    │
                        │ $s     8    │
                        │ $m    16  ← │
                        │ $l    24    │
                        │ $xl   32    │
                        └─────────────┘
                        Token-Picker inline
```

### 5. Weiter tippen = Überschreiben

```
header w full h 36 spread pad $m     (Ghost)
       ↓ User tippt: "hor"
header hor|                          (Ghost weg, eigener Code)
```

---

## Ghost-Text Styling

```css
.ghost-text {
  color: #666;           /* Grau */
  opacity: 0.6;
  user-select: none;     /* Nicht selektierbar */
}

.ghost-text .editable {
  border-bottom: 1px dashed #888;  /* Zeigt Klickbarkeit */
  cursor: pointer;
}

.ghost-text .editable:hover {
  color: #333;
  border-bottom-color: #3B82F6;
}
```

**Visuell:**
```
header w full h 36 spread pad $m
       ────── ─ ── ────── ─── ──
       │      │ │  │      │   └─ Klickbar (Token)
       │      │ │  │      └───── Klickbar (Keyword)
       │      │ │  └──────────── Klickbar (Keyword)
       │      │ └─────────────── Klickbar (Zahl)
       │      └───────────────── Klickbar (Keyword)
       └──────────────────────── Klickbar (Keyword)
```

---

## Defaults nach Name

| Name | Defaults |
|------|----------|
| `header` | `w full h 56 hor spread pad $m` |
| `footer` | `w full h 48 hor center pad $m` |
| `sidebar` | `w 240 h full ver pad $m gap $s` |
| `content` | `w full h full ver pad $l gap $m` |
| `nav` | `hor gap $m` |
| `card` | `ver pad $m gap $s bg white rad $m shadow` |
| `button` | `pad $s $m rad $s` |
| `input` | `w full pad $s rad $s bor 1 $border` |
| `modal` | `ver pad $l gap $m bg white rad $l shadow` |
| `avatar` | `w 40 h 40 rad full` |
| `icon` | `w 20 h 20` |
| `list` | `ver gap $s` |
| `grid` | `grid cols 3 gap $m` |
| `form` | `ver gap $m` |
| `row` | `hor gap $s center` |
| `stack` | `stacked` |

### Namens-Patterns

```typescript
const NAME_PATTERNS = [
  // Enthält "list" → ver gap
  { match: /list/i, defaults: 'ver gap $s' },

  // Enthält "row" → hor
  { match: /row/i, defaults: 'hor gap $s center' },

  // Enthält "grid" → grid
  { match: /grid/i, defaults: 'grid cols 3 gap $m' },

  // Endet mit "btn" oder "button" → button defaults
  { match: /(btn|button)$/i, defaults: 'pad $s $m rad $s cursor pointer' },

  // Enthält "container" oder "wrapper" → padding
  { match: /(container|wrapper)/i, defaults: 'pad $m' },
]
```

---

## Inline Edit Modes

### Zahl-Edit

```
h [36]     ← Input erscheint
  ────
  │
  ├─ ↑/↓: +/- 1
  ├─ Shift+↑/↓: +/- 8
  ├─ Enter: Bestätigen
  └─ Esc: Abbrechen
```

### Keyword-Edit (Dropdown)

```
w [full ▼]
  ────────
  │ full   ← Aktuell
  │ hug
  │ 100
  │ 200
  │ 50%
  └────────
```

### Token-Edit (Picker)

```
pad [$m ▼]
    ─────
    │ $xs    4
    │ $s     8
    │ $m    16  ←
    │ $l    24
    │ $xl   32
    └─────────
```

### Color-Edit (Color Picker)

```
bg [$primary ▼]
   ───────────
   ┌─────────────────┐
   │ ● $primary      │
   │ ○ $secondary    │
   │ ○ $accent       │
   │ ───────────     │
   │ [Color Picker]  │
   └─────────────────┘
```

---

## Technische Umsetzung

### CodeMirror Integration

```typescript
// Ghost-Text als Decoration
const ghostDecoration = Decoration.widget({
  widget: new GhostTextWidget(defaults),
  side: 1,  // Nach Cursor
})

class GhostTextWidget extends WidgetType {
  constructor(private defaults: string) {}

  toDOM() {
    const span = document.createElement('span')
    span.className = 'ghost-defaults'
    span.innerHTML = this.renderClickableDefaults()
    return span
  }

  renderClickableDefaults(): string {
    // Parse defaults und mache Werte klickbar
    return this.defaults
      .split(' ')
      .map(part => {
        if (isNumber(part)) {
          return `<span class="editable num" data-value="${part}">${part}</span>`
        }
        if (isToken(part)) {
          return `<span class="editable token" data-value="${part}">${part}</span>`
        }
        return `<span class="editable keyword" data-value="${part}">${part}</span>`
      })
      .join(' ')
  }
}
```

### Event Handler

```typescript
// Tab → Accept
editor.addKeyHandler('Tab', (e) => {
  if (hasActiveGhost()) {
    e.preventDefault()
    acceptGhost()
    return true
  }
})

// Click auf Ghost-Element
ghostContainer.addEventListener('click', (e) => {
  const target = e.target as HTMLElement
  if (target.classList.contains('editable')) {
    openInlineEdit(target)
  }
})

// Space nach Komponenten-Name
editor.on('change', (update) => {
  if (isSpaceAfterComponentName(update)) {
    showGhostDefaults(getComponentName(update))
  }
})
```

### Inline Edit

```typescript
function openInlineEdit(element: HTMLElement) {
  const type = element.dataset.type // 'num', 'token', 'keyword'
  const value = element.dataset.value

  switch (type) {
    case 'num':
      showNumberInput(element, value)
      break
    case 'token':
      showTokenPicker(element, value)
      break
    case 'keyword':
      showKeywordDropdown(element, value)
      break
  }
}

function showNumberInput(element: HTMLElement, value: string) {
  const input = document.createElement('input')
  input.type = 'number'
  input.value = value
  input.className = 'ghost-edit-input'

  // Arrow keys für +/-
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      input.value = String(Number(input.value) + (e.shiftKey ? 8 : 1))
    }
    if (e.key === 'ArrowDown') {
      input.value = String(Number(input.value) - (e.shiftKey ? 8 : 1))
    }
    if (e.key === 'Enter') {
      commitEdit(element, input.value)
    }
    if (e.key === 'Escape') {
      cancelEdit(element)
    }
  })

  element.replaceWith(input)
  input.focus()
  input.select()
}
```

---

## Workflow-Beispiele

### Header erstellen

```
1. header |
2. header w full h 56 hor spread pad $m     (Ghost)
3. Klick auf "56"
4. header w full h [56] hor spread pad $m
5. ↓ ↓ (zweimal runter)
6. header w full h [40] hor spread pad $m
7. Enter
8. header w full h 40 hor spread pad $m     (Ghost, updated)
9. Tab
10. header w full h 40 hor spread pad $m    (Finaler Code)
```

**Zeit: ~3 Sekunden**

### Card mit angepasstem Padding

```
1. card |
2. card ver pad $m gap $s bg white rad $m shadow     (Ghost)
3. Klick auf "$m" (erstes)
4. Token-Picker öffnet
5. Klick auf "$l"
6. card ver pad $l gap $s bg white rad $m shadow     (Ghost, updated)
7. Tab
8. card ver pad $l gap $s bg white rad $m shadow     (Finaler Code)
```

**Zeit: ~2 Sekunden**

---

## Vergleich

| Ansatz | Geschwindigkeit | Flexibilität | Lernkurve |
|--------|-----------------|--------------|-----------|
| **Inline Defaults** | ⚡⚡⚡ | ⚡⚡ | Minimal |
| Smart Defaults (Tab only) | ⚡⚡ | ⚡ | Minimal |
| Property Panel | ⚡ | ⚡⚡⚡ | Niedrig |
| Manuell tippen | 🐢 | ⚡⚡⚡ | Hoch |

---

## Edge Cases

### Kein Default bekannt

```
myCustomThing |
              ↓ Space
myCustomThing |     (Kein Ghost, nichts passiert)
```

→ Nur bekannte Namen/Patterns bekommen Defaults

### Bereits Properties vorhanden

```
header hor |
           ↓ Space
header hor w full h 56 spread pad $m
           ──────────────────────────
           Ghost ergänzt fehlende Props
```

→ Bestehende Props werden respektiert

### Mehrere Spaces

```
header    |
          ↓ Space
header w full h 56 hor spread pad $m
```

→ Whitespace wird normalisiert

---

## Implementierungs-Roadmap

### Phase 1: Basic Ghost (3-4 Tage)
- [ ] Ghost-Text nach Space
- [ ] Tab to Accept
- [ ] Esc to Dismiss
- [ ] Weiter-Tippen überschreibt

### Phase 2: Clickable Values (3-4 Tage)
- [ ] Klickbare Werte im Ghost
- [ ] Number Input Popup
- [ ] Keyboard Navigation (↑↓)

### Phase 3: Picker Integration (2-3 Tage)
- [ ] Token-Picker für $-Werte
- [ ] Keyword-Dropdown
- [ ] Color-Picker für Farben

### Phase 4: Smart Defaults (2-3 Tage)
- [ ] Name-Pattern-Matching
- [ ] Context-Awareness (Parent)
- [ ] Projekt-Token-Nutzung

---

## Konfiguration

```typescript
interface InlineDefaultsConfig {
  enabled: boolean
  triggerKey: 'Space' | 'Tab'  // Wann Ghost zeigen
  acceptKey: 'Tab' | 'Enter'   // Wann akzeptieren
  showDelay: number            // ms, 0 = sofort
  clickableValues: boolean     // Werte klickbar?
  useProjectTokens: boolean    // $tokens aus Projekt
}

// Defaults
const DEFAULT_CONFIG: InlineDefaultsConfig = {
  enabled: true,
  triggerKey: 'Space',
  acceptKey: 'Tab',
  showDelay: 0,
  clickableValues: true,
  useProjectTokens: true,
}
```

---

## Zusammenspiel mit Live AI Copilot

```
Inline Defaults:     Schnell, regelbasiert, bekannte Patterns
Live AI Copilot:     Langsamer, LLM-basiert, unbekannte Patterns

Strategie:
1. Space → Inline Defaults (sofort, wenn Pattern bekannt)
2. Falls kein Pattern → AI Copilot (nach 300ms Pause)
3. User merkt keinen Unterschied
```

```typescript
function onSpacePressed(componentName: string) {
  const defaults = getInlineDefaults(componentName)

  if (defaults) {
    showGhostText(defaults)  // Sofort
  } else if (aiCopilotEnabled) {
    scheduleAICopilot(componentName, 300)  // Verzögert
  }
}
```
