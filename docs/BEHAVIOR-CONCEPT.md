# Mirror Behavior Concept

> Deklarative UI-Interaktionen für komplexe Komponenten

## Status: In Entwicklung

**Implementiert:**
- [x] Parser: Events (`onclick`, `onclick-outside`, `onkeydown escape`, etc.)
- [x] Parser: Actions (`highlight`, `select`, `filter`, `show`, `hide`)
- [x] Parser: Key-Modifier (`escape`, `enter`, `arrow-up`, `arrow-down`, etc.)
- [x] Generator: Click-outside Detection
- [x] Generator: Key-Modifier Filtering
- [x] Registry: Behavior State Management
- [x] Generator: Highlight/Select/Filter Rendering
- [x] Generator: Container Context (for item registration)
- [ ] Standard-Komponenten mit eingebauten Behaviors

---

## Das Problem

Ein Dropdown braucht ~350 Zeilen JavaScript für:
- Click outside → schließen
- Escape → schließen
- Pfeiltasten → navigieren
- Enter → auswählen
- Type-ahead → filtern

---

## Das Ziel: Minimaler, lesbarer Code

```mirror
// DEFINITIONEN (einmal)
item: hor gap 8 pad 8 12 hover-bg #333 cursor pointer
  onclick select self, close dropdown
  onhover highlight self

dropdown: ver bg #1E1E2E rad 8 shadow lg hidden
  onclick-outside close self
  onkeydown escape close self
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted

// ANWENDUNG (konkret)
input onclick open dropdown below onkey filter dropdown

dropdown
  item icon "home" "Dashboard"
  item icon "user" "Profil"
  item icon "settings" "Einstellungen"
  item icon "logout" "Abmelden"
```

**11 Zeilen** für ein voll funktionales Dropdown.

---

## Die Lösung: Deklarative Behaviors

```
ON-EVENT [MODIFIER] ACTION TARGET
```

Liest sich wie ein Satz. Kein Magic. Alles explizit.

---

## Syntax-Referenz

### Events

| Event | Beschreibung | Implementiert |
|-------|--------------|---------------|
| `onclick` | Mausklick | ✅ |
| `onclick-outside` | Klick außerhalb | ✅ |
| `onclick-inside` | Klick innerhalb | ✅ |
| `onhover` | Hover | ✅ |
| `onkeydown KEY` | Taste gedrückt | ✅ |
| `onkeyup KEY` | Taste losgelassen | ✅ |
| `onfocus` | Fokus erhalten | ✅ |
| `onblur` | Fokus verloren | ✅ |
| `onchange` | Wert geändert | ✅ |
| `oninput` | Während Eingabe | ✅ |

### Key-Modifier (für onkeydown/onkeyup)

| Key | JavaScript Event.key | Implementiert |
|-----|---------------------|---------------|
| `escape` | `Escape` | ✅ |
| `enter` | `Enter` | ✅ |
| `tab` | `Tab` | ✅ |
| `space` | ` ` (Space) | ✅ |
| `arrow-down` | `ArrowDown` | ✅ |
| `arrow-up` | `ArrowUp` | ✅ |
| `arrow-left` | `ArrowLeft` | ✅ |
| `arrow-right` | `ArrowRight` | ✅ |
| `backspace` | `Backspace` | ✅ |
| `delete` | `Delete` | ✅ |
| `home` | `Home` | ✅ |
| `end` | `End` | ✅ |

### Actions

| Action | Beschreibung | Implementiert |
|--------|--------------|---------------|
| `open X` | Zeigt X | ✅ |
| `close X` | Versteckt X | ✅ |
| `toggle X` | Wechselt Sichtbarkeit | ✅ |
| `show X` | Zeigt X (State: visible) | ✅ |
| `hide X` | Versteckt X (State: hidden) | ✅ |
| `change X to Y` | Ändert State von X zu Y | ✅ |
| `assign $var to expr` | Setzt Variable | ✅ |
| `page X` | Navigiert zu Seite X | ✅ |
| `highlight X` | Markiert X | ✅ |
| `highlight next` | Markiert nächstes Element | ✅ |
| `highlight prev` | Markiert vorheriges Element | ✅ |
| `select X` | Wählt X aus | ✅ |
| `select highlighted` | Wählt markiertes aus | ✅ |
| `filter X` | Filtert Elemente in X | ✅ |

### Spezielle Targets

| Target | Beschreibung |
|--------|--------------|
| `self` | Das aktuelle Element |
| `next` | Nächstes Element in Container |
| `prev` | Vorheriges Element in Container |
| `highlighted` | Aktuell markiertes Element |

---

## Implementierungs-Details

### Parser-Änderungen

**Neue Event-Keywords** (`src/dsl/properties.ts`):
```typescript
EVENT_KEYWORDS = [
  'onclick', 'onhover', 'onchange', 'oninput', 'onload',
  'onfocus', 'onblur', 'onkeydown', 'onkeyup',
  'onclick-outside', 'onclick-inside'  // NEU
]

KEY_MODIFIERS = [
  'escape', 'enter', 'tab', 'space',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
  'backspace', 'delete', 'home', 'end'
]

ACTION_KEYWORDS = [
  'open', 'close', 'toggle', 'change', 'page',
  'show', 'hide', 'assign', 'alert',
  'highlight', 'select', 'filter'  // NEU
]

BEHAVIOR_TARGETS = [
  'self', 'next', 'prev', 'highlighted'
]
```

**EventHandler Type** (`src/parser/types.ts`):
```typescript
interface EventHandler {
  event: string           // 'onclick', 'onclick-outside', 'onkeydown'
  modifier?: string       // 'escape', 'enter', etc. (für onkeydown)
  actions: ActionStatement[]
}

interface ActionStatement {
  type: 'highlight' | 'select' | 'filter' | ...
  target?: string         // 'self', 'next', 'prev', 'highlighted', oder Name
  inContainer?: string    // für 'highlight next in dropdown'
}
```

### Generator-Änderungen

**Key-Modifier Matching** (`src/generator/react-generator.tsx`):
```typescript
function matchesKeyModifier(e: React.KeyboardEvent, modifier?: string): boolean {
  if (!modifier) return true
  const keyMap = {
    'escape': 'Escape',
    'enter': 'Enter',
    'arrow-down': 'ArrowDown',
    // ...
  }
  return e.key === keyMap[modifier]
}
```

**Click-Outside Detection**:
```typescript
// In InteractiveComponent
const clickOutsideHandler = eventHandlerMap.get('onclick-outside')

useEffect(() => {
  if (!clickOutsideHandler) return

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      executeHandler(clickOutsideHandler)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [clickOutsideHandler, executeHandler])
```

**Behavior Registry** (`src/generator/behaviors/registry.tsx`):
```typescript
interface BehaviorRegistry {
  // State
  getState(id: string): string
  setState(id: string, state: string): void
  toggle(id: string): void

  // Behavior Actions
  highlight(itemId: string, containerId: string): void
  highlightNext(containerId: string): void
  highlightPrev(containerId: string): void
  select(itemId: string, containerId: string): void
  selectHighlighted(containerId: string): void
  filter(containerId: string, query: string): void

  // Getters
  getHighlightedItem(containerId: string): string | null
  getSelectedItem(containerId: string): string | null
  getFilterQuery(containerId: string): string
}
```

---

## Beispiele

### Select/Dropdown (vollständig)

```mirror
// Komponenten-Definitionen mit Behaviors
item: hor gap 8 pad 8 12 hover-bg #333 cursor pointer
  onclick select self, close dropdown
  onhover highlight self

dropdown: ver bg #1E1E2E rad 8 shadow lg hidden
  onclick-outside close self
  onkeydown escape close self
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted

// Anwendung
input onclick open dropdown below onkey filter dropdown

dropdown
  item icon "home" "Dashboard"
  item icon "user" "Profil"
  item icon "settings" "Einstellungen"
  item icon "logout" "Abmelden"
```

### Dialog

```mirror
Dialog
  Button named OpenBtn onclick open Content "Dialog öffnen"

  Box named Backdrop hidden onclick close Content
    Box named Content pad 24 rad 12 shadow xl
      "Dialog Inhalt"
      Button onclick close Content "Schließen"

events
  Backdrop onclick
    close Content
  Content onkeydown escape
    close Content
```

### Tooltip

```mirror
Tooltip
  Box named Trigger onhover open Tip, onblur close Tip
    "Hover me"

  Box named Tip hidden
    "Tooltip text"
```

### Accordion

```mirror
Accordion
  - Section
      Box named Header onclick toggle Content
        "Section 1"
        Icon "chevron-down"
      Box named Content hidden
        "Content 1"

  - Section
      Box named Header onclick toggle Content
        "Section 2"
      Box named Content hidden
        "Content 2"
```

### Tabs mit Keyboard-Navigation

```mirror
Tabs $active: 0
  Box hor gap 8
    - Button onclick assign $active to 0 "Tab 1"
    - Button onclick assign $active to 1 "Tab 2"
    - Button onclick assign $active to 2 "Tab 3"

  Box
    if $active == 0 "Content 1"
    if $active == 1 "Content 2"
    if $active == 2 "Content 3"

events
  Tabs onkeydown arrow-right
    assign $active to ($active + 1) % 3
  Tabs onkeydown arrow-left
    assign $active to ($active - 1 + 3) % 3
```

---

## Filter-Verhalten

```mirror
input onkey filter dropdown
```

Durchsucht **allen Text** im Item - egal wie komplex:

```mirror
item
  "Dashboard"          // ✓ wird durchsucht
  "Admin Panel"        // ✓ wird durchsucht
  "12 Users"           // ✓ wird durchsucht
```

Tippe "Admin" → findet das Item.

**Kein extra Markup nötig.** Der Filter durchsucht automatisch allen sichtbaren Text.

---

## Compiler Output

```mirror
onclick-outside close Menu
```

Wird zu:

```javascript
useEffect(() => {
  if (!menuVisible) return

  const handleClickOutside = (e) => {
    if (containerRef.current && !containerRef.current.contains(e.target)) {
      setMenuVisible(false)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [menuVisible])
```

**1 Zeile Mirror = 15 Zeilen JavaScript**

---

## Das Kernprinzip: 2 Layer

```
┌─────────────────────────────────────────────────────────────┐
│  DEFINITION (einmal)                                        │
│  → Aussehen (Styling)                                       │
│  → Verhalten (Behaviors)                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  VERWENDUNG (kurz & klar)                                   │
│  → Nur Inhalt                                               │
│  → Optional: überschreiben was nötig ist                    │
└─────────────────────────────────────────────────────────────┘
```

Die Komplexität steckt in der **Definition**.
Die Verwendung ist **einfach und lesbar**.

---

## Vorteile

| Aspekt | Traditionell | Mirror |
|--------|--------------|--------|
| Zeilen Code | ~350 | ~11 |
| Lesbarkeit | Schwer | Sehr gut |
| Wiederverwendung | Copy-Paste | Einmal definieren |
| Verhalten ändern | Überall suchen | Eine Stelle |

---

## Der Paradigmenwechsel

Von **imperativ** (wie es funktioniert):

```javascript
useEffect(() => {
  const handleClickOutside = (e) => {
    if (ref.current && !ref.current.contains(e.target)) {
      setIsOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [isOpen])
```

Zu **deklarativ** (was passieren soll):

```mirror
onclick-outside close self
```

**Eine Zeile statt zehn.**

---

## Was das bedeutet

- Entwickler müssen nicht wissen was `useEffect` ist
- Entwickler müssen nicht wissen was `event.preventDefault()` macht
- Entwickler müssen nicht wissen wie Click-Outside-Detection funktioniert

Sie schreiben einfach:

```mirror
onclick-outside close dropdown
```

Und es funktioniert.

**Das ist keine DSL. Das ist eine neue Art, UI zu denken.**

---

## Nächste Schritte

1. ~~Parser erweitern für Behavior-Syntax~~ ✅
2. ~~Generator erweitern für Click-Outside und Key-Modifier~~ ✅
3. Generator erweitern für Highlight/Select/Filter Rendering
4. Standard-Komponenten mit Behaviors (item, dropdown, dialog, tabs)
5. Dokumentation im CLAUDE.md erweitern

---

## Datei-Referenz

| Datei | Änderungen |
|-------|------------|
| `src/dsl/properties.ts` | Neue Keywords: EVENT_KEYWORDS, KEY_MODIFIERS, ACTION_KEYWORDS, BEHAVIOR_TARGETS |
| `src/parser/types.ts` | EventHandler.modifier, ActionStatement.inContainer, neue Action-Types |
| `src/parser/component-parser.ts` | parseInlineEventHandler mit Key-Modifier |
| `src/parser/events-parser.ts` | parseCentralizedEventHandler mit Key-Modifier |
| `src/parser/state-parser.ts` | parseAction für highlight/select/filter, parseEventHandler mit Key-Modifier |
| `src/generator/react-generator.tsx` | matchesKeyModifier(), click-outside useEffect, containerRef |
| `src/generator/actions/action-executor.ts` | Neue Cases: show, hide, highlight, select, filter |
| `src/generator/behaviors/index.ts` | BehaviorRegistry Interface erweitert |
| `src/generator/behaviors/registry.tsx` | Implementierung der Behavior-Methoden |
