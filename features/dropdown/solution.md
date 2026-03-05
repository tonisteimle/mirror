# Dropdown - Technische Lösung

## Übersicht

Die Dropdown-Funktionalität wird durch das Zusammenspiel von Parser, IR-Transformer und DOM-Backend implementiert. Es gibt keine spezielle "Dropdown-Komponente" - stattdessen werden allgemeine Primitive kombiniert.

## Architektur

```
Mirror DSL → Parser → AST → IR Transformer → IR → DOM Backend → JavaScript
```

## Parser

### Initial State (`closed`, `open`, `collapsed`, `expanded`)

Der Parser erkennt State-Keywords als Properties:

```typescript
// In parser.ts
const stateKeywords = ['closed', 'open', 'collapsed', 'expanded', 'hidden', 'visible']
```

Diese werden als `initialState` auf der Komponente gespeichert:

```typescript
component.initialState = 'closed'
```

### Conditional Visibility (`if (state)`)

Der Parser erkennt `if (condition)` Blöcke:

```typescript
// if (open) wird zu:
{
  visibleWhen: 'open',
  children: [...]
}
```

Kinder erben das `visibleWhen` Property.

### Events

| DSL | Parser Output |
|-----|---------------|
| `onclick toggle` | `{ name: 'click', actions: [{ type: 'toggle' }] }` |
| `onclick-outside close` | `{ name: 'click-outside', actions: [{ type: 'close' }] }` |
| `onhover highlight` | `{ name: 'mouseenter', actions: [{ type: 'highlight' }] }` |
| `onclick select, close` | `{ name: 'click', actions: [{ type: 'select' }, { type: 'close' }] }` |

### Keys Block

```mirror
keys
  escape close
  arrow-down highlight next
```

Wird zu Array von Keyboard-Events:

```typescript
[
  { name: 'keydown', key: 'escape', actions: [{ type: 'close' }] },
  { name: 'keydown', key: 'arrow-down', actions: [{ type: 'highlight', target: 'next' }] }
]
```

### Selection Binding

```mirror
selection selected
```

Wird zu:

```typescript
component.selection = 'selected'
```

## IR Transformer

### IRNode Struktur (types.ts:39-40)

```typescript
interface IRNode {
  // ...
  visibleWhen?: string    // State-based visibility: "if (open)" → "open"
  initialState?: string   // Initial state: "closed", "open", etc.
  selection?: string      // Selection binding variable
  events: IREvent[]       // Event handlers
}
```

### Transformation (ir/index.ts:157-172)

```typescript
const visibleWhen = instance.visibleWhen || resolvedComponent?.visibleWhen
const initialState = instance.initialState || resolvedComponent?.initialState

return {
  // ...
  visibleWhen,
  initialState,
  selection: instance.selection,
  events: transformEvents(instance.events)
}
```

## DOM Backend

### Initial State (dom.ts:269-273)

```typescript
// Initial state
if (node.initialState) {
  this.emit(`${varName}.dataset.state = '${node.initialState}'`)
  this.emit(`${varName}._initialState = '${node.initialState}'`)
}
```

### Visible When (dom.ts:275-280)

```typescript
if (node.visibleWhen) {
  this.emit(`${varName}._visibleWhen = '${node.visibleWhen}'`)
  this.emit(`// Initially hidden until parent state matches`)
  this.emit(`${varName}.style.display = 'none'`)
}
```

### Keyboard Events (dom.ts:289-293)

```typescript
// Check if there are keyboard events and make element focusable
const hasKeyboardEvents = node.events.some(e => e.key || e.name === 'keydown')
if (hasKeyboardEvents) {
  this.emit(`${varName}.setAttribute('tabindex', '0')`)
}
```

### Click-Outside Handler (dom.ts:625-641)

```typescript
if (eventName === 'click-outside') {
  this.emit(`const ${varName}_clickOutsideHandler = (e) => {`)
  this.emit(`  if (!${varName}.contains(e.target)) {`)
  // ... emit actions
  this.emit(`  }`)
  this.emit(`}`)
  this.emit(`document.addEventListener('click', ${varName}_clickOutsideHandler)`)
}
```

## Runtime Helpers

### toggle (dom.ts:965-988)

```typescript
toggle(el) {
  const currentState = el.dataset.state || el._initialState
  if (currentState === 'closed' || currentState === 'open') {
    const newState = currentState === 'closed' ? 'open' : 'closed'
    this.setState(el, newState)
  } else if (currentState === 'collapsed' || currentState === 'expanded') {
    const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed'
    this.setState(el, newState)
  }
}
```

### close (dom.ts:1009-1030)

```typescript
close(el) {
  const initialState = el._initialState
  if (initialState === 'closed' || el.dataset.state === 'open') {
    this.setState(el, 'closed')  // State wechseln, nicht hide
  } else {
    this.hide(el)  // Fallback
  }
}
```

### highlight / highlightNext / highlightPrev (dom.ts:1066-1123)

```typescript
highlight(el) {
  // Clear highlight from siblings first
  Array.from(el.parentElement.children).forEach(sibling => {
    if (sibling !== el && sibling.dataset.highlighted) {
      this.unhighlight(sibling)
    }
  })
  el.dataset.highlighted = 'true'
  this.applyState(el, 'highlighted')
}

highlightNext(container) {
  const items = this.getHighlightableItems(container)
  const current = items.findIndex(el => el.dataset.highlighted === 'true')
  const next = current === -1 ? 0 : Math.min(current + 1, items.length - 1)
  this.highlight(items[next])
}
```

### select / selectHighlighted (dom.ts:1032-1055, 1183-1191)

```typescript
select(el) {
  // Clear previous selection from siblings
  Array.from(el.parentElement.children).forEach(sibling => {
    if (sibling !== el && sibling.dataset.selected) {
      this.deselect(sibling)
    }
  })
  el.dataset.selected = 'true'
  this.applyState(el, 'selected')
  this.updateSelectionBinding(el)
}

selectHighlighted(container) {
  const items = this.getHighlightableItems(container)
  const highlighted = items.find(el => el.dataset.highlighted === 'true')
  if (highlighted) this.select(highlighted)
}
```

### updateVisibility (dom.ts:1281-1319)

```typescript
updateVisibility(el) {
  const state = el.dataset.state
  const children = el.querySelectorAll('[data-mirror-id]')
  children.forEach(child => {
    if (child._visibleWhen) {
      const visible = state === child._visibleWhen
      child.style.display = visible ? '' : 'none'
    }
  })
}
```

### updateSelectionBinding (dom.ts:1323-1348)

```typescript
updateSelectionBinding(el) {
  let parent = el.parentElement
  while (parent) {
    if (parent._selectionBinding) {
      const value = el.textContent?.trim() || ''
      const varName = parent._selectionBinding
      window._mirrorState = window._mirrorState || {}
      window._mirrorState[varName] = value
      return
    }
    parent = parent.parentElement
  }
}
```

## Key Mapping (dom.ts:1447-1461)

```typescript
private mapKeyName(key: string): string {
  const mapping = {
    'escape': 'Escape',
    'enter': 'Enter',
    'arrow-up': 'ArrowUp',
    'arrow-down': 'ArrowDown',
    // ...
  }
  return mapping[key] || key
}
```

## State Management

### data-Attribute Konvention

| Attribut | Bedeutung |
|----------|-----------|
| `data-state` | Aktueller State (open, closed, etc.) |
| `data-highlighted` | Element ist hervorgehoben |
| `data-selected` | Element ist ausgewählt |

### State Styles

Behavior-States werden zur Laufzeit verwaltet:

```typescript
el._stateStyles = {
  'highlighted': { background: '#444' },
  'selected': { background: '#2563EB', color: 'white' }
}
```

CSS-States (hover, focus, active, disabled) werden als CSS-Pseudo-Selektoren generiert.

## Offene Punkte

### Ternary Text-Binding

```mirror
// Noch nicht implementiert:
Text selected ? selected : "Placeholder"
```

Benötigt:
1. Parser: Ternary-Expressions in Text-Content erkennen
2. IR: TextNode mit Expression statt statischem String
3. DOM Backend: Reaktive Text-Updates bei Variable-Änderung
