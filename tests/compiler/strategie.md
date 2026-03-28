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
| Schema-Driven Tests | alle schema-elemente automatisch | jede property wird getestet |
| IR-Tests | zwischenrepräsentation | `node.styles` enthält `width: 100px` |
| HTML-Output-Tests | echtes DOM (JSDOM) | `el.style.width === '100px'` |

die html-output-tests (`html-output-022.test.ts`) führen den generierten JavaScript-Code in JSDOM aus und prüfen das tatsächliche DOM.

---

## schema-driven tests: garantierte vollständigkeit

### single source of truth

`src/schema/dsl.ts` ist die einzige quelle der wahrheit. alles andere wird daraus generiert:

```
src/schema/dsl.ts (SSOT)
    │
    ├── npm run generate
    │   ├── CLAUDE.md (DSL Reference)
    │   └── docs/generated/dsl-reference.md
    │
    └── schema-driven.test.ts
        └── testet ALLE elemente automatisch
```

### was automatisch getestet wird (273 schema tests)

| bereich | tests | quelle |
|---------|-------|--------|
| Primitives | 25 | `DSL.primitives` |
| Primitive Aliases | 2 | `DSL.primitives[x].aliases` |
| Zag Components | 50 | `ZAG_PRIMITIVES` |
| Standalone Properties | 38 | `SCHEMA[x].keywords._standalone` |
| Property Aliases | ~40 | `SCHEMA[x].aliases` |
| Numeric Properties | 32 | `SCHEMA[x].numeric` |
| Keyword Properties | ~50 | `SCHEMA[x].keywords` |
| Events | 11 | `DSL.events` |
| Key Events | 2 | `DSL.events[x].acceptsKey` |
| System States | 4 | `DSL.states` (system: true) |
| Custom States | 13 | `DSL.states` (system: false) |
| Keyboard Keys | 12 | `DSL.keys` |

### befehle

```bash
# generierung ausführen
npm run generate

# prüfen ob doku aktuell ist (für CI)
npm run generate:check

# schema-driven tests ausführen
npm test -- tests/compiler/schema-driven.test.ts
```

### garantien

1. **neue property in schema = automatisch getestet**
2. **veraltete doku = CI schlägt fehl**
3. **keine manuelle test-pflege für basis-abdeckung**

---

## html-output-tests: abdeckung

### was getestet wird (273 HTML-output tests)

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
| **Remaining Primitives** | 8 | H3-H6, Divider, Spacer, Box, Img |
| **Layout Properties** | 3 | wrap, grow, shrink |
| **Directional Spacing** | 4 | pad left/right/top/bottom |
| **More Visual** | 10 | shadow md/lg, cursor grab/move/text/wait/not-allowed, visible, disabled, scroll-hor/both, truncate |
| **Font Families** | 3 | sans, serif, roboto |
| **More Position** | 7 | absolute, abs, relative, pl, pr, pt, pb |
| **Size Property** | 1 | size (w + h zusammen) |
| **Weight Keywords** | 6 | thin, light, normal, medium, semibold, black |
| **Text Align** | 3 | left, right, justify |
| **Center Alignment** | 2 | hor-center, ver-center |
| **Directional Margin** | 4 | margin left/right/top/bottom |
| **Pin Center** | 6 | pin-center-x, pin-center-y, pin-center, pcx, pcy, pc |
| **More Aliases** | 5 | g=gap, cen=center, positioned=pos, rot=rotate, m=margin |
| **Icon Primitive** | 2 | Icon→span, Icon mit styles |
| **Stacked Layout** | 2 | position relative auf parent, absolute auf children |
| **Align Property** | 5 | align top/bottom/left/right/center |
| **Standalone Alignment** | 4 | left, right, top, bottom |
| **Layout+Position Konflikte** | 3 | hor center pos, grid stacked, stacked grid |
| **Transform Kombinationen** | 3 | rotate+scale, pin-center+rotate, rotate+scale+translate |
| **Mehr Reihenfolge** | 5 | tl br, br tl, center spread, spread center, hor ver hor |
| **Tiefe Verschachtelung** | 2 | 4 ebenen layout-wechsel, stacked+positioned child |
| **Null-Werte** | 5 | pad/margin/gap 0, w/h 0, opacity 0, scale 0, rotate 0 |
| **Negative Werte** | 4 | margin -10, z -1, x/y negativ, rotate -180 |
| **Extreme Werte** | 5 | w 99999, rotate 720/-360, scale 10, z 9999 |
| **Multiple States** | 3 | hover, hover+focus, custom state selected |
| **Multiple Events** | 3 | onclick, onclick+onhover, onkeydown enter |
| **Token Reihenfolge** | 3 | token→fester, fester→token, token mehrfach |
| **Praxis-Patterns** | 4 | card, button, modal overlay, navbar |
| **Robustheit: Leerzeilen** | 5 | anfang, ende, zwischen, mehrfach, whitespace |
| **Robustheit: Einrückung** | 5 | 2 spaces, 4 spaces, tabs, gemischt, trailing |
| **Robustheit: Kommentare** | 5 | zeilenende, eigene zeile, zwischen, mehrfach, nach leerzeile |
| **Robustheit: Semikolons** | 3 | am zeilenende, mehrere properties, als trenner |
| **Robustheit: Strings** | 5 | double quotes, single quotes, leer, leerzeichen, sonderzeichen |
| **Robustheit: Komplex** | 4 | alles zusammen, component def, inheritance, tiefe verschachtelung |

### was NICHT getestet wird

| bereich | grund |
|---------|-------|
| Zag Components | komplexe DOM-struktur, separate tests in zag-*.test.ts |
| Animations | benötigt zeit-basierte prüfung |
| Event-Interaktion | click/hover simulation benötigt mehr setup |

### gefundene bugs

| property | erwartet | tatsächlich | status |
|----------|----------|-------------|--------|
| `hor-center` | align-items: center | flex-start | **GEFIXT** |
| `ver-center` | justify-content: center | nicht gesetzt | **GEFIXT** |
| `;` (semicolon) | property-trenner | nicht erkannt | **GEFIXT** |
| `'string'` (single quotes) | string-literal | leer | **GEFIXT** (war bereits im lexer) |
| `aspect square` | aspect-ratio: 1/1 | - | JSDOM-LIMITIERUNG |

### parser-robustheit

der parser wurde auf robustheit getestet (27 tests). ergebnis:

**robust bei:**

| bereich | status | details |
|---------|--------|---------|
| leerzeilen | ✅ | anfang, ende, zwischen elementen, mehrfach hintereinander |
| einrückung | ✅ | 2 spaces, 4 spaces, tabs, gemischt, trailing spaces |
| kommentare | ✅ | `//` am zeilenende, eigene zeile, zwischen elementen, nach leerzeilen |
| strings | ✅ | `"double quotes"`, `'single quotes'`, leer `""`, mit leerzeichen, mit sonderzeichen (äöü €) |
| semikolons | ✅ | `bg #f00; w 100;` als property-trenner |
| verschachtelung | ✅ | 4+ ebenen tief, mixed whitespace |

**alle bekannten limitierungen wurden behoben.** der parser ist jetzt vollständig robust.

### noch zu testen (backlog)

backlog ist leer - alle geplanten tests implementiert.

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

### struktur (refactored 2026-03-28)

```
tests/compiler/
├── strategie.md        ← philosophie, testebenen (diese datei)
├── syntax-regeln.md    ← verhaltensregeln (205 zeilen, kompakt)
├── changelog.md        ← bug-fixes chronologisch
└── _archiv/
    └── regeln.md       ← alte vollständige doku (1539 zeilen)
```

### dokumentations-dateien

| datei | inhalt | zeilen |
|-------|--------|--------|
| `syntax-regeln.md` | Verhaltensregeln (nur nicht-offensichtliches) | ~200 |
| `changelog.md` | Bug-Fixes chronologisch (standard-format) | ~120 |
| `CLAUDE.md` | DSL-Referenz (auto-generiert aus Schema) | - |
| `_archiv/regeln.md` | Alte vollständige Doku (für Referenz) | ~1500 |

### was wohin gehört

| inhalt | datei | grund |
|--------|-------|-------|
| Property-Liste | CLAUDE.md | Auto-generiert aus Schema |
| Primitive-Mapping | CLAUDE.md | Auto-generiert aus Schema |
| "Letzter gewinnt" Regel | syntax-regeln.md | Verhaltensregel |
| Edge Cases | syntax-regeln.md | Nicht-offensichtlich |
| Bug-Fix Details | changelog.md | Chronologisch |
| Test-Philosophie | strategie.md | Meta-Ebene |

### prinzipien

1. **schema ist SSOT** - Properties, Primitives nur in `src/schema/dsl.ts`
2. **keine redundanz** - was im Schema steht, nicht wiederholen
3. **nur edge cases** - offensichtliches (`bg #f00` → background) nicht dokumentieren
4. **changelog statt sessions** - chronologisch mit datum, nicht "session 3"
5. **kompakt > vollständig** - 200 zeilen > 1500 zeilen

### warum diese struktur?

**problem vorher:**
- 1539 zeilen in einer datei
- property-listen dupliziert (auch in CLAUDE.md)
- bug-history als "session 1, 2, 3..." ohne kontext
- manuelle testzahlen die veralten

**lösung:**
- spezialisierte dateien für verschiedene zwecke
- redundanz eliminiert (schema → CLAUDE.md)
- changelog mit echten daten
- alte doku archiviert (nicht gelöscht)

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
   → in changelog.md dokumentieren (### Fixed)

5. wenn PASS:
   → kein bug, aber test bleibt als regression-schutz

6. wenn neue verhaltensregel:
   → in syntax-regeln.md dokumentieren (nur wenn nicht-offensichtlich)
```

---

## dateien in diesem verzeichnis

```
tests/compiler/
├── strategie.md              ← diese datei (philosophie, testebenen)
├── syntax-regeln.md          ← verhaltensregeln (kompakt)
├── changelog.md              ← bug-fixes chronologisch
├── _archiv/regeln.md         ← alte vollständige doku (archiviert)
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
├── html-output-022.test.ts   ← END-TO-END HTML-OUTPUT (JSDOM)
└── schema-driven.test.ts     ← AUTO-GENERIERTE TESTS AUS SCHEMA
```

---

## befehle

```bash
# alle compiler tests
npm test -- tests/compiler/

# einzelne testdatei
npm test -- tests/compiler/bugs-found.test.ts
```
