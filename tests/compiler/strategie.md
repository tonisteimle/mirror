# compiler testing

## philosophie

**wir suchen aktiv nach fehlern.**

nicht: "funktioniert das?"
sondern: "wie kann ich das kaputt machen?"

### grundprinzipien

1. **gezielte provokation** - schwierige kombinationen testen, nicht offensichtliche fälle
2. **nur bewiesenes dokumentieren** - keine absichten, nur was durch tests bewiesen ist
3. **fehler sind wertvoll** - jeder gefundene fehler macht den compiler besser

---

## teststrategie

### was wir testen

| kategorie | beispiel | warum schwierig? |
|-----------|----------|------------------|
| kombinationen | `hor center`, `tc hor` | mehrere properties interagieren |
| reihenfolge | `w 100 w full` vs `w full w 100` | "letzter gewinnt" regel |
| vererbung | `Child extends Parent` mit konflikten | properties + kinder mergen |
| verschachtelung | 3+ ebenen tief, verschiedene layouts | kontext-abhängigkeit |
| edge cases | leere frames, fehlende properties | grenzfälle |

### testebenen

| ebene | prüft | beispiel |
|-------|-------|----------|
| IR-Tests | zwischenrepräsentation | `node.styles` enthält `width: 100px` |
| HTML-Output-Tests | echtes DOM (JSDOM) | `el.style.width === '100px'` |

die html-output-tests (`html-output-022.test.ts`) führen den generierten JavaScript-Code in JSDOM aus und prüfen das tatsächliche DOM.

---

## html-output-tests: abdeckung

### was getestet wird (127 tests)

| bereich | tests | details |
|---------|-------|---------|
| **HTML Structure** | 6 | Frame→div, Text→span, Button→button, Input→input, Verschachtelung, Geschwister |
| **CSS Properties** | 8 | w, h, bg, pad, rad, gap, opacity, z-index |
| **Layout** | 7 | display:flex, ver/hor, center, spread, w full, w hug |
| **Property Combinations** | 3 | mehrere properties zusammen |
| **9-Zone Alignment** | 8 | tl, tc, tr, cl, center, cr, bl, bc, br |
| **Inheritance** | 4 | property-vererbung, override, kind-merge, 4-ebenen-kette |
| **Last Value Wins** | 6 | w 100 w 200, hor ver, tc hor |
| **Positioning** | 5 | pos, x/y, negative werte, pin-*, fixed |
| **Visual Properties** | 6 | shadow, blur, cursor, hidden, scroll, clip |
| **Typography** | 7 | fs, weight, text-align, italic, underline, uppercase |
| **Transform** | 3 | rotate, rotate negativ, scale |
| **Grid** | 2 | grid N, grid auto |
| **Tokens** | 2 | token als bg, $ prefix |
| **Border Shortcuts** | 3 | bor, boc, rad tl |
| **Edge Cases** | 6 | leerer frame, umlaute, emoji, h 0, minw>maxw, aspect video |
| **Constraints** | 2 | minw + w full, maxw + w full |
| **Complex Nesting** | 2 | 3-ebenen layouts, layout in vererbung |
| **Data Attributes** | 1 | data-mirror-id |
| **Events** | 2 | onclick registrierung |
| **States** | 3 | hover-bg, hover: block, focus: |
| **Each Loop** | 2 | container erstellen, items aus daten rendern |
| **Conditionals** | 1 | if true rendert content |
| **Slots** | 2 | slot-inhalt eingefügt, default content |
| **More Primitives** | 13 | Textarea, Label, Link, Image, H1-H2, Section, Nav, Header, Footer, Main, Article, Aside |
| **More CSS** | 12 | margin, min/max-w/h, color, font, line-height, lowercase, backdrop-blur, translate |
| **Property Aliases** | 10 | w=width, h=height, pad=p, bg, col=c, rad, hor, ver, fs, o=opa |

### was NICHT getestet wird

| bereich | grund |
|---------|-------|
| Zag Components | komplexe DOM-struktur, separate tests in zag-*.test.ts |
| Animations | benötigt zeit-basierte prüfung |
| Event-Interaktion | click/hover simulation benötigt mehr setup |

### noch zu testen (backlog)

**primitives:**
- Icon, Divider, Spacer, H3-H6
- Box (alias für Frame), Img (alias für Image)

**layout:**
- wrap, stacked, grow, shrink
- align (top, bottom, left, right, center)
- left, right, top, bottom (standalone alignment)
- hor-center, ver-center

**sizing:**
- size (w + h zusammen)

**spacing:**
- pad left/right/top/bottom (directional)
- margin left/right/top/bottom

**position:**
- pin-center-x, pin-center-y, pin-center
- absolute (standalone), relative

**visual:**
- shadow md, shadow lg
- cursor grab, move, text, wait, not-allowed
- visible, disabled
- scroll-hor, scroll-both
- truncate

**typography:**
- font sans, serif, roboto

**mehr aliase:**
- gap = g, center = cen, pos = positioned
- pin-left = pl, pin-right = pr, pin-top = pt, pin-bottom = pb
- rotate = rot, margin = m, absolute = abs

### limitierungen

- **JSDOM konvertiert farben**: `#f00` → `rgb(255, 0, 0)` (wird berücksichtigt)
- **aspect square**: JSDOM-bug, test übersprungen
- **computed styles**: JSDOM berechnet keine flex-layouts, nur CSS-properties prüfbar

### wie wir testen

1. **erwartung bilden** - was SOLLTE rauskommen?
2. **test schreiben** - klare assertion
3. **ausführen** - fehler finden
4. **dokumentieren** - nur wenn test passt

### was wir NICHT testen

- einzelne properties isoliert (das ist schema-wiederholung)
- offensichtliche fälle (`Frame bg #f00` → background: #f00)
- theoretische kombinationen ohne praktische relevanz

---

## dokumentationsstrategie

### regeln.md

**nur bewiesene regeln.** jede regel hat einen test-verweis.

```markdown
## regel x

beschreibung...

**test:** `dateiname.test.ts` (n tests)
```

keine regel ohne test. keine absichten. keine "sollte funktionieren".

---

## ablauf: neuen bug finden

```
1. hypothese: "das könnte schiefgehen..."

2. test schreiben mit ERWARTUNG
   expect(getStyle(node, 'flex-direction')).toBe('row')

3. test ausführen
   npm test -- tests/compiler/datei.test.ts

4. wenn FAIL:
   → bug gefunden!
   → ursache analysieren (im parser/ir nachsehen)
   → fix implementieren
   → test muss PASS werden
   → in regeln.md dokumentieren

5. wenn PASS:
   → kein bug, aber test bleibt als regression-schutz
```

---

## dateien in diesem verzeichnis

```
tests/compiler/
├── strategie.md              ← diese datei
├── regeln.md                 ← bewiesene compiler-regeln
├── structure-001.test.ts     ← basis-struktur
├── zag-002.test.ts           ← zag-komponenten
├── properties-003.test.ts    ← property-aliase
├── nested-zag-004.test.ts    ← verschachtelte zag
├── inheritance-005.test.ts   ← vererbung
├── layout-006.test.ts        ← layout-system
├── layout-conflicts-007.test.ts ← konflikte
├── alignment-008.test.ts     ← 9-zone alignment
├── combinations-009.test.ts  ← kombinationen
├── edge-cases-010.test.ts    ← edge cases
├── design-issues-011.test.ts ← design-probleme
├── bugs-found.test.ts        ← gelöste bugs
├── deep-edge-cases-012.test.ts ← tiefe edge cases
├── token-usage-013.test.ts   ← token-verwendung
├── missing-properties-014.test.ts ← visual/typography/grid
├── zag-selection-015.test.ts ← Select, Combobox, Listbox
├── zag-menus-016.test.ts     ← Menu, ContextMenu, etc.
├── zag-forms-017.test.ts     ← Checkbox, Switch, Slider, etc.
├── zag-overlays-018.test.ts  ← Dialog, Tooltip, Popover, etc.
├── zag-navigation-019.test.ts ← Tabs, Accordion, Steps, etc.
├── zag-media-020.test.ts     ← Avatar, FileUpload, Progress, etc.
├── provocation-021.test.ts   ← gezielte bug-suche
└── html-output-022.test.ts   ← END-TO-END HTML-OUTPUT (JSDOM)
```

---

## befehle

```bash
# alle compiler tests
npm test -- tests/compiler/

# einzelne testdatei
npm test -- tests/compiler/bugs-found.test.ts
```
