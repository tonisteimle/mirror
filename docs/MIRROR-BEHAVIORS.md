# Mirror Behaviors - Interaktive Komponenten

> Deklarative Microinteractions für komplexe UI-Patterns

## Grundkonzepte

### Behavior States vs. System States

Mirror unterscheidet zwei Arten von States:

**System States** (automatisch durch Browser):
```mirror
Button: hover-bg #3B82F6     // :hover
Input: focus boc #3B82F6     // :focus
```

**Behavior States** (durch Actions aktiviert):
```mirror
Item: pad 12
  state default
    bg transparent
  state highlighted
    bg #333
  state selected
    bg #3B82F6

// Aktivierung durch Action
Item onhover highlight self
```

### Das Event-Action-Target Pattern

```
ON-EVENT [KEY-MODIFIER] ACTION TARGET
```

Liest sich wie ein Satz:
- `onclick close dropdown` → "Bei Klick schließe das Dropdown"
- `onkeydown escape close self` → "Bei Escape-Taste schließe mich selbst"
- `onhover highlight self` → "Bei Hover markiere mich selbst"

---

## Events

### Standard Events

| Event | Beschreibung | Beispiel |
|-------|--------------|----------|
| `onclick` | Mausklick | `onclick toggle` |
| `onclick-outside` | Klick außerhalb | `onclick-outside close self` |
| `onhover` | Hover | `onhover highlight self` |
| `onfocus` | Fokus erhalten | `onfocus show Hint` |
| `onblur` | Fokus verloren | `onblur hide Hint` |
| `onchange` | Wert geändert | `onchange validate self` |
| `oninput` | Während Eingabe | `oninput filter Items` |

### Keyboard Events

```mirror
onkeydown KEY action target
onkeyup KEY action target
```

**Key-Modifier:**

| Key | Beispiel |
|-----|----------|
| `escape` | `onkeydown escape close self` |
| `enter` | `onkeydown enter select highlighted` |
| `tab` | `onkeydown tab focus next` |
| `space` | `onkeydown space toggle` |
| `arrow-down` | `onkeydown arrow-down highlight next` |
| `arrow-up` | `onkeydown arrow-up highlight prev` |
| `arrow-left` | `onkeydown arrow-left prev` |
| `arrow-right` | `onkeydown arrow-right next` |
| `backspace` | `onkeydown backspace clear` |
| `delete` | `onkeydown delete remove` |
| `home` | `onkeydown home highlight first` |
| `end` | `onkeydown end highlight last` |

### Segment Events (für Masked Input)

| Event | Beschreibung | Beispiel |
|-------|--------------|----------|
| `onfill` | Segment vollständig gefüllt | `onfill focus next` |
| `oncomplete` | Alle Segments gefüllt | `oncomplete validate` |
| `onempty` | Segment leer (nach Backspace) | `onempty focus prev` |

### Timing Modifiers

Timing Modifiers können nach dem Event (und optionalem Key-Modifier) angegeben werden:

```
ON-EVENT [KEY-MODIFIER] [TIMING-MODIFIER MS] ACTION TARGET
```

| Modifier | Beschreibung | Beispiel |
|----------|--------------|----------|
| `debounce N` | Verzögert Ausführung, resettet bei neuen Events | `oninput debounce 300 filter Results` |
| `delay N` | Verzögert Ausführung um N ms | `onblur delay 200 hide Results` |

**Debounce** ist ideal für Autocomplete/Suche:
```mirror
Input oninput debounce 300 filter Results    // Wartet 300ms nach letzter Eingabe
```

**Delay** ist ideal für UI-Timing (z.B. Blur-Handler):
```mirror
Input onblur delay 200 hide Results          // Versteckt erst nach 200ms (erlaubt Klick auf Results)
```

**Kombination mit Key-Modifiern:**
```mirror
Input onkeydown escape debounce 100 close Results
```

---

## Actions

### Visibility Actions

| Action | Beschreibung | Beispiel |
|--------|--------------|----------|
| `show X` | Zeigt Element | `show Dropdown` |
| `hide X` | Versteckt Element | `hide Tooltip` |
| `toggle X` | Wechselt Sichtbarkeit | `toggle Menu` |
| `open X [pos] [anim] [ms]` | Öffnet mit Position/Animation | `open Dropdown below fade 200` |
| `close X [anim] [ms]` | Schließt mit Animation | `close Dialog fade 150` |

### Selection Actions

| Action | Beschreibung | Beispiel |
|--------|--------------|----------|
| `highlight X` | Markiert Element (visual) | `highlight self` |
| `highlight next/prev` | Markiert nächstes/vorheriges | `highlight next` |
| `highlight first/last` | Markiert erstes/letztes | `highlight first` |
| `select X` | Wählt Element aus (persistent) | `select self` |
| `select highlighted` | Wählt markiertes aus | `select highlighted` |
| `deselect X` | Entfernt Auswahl | `deselect self` |
| `clear-selection` | Entfernt alle Auswahlen | `clear-selection` |

### State Actions

| Action | Beschreibung | Beispiel |
|--------|--------------|----------|
| `change X to state` | Ändert State | `change self to active` |
| `reset X` | Setzt auf Initialzustand | `reset Form` |

### Activation Actions (Tabs, Toggle Groups)

| Action | Beschreibung | Beispiel |
|--------|--------------|----------|
| `activate X` | Aktiviert Element (state: active) | `activate self` |
| `deactivate X` | Deaktiviert Element (state: inactive) | `deactivate self` |
| `deactivate-siblings` | Deaktiviert alle Geschwister | `deactivate-siblings` |
| `toggle-state` | Wechselt zwischen States (für Accordions) | `toggle-state` |

**Typisches Tab-Pattern:**
```mirror
Tab: pad 12
  onclick activate self, deactivate-siblings
```

**Typisches Accordion-Pattern:**
```mirror
AccordionItem: ver
  Header onclick toggle-state
```

### Navigation Actions

| Action | Beschreibung | Beispiel |
|--------|--------------|----------|
| `focus X` | Setzt Fokus | `focus EmailInput` |
| `focus next/prev` | Fokussiert nächstes/vorheriges | `focus next` |
| `focus first-empty` | Fokussiert erstes leeres | `focus first-empty` |
| `page X` | Navigiert zu Seite | `page Dashboard` |

### Data Actions

| Action | Beschreibung | Beispiel |
|--------|--------------|----------|
| `assign $var to expr` | Setzt Variable | `assign $count to $count + 1` |
| `filter X` | Filtert Elemente | `filter Items` |
| `validate X` | Validiert Element | `validate self` |

### Chained Actions

Mehrere Actions in einer Zeile mit Komma:

```mirror
onclick select self, close Dropdown
onclick highlight self, show Preview
```

Für komplexere Logik: `events` Block:

```mirror
events
  SaveBtn onclick
    validate Form
    if Form.valid
      show SuccessMessage
      reset Form
    else
      show ErrorMessage
```

---

## Targets

### Relative Targets

| Target | Beschreibung |
|--------|--------------|
| `self` | Das auslösende Element |
| `next` | Nächstes Geschwister-Element |
| `prev` | Vorheriges Geschwister-Element |
| `first` | Erstes Element im Container |
| `last` | Letztes Element im Container |
| `first-empty` | Erstes leeres Segment |
| `highlighted` | Aktuell markiertes Element |
| `selected` | Aktuell ausgewähltes Element |
| `parent` | Eltern-Element |

### Group Targets

| Target | Beschreibung |
|--------|--------------|
| `self-and-before` | Dieses und alle vorherigen (Rating) |
| `all` | Alle Elemente im Container |
| `none` | Kein Element |

---

## Patterns

### 1. Dropdown / Select

```mirror
// Definitionen
Item: hor gap 8 pad 8 12 cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333
  state selected
    bg #3B82F6
  onclick select self, close Dropdown
  onhover highlight self

Dropdown: ver bg #1E1E2E rad 8 shadow lg hidden
  onclick-outside close self
  onkeydown escape close self
  onkeydown arrow-down highlight next
  onkeydown arrow-up highlight prev
  onkeydown enter select highlighted

// Verwendung
Input named Search onclick open Dropdown below, oninput filter Dropdown

Dropdown
  - Item icon "home" "Dashboard"
  - Item icon "user" "Profile"
  - Item icon "settings" "Settings"
  - Item icon "log-out" "Logout"
```

### 2. Masked Input (Phone Number)

```mirror
// Definition
PhoneInput: hor gap 4 ver-cen
  Segment: length 3 type digits
    onfill focus next
    onempty focus prev
  Text "-"
  Segment: length 3 type digits
    onfill focus next
    onempty focus prev
  Text "-"
  Segment: length 4 type digits
    oncomplete validate parent

// Verwendung
PhoneInput named Phone
  oncomplete
    if Phone.valid
      show SuccessIcon
```

### 3. PIN / OTP Input

```mirror
// Definition
PinInput: hor gap 8
  Segment: length 1 type digits w 48 h 56 align center size 24
    state empty
      boc #333
    state filled
      boc #3B82F6
    state invalid
      boc #EF4444
    onfill focus next
    onempty focus prev
    onkeydown backspace clear, focus prev

// Verwendung (4-digit PIN)
PinInput named Pin segments 4
  oncomplete validate

// Verwendung (6-digit OTP)
PinInput named Otp segments 6
  oncomplete submit
```

### 4. Credit Card Input

```mirror
CardInput: hor gap 8 ver-cen
  // Card Number: 4-4-4-4 format
  Segment: length 4 type digits
    onfill focus next
  Text " "
  Segment: length 4 type digits
    onfill focus next
  Text " "
  Segment: length 4 type digits
    onfill focus next
  Text " "
  Segment: length 4 type digits
    onfill focus next

  // Expiry: MM/YY
  Text "  "
  Segment: length 2 type digits pattern "0[1-9]|1[0-2]"
    onfill focus next
  Text "/"
  Segment: length 2 type digits
    onfill focus next

  // CVV
  Text "  "
  Segment: length 3 type digits mask
```

### 5. Date Range Picker

```mirror
// Definition
Day: 36 36 rad 4 cen cursor pointer
  state default
    bg transparent
  state in-range
    bg #3B82F620
  state range-start
    bg #3B82F6 rad 4 0 0 4
  state range-end
    bg #3B82F6 rad 0 4 4 0
  state disabled
    opacity 0.3 cursor default
  onclick
    if not $rangeStart
      assign $rangeStart to self.date
      change self to range-start
    else if not $rangeEnd
      assign $rangeEnd to self.date
      change self to range-end
      mark-range $rangeStart $rangeEnd

// Kalender-Grid
Calendar: grid 7 gap 2
  each $day in $days
    Day $day.label
      if $day.disabled then disabled
```

### 6. Autocomplete

```mirror
Autocomplete: ver w 300
  Input named Search oninput debounce 300 filter Results
    onfocus show Results
    onblur delay 200 hide Results

  Results: ver bg #1E1E2E rad 8 shadow lg hidden maxh 300 scroll
    state loading
      Spinner cen
    state empty
      Text col #666 pad 16 "No results"
    state results
      each $result in $filtered
        - Item $result.label
          onclick select self, close Results
          onhover highlight self

    onkeydown arrow-down highlight next
    onkeydown arrow-up highlight prev
    onkeydown enter select highlighted
    onkeydown escape close self
```

### 7. Tabs

```mirror
// Definition
Tab: pad 12 16 cursor pointer
  state inactive
    col #999 bor b 2 transparent
  state active
    col #FFF bor b 2 #3B82F6
  onclick activate self

TabPanel: pad 16
  state inactive
    hidden
  state active
    visible

// Verwendung
Tabs: ver
  TabBar: hor gap 0 bor b 1 #333
    - Tab "Overview"
    - Tab "Settings"
    - Tab "History"

  TabPanels: stacked
    - TabPanel "Overview content"
    - TabPanel "Settings content"
    - TabPanel "History content"

events
  Tab onclick
    deactivate-siblings
    activate linked-panel
```

**Vereinfachte Syntax mit auto-linking:**

```mirror
Tabs $active: 0
  TabBar: hor
    - Tab link 0 "Overview"
    - Tab link 1 "Settings"
    - Tab link 2 "History"

  - TabPanel for 0 "Overview content"
  - TabPanel for 1 "Settings content"
  - TabPanel for 2 "History content"
```

### 8. Rating (Stars)

```mirror
// Definition
Star: cursor pointer
  state empty
    icon "star" col #333
  state filled
    icon "star" col #F59E0B fill
  onhover highlight self-and-before
  onclick select self-and-before

// Verwendung
Rating: hor gap 4
  - Star
  - Star
  - Star
  - Star
  - Star

// Alternative: mit Anzahl
Rating: hor gap 4 stars 5
```

### 9. Stepper / Wizard

```mirror
// Definition
Step: hor gap 12 ver-cen
  state pending
    Number: 32 32 rad 16 bor 2 #333 col #666
    Label: col #666
  state current
    Number: 32 32 rad 16 bg #3B82F6 col white
    Label: col white weight 600
  state complete
    Number: 32 32 rad 16 bg #10B981 icon "check" col white
    Label: col #10B981

StepContent: pad 24
  state inactive
    hidden
  state active
    visible

// Verwendung
Wizard $step: 0
  Steps: hor gap 0 between
    - Step "Account"
    - Step "Profile"
    - Step "Confirm"

  Contents: stacked
    - StepContent
        "Account form..."
        Button onclick assign $step to 1 "Next"
    - StepContent
        "Profile form..."
        Button onclick assign $step to 0 "Back"
        Button onclick assign $step to 2 "Next"
    - StepContent
        "Confirmation..."
        Button onclick assign $step to 1 "Back"
        Button "Submit"
```

### 10. Toggle Group (Radio-like)

```mirror
// Definition
ToggleItem: pad 8 16 rad 4 cursor pointer
  state inactive
    bg transparent col #999
  state active
    bg #3B82F6 col white
  onclick activate self, deactivate-siblings

// Verwendung
ToggleGroup: hor gap 2 bg #1E1E2E pad 4 rad 8
  - ToggleItem "Day"
  - ToggleItem "Week"
  - ToggleItem "Month"
```

### 11. Expandable List

```mirror
// Definition
ExpandableItem: ver
  Header: hor between pad 12 cursor pointer
    Title: weight 500
    Chevron: icon "chevron-down"
      transition transform 200
  Content: hidden pad 12 bg #1E1E2E

  state collapsed
    Chevron transform rotate(0)
    Content hidden
  state expanded
    Chevron transform rotate(180deg)
    Content visible

  Header onclick toggle-state

// Verwendung
ExpandableList: ver gap 2
  - ExpandableItem
      Title "Section 1"
      Content "Content for section 1..."
  - ExpandableItem
      Title "Section 2"
      Content "Content for section 2..."
```

---

## Segment Constraints

Für Masked Inputs wie Phone, PIN, Credit Card:

| Constraint | Beschreibung | Beispiel |
|------------|--------------|----------|
| `length N` | Anzahl Zeichen | `length 4` |
| `type digits` | Nur Zahlen (0-9) | `type digits` |
| `type alpha` | Nur Buchstaben | `type alpha` |
| `type alphanumeric` | Buchstaben und Zahlen | `type alphanumeric` |
| `pattern "regex"` | Custom Pattern | `pattern "0[1-9]\|1[0-2]"` |
| `mask` | Zeichen verstecken (***) | `mask` |
| `uppercase` | Automatisch Großbuchstaben | `uppercase` |

---

## Behavior State Reference

| State | Verwendung | Auto-Reset |
|-------|------------|------------|
| `highlighted` | Keyboard/Hover Navigation | Ja, bei Blur |
| `selected` | Persistente Auswahl | Nein |
| `active` | Aktiver Tab/Item | Nein |
| `inactive` | Inaktiver Tab/Item | Nein |
| `expanded` | Geöffneter Accordion | Nein |
| `collapsed` | Geschlossener Accordion | Nein |
| `in-range` | Innerhalb Date Range | Nein |
| `range-start` | Beginn Date Range | Nein |
| `range-end` | Ende Date Range | Nein |
| `valid` | Validierung bestanden | Nein |
| `invalid` | Validierung fehlgeschlagen | Nein |
| `empty` | Leeres Input/Segment | Ja |
| `filled` | Gefülltes Segment | Ja |
| `loading` | Async Operation läuft | Ja |
| `complete` | Alle Segments gefüllt | Nein |

---

## Quick Reference

```
EVENTS      onclick onclick-outside onhover onfocus onblur onchange oninput
            onkeydown KEY onkeyup KEY onfill oncomplete onempty

KEYS        escape enter tab space arrow-up arrow-down arrow-left arrow-right
            backspace delete home end

TIMING      debounce N    (reset timer on each event, ideal for search)
            delay N       (delay action execution, ideal for blur)

ACTIONS     show hide toggle open close
            highlight select deselect clear-selection
            activate deactivate deactivate-siblings toggle-state
            change reset focus page assign filter validate

TARGETS     self next prev first last first-empty
            highlighted selected parent
            self-and-before all none

STATES      highlighted selected active inactive expanded collapsed
            in-range range-start range-end valid invalid
            empty filled loading complete

SEGMENTS    length N | type digits/alpha/alphanumeric | pattern "regex" | mask | uppercase
```

---

## Migration von Events-Block

Behaviors können sowohl inline als auch im events-Block definiert werden:

**Inline (für einfache Cases):**
```mirror
Button onclick toggle Menu "Menu"
Item onhover highlight self
```

**Events-Block (für komplexe Logik):**
```mirror
events
  SearchInput oninput
    filter Results
    if SearchInput.value.length > 0
      show ClearBtn
    else
      hide ClearBtn
```

Die beiden Ansätze können kombiniert werden.
