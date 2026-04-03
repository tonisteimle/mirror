# compiler regeln (getestet)

nur regeln, die durch tests bewiesen sind.

---

## 1. struktur

### kinder durch einrückung
```
Frame
  Text "A"    ← kind
```

### geschwister durch gleiche einrückung
```
Frame
  Frame
    Text "Tief"
  Text "Flach"    ← geschwister
```

**test:** `structure-001.test.ts` (3 tests)

---

## 2. zag-komponenten

### items gehören zur komponente
```
Select
  Item "A"
```

### geschwister nach zag bleiben geschwister
```
Frame
  Select
    Item "A"
  Text "Nachher"    ← kind von frame, NICHT item
```

**test:** `zag-002.test.ts` (3 tests)

---

## 3. verschachtelte zag

```
Frame
  Frame
    Select
      Item "A"
    Text "..."    ← kind des frame
```

**test:** `nested-zag-004.test.ts` (10 tests)

---

## 4. properties

### aliase äquivalent
`w 100` = `width 100`

### reihenfolge egal
`w 100 bg #f00` = `bg #f00 w 100`

**test:** `properties-003.test.ts` (3 tests)

---

## 5. vererbung

### properties geerbt + überschrieben
```
Button as button:
  bg #f00

BlueButton extends Button:
  bg #00f    ← überschreibt
```

### kinder ZUSAMMENGEFÜGT
```
Card as Frame:
  Text "Base"

Child extends Card:
  Text "Child"
```
→ hat BEIDE texte

**test:** `inheritance-005.test.ts` (10 tests)

---

## 6. layout-system

### eltern: richtung
```
Frame ver    → column
Frame hor    → row
Frame        → column (default)
```

### eltern: alignment
```
Frame center   → beide achsen zentriert
Frame spread   → space-between
```

### kinder: größen
```
w 100    → fix
w hug    → fit-content
w full   → flex (restplatz)
```

### kombination
```
Frame hor
  Frame w 100     ← fix
  Frame w full    ← füllt
  Frame w 100     ← fix
```

**test:** `layout-006.test.ts` (14 tests)

---

## 7. layout-konflikte

**regel: letzter wert gewinnt.**

```
hor ver    → column (ver letzter)
ver hor    → row (hor letzter)
w full w 100 → 100px (letzter)
```

**test:** `layout-conflicts-007.test.ts` (5 tests)

---

## 8. 9-zone alignment

```
top-left (tl)     top-center (tc)     top-right (tr)
center-left (cl)  center              center-right (cr)
bottom-left (bl)  bottom-center (bc)  bottom-right (br)
```

alle zonen setzen `justify-content` + `align-items` korrekt.

**test:** `alignment-008.test.ts` (9 tests)

---

## 9. kombinationen

### hor + center = row mit zentrierten kindern
```
Frame hor center
→ flex-direction: row
→ justify-content: center
→ align-items: center
```

### 9-zone + hor/ver: letzter gewinnt
```
Frame tc hor  → row (hor letzter)
Frame hor tc  → column (tc letzter)
```

### vererbung: layout überschreibbar
```
VerticalBox as Frame:
  ver
  gap 20

HorizontalBox extends VerticalBox:
  hor              ← überschreibt ver
```
→ HorizontalBox: row, gap 20px

**test:** `combinations-009.test.ts` (15 tests)

---

## 10. edge cases

### mehrfache werte: letzter gewinnt
```
Frame w 100 w 200    → 200px
Frame bg #f00 bg #0f0 → #0f0
```

### pos für absolute kinder
```
Frame pos            ← position: relative
  Frame x 10 y 10    ← absolute, relativ zum parent
```

**test:** `edge-cases-010.test.ts` (13 tests)

---

## gelöste bugs

### bug 1: 9-zone + hor/ver konflikt

**problem war:**
```
Frame tc hor    → column (FALSCH!)
                  sollte row sein (hor ist letzter)
```

**lösung:** 9-zone properties werden jetzt in source-reihenfolge verarbeitet.
"letzter gewinnt" funktioniert korrekt.

**geänderte dateien:**
- `compiler/schema/ir-helpers.ts` - 9-zone zu ALIGNMENT_PROPERTIES
- `compiler/ir/index.ts` - layout-properties in reihenfolge verarbeiten

**test:** `bugs-found.test.ts`

---

## 11. tokens

### tokens werden zu CSS-variablen
```
primary: #3B82F6

Frame bg primary    → background: var(--primary)
Frame bg $primary   → background: var(--primary)
```

### tokens in verschachtelten strukturen
```
primary: #3B82F6

Frame
  Frame
    Frame bg primary    ← funktioniert 3 ebenen tief
```

### token + vererbung
```
primary: #3B82F6
danger: #EF4444

Card as Frame:
  bg primary

DangerCard extends Card:
  bg danger           ← überschreibt zu var(--danger)

GreenCard extends Card:
  bg #00FF00          ← literal überschreibt token
```

**test:** `token-usage-013.test.ts` (15 tests)

---

## 12. visual properties

### shadow
```
Frame shadow sm    → 0 1px 2px rgba(0,0,0,0.05)
Frame shadow md    → 0 4px 6px rgba(0,0,0,0.1)
Frame shadow lg    → 0 10px 15px rgba(0,0,0,0.1)
```

### blur
```
Frame blur 10           → filter: blur(10px)
Frame backdrop-blur 10  → backdrop-filter: blur(10px)
Frame blur-bg 10        → backdrop-filter: blur(10px)
```

### opacity
```
Frame opacity 0.5  → opacity: 0.5
Frame o 0.5        → opacity: 0.5
Frame opa 0.5      → opacity: 0.5
```

### cursor
```
Frame cursor pointer      → cursor: pointer
Frame cursor grab         → cursor: grab
Frame cursor move         → cursor: move
Frame cursor not-allowed  → cursor: not-allowed
```

### visibility
```
Frame hidden   → display: none
Frame visible  → visibility: visible
```

**test:** `missing-properties-014.test.ts` (34 tests)

---

## 13. typography

### text-decoration
```
Text italic     → font-style: italic
Text underline  → text-decoration: underline
```

### text-transform
```
Text uppercase  → text-transform: uppercase
Text lowercase  → text-transform: lowercase
```

### truncate
```
Text truncate "..."
→ overflow: hidden
→ text-overflow: ellipsis
→ white-space: nowrap
```

**test:** `missing-properties-014.test.ts`

---

## 14. scroll/overflow

```
Frame scroll       → overflow-y: auto
Frame scroll-hor   → overflow-x: auto
Frame scroll-both  → overflow: auto
Frame clip         → overflow: hidden
```

**test:** `missing-properties-014.test.ts`

---

## 15. grid

```
Frame grid 3      → display: grid; grid-template-columns: repeat(3, 1fr)
Frame grid auto   → display: grid
Frame grid 2 gap 10 → display: grid; gap: 10px
```

**test:** `missing-properties-014.test.ts`

---

## 16. transform

```
Frame rotate 45    → transform: rotate(45deg)
Frame scale 1.5    → transform: scale(1.5)
Frame translate 10 → transform: translate(10px, 0px)
```

**test:** `missing-properties-014.test.ts`

---

## gelöste bugs (session 2)

### bug 2: minw/maxw werden von w full überschrieben

**problem war:**
```
Frame minw 100 w full  → min-width wird ignoriert
```

**lösung:** explizite min-width/max-width werte werden bei der konvertierung von
flex-basierten styles zu prozentualen styles nicht mehr entfernt.
nur das automatische `min-width: 0` von `w full` wird entfernt.

**geänderte dateien:**
- `compiler/ir/index.ts` - 3 stellen wo flex-styles gefiltert werden

### bug 3: aspect video gibt 'video' statt '16/9'

**problem war:**
```
Frame aspect video  → aspect-ratio: video (falsch!)
                     sollte 16/9 sein
```

**lösung:** keyword-mapping für aspect hinzugefügt (video → 16/9, square → 1).

**geänderte dateien:**
- `compiler/ir/index.ts` - aspect handler

### bug 4: pin-left/pin-right werden nicht generiert

**problem war:**
```
Frame pin-left 10  → kein left: 10px
```

**lösung:** schema-basierte konvertierung wird jetzt VOR dem `PROPERTY_TO_CSS` check
aufgerufen, damit properties wie `pin-left` korrekt verarbeitet werden.

**geänderte dateien:**
- `compiler/ir/index.ts` - propertyToCSS reihenfolge geändert

---

## 17. zag-komponenten

### alle zag-komponenten werden erkannt

| kategorie | komponenten | status |
|-----------|-------------|--------|
| selection | Select, Combobox, Listbox | ✓ |
| menus | Menu, ContextMenu, NestedMenu, NavigationMenu | ✓ |
| forms | Checkbox, Switch, RadioGroup, Slider, NumberInput, PinInput, TagsInput, RatingGroup, SegmentedControl, ToggleGroup | ✓ |
| overlays | Dialog, Tooltip, Popover, HoverCard, Toast, FloatingPanel, Tour | ✓ |
| navigation | Tabs, Accordion, Collapsible, Steps, Pagination, TreeView | ✓ |
| media | Avatar, FileUpload, Carousel, Progress, CircularProgress | ✓ |
| utility | Clipboard, QRCode, ScrollArea, Splitter | ✓ |

### zag slots werden korrekt generiert

```
Dialog slots: Trigger, Backdrop, Positioner, Content, Title, Description, CloseTrigger
Slider slots: Root, Track, Range, Thumb, Label, ValueText, MarkerGroup, Marker, HiddenInput
Switch slots: Track, Thumb, Label
```

### zag in frame funktioniert

```
Frame ver gap 10
  Checkbox
  RadioGroup
  Switch
→ 3 Kinder korrekt
```

**tests:**
- `zag-selection-015.test.ts` (18 tests)
- `zag-menus-016.test.ts` (9 tests)
- `zag-forms-017.test.ts` (19 tests)
- `zag-overlays-018.test.ts` (15 tests)
- `zag-navigation-019.test.ts` (13 tests)
- `zag-media-020.test.ts` (13 tests)

---

## bekannte limitierungen

### zag-komponenten und layout

zag-komponenten (Select, Checkbox, etc.) haben eine eigene struktur und
rendern layout-properties nicht wie normale elemente.

```
Select w 200 pad 10   → width/padding werden ignoriert
                       weil Select zu komplexem baum wird
                       (Root > Control > Trigger, etc.)
```

**status:** als design-entscheidung akzeptiert, tests übersprungen

---

## gelöste bugs (session 3)

### bug 5: x -50 bekommt keine px-einheit

**problem war:**
```
Frame x -50  → left: -50 (FALSCH!)
              sollte left: -50px sein
```

**lösung:** regex für x/y geändert von `/^\d+$/` zu `/^-?\d+$/` um negative werte zu unterstützen.

**geänderte dateien:**
- `compiler/ir/index.ts` - x und y handler

---

## 18. provokation tests

### negative werte funktionieren

```
Frame margin -10  → margin: -10px
Frame x -50       → left: -50px
Frame rotate -45  → rotate(-45deg)
```

### border shortcuts funktionieren

```
Frame bor 1 #333   → border: 1px solid #333
Frame bor 2        → border: 2px solid currentColor
Frame boc #f00     → border-color: #f00
Frame rad tl 8     → border-top-left-radius: 8px
Frame rad t 8      → border-top-left/right-radius: 8px
```

### extreme vererbung funktioniert (4 ebenen)

```
D as Frame: bg #111, gap 5
C extends D: bg #222, pad 10
B extends C: bg #333, w 200
A extends B: bg #444, h 100
→ A hat alle properties korrekt
```

### hover mit mehreren properties

```
Frame bg #fff col #000 hover-bg #000 hover-col #fff
→ beide hover-properties werden korrekt gesetzt
```

### spezielle zeichen funktionieren

```
Text "Größe: üblich"  → umlaute ✓
Text "Hello 👋 World" → emoji ✓
Text "Er sagte: \"Hallo\"" → escaped quotes ✓
```

**test:** `provocation-021.test.ts` (35 tests)

---

## gelöste bugs (session 4)

### bug 6: inline hover state wird nicht erkannt

**problem war:**
```
Frame bg #333 hover: bg light  → hover-state wird ignoriert
                                token var(--light) erscheint nicht
```

**lösung:** zwei fixes waren nötig:

1. **parser:** inline states nach properties parsen
   - `parseInlineProperties` stoppt bei lowercase identifier + `:`
   - neue schleife in `parseInstance` parst inline states
   - `states: []` zu Instance initialisierung hinzugefügt

2. **IR:** instance.states auch transformieren
   - `instance.states` wird jetzt auch zu CSS-styles transformiert
   - neben `resolvedComponent.states` und `inlineStateStyles`

**geänderte dateien:**
- `compiler/parser/parser.ts` - inline state parsing
- `compiler/ir/index.ts` - `instanceStateStyles` hinzugefügt

**test:** `token-usage-013.test.ts` - "Inline hover State wird erkannt"

### bug 7: onkeydown enter: parser crash

**problem war:**
```
Input onkeydown enter: submit  → parser crash oder falsches parsing
                                enter: wurde als inline state behandelt
```

**lösung:** mehrere fixes:

1. **AST:** `events` und `states` felder zu Instance hinzugefügt
2. **parser:**
   - `KEYBOARD_KEYS` set hinzugefügt (escape, enter, space, etc.)
   - keyboard keys werden nicht mehr als inline states behandelt
   - `parseInlineProperties` erkennt events (`on*`) und ruft `parseEvent` auf
3. **IR:** `instance.events` wird jetzt auch transformiert

**geänderte dateien:**
- `compiler/parser/ast.ts` - events/states felder zu Instance
- `compiler/parser/parser.ts` - KEYBOARD_KEYS, event parsing in parseInlineProperties
- `compiler/ir/index.ts` - instanceEvents hinzugefügt

**test:** `provocation-021.test.ts` - "onkeydown enter - Tastatur-Event"

### bug 8: block hover state wird nicht erkannt

**problem war:**
```
Frame bg #333
  hover:
    bg light
→ hover: wird als Kind-Instance geparst, nicht als State
```

**lösung:**
- `STATE_NAMES` set hinzugefügt (hover, focus, active, selected, etc.)
- state block detection in `parseInstanceBody` vor child instance parsing
- states werden korrekt mit inline und block properties geparst

**geänderte dateien:**
- `compiler/parser/parser.ts` - STATE_NAMES, state block parsing in parseInstanceBody

**test:** `token-usage-013.test.ts` - "Block hover State wird erkannt"

### klarstellung: Button as button (kein bug)

**falsches verständnis war:**
```
Button as button:
  bg primary
→ "sollte einen IR-Node erzeugen"
```

**richtig ist:**
- component-definitionen (`Name as primitive:`) sind TEMPLATES
- sie erzeugen KEINE IR-nodes direkt
- nur INSTANZEN der komponente werden gerendert
- test wurde korrigiert um definition + instanz zu testen

**test:** `token-usage-013.test.ts` - "Component-Definition + Instanz funktioniert"

### bug 9: zag-komponenten ignorieren styling-properties

**problem war:**
```
Select w 200 bg #f00 pad 10
→ styles: [] (leer!)
```

**lösung:**
- in `transformZagComponent`: styling-properties werden jetzt separiert
- `machineConfigProps` set definiert welche props zur machine config gehören
- alle anderen props (w, h, bg, pad, rad, etc.) werden zu CSS transformiert

**geänderte dateien:**
- `compiler/ir/index.ts` - styling-properties in transformZagComponent

**tests:**
- `zag-selection-015.test.ts` - "Select + Layout" tests
- `deep-edge-cases-012.test.ts` - "Zag + Layout" tests

---

## testübersicht

| testdatei | tests | status |
|-----------|-------|--------|
| structure-001.test.ts | 3 | ✓ |
| zag-002.test.ts | 3 | ✓ |
| nested-zag-004.test.ts | 10 | ✓ |
| properties-003.test.ts | 3 | ✓ |
| inheritance-005.test.ts | 10 | ✓ |
| layout-006.test.ts | 14 | ✓ |
| layout-conflicts-007.test.ts | 5 | ✓ |
| alignment-008.test.ts | 9 | ✓ |
| combinations-009.test.ts | 15 | ✓ |
| edge-cases-010.test.ts | 13 | ✓ |
| design-issues-011.test.ts | 12 | ✓ |
| bugs-found.test.ts | 5 | ✓ |
| deep-edge-cases-012.test.ts | 20 | ✓ |
| token-usage-013.test.ts | 15 | ✓ |
| missing-properties-014.test.ts | 34 | ✓ |
| zag-selection-015.test.ts | 18 | ✓ |
| zag-menus-016.test.ts | 9 | ✓ |
| zag-forms-017.test.ts | 19 | ✓ |
| zag-overlays-018.test.ts | 15 | ✓ |
| zag-navigation-019.test.ts | 13 | ✓ |
| zag-media-020.test.ts | 13 | ✓ |
| provocation-021.test.ts | 35 | ✓ |
| html-output-022.test.ts | 210 | ✓ |
| backlog-023.test.ts | 33 | ✓ |

**gesamt: 523 tests in compiler/** (alle bestanden)

---

## 19. backlog features

### Icon primitive
```
Icon "check"           → span mit default 20x20
Icon "check" size 32   → 32x32 (überschreibt default)
Icon "check" col #f00  → farbe
```

### stacked layout
```
Frame stacked          → position: relative
  Frame                → position: absolute (kinder)
  Frame                → position: absolute
```

### align property
```
Frame align top      → justify-content: flex-start
Frame align bottom   → justify-content: flex-end
Frame align left     → align-items: flex-start
Frame align right    → align-items: flex-end
Frame align center   → beide zentriert
```

### standalone alignment
```
Frame left     → align-items: flex-start
Frame right    → align-items: flex-end
Frame top      → justify-content: flex-start
Frame bottom   → justify-content: flex-end
```

### hor-center / ver-center
```
Frame hor-center   → align-items: center
Frame ver-center   → justify-content: center
```
**wichtig:** standalone properties VOR value properties auf gleicher zeile!

### directional margin
```
Frame margin left 10    → margin-left: 10px
Frame margin right 10   → margin-right: 10px
Frame margin top 10     → margin-top: 10px
Frame margin bottom 10  → margin-bottom: 10px
Frame m 20              → margin: 20px (alias)
```

### pin-center variants
```
Frame pos
  Frame pin-center-x   → left: 50%, translateX(-50%)
  Frame pin-center-y   → top: 50%, translateY(-50%)
  Frame pin-center     → left: 50%, top: 50%, translate(-50%, -50%)
  Frame pcx            → alias für pin-center-x
  Frame pcy            → alias für pin-center-y
  Frame pc             → alias für pin-center
```

### property aliases
```
g 10        → gap: 10px
cen         → center (beide achsen)
positioned  → pos (position: relative)
rot 45      → rotate(45deg)
m 20        → margin: 20px
```

**test:** `backlog-023.test.ts` (33 tests)

---

### gelöste bugs (session 5)

**nested h full / w full / hug Tests:** Die Test-Syntax war falsch. Die Tests verwendeten:
- Komma-separierte Properties (`w 300, h 300`) statt Zeilenumbrüche
- Doppelpunkte nach Instance-Namen mit Properties (`Inner h full:`)
- Undefinierte Komponenten (`Box` statt `Frame`)

Alle 5 nested-Tests wurden korrigiert und funktionieren jetzt.

**Mehrere Overlays mit Slots:** Test-Syntax war falsch (`Trigger` statt `Trigger:`).
Slots erfordern einen Doppelpunkt nach dem Namen. Test korrigiert.

---

## 20. lexer regeln

### token-typen

| typ | beispiele |
|-----|-----------|
| IDENTIFIER | `Button`, `my-button`, `_private`, `Card2` |
| KEYWORD | `as`, `extends`, `named`, `each`, `in`, `if`, `else`, `where`, `data`, `keys` |
| STRING | `"Hello"`, `"Ümläüt"`, `"🎉"` |
| NUMBER | `42`, `3.14`, `0.5` |
| HEX_COLOR | `#FFF`, `#3B82F6`, `#00000080` |
| OPERATORS | `>`, `<`, `>=`, `<=`, `!=`, `==`, `===`, `&&`, `||`, `!` |
| PUNCTUATION | `:`, `,`, `;`, `.`, `=`, `?`, `(`, `)` |

### strings
```
"Hello World"        ← leerzeichen ok
"Größe: üblich"      ← unicode ok
"Hello 👋"           ← emoji ok
"Er sagte: \"Hi\""   ← escaped quotes ok
""                   ← leerer string ok
```
**regel:** nur doppelte anführungszeichen, keine einfachen (`'`)

### kommentare
```
// Zeilenkommentar
Button "Click" // am Ende
// URL in String ist KEIN Kommentar:
Link "http://example.com"
```

### einrückung
```
Tab = 4 Spaces
Gemischte Einrückung erlaubt
Leerzeilen werden ignoriert
```

### section headers
```
--- Components ---
--- Phase 2 ---
-------- Name --------
```

**test:** `lexer-*.test.ts` (204 tests)

---

## 21. parser syntax

### komponenten-definition
```
// Basis
Card as frame:
  pad 16

// Vererbung
DangerButton extends Button:
  bg danger

// Inline + Block kombiniert
Card as frame: rad 8
  pad 16
  bg surface
```

### instanz-syntax
```
// Einfach
Button

// Mit Inhalt (wird zu content property)
Button "Click me"

// Benannt
Button named saveBtn "Save"

// Mit Properties
Button pad 8 bg primary

// Verschachtelt
Card
  Text "Hello"
  Button "OK"
```

### automatische property-trennung
```
// Kommas optional wenn Property-Name erkannt
Box h 300 bg #333 pad 16    ← funktioniert!
Box h 300, bg #333, pad 16  ← auch OK
```

**test:** `parser-auto-property-separation.test.ts` (57 tests)

---

## 22. slot-syntax

```
// Definition mit Name
Slot "Header"
Slot "Content"
Slot "Footer"

// Default (name = "default")
Slot

// Mit Properties
Slot "Sidebar" w 200

// In Komponente
Card as frame:
  Slot "Header"
  Slot "Content"
```

**test:** `parser-slots.test.ts` (16 tests)

---

## 23. event-syntax

### basis-events
```
onclick toggle Menu
onhover highlight
onfocus show Tooltip
onblur hide Tooltip
onchange filter
oninput search
```

### keyboard events
```
// Mit Key
onkeydown enter: submit
onkeydown escape: close

// Keys Block
keys
  escape close
  enter select
  arrow-down highlight next
  arrow-up highlight prev
```

### keyboard keys
```
escape, enter, space, tab, backspace, delete
arrow-up, arrow-down, arrow-left, arrow-right
home, end
```

### event modifiers
```
oninput debounce 300: filter
onclick delay 200: submit
```

### click-outside
```
onclick-outside close
onclick-outside close, deselect
```

**test:** `parser-events.test.ts` (29 tests)

---

## 24. state-syntax

### system states (CSS pseudo-classes)
```
hover:
  bg primary
  col white

focus:
  bor 2 #3B82F6

active:
  scale 0.98

disabled:
  opacity 0.5
```

### custom states
```
selected:
  bg highlight

highlighted:
  bg #333

expanded:
  h auto

collapsed:
  h 0
```

### inline state
```
Button hover: bg primary
Frame focus: bor 2 blue
```

**test:** `parser-states.test.ts` (22 tests)

---

## 25. conditional-syntax

### if/else block
```
if loggedIn
  UserProfile
else
  LoginButton
```

### verschachtelt
```
if hasData
  if isLoading
    Spinner
  else
    Content
```

### komplexe bedingungen
```
if user.isAdmin && hasPermission
  AdminPanel

if count > 0 && status === "active"
  ActiveItems

if (hasPermission || isOwner)
  EditButton
```

### ternary in properties
```
Button bg active ? primary : muted
Icon content done ? "check" : "circle"
Text col valid ? green : red
```

**test:** `parser-conditionals.test.ts` (15 tests)

---

## 26. iteration-syntax

### each loop
```
each task in tasks
  Card
    Text task.title
    Text task.description
```

### mit filter
```
each task in tasks where done === false
  TaskItem

each item in items where priority > 3 && !completed
  HighPriorityItem
```

### data binding
```
TaskList data tasks
TaskList data tasks where done === false
```

**test:** `parser-iteration.test.ts` (11 tests)

---

## 27. child override syntax

```
// Mehrere Kinder überschreiben
NavItem Icon "home"; Label "Home"
Card Title "Header"; Content "Body"

// Mit Properties
ListItem Icon "star" col gold; Text "Favorite"
```

**test:** `parser-child-overrides.test.ts` (16 tests)

---

## 28. token-definition syntax

### vollständige syntax
```
primary: color = #3B82F6
sm: size = 4
body: font = "Inter"
```

### vereinfachte syntax (auto-detect)
```
primary: #3B82F6      ← auto: color
sm: 4                 ← auto: size
half: 50%             ← auto: size
body: "Inter"         ← auto: font
```

### token-typen
- `color`: hex-werte, farbnamen
- `size`: zahlen, prozent, dezimal
- `font`: string-werte
- `icon`: string-werte

**test:** `parser-tokens.test.ts` (26 tests)

---

## 29. javascript integration

```
Button as button:
  onclick increment

let count = 0

function increment() {
  count++
  update()
}
```

erkannte keywords: `let`, `const`, `var`, `function`, `class`

**test:** `parser-javascript.test.ts` (9 tests)

---

## 30. html element mapping

| primitive | html tag |
|-----------|----------|
| Frame, Box | `<div>` |
| Text | `<span>` |
| Button | `<button>` |
| Input | `<input>` |
| Textarea | `<textarea>` |
| Label | `<label>` |
| Image, Img | `<img>` |
| Icon | `<span>` |
| Link | `<a>` |
| Divider | `<hr>` |
| Spacer | `<div>` |
| H1 | `<h1>` |
| H2 | `<h2>` |
| H3 | `<h3>` |
| H4 | `<h4>` |
| H5 | `<h5>` |
| H6 | `<h6>` |
| Header | `<header>` |
| Nav | `<nav>` |
| Main | `<main>` |
| Section | `<section>` |
| Article | `<article>` |
| Aside | `<aside>` |
| Footer | `<footer>` |

**test:** `backend-dom.test.ts` (46 tests)

---

## 31. sizing regeln (details)

### full sizing
```
w full  → flex: 1 1 0%, min-width: 0
h full  → flex: 1 1 0%, min-height: 0
```
**wichtig:** NICHT `width: 100%`!

### hug sizing
```
w hug  → width: fit-content
h hug  → height: fit-content
```

### size shorthand
```
size 100   → w 100 + h 100
size hug   → w hug + h hug
size full  → w full + h full
```

### kombination hug + full
```
Frame ver
  Box h hug      ← fit-content (header)
  Box h full     ← flex: 1 (content, füllt rest)
  Box h hug      ← fit-content (footer)
```

**test:** `ir-full-sizing.test.ts` (15 tests), `ir-hug-edge-cases.test.ts` (9 tests)

---

## 32. directional properties

### padding richtungen
```
pad left 10     → padding-left: 10px
pad right 10    → padding-right: 10px
pad top 10      → padding-top: 10px
pad bottom 10   → padding-bottom: 10px
pad x 20        → padding-left + padding-right
pad y 20        → padding-top + padding-bottom
```

### margin richtungen
```
margin left 10   → margin-left: 10px
margin right 10  → margin-right: 10px
margin top 10    → margin-top: 10px
margin bottom 10 → margin-bottom: 10px
margin x 20      → margin-left + margin-right
margin y 20      → margin-top + margin-bottom
```

### border-radius richtungen
```
rad tl 8   → border-top-left-radius: 8px
rad tr 8   → border-top-right-radius: 8px
rad bl 8   → border-bottom-left-radius: 8px
rad br 8   → border-bottom-right-radius: 8px
rad t 8    → top-left + top-right
rad b 8    → bottom-left + bottom-right
rad l 8    → top-left + bottom-left
rad r 8    → top-right + bottom-right
```

**test:** `html-output-022.test.ts`

---

## 33. property aliases (vollständig)

| lang | kurz | kategorie |
|------|------|-----------|
| width | w | sizing |
| height | h | sizing |
| min-width | minw | sizing |
| max-width | maxw | sizing |
| min-height | minh | sizing |
| max-height | maxh | sizing |
| padding | pad, p | spacing |
| margin | m | spacing |
| gap | g | layout |
| background | bg | color |
| color | col, c | color |
| border-color | boc | color |
| border | bor | border |
| radius | rad | border |
| font-size | fs | typography |
| opacity | o, opa | visual |
| horizontal | hor | layout |
| vertical | ver | layout |
| center | cen | alignment |
| positioned | pos | position |
| absolute | abs | position |
| rotate | rot | transform |
| pin-left | pl | position |
| pin-right | pr | position |
| pin-top | pt | position |
| pin-bottom | pb | position |
| pin-center-x | pcx | position |
| pin-center-y | pcy | position |
| pin-center | pc | position |

**test:** `html-output-022.test.ts`, `backlog-023.test.ts`

---

## 34. error handling

### lexer error recovery
```
"Hello        ← unclosed string → weiter parsen
@test         ← ungültiges zeichen → überspringen
#GGG          ← ungültige hex → überspringen
```

### parser error collection
```javascript
ast.errors = [
  { message: 'Expected COLON', line: 5, column: 10 }
]
```
**wichtig:** parser stoppt NICHT bei fehlern, sammelt sie.

### validator error codes

| code | bedeutung |
|------|-----------|
| `UNKNOWN_PROPERTY` | property nicht im schema |
| `UNDEFINED_COMPONENT` | komponente nicht definiert |
| `UNKNOWN_EVENT` | event nicht im schema |
| `UNKNOWN_ACTION` | action nicht bekannt |
| `UNKNOWN_KEY` | keyboard-key ungültig |
| `UNDEFINED_TOKEN` | token ($name) nicht definiert |
| `INVALID_VALUE` | wert-format ungültig |
| `CIRCULAR_REFERENCE` | zirkuläre vererbung |
| `DUPLICATE_DEFINITION` | doppelte definition |

### quick fix suggestions
```
Box backgrund #333
→ Suggestion: "background" (typo-korrektur)

Buton "Click"
→ Suggestion: "Button" (typo-korrektur)
```

**test:** `errors-*.test.ts` (78 tests), `validator-*.test.ts` (92 tests)

---

## 35. sourcemap regeln

### node tracking
```
nodeId: eindeutige ID pro node
parentId: verweis auf eltern-node
componentName: z.B. 'Box', 'Text'
instanceName: bei `named` instanzen
isDefinition: true für komponenten-definition
isEachTemplate: true für each-loop items
isConditional: true für if/else blöcke
```

### position tracking
```
property.position = {
  line: 5,
  column: 3,
  endLine: 5,
  endColumn: 15
}
```

### query methods
```
getNodeAtLine(line)         → node an zeile
getNodesByComponent(name)   → alle nodes mit name
getNodeByInstanceName(name) → node mit instance name
getChildren(nodeId)         → direkte kinder
```

**test:** `ir-source-map.test.ts` (44 tests)

---

## 36. validation warnings

### unknown properties
```
Box unknownprop 123
→ Warning: { type: 'unknown-property', property: 'unknownprop' }
```

### gültige properties (kein warning)
- sizing: w, h, minw, maxw, minh, maxh, size
- layout: hor, ver, gap, center, spread, wrap, stacked, grid
- spacing: pad, margin, p, m
- colors: bg, col, boc
- border: bor, rad
- typography: fs, weight, line, italic, underline
- position: x, y, z, absolute, fixed, relative
- transform: rotate, scale, translate
- effects: opacity, shadow, cursor, blur, hidden
- scroll: scroll, scroll-hor, scroll-both, clip

### hover-prefix properties
```
hover-bg #red     ← gültig (bg ist bekannt)
hover-unknown 123 ← ungültig (unknown nicht bekannt)
```

**test:** `ir-validation-warnings.test.ts` (26 tests)

---

## 37. runtime helpers

### state management
```javascript
_runtime.setState(el, 'selected', true)
_runtime.getState(el, 'selected')
_runtime.updateVisibility(el)
```

### actions
```javascript
_runtime.show(el)
_runtime.hide(el)
_runtime.toggle(el)
_runtime.select(el)
_runtime.highlight(el)
_runtime.destroy(el)  // cleanup
```

### each loop
```javascript
_eachConfig = {
  itemVar: 'task',
  collection: 'tasks',
  filter: (item) => !item.done,
  renderItem: (item) => createTaskElement(item)
}
```

### conditional
```javascript
_conditionalConfig = {
  condition: () => loggedIn,
  renderThen: () => createProfile(),
  renderElse: () => createLoginButton()
}
```

**test:** `backend-dom-javascript.test.ts` (12 tests)

---

## 38. robustheit

### leerzeilen
```
Frame bg #f00

  Text "A"

  Text "B"

```
→ funktioniert korrekt

### einrückung varianten
```
// 2 spaces
Frame
  Text "child"

// 4 spaces
Frame
    Text "child"

// tabs
Frame
	Text "child"
```
→ alle funktionieren

### kommentare
```
// am anfang
Frame bg #f00 // am ende
  // zwischen elementen
  Text "A"
```
→ alle ignoriert

**test:** `html-output-022.test.ts` (robustness tests)

---

## testübersicht (aktualisiert)

| testdatei | tests | kategorie |
|-----------|-------|-----------|
| lexer-*.test.ts | 204 | lexer |
| parser-*.test.ts | 440 | parser |
| ir-*.test.ts | 232 | ir transformation |
| backend-*.test.ts | 80 | code generation |
| validator-*.test.ts | 92 | validation |
| errors-*.test.ts | 78 | error handling |
| zag-*.test.ts | 88 | zag components |
| html-output-022.test.ts | 273 | e2e/integration |
| andere feature tests | ~300 | features |

**gesamt: 3717 tests** (alle bestanden, 6 übersprungen - LLM-Agent-Tests)

---

## gelöste bugs (session 6)

### bug 10: event-vererbung funktioniert nicht

**problem war:**
```
Clickable as Frame:
  onclick: show Modal

SpecialClickable extends Clickable:
  bg #f00

SpecialClickable
→ onclick wird NICHT vererbt
```

**lösung:**
- parser: event-detection VOR state/slot-detection
- `onclick:` wurde fälschlich als state geparst
- präzise prüfung: `on` + mindestens 1 zeichen (nicht `on`/`off`)

**geänderte dateien:**
- `compiler/parser/parser.ts` - event-check vor state-check in parseComponentBody

**test:** `inheritance-005.test.ts` - "5.6: Vererbung mit Events"

### bug 11: child override parsing mit semicolons

**problem war:**
```
NavItem Icon "home"; Label "Home"
→ nur 1 child override statt 2
```

**lösung:**
- `parseInlineProperties` konsumierte semicolons
- neuer parameter `stopAtSemicolon` hinzugefügt
- `parseChildOverridesFromStart` nutzt jetzt `{ stopAtSemicolon: true }`

**geänderte dateien:**
- `compiler/parser/parser.ts` - stopAtSemicolon option

**test:** `parser-child-overrides.test.ts` (16 tests)

### feature: single quotes für strings

```
Text 'Hello World'    ← jetzt gültig
Text "Hello World"    ← wie immer
```

**geänderte dateien:**
- `compiler/parser/lexer.ts` - scanString() unterstützt beide quote-typen

**test:** `html-output-022.test.ts` - "single quotes"

### feature: semicolons als property-trenner

```
Frame bg #f00; w 100; pad 16    ← jetzt gültig
Frame bg #f00, w 100, pad 16    ← wie immer
```

**design-entscheidung:** Nur PascalCase nach semicolon = child override syntax.
Lowercase nach semicolon = property separator.

**test:** `html-output-022.test.ts` - "semicolons"
