# Interaction Model

> Status: Konzept
>
> Ein deklaratives Interaktionsmodell basierend auf State Machines.

## Kernidee

Mirror ist deklarativ für UI. Interaktionen sollten es auch sein.

```
UI:           "Frame ist rot"           → Frame bg #f00
Interaktion:  "Menu ist offen wenn..."  → Menu open: visible
```

Alles ist State. Keine Events. Keine Handler.

## Syntax

### Grundform

```
state [modifier] [trigger]:
  aussehen
```

| Teil | Beschreibung | Beispiel |
|------|--------------|----------|
| state | Der Zustand | `selected`, `open`, `hover` |
| modifier | Optionale Regel | `exclusive` |
| trigger | Was löst aus | `onclick`, `onhover` |
| aussehen | Visuelle Ausprägung | `bg #f00`, `visible` |

### Kurzform: Trigger = State

Wenn Trigger und State identisch sind:

```
hover:           // = hover onhover:
  bg #f00
```

### Langform: Trigger ≠ State

Wenn Trigger und State unterschiedlich sind:

```
selected onclick:
  bg #f00
```

### Mit Modifier

```
selected exclusive onclick:
  bg #f00
```

→ "selected (und zwar exclusive) bei onclick"

## Definition vs. Instanz

### Definition (Template)

Beschreibt States, Aussehen, Verhalten:

```
Tab:
  bg #eee
  hover:
    bg #ddd
  selected exclusive onclick:
    bg #fff
```

### Instanz (Verwendung)

Nur Existenz und Inhalt:

```
Tabs
  Tab "Home"
  Tab "About"
  Tab "Contact"
```

Die Instanz erbt alles von der Definition.

## Exclusive Pattern

Für Radio/Tab-Verhalten: nur einer kann den State haben.

```
Tab:
  bg #eee
  selected exclusive onclick:
    bg #fff

Tabs
  Tab "Tab 1"
  Tab "Tab 2"
  Tab "Tab 3"
```

- Klick auf Tab 2 → Tab 2 wird `selected`
- Alle anderen Tabs in der Gruppe werden automatisch `unselected`

Kein Aufzählen nötig. Die `exclusive` Regel macht das automatisch.

## State Machine

Das Modell ist eine State Machine:

```
                    click
        ┌────────────────────────┐
        │                        ▼
   ┌─────────┐              ┌─────────┐
   │ closed  │              │  open   │
   │ hidden  │              │ visible │
   └─────────┘              └─────────┘
        ▲                        │
        └────────────────────────┘
                   escape
```

In Mirror:

```
Menu:
  closed: hidden
  open onclick: visible
  closed onkeydown escape: hidden
```

Kein Sonderfall für Escape. Gleiche Syntax. `closed` ist der State, `onkeydown escape` ist der Trigger.

## Vollständige Beispiele

### 1. Dropdown Menu

```
Dropdown:
  Menu:
    hidden
    open onclick:
      visible
      fade-in

  Item:
    pad 12
    hover:
      bg #f5f5f5
    selected onclick:
      bg #e0e0e0

Dropdown
  Button "Optionen"
  Menu
    Item "Bearbeiten"
    Item "Kopieren"
    Item "Löschen"
```

### 2. Tabs mit Content

```
TabBar:
  Tab:
    pad 16
    opacity 0.6
    hover:
      opacity 0.8
    selected exclusive onclick:
      opacity 1
      border-bottom 2 blue

TabContent:
  Panel:
    hidden
    active exclusive:
      visible

TabBar
  Tab "Home"
  Tab "Produkte"
  Tab "Kontakt"

TabContent
  Panel
    Text "Willkommen..."
  Panel
    Text "Unsere Produkte..."
  Panel
    Text "Kontaktieren Sie uns..."
```

### 3. Modal mit Backdrop

```
Modal:
  closed: hidden
  open onclick:
    visible
    scale 1
    fade-in
  closed onkeydown escape: hidden

Backdrop:
  hidden
  visible when Modal open:
    opacity 0.5

// Instanzen
Backdrop

OpenButton onclick: Modal open

Modal
  Header "Titel"
  Content "..."
  CloseButton onclick: Modal closed
```

### 4. Multi-Element: Sidebar Navigation

Ein Trigger beeinflusst mehrere Elemente gleichzeitig.

**Variante A: Aufzählung beim Trigger**

```
MenuButton:
  onclick:
    Sidebar open
    Backdrop visible
    MainContent shifted

CloseButton:
  onclick:
    Sidebar closed
    Backdrop hidden
    MainContent default

Sidebar:
  closed: x -300
  open: x 0

Backdrop:
  hidden: opacity 0
  visible: opacity 0.5

MainContent:
  default: x 0
  shifted: x 300

// Instanzen
MenuButton "Menu"
Sidebar
  Nav
    Link "Home"
    Link "About"
Backdrop
MainContent
  Text "..."
```

**Variante B: Abhängigkeiten bei den Elementen**

```
Sidebar:
  closed: x -300
  open onclick: x 0
  closed onkeydown escape: x -300

Backdrop:
  hidden: opacity 0
  visible when Sidebar open:
    opacity 0.5

MainContent:
  default: x 0
  shifted when Sidebar open:
    x 300

// Instanzen
MenuButton onclick: Sidebar open
Sidebar
  Nav
    Link "Home"
    Link "About"
Backdrop
MainContent
  Text "..."
```

→ Variante B ist deklarativer: Jedes Element beschreibt seine eigenen Abhängigkeiten.

## System-States vs Custom-States

### System-States (Trigger = State)

| State | Trigger (implizit) |
|-------|-------------------|
| `hover` | mouseenter / mouseleave |
| `focus` | focus / blur |
| `active` | mousedown / mouseup |
| `disabled` | attribute |

```
hover:        // Kurzform
  bg #f00
```

### Custom-States (Trigger explizit)

| State | Trigger |
|-------|---------|
| `open` | onclick, etc. |
| `selected` | onclick, etc. |
| `expanded` | onclick, etc. |

```
open onclick:    // Langform
  visible

selected exclusive onclick:    // Mit Modifier
  bg #fff
```

## Multi-Element-Änderungen

Ein Trigger kann mehrere States setzen:

```
MenuButton onclick:
  Menu open
  Backdrop visible
  Navigation collapsed
```

Oder deklarativ mit Abhängigkeiten:

```
Backdrop:
  hidden
  visible when Menu open

Navigation:
  expanded
  collapsed when Menu open
```

→ Backdrop und Navigation reagieren automatisch auf Menu's State.

## Toggle Pattern

Toggle ist kein Sonderfall. Es sind zwei State-Übergänge mit dem gleichen Trigger:

```
Menu:
  closed: hidden
  open onclick: visible      // wenn closed → open bei click
  closed onclick: hidden     // wenn open → closed bei click
```

Oder mit `toggle` Modifier für häufigen Fall:

```
Menu:
  closed: hidden
  open toggle onclick: visible
```

→ `toggle` bedeutet: gleicher Trigger wechselt zwischen diesem State und dem vorherigen.

## Initialer State

Der initiale State ist entweder:

**1. Der erste definierte State:**

```
Modal:
  closed: hidden      // ← initial (weil erster)
  open onclick: visible
```

**2. Explizit markiert:**

```
Modal:
  closed: hidden
  open initial onclick: visible    // ← explizit initial
```

## Naming & Scoping

Elemente müssen eindeutig benannt sein wenn sie referenziert werden:

```
// Eindeutige Namen
MainModal:
  closed: hidden
  open onclick: visible

SettingsModal:
  closed: hidden
  open onclick: visible

// Referenz ist eindeutig
OpenMain onclick: MainModal open
OpenSettings onclick: SettingsModal open
```

Bei `when` Abhängigkeiten ebenfalls:

```
Backdrop:
  visible when MainModal open or SettingsModal open:
    opacity 0.5
```

## Mehrere Bedingungen

Mit `and` und `or`:

```
Backdrop:
  visible when Menu open or Sidebar open:
    opacity 0.5

SubmitButton:
  enabled when Form valid and User loggedIn:
    opacity 1
    cursor pointer
```

Kombiniert:

```
Panel:
  visible when (Menu open or Sidebar open) and User loggedIn:
    opacity 1
```

## Zusammenfassung

```
┌─────────────────────────────────────────────────────────────────┐
│  SYNTAX                                                         │
│                                                                 │
│  state [modifier] [trigger]:                                    │
│    aussehen                                                     │
│                                                                 │
│  state when Element state:                                      │
│    aussehen                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  BEISPIELE                                                      │
│                                                                 │
│  hover:                           // System-State (Kurzform)   │
│    bg #f00                                                      │
│                                                                 │
│  selected onclick:                // Custom-State              │
│    bg #fff                                                      │
│                                                                 │
│  selected exclusive onclick:      // Exclusive (Radio/Tab)     │
│    bg #fff                                                      │
│                                                                 │
│  open toggle onclick:             // Toggle                    │
│    visible                                                      │
│                                                                 │
│  closed onkeydown escape:         // Keyboard                  │
│    hidden                                                       │
│                                                                 │
│  visible when Menu open:          // Abhängigkeit              │
│    opacity 0.5                                                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  MODIFIER                                                       │
│                                                                 │
│  exclusive    nur einer in Gruppe kann State haben             │
│  toggle       gleicher Trigger wechselt hin/zurück             │
│  initial      explizit als Start-State markieren               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  BEDINGUNGEN                                                    │
│                                                                 │
│  when A open                      // einfach                   │
│  when A open or B open            // oder                      │
│  when A valid and B valid         // und                       │
│  when (A or B) and C              // kombiniert                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Vorteile

1. **Deklarativ** - Beschreibt WAS, nicht WIE
2. **Lesbar** - State steht immer vorne
3. **Konsistent** - Gleiche Syntax für System- und Custom-States
4. **Keine Aufzählung** - `exclusive` statt alle anderen listen
5. **Trennung** - Definition beschreibt, Instanz verwendet

## Animationen

Animationen sind nahtlos in das State-System integriert.

### Syntax-Übersicht

```
state [modifier] [trigger] [animation]:
  properties
  [enter: animation]
  [exit: animation]
```

| Form | Syntax | Beschreibung |
|------|--------|--------------|
| Einfach | `selected onclick:` | Keine Animation |
| Preset | `selected onclick: bounce` | Preset-Animation beim Eintreten |
| Duration | `selected onclick 0.2s:` | Auto-Transition aller Properties |
| Duration + Easing | `selected onclick 0.3s ease-out:` | Mit Easing |
| Enter/Exit | `enter: slide-in` / `exit: fade-out` | Separate Ein-/Aus-Animation |

### Einfache Animation (Preset nach Trigger)

```
Tab
  selected onclick: bounce
    bg #3B82F6
```

→ `bounce` spielt beim Eintreten in `selected`

### Auto-Transition (Duration nach Trigger)

```
Card
  default:
    scale 1
    shadow sm

  highlighted onhover 0.15s:
    scale 1.02
    shadow md

  selected onclick 0.3s ease-out:
    bg #3B82F6
    shadow lg
```

→ Alle geänderten Properties werden animiert (wie CSS `transition`)

### Enter/Exit Animationen

Wenn Ein- und Aus-Animation unterschiedlich sein sollen:

```
Modal
  closed:
    hidden

  open onclick:
    enter: scale-in
    exit: fade-out
    visible
```

→ `scale-in` beim Öffnen, `fade-out` beim Schließen

**Kurzform:** Animation nach `:` ist implizit `enter`:

```
Modal
  open onclick: scale-in
    exit: fade-out
    visible
```

### When mit Animation

```
Backdrop
  visible when Menu open 0.2s:
    opacity 0.5

Sidebar
  expanded when Hamburger active: slide-in
    x 0
```

### Multi-Element mit Animation

```
MenuButton onclick:
  Menu open: slide-in
  Backdrop visible: fade-in
```

Oder mit Stagger:

```
OpenAll onclick:
  Dialog open: scale-in
  Backdrop visible: fade-in 0.1s delay
  Sidebar expanded: slide-in 0.2s delay
```

### Verfügbare Presets

| Preset | Beschreibung |
|--------|--------------|
| `fade-in` | Einblenden |
| `fade-out` | Ausblenden |
| `slide-in` | Reingleiten |
| `slide-out` | Rausgleiten |
| `scale-in` | Reinzoomen |
| `scale-out` | Rauszoomen |
| `bounce` | Hüpfen |
| `pulse` | Pulsieren |
| `shake` | Schütteln |
| `spin` | Drehen |

### Custom Animationen

Eigene Animationen definieren:

```
FadeUp as animation: ease-out
  0.00 opacity 0, y-offset 20
  0.30 opacity 1, y-offset 0

// Verwendung
Card
  visible onclick: FadeUp
    opacity 1
```

### Vollständiges Beispiel

```
Modal:
  closed:
    hidden

  open onclick: scale-in
    exit: fade-out
    visible

Backdrop:
  hidden:
    opacity 0

  visible when Modal open 0.3s:
    opacity 0.5

OpenButton:
  onclick:
    Modal open

// Instanzen
OpenButton "Öffnen"
Backdrop
Modal
  Header "Titel"
  Content "..."
  CloseButton onclick: Modal closed
```

### Zusammenfassung Animation

```
┌─────────────────────────────────────────────────────────────────┐
│  ANIMATION IN STATE BLOCKS                                      │
│                                                                 │
│  // Keine Animation                                             │
│  selected onclick:                                              │
│    bg blue                                                      │
│                                                                 │
│  // Preset-Animation                                            │
│  selected onclick: bounce                                       │
│    bg blue                                                      │
│                                                                 │
│  // Auto-Transition (Duration)                                  │
│  selected onclick 0.2s:                                         │
│    bg blue                                                      │
│                                                                 │
│  // Mit Easing                                                  │
│  selected onclick 0.3s ease-out:                                │
│    bg blue                                                      │
│                                                                 │
│  // Separate Enter/Exit                                         │
│  open onclick: scale-in                                         │
│    exit: fade-out                                               │
│    visible                                                      │
│                                                                 │
│  // When mit Animation                                          │
│  visible when Menu open 0.2s:                                   │
│    opacity 0.5                                                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  PRESETS                                                        │
│                                                                 │
│  fade-in, fade-out, slide-in, slide-out                        │
│  scale-in, scale-out, bounce, pulse, shake, spin               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Offene Fragen

- [ ] Wie behandelt man Daten (Arrays, Objekte)?
- [ ] Wie funktioniert Validierung?
- [x] ~~Wie definiert man Transitions/Animationen zwischen States?~~ → Siehe Animationen
- [ ] Negation in Bedingungen? (`when Menu not open` vs. `when Menu closed`)
