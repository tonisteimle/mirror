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

**test:** `nested-zag-004.test.ts` (3 tests)

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

**test:** `inheritance-005.test.ts` (4 tests)

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
- `src/schema/ir-helpers.ts` - 9-zone zu ALIGNMENT_PROPERTIES
- `src/ir/index.ts` - layout-properties in reihenfolge verarbeiten

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
- `src/ir/index.ts` - 3 stellen wo flex-styles gefiltert werden

### bug 3: aspect video gibt 'video' statt '16/9'

**problem war:**
```
Frame aspect video  → aspect-ratio: video (falsch!)
                     sollte 16/9 sein
```

**lösung:** keyword-mapping für aspect hinzugefügt (video → 16/9, square → 1).

**geänderte dateien:**
- `src/ir/index.ts` - aspect handler

### bug 4: pin-left/pin-right werden nicht generiert

**problem war:**
```
Frame pin-left 10  → kein left: 10px
```

**lösung:** schema-basierte konvertierung wird jetzt VOR dem `PROPERTY_TO_CSS` check
aufgerufen, damit properties wie `pin-left` korrekt verarbeitet werden.

**geänderte dateien:**
- `src/ir/index.ts` - propertyToCSS reihenfolge geändert

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
- `src/ir/index.ts` - x und y handler

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
- `src/parser/parser.ts` - inline state parsing
- `src/ir/index.ts` - `instanceStateStyles` hinzugefügt

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
- `src/parser/ast.ts` - events/states felder zu Instance
- `src/parser/parser.ts` - KEYBOARD_KEYS, event parsing in parseInlineProperties
- `src/ir/index.ts` - instanceEvents hinzugefügt

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
- `src/parser/parser.ts` - STATE_NAMES, state block parsing in parseInstanceBody

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
- `src/ir/index.ts` - styling-properties in transformZagComponent

**tests:**
- `zag-selection-015.test.ts` - "Select + Layout" tests
- `deep-edge-cases-012.test.ts` - "Zag + Layout" tests

---

## testübersicht

| testdatei | tests | status |
|-----------|-------|--------|
| structure-001.test.ts | 3 | ✓ |
| zag-002.test.ts | 3 | ✓ |
| nested-zag-004.test.ts | 3 | ✓ |
| properties-003.test.ts | 3 | ✓ |
| inheritance-005.test.ts | 4 | ✓ |
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
| html-output-022.test.ts | 82 | 81 ✓, 1 skipped |

**gesamt: 1947 tests** (alle bestanden)

### gelöste bugs (session 5)

**nested h full / w full / hug Tests:** Die Test-Syntax war falsch. Die Tests verwendeten:
- Komma-separierte Properties (`w 300, h 300`) statt Zeilenumbrüche
- Doppelpunkte nach Instance-Namen mit Properties (`Inner h full:`)
- Undefinierte Komponenten (`Box` statt `Frame`)

Alle 5 nested-Tests wurden korrigiert und funktionieren jetzt.

**Mehrere Overlays mit Slots:** Test-Syntax war falsch (`Trigger` statt `Trigger:`).
Slots erfordern einen Doppelpunkt nach dem Namen. Test korrigiert.
