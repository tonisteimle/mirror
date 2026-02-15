# Mirror Interactivity - Dokumentations-Konzept

> Ziel: Schrittweiser Aufbau vom einfachsten Klick bis zu komplexen Patterns wie Autocomplete.

---

## Das Grundprinzip (Der eine Satz)

```
EVENT → ACTION → STATE
```

**Alles in Mirror folgt diesem Muster:**
- Ein **Event** passiert (Nutzer klickt)
- Eine **Action** wird ausgeführt (toggle)
- Ein **State** ändert sich (von off zu on)

```mirror
Button onclick toggle
       ↑       ↑
     Event   Action
```

Das ist alles. Der Rest ist Variation und Kombination.

---

## Stufe 1: Der erste Klick

### 1.1 Toggle - An und Aus

Das einfachste interaktive Element: Ein Button der zwischen zwei Zuständen wechselt.

```mirror
Button onclick toggle "Click me"
```

**Was passiert?**
- `onclick` = wenn geklickt wird
- `toggle` = wechsle zum nächsten State

Aber wohin wechselt er? Wir brauchen **States**:

```mirror
Button: pad 12 rad 8
  state off
    bg #333
    "Off"
  state on
    bg #3B82F6
    "On"

Button onclick toggle
```

**Lernziel:** Event + Action + States = Interaktion

---

### 1.2 Show und Hide

Etwas zeigen oder verstecken:

```mirror
Button onclick show Tooltip "Hover me"

Tooltip: hidden pad 8 bg #333 rad 4
  "I'm a tooltip!"
```

**Die wichtigsten Sichtbarkeits-Actions:**

| Action | Was passiert |
|--------|--------------|
| `show X` | Zeigt Element X |
| `hide X` | Versteckt Element X |
| `toggle X` | Wechselt Sichtbarkeit von X |

---

### 1.3 Übung: Notification Badge

```mirror
// Aufgabe: Klick auf Button soll Badge verstecken

Button: pad 12 bg #3B82F6 rad 8
  "3 new messages"
  Badge: 20 20 rad 10 bg #EF4444 "3"

Button onclick ??? Badge
```

**Lösung:** `onclick hide Badge`

---

## Stufe 2: States verstehen

### 2.1 Was ist ein State?

Ein State ist eine **benannte Konfiguration** von Properties.

```mirror
Card: pad 16 bg #1E1E2E rad 8
  state default
    bor 1 #333
  state selected
    bor 2 #3B82F6
    shadow lg
```

**Ohne States** müsstest du schreiben:
```javascript
// Pseudo-Code
if (isSelected) {
  border = "2px solid #3B82F6"
  boxShadow = "..."
} else {
  border = "1px solid #333"
}
```

**Mit States** siehst du alles an einem Ort.

---

### 2.2 System States vs Custom States

**System States** - automatisch vom Browser:

| State | Wann aktiv |
|-------|------------|
| `hover` | Maus darüber |
| `focus` | Element fokussiert |
| `active` | Gerade geklickt |
| `disabled` | Element deaktiviert |

```mirror
Button: pad 12 bg #333 rad 8
  state hover
    bg #444
  state active
    bg #222
```

**Custom States** - von dir definiert:

```mirror
Toggle: pad 12
  state off
    bg #333
  state on
    bg #3B82F6
```

---

### 2.3 Hover Shorthand

Für einfache Hover-Effekte gibt es eine Kurzform:

```mirror
// Statt:
Button: pad 12 bg #333
  state hover
    bg #444
    col #FFF

// Kannst du schreiben:
Button: pad 12 bg #333 hover-bg #444 hover-col #FFF
```

**Verfügbare Hover-Properties:**
`hover-bg`, `hover-col`, `hover-boc`, `hover-opacity`, `hover-scale`

---

## Stufe 3: Mehrere Elemente steuern

### 3.1 Das Problem: Tabs

Du hast drei Tabs. Wenn einer aktiv wird, sollen die anderen inaktiv werden.

**Naiver Ansatz (funktioniert nicht gut):**
```mirror
Tab1 onclick change Tab1 to active, change Tab2 to inactive, change Tab3 to inactive
Tab2 onclick change Tab2 to active, change Tab1 to inactive, change Tab3 to inactive
// ... wird schnell unübersichtlich
```

**Besserer Ansatz:**
```mirror
Tab onclick activate self, deactivate-siblings
```

---

### 3.2 Activate und Deactivate

| Action | Was passiert |
|--------|--------------|
| `activate self` | Setzt eigenen State auf `active` |
| `deactivate self` | Setzt eigenen State auf `inactive` |
| `deactivate-siblings` | Setzt alle Geschwister auf `inactive` |

**Vollständiges Tab-Beispiel:**

```mirror
Tab: pad 12 16 cursor pointer
  state inactive
    col #666
    bor b 2 transparent
  state active
    col #FFF
    bor b 2 #3B82F6

TabBar: hor gap 0 bor b 1 #333
  - Tab "Overview"
  - Tab "Settings"
  - Tab "History"

events
  Tab onclick
    activate self
    deactivate-siblings
```

---

### 3.3 Highlight und Select (Dropdown Pattern)

Für Listen und Menüs brauchst du zwei Konzepte:

| Konzept | Bedeutung | Beispiel |
|---------|-----------|----------|
| **Highlight** | Visuell markiert (temporär) | Hover über Item |
| **Select** | Ausgewählt (persistent) | Klick auf Item |

```mirror
Item: pad 8 12 cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333
  state selected
    bg #3B82F6

Menu: ver bg #1E1E2E rad 8
  - Item "Dashboard"
  - Item "Settings"
  - Item "Logout"

events
  Item onhover highlight self
  Item onclick select self
```

**Wichtig:** `highlighted` ist temporär (geht weg bei Blur), `selected` ist persistent.

---

## Stufe 4: Keyboard Navigation

### 4.1 Keyboard Events

```mirror
onkeydown KEY action
```

**Verfügbare Keys:**

| Key | Beschreibung |
|-----|--------------|
| `escape` | Escape-Taste |
| `enter` | Enter-Taste |
| `space` | Leertaste |
| `tab` | Tab-Taste |
| `arrow-up` | Pfeil hoch |
| `arrow-down` | Pfeil runter |
| `arrow-left` | Pfeil links |
| `arrow-right` | Pfeil rechts |

---

### 4.2 Dropdown mit Keyboard

```mirror
Dropdown: ver bg #1E1E2E rad 8 shadow lg
  onkeydown escape close self
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted

  - Item "Option 1"
  - Item "Option 2"
  - Item "Option 3"
```

**Die Navigation-Targets:**

| Target | Bedeutung |
|--------|-----------|
| `self` | Das aktuelle Element |
| `next` | Das nächste Element |
| `prev` | Das vorherige Element |
| `first` | Das erste Element |
| `last` | Das letzte Element |
| `highlighted` | Das aktuell markierte |
| `selected` | Das ausgewählte |

---

### 4.3 Vollständiges Dropdown

```mirror
// Trigger
Input: pad 8 12 bg #1E1E2E rad 8 bor 1 #333
  onclick open Dropdown below
  onfocus open Dropdown below
  "Select option..."

// Dropdown
Dropdown: ver bg #1E1E2E rad 8 shadow lg hidden
  onclick-outside close self
  onkeydown escape close self
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted, close self

  - Item onhover highlight self, onclick select self "Dashboard"
  - Item onhover highlight self, onclick select self "Settings"
  - Item onhover highlight self, onclick select self "Profile"
```

---

## Stufe 5: Fortgeschrittene Patterns

### 5.1 Autocomplete (mit Debounce)

Problem: Bei jedem Tastendruck filtern ist zu schnell. Lösung: **Debounce**.

```mirror
// Debounce wartet 300ms nach der letzten Eingabe
Input oninput debounce 300 filter Results
```

**Vollständiges Autocomplete:**

```mirror
Autocomplete: ver w 300
  Input: pad 8 12 bg #1E1E2E rad 8 bor 1 #333
    oninput debounce 300 filter Results
    onfocus show Results
    onblur delay 200 hide Results  // delay erlaubt Klick auf Results
    "Search..."

  Results: ver bg #1E1E2E rad 8 shadow lg hidden maxh 200 scroll
    onkeydown arrow-down highlight next
    onkeydown arrow-up highlight prev
    onkeydown enter select highlighted, hide self

    - Item "Result 1"
    - Item "Result 2"
    - Item "Result 3"
```

**Timing Modifiers:**

| Modifier | Wann verwenden |
|----------|----------------|
| `debounce N` | Wartet N ms nach letzter Eingabe (für Suche) |
| `delay N` | Verzögert Ausführung um N ms (für Blur) |

---

### 5.2 Rating (Stars)

Das "self-and-before" Pattern: Hover über Stern 3 markiert Sterne 1, 2, 3.

```mirror
Star: cursor pointer
  state empty
    icon "star" col #333
  state filled
    icon "star" col #F59E0B

Rating: hor gap 4
  - Star onhover highlight self-and-before, onclick select self-and-before
  - Star onhover highlight self-and-before, onclick select self-and-before
  - Star onhover highlight self-and-before, onclick select self-and-before
  - Star onhover highlight self-and-before, onclick select self-and-before
  - Star onhover highlight self-and-before, onclick select self-and-before
```

---

### 5.3 Accordion (Toggle State)

Für Elemente die zwischen expanded/collapsed wechseln:

```mirror
AccordionItem: ver
  Header: hor between pad 12 cursor pointer
    Title: weight 500 "Section Title"
    Chevron: icon "chevron-down"

  Content: hidden pad 12 bg #1E1E2E
    "Hidden content here..."

  state collapsed
    Chevron transform rotate(0)
    Content hidden
  state expanded
    Chevron transform rotate(180deg)
    Content visible

  Header onclick toggle-state
```

---

## Referenz: Alle Events

| Event | Wann | Beispiel |
|-------|------|----------|
| `onclick` | Klick | `onclick toggle` |
| `onclick-outside` | Klick außerhalb | `onclick-outside close self` |
| `onhover` | Maus darüber | `onhover highlight self` |
| `onfocus` | Fokus erhalten | `onfocus show Hint` |
| `onblur` | Fokus verloren | `onblur hide Hint` |
| `onchange` | Wert geändert | `onchange validate self` |
| `oninput` | Während Eingabe | `oninput filter Results` |
| `onkeydown KEY` | Taste gedrückt | `onkeydown escape close` |
| `onkeyup KEY` | Taste losgelassen | `onkeyup enter submit` |
| `onload` | Komponente geladen | `onload show Welcome` |

---

## Referenz: Alle Actions

### Sichtbarkeit
| Action | Beschreibung |
|--------|--------------|
| `show X` | Zeigt Element |
| `hide X` | Versteckt Element |
| `toggle X` | Wechselt Sichtbarkeit |
| `open X [pos] [anim] [ms]` | Öffnet Overlay |
| `close [X] [anim] [ms]` | Schließt Overlay |

### States
| Action | Beschreibung |
|--------|--------------|
| `change X to state` | Setzt spezifischen State |
| `activate X` | Setzt State auf `active` |
| `deactivate X` | Setzt State auf `inactive` |
| `deactivate-siblings` | Deaktiviert alle Geschwister |
| `toggle-state` | Wechselt zwischen States |

### Selection
| Action | Beschreibung |
|--------|--------------|
| `highlight X` | Markiert Element (temporär) |
| `highlight next/prev` | Markiert nächstes/vorheriges |
| `select X` | Wählt Element (persistent) |
| `select highlighted` | Wählt markiertes aus |
| `deselect X` | Entfernt Auswahl |
| `clear-selection` | Entfernt alle Auswahlen |

### Navigation & Form
| Action | Beschreibung |
|--------|--------------|
| `focus X` | Fokussiert Element |
| `focus next/prev` | Fokussiert nächstes/vorheriges |
| `page X` | Navigiert zu Seite |
| `filter X` | Filtert Elemente |
| `validate X` | Validiert Element |
| `reset X` | Setzt zurück |

### Daten
| Action | Beschreibung |
|--------|--------------|
| `assign $var to expr` | Setzt Variable |

---

## Referenz: Alle Targets

| Target | Bedeutung |
|--------|-----------|
| `self` | Das auslösende Element |
| `next` | Nächstes Geschwister |
| `prev` | Vorheriges Geschwister |
| `first` | Erstes im Container |
| `last` | Letztes im Container |
| `highlighted` | Aktuell markiertes |
| `selected` | Aktuell ausgewähltes |
| `self-and-before` | Selbst und alle davor (Rating) |
| `all` | Alle im Container |
| `none` | Keines |

---

## Quick Reference Card

```
EVENTS      onclick onclick-outside onhover onfocus onblur
            onchange oninput onkeydown KEY onkeyup KEY onload

KEYS        escape enter tab space
            arrow-up arrow-down arrow-left arrow-right

TIMING      debounce N (für Suche)
            delay N (für Blur)

ACTIONS     show hide toggle open close
            change activate deactivate deactivate-siblings toggle-state
            highlight select deselect clear-selection
            focus filter validate reset
            assign $var to expr page X

TARGETS     self next prev first last
            highlighted selected self-and-before all none

CHAINING    onclick action1, action2    (Komma trennt Actions)
```
