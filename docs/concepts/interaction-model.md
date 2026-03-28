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

## Das Modell

### 1. Elemente haben States

Jedes Element definiert seine möglichen Zustände und deren Aussehen:

```
Menu
  closed: hidden
  open: visible fade-in

Sidebar
  collapsed: w 0
  expanded: w 300
```

### 2. Auslöser setzen States

Auslöser (Events) setzen States auf einem oder mehreren Elementen:

```
Button click:
  Menu open
  Sidebar collapsed

Escape:
  Menu closed
  Sidebar expanded
```

### 3. Self-States sind Kurzform

Wenn ein Element seinen eigenen State ändert, verschmelzen Event und State:

```
Button
  hover: bg #f00       // Event=hover, State=hover, Target=self
  active: scale 0.95
```

Das ist äquivalent zu:

```
Button
  default: bg #333
  hover: bg #f00

Button hover: Button hover
```

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
Menu
  closed: hidden
  open: visible

Button click: Menu open
Escape: Menu closed
```

## Vollständiges Beispiel

```
// States definieren
Menu
  closed: hidden
  open: visible fade-in

Backdrop
  hidden: opacity 0
  visible: opacity 0.5

Navigation
  expanded: w 300
  collapsed: w 0

// Self-States (Kurzform)
Button
  bg #333
  hover: bg #555
  active: scale 0.95

// Auslöser setzen States
Button click:
  Menu open
  Backdrop visible
  Navigation collapsed

CloseButton click:
  Menu closed
  Backdrop hidden
  Navigation expanded

Escape:
  Menu closed
  Backdrop hidden
  Navigation expanded
```

## System-States vs Custom-States

### System-States (impliziter Trigger)

| State | Trigger |
|-------|---------|
| `hover` | mouseenter / mouseleave |
| `focus` | focus / blur |
| `active` | mousedown / mouseup |
| `disabled` | attribute |

### Custom-States (expliziter Trigger)

| State | Trigger |
|-------|---------|
| `open` | click, etc. (muss definiert werden) |
| `expanded` | click, etc. |
| `selected` | click, etc. |
| `loading` | async operation |

## Vorteile

1. **Deklarativ** - Beschreibt WAS, nicht WIE
2. **Lesbar** - 1:1 übersetzbar zu natürlicher Sprache
3. **Konsistent** - Gleiches Konzept für UI und Interaktion
4. **State Machine** - Visuell darstellbar, beweisbar korrekt
5. **Designer-freundlich** - Keine Programmierkonzepte nötig

## Abgrenzung

Dieses Modell deckt ~80% der Interaktionen ab:

- Visibility togglen
- Accordions / Tabs
- Modals / Dropdowns
- Hover / Focus States
- Multi-Element-Änderungen

Für komplexere Fälle (Daten, Listen, Formulare) braucht es Erweiterungen.

## Offene Fragen

- [ ] Wie behandelt man Daten (Arrays, Objekte)?
- [ ] Wie funktioniert Validierung?
- [ ] Wie definiert man Transitions zwischen States?
- [ ] Braucht es benannte Szenen für komplexe Übergänge?
