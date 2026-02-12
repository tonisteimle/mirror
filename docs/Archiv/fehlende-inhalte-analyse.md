# Analyse: Fehlende Inhalte in mirror-doku.html

Diese Analyse vergleicht `mirror-doku.html` mit `reference.html` und dokumentiert alle Inhalte, die in der reference.html vorhanden sind, aber in mirror-doku.html fehlen oder weniger detailliert beschrieben werden.

---

## 1. Syntax-Grundlagen (Fehlt weitgehend)

Die reference.html enthält einen dedizierten Abschnitt zu Syntax-Grundlagen, der in mirror-doku.html nicht systematisch behandelt wird:

### Zeilenstruktur
```
ComponentName property value property value "text content"
```

### Einrückung
- Kinder werden mit **2 Spaces** eingerückt (nicht explizit dokumentiert in mirror-doku)

### Dimension Shorthand (FEHLT KOMPLETT)
```mirror
// Shorthand - erste zwei Zahlen werden als w/h interpretiert
Box 300 400 pad 16           // w 300, h 400
Card 200 pad 8               // nur w 200

// Äquivalent zu
Box w 300 h 400 pad 16
Card w 200 pad 8

// Mischen möglich
Panel 300 h 400              // w implizit, h explizit
```

Bei `Image` wird der String als `src` interpretiert, gefolgt von Breite und Höhe:
```mirror
Image "foto.jpg" 800 600
```

### Farben mit Alpha
```mirror
Box col #3B82F680      // RGBA (50% Transparenz)
```

### Komponenten-Namen Konvention (nicht explizit)
```mirror
Button "Click"    // Großbuchstabe → Komponente
header hor        // Kleinbuchstabe → Element
```

---

## 2. Komponenten-Property-Referenzen (FEHLT)

Referenziere Properties von definierten Komponenten:

```mirror
// Komponente definieren
Card: rad 16 pad 20 col #2A2A3E

// Properties referenzieren
Button rad Card.rad col Card.col
```

### Design-System Pattern
```mirror
// Design-Primitives definieren
Spacing: pad 16 gap 12
Radius: rad 8
Colors: col #1E1E2E

// Überall verwenden
Card pad Spacing.pad gap Spacing.gap rad Radius.rad col Colors.col
```

---

## 3. Fehlende Properties

### gap-col / gap-row (FEHLT)
```mirror
gap-col 16       // Horizontaler Abstand
gap-row 8        // Vertikaler Abstand
```

### Scroll Properties (TEILWEISE FEHLT)
In mirror-doku.html nur in Quick Reference erwähnt, nicht erklärt:

```mirror
// Vertikaler Scroll (Chat, Feed)
Box h 400 scroll
  Content

// Horizontaler Carousel mit Snap
Row scroll-hor snap gap 16
  Card 300 200
  Card 300 200
  Card 300 200

// Map/Canvas (beide Richtungen)
Box scroll-both
  LargeContent
```

| Property | Beschreibung |
|----------|-------------|
| `scroll` | Vertikal scrollen (default) |
| `scroll-ver` | Vertikal scrollen (explizit) |
| `scroll-hor` | Horizontal scrollen |
| `scroll-both` | Beide Richtungen |
| `snap` | Elemente rasten ein |
| `clip` | Überlauf abschneiden |

### pointer Property (FEHLT)
```mirror
Box pointer none    // Pointer Events deaktivieren
```

### Shadow Presets (FEHLT)
```mirror
shadow sm    // kleiner Schatten
shadow md    // mittlerer Schatten
shadow lg    // großer Schatten
```

### visible Property (TEILWEISE FEHLT)
```mirror
visible true     // Element sichtbar
visible false    // Element versteckt
disabled         // Element deaktivieren
disabled true    // Element deaktivieren (explizit)
```

---

## 4. Modifiers (FEHLEN KOMPLETT)

Vordefinierte Style-Shortcuts:

| Modifier | Beschreibung |
|----------|-------------|
| `-primary` | Primärer Stil (blauer Hintergrund, weißer Text) |
| `-secondary` | Sekundärer Stil (grauer Hintergrund) |
| `-outlined` | Transparenter Hintergrund, Rahmen |
| `-ghost` | Komplett transparent |
| `-filled` | Gefüllter Hintergrund |
| `-disabled` | 50% Transparenz, nicht klickbar |
| `-rounded` | Vollständig gerundet (Pill-Form) |

```mirror
Button -primary "Submit"
Button -outlined "Cancel"
Button -disabled "Nicht verfügbar"
```

---

## 5. Fehlende Events und Actions

### change Action (FEHLT)
```mirror
onclick change self to active     // Ändert eigenen State
onclick change Panel to expanded  // Ändert State einer anderen Komponente
```

### Bedingte Actions (FEHLT)
```mirror
$isLoggedIn: true
Button onclick if $isLoggedIn page Dashboard else open LoginDialog "Go"
```

### onkeydown / onkeyup / onload Events
In mirror-doku.html nur erwähnt, nicht mit Beispielen erklärt.

---

## 6. Detailliertere Property-Zuweisungen im Events-Block (TEILWEISE FEHLT)

Die reference.html zeigt mehr Beispiele für Property-Zuweisungen:

```mirror
events
  Email onchange
    Error.visible = false

  Submit onclick
    if Email.value and Password.value
      Submit.label = "Sending..."
      Submit.disabled = true
      page Dashboard
    else
      Error.text = "Bitte alle Felder ausfüllen"
      Error.visible = true
```

### Intrinsische Properties Tabelle (FEHLT)
| Komponente | Properties |
|------------|-----------|
| Alle | `.visible`, `.disabled`, `.opacity`, `.col` |
| Input / Textarea | `.value`, `.placeholder`, `.focus` |
| Button | `.label`, `.loading` |
| Checkbox / Switch | `.checked` |
| Dialog / Overlay | `.open`, `.close` |
| Text / Label | `.text` |
| Image | `.src`, `.alt` |

---

## 7. Library-Komponenten (FEHLEN KOMPLETT)

Dies ist der größte fehlende Abschnitt. Die reference.html dokumentiert vordefinierte interaktive Komponenten mit eingebautem Verhalten:

### Overlays

#### Dropdown
```mirror
Dropdown
  Trigger: pad 8 12 col #1A1A1A rad 6 bor 1 boc #333
    "Options"
  Content: ver col #1A1A1A rad 8 pad 4 bor 1 boc #333
    Item: pad 8 12 rad 4 hover-col #333
      "Profile"
    Item: pad 8 12 rad 4 hover-col #333
      "Settings"
    Separator: h 1 col #333 mar u-d 4
    Item: pad 8 12 rad 4 hover-col #EF4444 col #FF6B6B
      "Logout"
```
**Slots:** Trigger, Content, Item, Separator
**States:** closed, open

#### Dialog
```mirror
Dialog
  Trigger
    Button "Open Dialog"
  Content: ver gap 16 pad 24 col #1A1A1A rad 12 w 400
    Title: size 18 weight 600
      "Confirm"
    "Are you sure?"
    Actions: hor gap 8 hor-r
      Button onclick close "Cancel"
      Button -primary "Confirm"
```
**Slots:** Trigger, Content
**States:** closed, open

#### Tooltip
```mirror
Tooltip
  Trigger
    Button "Hover me"
  Content: pad 8 12 col #333 rad 6 size 12
    "Tooltip text"
```
**Slots:** Trigger, Content

#### Popover
```mirror
Popover
  Trigger
    Button "Click me"
  Content: ver pad 16 col #1A1A1A rad 8 w 200
    "Popover content"
```
**Slots:** Trigger, Content
**States:** closed, open

#### ContextMenu
```mirror
ContextMenu
  Trigger: w 200 h 150 col #1A1A1A rad 8 hor-cen ver-cen
    "Rechtsklick hier"
  Content: ver col #1A1A1A rad 8 pad 4
    Item: "Copy"
    Item: "Paste"
    Separator:
    Item: "Delete"
```
**Slots:** Trigger, Content, Item, Separator

#### HoverCard
```mirror
HoverCard
  Trigger
    Link "@username"
  Content: ver gap 12 pad 16 col #1A1A1A rad 8 w 300
    Avatar src "avatar.jpg"
    Name: weight 600 "John Doe"
    Bio: size 14 col #888 "Developer"
```
**Slots:** Trigger, Content

### Navigation

#### Tabs
```mirror
Tabs
  TabList: hor gap 4 col #1A1A1A pad 4 rad 8
    Tab: "Overview"
    Tab: "Details"
    Tab: "Settings"
  TabContent:
    Panel: pad 16
      "Overview content"
    Panel: pad 16
      "Details content"
    Panel: pad 16
      "Settings content"
```
**Slots:** TabList, Tab, TabContent, Panel

#### Accordion
```mirror
Accordion
  AccordionItem:
    Trigger: pad 16 hor ver-cen between
      "Section 1"
    Content: pad 16
      "Section 1 content"
  AccordionItem:
    Trigger: "Section 2"
    Content: "Section 2 content"
```
**Slots:** AccordionItem, Trigger, Content
**States:** collapsed, expanded

#### Collapsible
```mirror
Collapsible
  Trigger: pad 12 col #1A1A1A rad 6
    "Click to expand"
  Content: pad 12
    "Collapsible content"
```
**Slots:** Trigger, Content
**States:** collapsed, expanded

### Formular

#### Input (Library-Komponente)
```mirror
Input
  Label: "Email"
  Field: placeholder "your@email.com" type "email"
  Hint: "Wir teilen deine Email nie"
```
**Slots:** Label, Field, Hint, Error

#### Select
```mirror
Select
  Trigger: pad 8 12 col #1A1A1A rad 6 bor 1 boc #333
    "Option wählen"
  Content:
    Item value "1" "Option 1"
    Item value "2" "Option 2"
    Item value "3" "Option 3"
```
**Slots:** Trigger, Content, Item

#### Checkbox
```mirror
Checkbox
  Indicator: w 18 h 18 rad 4 bor 1 boc #333
  Label: "AGB akzeptieren"
```
**Slots:** Indicator, Label
**States:** unchecked, checked

#### Switch
```mirror
Switch
  Track: w 44 h 24 rad 12 col #333
  Thumb: w 20 h 20 rad 10 col white
```
**Slots:** Track, Thumb
**States:** off, on

#### Slider
```mirror
Slider min 0 max 100 step 1
  Track: h 4 col #333 rad 2
  Range: col #3B82F6
  Thumb: w 16 h 16 rad 8 col white
```
**Slots:** Track, Range, Thumb

### Feedback

#### Toast
```mirror
Toast
  Title: weight 600 "Erfolg"
  Description: "Änderungen gespeichert."
  Close: icon "x"
```
**Slots:** Title, Description, Close

#### Progress
```mirror
Progress value 65 max 100
  Track: h 8 col #333 rad 4
  Indicator: col #3B82F6
```
**Slots:** Track, Indicator

#### Avatar
```mirror
Avatar
  Image: src "avatar.jpg"
  Fallback: "JD"
```
**Slots:** Image, Fallback

---

## 8. Schnellreferenz-Format (ANDERS)

Die reference.html hat ein strukturiertes Quick-Reference-Format am Ende:

```
LAYOUT      hor ver gap between wrap grid
ALIGN       hor-l hor-cen hor-r ver-t ver-cen ver-b cen
SPACING     pad mar (+ l r u d l-r u-d)
SIZE        w h minw maxw minh maxh full grow fill shrink
SHORTHAND   Box 300 400 pad 16            → Box w 300 h 400 pad 16
GRID        grid N | grid auto MIN        → grid 3, grid auto 250
COLOR       col (unified) boc             → col: Container=backgroundColor, Text=color
BORDER      bor [dir] [w] [style] [col]  → bor l 2 dashed #333
            rad                          → rad 8
TYPE        size weight line font align italic underline uppercase lowercase truncate
VISUAL      opacity shadow cursor pointer z
VISIBLE     visible hidden
PRIMITIVES  Image Input Textarea Link Button   → Keyword Name? "value" props
IMAGE       Image "url" w h fit alt            → Image Avatar "pic.jpg" 48 48
INPUT       Input "placeholder" type w         → Input EmailField "Email" w 200
TEXTAREA    Textarea "placeholder" rows        → Textarea "Message" rows 5
LINK        Link "href" target                 → Link "https://..." target _blank
ICON        icon
HOVER       hover-col hover-boc hover-bor hover-rad hover-opacity hover-scale
MODIFIER    -primary -secondary -outlined -ghost -disabled -rounded

TOKENS      $name: value          → $primary: #3B82F6
REFERENCE   Component.prop        → Card.rad
DEFINE      Name: props           → Button: pad 12 col #3B82F6
INHERIT     Name from Parent: props → DangerBtn from Button: col #EF4444
INSTANCE    Type Name: props      → Input Email: placeholder "Email"
COMP.PROP   Name.property         → Email.value, Submit.disabled

STATE       state name            → state active
EVENTS      onclick onhover onchange oninput onfocus onblur onkeydown onkeyup onload
EVENTSBLK   events                → events-Block für zentrale Event-Handler
ACTIONS     toggle | open X [pos] [anim] [ms] | close [X] [anim] [ms] | show X | hide X | page X
ANIMATIONS  slide-up | slide-down | slide-left | slide-right | fade | scale | none | spin | pulse | bounce
POSITIONS   below | above | left | right | center
ASSIGN      assign $var to expr   → assign $count to $count + 1
SETPROP     Name.prop = value     → Submit.disabled = true (im events Block)
$EVENT      $event.value          → $event.target.value
            $event.checked        → $event.target.checked

CONDITION   if $cond              → if $isLoggedIn
ELSE        else                  → else
CONDPROP    if $x then p v else   → if $active then col #3B82F6 else col #333
ITERATOR    each $x in $list      → each $task in $tasks

OPERATORS   == != > < >= <=       (comparison)
            and or not            (logical)
            + - * /               (arithmetic)
```

---

## Zusammenfassung der Prioritäten

### Hohe Priorität (Wichtige fehlende Features)
1. **Library-Komponenten** - Kompletter Abschnitt fehlt (Dropdown, Dialog, Tabs, Accordion, Select, Checkbox, Switch, Slider, etc.)
2. **Dimension Shorthand** - Wichtiges Feature für kompakten Code
3. **Modifiers** - Nützliche Shortcuts für häufige Styles
4. **Komponenten-Property-Referenzen** - Wichtig für Design-Systems

### Mittlere Priorität
5. **Scroll Properties** - Detailliertere Erklärung mit Beispielen
6. **Bedingte Actions** - Inline-Bedingungen in Event-Handlern
7. **change Action** - State-Wechsel für Komponenten
8. **Intrinsische Properties Tabelle** - Übersicht aller lesbaren/schreibbaren Properties

### Niedrige Priorität
9. **Syntax-Grundlagen-Abschnitt** - Könnte für Anfänger hilfreich sein
10. **Schnellreferenz-Format** - Alternative Darstellung am Ende
11. **gap-col / gap-row** - Speziellere Layout-Properties
12. **pointer Property** - Selten benötigt
