# Dropdown: Spezialisierte Prompts

## Prompt 1: Structure

**Input:** "Dropdown mit Label, Icon und Items"

**System Prompt:**
```
Du generierst NUR die Komponenten-Hierarchie in Mirror-Syntax.
Keine Properties, keine Styles, keine Events.
Nur Komponenten-Namen und Verschachtelung mit Einrückung.

Regeln:
- Komponenten-Definitionen enden mit `:`
- Kinder werden eingerückt (2 Spaces)
- Keine Properties (kein pad, bg, col, etc.)
```

**Expected Output:**
```mirror
Dropdown:
  Trigger:
    Label:
    ChevronIcon:
  Menu:
    Item:
```

---

## Prompt 2: Layout

**Input:** Komponenten-Liste + Beschreibung

**System Prompt:**
```
Du generierst NUR Layout-Properties für Mirror-Komponenten.
Erlaubte Properties: hor, ver, gap, center, spread, wrap, left, right, top, bottom

Regeln:
- Eine Zeile pro Komponente
- Format: `KomponentenName: layout-props`
- Keine Farben, keine Abstände (padding), keine Events
```

**Input:**
```
Komponenten: Trigger, Menu, Item
Beschreibung: Trigger ist horizontal mit Icon rechts. Menu ist vertikal. Items sind horizontal.
```

**Expected Output:**
```mirror
Trigger: hor, center, spread
Menu: ver
Item: hor, center
```

---

## Prompt 3: Styling

**Input:** Komponenten-Liste + Design-Beschreibung

**System Prompt:**
```
Du generierst NUR visuelle Properties für Mirror-Komponenten.
Erlaubte Properties: bg, col, pad, rad, bor, font-size, shadow, opacity

Regeln:
- Eine Zeile pro Komponente
- Format: `KomponentenName: style-props`
- Verwende Hex-Farben oder Token ($name)
- Keine Layout-Props (kein hor, ver, gap)
- Keine Events
```

**Input:**
```
Komponenten: Trigger, Menu, Item, Label, ChevronIcon
Design: Dunkles Theme. Trigger mit Border. Menu mit Shadow. Items mit Padding.
```

**Expected Output:**
```mirror
Trigger: bg #1A1A23, bor 1 #333, rad 6, pad 8 12
Menu: bg #1A1A23, bor 1 #333, rad 6, shadow md
Item: pad 8 12, col #E4E4E7
Label: col #E4E4E7, font-size 13
ChevronIcon: col #71717A
```

---

## Prompt 4: States

**Input:** Komponenten-Liste + Verhaltensbeschreibung

**System Prompt:**
```
Du generierst NUR State-Definitionen für Mirror-Komponenten.
Erlaubte States: hover, focus, active, disabled, highlighted, selected, expanded, collapsed, hidden

Regeln:
- Inline-Syntax: `state statename prop value`
- Oder Block-Syntax mit Einrückung
- Nur State-relevante Properties ändern
```

**Input:**
```
Komponenten: Menu, Item
Verhalten: Menu ist initial versteckt. Items haben hover-Effekt und können selected sein.
```

**Expected Output:**
```mirror
Menu: hidden

Item:
  state hover bg #333
  state highlighted bg #333
  state selected bg #2563EB, col white
```

---

## Prompt 5: Events

**Input:** Komponenten-Liste + Interaktionsbeschreibung

**System Prompt:**
```
Du generierst NUR Event-Handler für Mirror-Komponenten.
Erlaubte Events: onclick, onhover, onkeydown, onclick-outside
Erlaubte Actions: toggle, show, hide, select, highlight, close, open

Regeln:
- Format: `eventname action target`
- Keyboard-Events: `onkeydown KEY: action`
- Für Keyboard-Navigation: keys-Block verwenden
```

**Input:**
```
Komponenten: Trigger, Menu, Item
Interaktion: Trigger öffnet/schließt Menu. Item-Klick wählt aus und schließt. Escape schließt. Pfeiltasten navigieren.
```

**Expected Output:**
```mirror
Trigger:
  onclick toggle Menu

Menu:
  onclick-outside close
  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

Item:
  onclick select
  onhover highlight
```

---

## Merged Output

Alle Outputs zusammengeführt (Mirror merged automatisch):

```mirror
// Structure
Dropdown:
  Trigger:
    Label:
    ChevronIcon:
  Menu:
    Item:

// Layout
Trigger: hor, center, spread
Menu: ver
Item: hor, center

// Styling
Trigger: bg #1A1A23, bor 1 #333, rad 6, pad 8 12
Menu: bg #1A1A23, bor 1 #333, rad 6, shadow md
Item: pad 8 12, col #E4E4E7
Label: col #E4E4E7, font-size 13
ChevronIcon: col #71717A

// States
Menu: hidden
Item:
  state hover bg #333
  state highlighted bg #333
  state selected bg #2563EB, col white

// Events
Trigger:
  onclick toggle Menu

Menu:
  onclick-outside close
  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select highlighted, close

Item:
  onclick select
  onhover highlight
```

---

## Orchestrator Flow

```
User Request: "Baue ein Dropdown mit dunklem Theme"
                    │
                    ▼
            ┌─────────────┐
            │ Orchestrator│
            └──────┬──────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Structure│  │ Layout  │  │ Styling │
└────┬────┘  └────┬────┘  └────┬────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐
│ States  │  │ Events  │
└────┬────┘  └────┬────┘
     │             │
     └──────┬──────┘
            │
            ▼
      ┌───────────┐
      │  Merger   │
      └─────┬─────┘
            │
            ▼
    Valid Mirror Code
```
