# Action Chain Autocomplete

## Übersicht

Erweiterung des bestehenden Autocomplete-Systems um verkettete Vervollständigung für Events, Actions und Targets. Der User wird schrittweise durch die Syntax geführt:

```
onclick: |        → show, hide, toggle, select, page...
onclick: show |   → Modal, Menu, Dropdown (Elemente aus Code)
onclick: toggle | → Sidebar, Panel (Elemente mit state)
```

**Ziel:** User lernt die Mirror-Syntax durch geführtes Autocomplete.

---

## Neue Kontexte

### Aktueller Zustand

| Kontext | Trigger | Status |
|---------|---------|--------|
| `property` | Nach Component-Name, Komma, Colon | ✅ |
| `value` | Nach Property + Space | ✅ |
| `state` | Nach `state ` | ✅ |
| `slot` | Eingerückte Zeile + Großbuchstabe | ✅ |

### Neue Kontexte

| Kontext | Trigger | Beispiel |
|---------|---------|----------|
| `action` | Nach Event + `:` + Space | `onclick: ` |
| `target` | Nach Action + Space | `onclick: show ` |
| `duration` | Nach `transition` + Property | `transition all ` |
| `easing` | Nach Duration | `transition all 200 ` |

---

## Action-Kontext

### Trigger-Pattern

```javascript
// Nach Event + Colon (mit/ohne Space)
const actionContextMatch = textBefore.match(
  /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown|onkeyup|onmousedown|onmouseup):\s*$/
)
```

### Action-Vorschläge

| Action | Beschreibung | Erwartetes Target |
|--------|--------------|-------------------|
| `show` | Element sichtbar machen | Elementname |
| `hide` | Element verstecken | Elementname |
| `toggle` | Sichtbarkeit umschalten | Elementname |
| `select` | Element auswählen | Elementname |
| `highlight` | Element hervorheben | Elementname |
| `activate` | Element aktivieren | Elementname |
| `deactivate` | Element deaktivieren | Elementname |
| `open` | Dialog/Panel öffnen | Elementname |
| `close` | Dialog/Panel schließen | Elementname |
| `page` | Zu Seite navigieren | Seitenname |
| `call` | Funktion aufrufen | Funktionsname |
| `assign` | Wert zuweisen | Variable |

### Implementierung

```javascript
// In mirrorCompletions() oder separatem ActionCompletionSource
const actionContextMatch = textBefore.match(
  /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown\s+\w+):\s*$/
)

if (actionContextMatch) {
  const actions = [
    { label: 'show', info: 'Element sichtbar machen', type: 'function' },
    { label: 'hide', info: 'Element verstecken', type: 'function' },
    { label: 'toggle', info: 'Sichtbarkeit umschalten', type: 'function' },
    { label: 'select', info: 'Element auswählen', type: 'function' },
    { label: 'highlight', info: 'Element hervorheben', type: 'function' },
    { label: 'open', info: 'Dialog/Panel öffnen', type: 'function' },
    { label: 'close', info: 'Dialog/Panel schließen', type: 'function' },
    { label: 'page', info: 'Zu Seite navigieren', type: 'function' },
    { label: 'call', info: 'Funktion aufrufen', type: 'function' },
    { label: 'assign', info: 'Wert zuweisen', type: 'function' },
  ]
  return { from, options: actions }
}
```

---

## Target-Kontext

### Trigger-Pattern

```javascript
// Nach Action + Space
const targetContextMatch = textBefore.match(
  /\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown\s+\w+):\s*(show|hide|toggle|select|highlight|activate|deactivate|open|close)\s+$/
)
```

### Target-Extraktion

Targets werden dynamisch aus dem Code extrahiert:

```javascript
function extractElementNames(doc: Text): string[] {
  const names: string[] = []
  const lines = doc.toString().split('\n')

  for (const line of lines) {
    // Definition: Name: = ...
    const defMatch = line.match(/^([A-Z][a-zA-Z0-9_]+)\s*:\s*=/)
    if (defMatch) names.push(defMatch[1])

    // Instanz: Name = Component
    const instMatch = line.match(/^([A-Z][a-zA-Z0-9_]+)\s*=/)
    if (instMatch) names.push(instMatch[1])

    // Component am Zeilenanfang (ohne Assignment)
    const compMatch = line.match(/^([A-Z][a-zA-Z0-9_]+)(?:\s|$)/)
    if (compMatch && !line.includes('=') && !line.includes(':')) {
      // Nur wenn es ein bekanntes Pattern ist
    }
  }

  return [...new Set(names)]  // Deduplizieren
}
```

### Kontext-sensitive Targets

| Action | Target-Filter |
|--------|---------------|
| `show`, `hide`, `toggle` | Alle sichtbaren Elemente |
| `select`, `highlight` | Elemente mit `state selected/highlighted` |
| `open`, `close` | Dialogs, Panels, Modals |
| `page` | Page-Definitionen |

### Implementierung

```javascript
if (targetContextMatch) {
  const action = targetContextMatch[2]  // 'show', 'hide', etc.
  const elementNames = extractElementNames(context.state.doc)

  // Optional: Filtern basierend auf Action
  let filteredNames = elementNames
  if (action === 'page') {
    filteredNames = extractPageNames(context.state.doc)
  }

  const options = filteredNames.map(name => ({
    label: name,
    type: 'variable',
    info: `Target für ${action}`
  }))

  return { from, options }
}
```

---

## Duration-Kontext (Transition)

### Trigger-Pattern

```javascript
// Nach "transition" + Property
const durationContextMatch = textBefore.match(
  /\btransition\s+(all|bg|col|opacity|transform|pad|margin|w|h|rad)\s+$/
)
```

### Duration-Vorschläge

```javascript
if (durationContextMatch) {
  const durations = [
    { label: '100', info: '100ms - sehr schnell' },
    { label: '150', info: '150ms - schnell' },
    { label: '200', info: '200ms - normal (empfohlen)' },
    { label: '300', info: '300ms - gemächlich' },
    { label: '500', info: '500ms - langsam' },
  ]
  return { from, options: durations }
}
```

---

## Easing-Kontext (Transition)

### Trigger-Pattern

```javascript
// Nach "transition" + Property + Duration
const easingContextMatch = textBefore.match(
  /\btransition\s+(all|bg|col|opacity|transform|pad|margin|w|h|rad)\s+\d+\s+$/
)
```

### Easing-Vorschläge

```javascript
if (easingContextMatch) {
  const easings = [
    { label: 'ease', info: 'Standard Easing' },
    { label: 'ease-in', info: 'Langsamer Start' },
    { label: 'ease-out', info: 'Langsames Ende' },
    { label: 'ease-in-out', info: 'Langsamer Start und Ende' },
    { label: 'linear', info: 'Konstante Geschwindigkeit' },
  ]
  return { from, options: easings }
}
```

---

## Vollständige Kette

### Beispiel-Flow

```
Button
  on|                    → [onclick, onhover, onfocus, onblur, ...]
  onclick|               → : wird automatisch ergänzt
  onclick: |             → [show, hide, toggle, select, page, ...]
  onclick: toggle |      → [Sidebar, Menu, Modal, ...]  (aus Code)
  onclick: toggle Menu   → ✓ Fertig
```

### Mehrere Actions

```
Button
  onclick: show Modal, hide Overlay, select Tab1

  onclick: show Modal, |  → [hide, toggle, select, ...] (nächste Action)
```

Pattern für Komma-Verkettung:

```javascript
// Nach Action + Target + Komma
const chainContextMatch = textBefore.match(
  /\b(onclick|...):\s*(?:\w+\s+\w+\s*,\s*)+$/
)

if (chainContextMatch) {
  // Zeige Action-Autocomplete für nächste Action in Kette
  return { from, options: actions }
}
```

---

## Integration

### AutocompleteContext erweitern

```typescript
// studio/autocomplete/index.ts

export type AutocompleteContext =
  | 'property'
  | 'value'
  | 'state'
  | 'slot'
  | 'action'      // NEU
  | 'target'      // NEU
  | 'duration'    // NEU
  | 'easing'      // NEU
  | 'none'

export function detectContext(state: EditorState, pos: number): AutocompleteContext {
  const line = state.doc.lineAt(pos)
  const textBefore = line.text.slice(0, pos - line.from)

  // Action-Kontext (nach Event:)
  if (textBefore.match(/\b(onclick|onhover|onfocus|onblur|onchange|oninput|onkeydown\s+\w+):\s*$/)) {
    return 'action'
  }

  // Target-Kontext (nach Action)
  if (textBefore.match(/\b(onclick|...):\s*(show|hide|toggle|select|...)\s+$/)) {
    return 'target'
  }

  // Duration-Kontext
  if (textBefore.match(/\btransition\s+(all|bg|...)\s+$/)) {
    return 'duration'
  }

  // Easing-Kontext
  if (textBefore.match(/\btransition\s+(all|bg|...)\s+\d+\s+$/)) {
    return 'easing'
  }

  // ... bestehende Kontexte
}
```

### Neue Completion-Functions

```typescript
// studio/autocomplete/action-completions.ts

export function getActionCompletions(): Completion[] {
  return [
    { label: 'show', info: 'Element sichtbar machen', type: 'function' },
    { label: 'hide', info: 'Element verstecken', type: 'function' },
    { label: 'toggle', info: 'Sichtbarkeit umschalten', type: 'function' },
    // ...
  ]
}

export function getTargetCompletions(doc: Text, action: string): Completion[] {
  const elements = extractElementNames(doc)
  return elements.map(name => ({
    label: name,
    type: 'variable',
    info: `Target für ${action}`
  }))
}

export function getDurationCompletions(): Completion[] {
  return [
    { label: '100', info: '100ms - sehr schnell' },
    { label: '200', info: '200ms - normal' },
    { label: '300', info: '300ms - gemächlich' },
  ]
}

export function getEasingCompletions(): Completion[] {
  return [
    { label: 'ease', info: 'Standard' },
    { label: 'ease-in-out', info: 'Sanft' },
    { label: 'linear', info: 'Konstant' },
  ]
}
```

---

## Test-Szenarien

### Action-Kontext

| Eingabe | Erwartung |
|---------|-----------|
| `onclick: ` | Action-Autocomplete (show, hide, toggle...) |
| `onclick:` | Action-Autocomplete (ohne Space) |
| `onhover: ` | Action-Autocomplete |
| `onkeydown enter: ` | Action-Autocomplete |
| `onclick: to` | Gefiltert: `toggle` |

### Target-Kontext

| Eingabe | Erwartung |
|---------|-----------|
| `onclick: show ` | Elemente aus Code |
| `onclick: toggle ` | Elemente aus Code |
| `onclick: page ` | Page-Namen aus Code |
| `onclick: show M` | Gefiltert: `Modal`, `Menu`... |

### Duration-Kontext

| Eingabe | Erwartung |
|---------|-----------|
| `transition all ` | Duration-Vorschläge (100, 200, 300...) |
| `transition bg ` | Duration-Vorschläge |
| `transition all 2` | Gefiltert: `200` |

### Easing-Kontext

| Eingabe | Erwartung |
|---------|-----------|
| `transition all 200 ` | Easing-Vorschläge |
| `transition bg 150 ` | Easing-Vorschläge |
| `transition all 200 e` | Gefiltert: `ease`, `ease-in`... |

---

## Priorisierung

| Feature | Priorität | Aufwand |
|---------|-----------|---------|
| Action-Kontext | P1 | Niedrig |
| Target-Kontext | P1 | Mittel (Element-Extraktion) |
| Duration-Kontext | P2 | Niedrig |
| Easing-Kontext | P2 | Niedrig |
| Ketten-Autocomplete | P3 | Mittel |

---

## Lern-Effekt

Der User sieht bei jedem Schritt:

1. **Event-Syntax:** `onclick:` → lernt Event-Namen
2. **Action-Syntax:** `show`, `toggle` → lernt verfügbare Actions
3. **Target-Syntax:** Elementnamen → lernt Referenzierung
4. **Transition-Syntax:** `transition all 200 ease` → lernt komplette Syntax

Nach wenigen Interaktionen kann der User die Syntax auswendig und braucht kein Autocomplete mehr.
