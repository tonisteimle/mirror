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

Escape: Menu closed
```

## Vollständige Beispiele

### Tabs

```
Tabs:
  Tab:
    pad 12
    bg #eee
    hover:
      bg #ddd
    selected exclusive onclick:
      bg #fff
      border-bottom 2 blue

Tabs
  Tab "Home"
  Tab "Products"
  Tab "Contact"
```

### Modal mit Backdrop

```
Modal:
  hidden
  open:
    visible
    fade-in

Backdrop:
  hidden
  visible when Modal open:
    opacity 0.5

Button open onclick: Modal open
Escape: Modal closed
```

### Accordion

```
Accordion:
  Panel:
    collapsed: h 0
    expanded exclusive onclick:
      h auto

Accordion
  Panel "Section 1"
    Content "..."
  Panel "Section 2"
    Content "..."
  Panel "Section 3"
    Content "..."
```

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

## Zusammenfassung

```
┌─────────────────────────────────────────────────────────────────┐
│  SYNTAX                                                         │
│                                                                 │
│  state [modifier] [trigger]:                                    │
│    aussehen                                                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  BEISPIELE                                                      │
│                                                                 │
│  hover:                      // System-State (Kurzform)        │
│    bg #f00                                                      │
│                                                                 │
│  selected onclick:           // Custom-State                   │
│    bg #fff                                                      │
│                                                                 │
│  expanded exclusive onclick: // Mit Modifier                   │
│    h auto                                                       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  DEFINITION VS. INSTANZ                                         │
│                                                                 │
│  Tab:                        // Definition: States + Verhalten │
│    selected exclusive onclick:                                  │
│      bg #fff                                                    │
│                                                                 │
│  Tabs                        // Instanzen: nur Existenz        │
│    Tab "Home"                                                   │
│    Tab "About"                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Vorteile

1. **Deklarativ** - Beschreibt WAS, nicht WIE
2. **Lesbar** - State steht immer vorne
3. **Konsistent** - Gleiche Syntax für System- und Custom-States
4. **Keine Aufzählung** - `exclusive` statt alle anderen listen
5. **Trennung** - Definition beschreibt, Instanz verwendet

## Offene Fragen

- [ ] Wie behandelt man Daten (Arrays, Objekte)?
- [ ] Wie funktioniert Validierung?
- [ ] Wie definiert man Transitions zwischen States?
- [ ] Syntax für `when` Abhängigkeiten finalisieren
