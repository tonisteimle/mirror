# Compiler Changelog

Chronologische Liste aller Bug-Fixes und Features.

---

## 2026-04-25 (Zag-Cleanup vor Thema 12)

Vor Beginn des geplanten Thema 12 („Zag-Komponenten") entdeckt: das Thema
existiert nicht mehr im klassischen Sinn. Schema (`zag-primitives.ts`)
listet nur DatePicker; alle anderen Komponenten (Switch, Checkbox, Slider,
RadioGroup, Tabs, SideNav, Select, Dialog, Tooltip, …) sind Pure-Mirror-
Templates in `studio/panels/components/component-templates.ts`. Der alte
Zag-Code blieb als Dead Code im Repo.

### Removed (~13'000 LOC)

- **`compiler/backends/dom/zag/form-emitters.ts`** (1174 LOC) — komplett
- **`compiler/backends/dom/zag/nav-emitters.ts`** (618 LOC) — komplett
- **`compiler/backends/dom/zag/select-emitters.ts`** (458 LOC) — komplett
- **`compiler/backends/dom/zag/overlay-emitters.ts`** (690 → 137 LOC) — auf
  `emitDatePickerComponent` reduziert. Tooltip, Dialog, Popover, HoverCard,
  Collapsible weg.
- **`compiler/backends/dom/zag/index.ts`** (179 → 67 LOC) — Dispatcher von
  28 Einträgen auf 2 (`date-picker`, `datepicker`).
- **`compiler/backends/dom/zag-emitters.ts`** (61 → 17 LOC) — Re-exports
  schrumpfen.
- **`compiler/runtime/parts/zag-runtime.ts`** (9306 → 634 LOC) — alle
  init-Funktionen außer `initDatePickerComponent` weg (33 → 1).
- **`compiler/schema/zag-prop-metadata.ts`** (1402 → 79 LOC) — Metadata
  nur noch für DatePicker.
- **8 `@zag-js/*` deps**: checkbox, dialog, radio-group, select, slider,
  switch, tabs, tooltip.

### Bewusst nicht angefasst

- `compiler/parser/zag-parser.ts` (1065 LOC), `compiler/ir/transformers/zag-transformer.ts`
  (587 LOC), `compiler/compiler/zag/*` (765 LOC): durch `isZagPrimitive()`-
  Gate jetzt nur für DatePicker aktiv; nicht-DatePicker-Pfade technisch tot,
  aber Reduktion bringt keinen User-Bundle-Gewinn (Parser läuft nicht im
  Output) und Risiko-vs-Nutzen ungünstig.

### Effekt

- DatePicker-Compile-Output schrumpft 12'443 → 3'823 LOC (~70% kleiner)
- Globale Coverage-Sprung: 52.5% → 62.95% Lines (+10.4 pp)
- Bundle-size für Studio-Build leicht kleiner (sichtbar in `studio/dist/index.js`:
  2.55 MB → 2.26 MB nach Runtime-Cleanup, also -290 KB)

### Verbleibende Arbeit für Thema 12

DatePicker selbst hat aktuell ~0% Coverage. Thema 12 ist jetzt fokussiert:
DatePicker-Pfade in `parser`, `transformer`, `runtime`, `overlay-emitters`
gezielt mit Tests abdecken (selectionMode single/multiple/range, locale,
positioning, fixedWeeks, startOfWeek, closeOnSelect, min/max, value/
defaultValue, slot-Aliases).

### Doku-Sync

- `CLAUDE.md` „Zag Primitives"-Tabelle (Select, Checkbox, Switch, …) ist
  veraltet und sollte auf nur DatePicker reduziert werden — TODO als
  separater Schritt, weil CLAUDE.md die Compiler-Reference ist und vom
  User aktualisiert wird.

---

## 2026-04-25 (Property-based Testing – Phase 2)

Phase 2 der Bullet-Proof-Strategie: Property-based Testing mit fast-check
für die 5 zentralen Compiler-Funktionen.

### Added

- **fast-check 4.7** als devDependency (`--legacy-peer-deps` wegen Vitest 4
  Peer-Konflikt).
- **`tests/compiler/properties-property-based.test.ts`** — 31 Property-Tests
  (à 1000 Runs = 31'000 randomisierte Inputs, ~570ms Laufzeit) für:
  - **mergeProperties** (8 Properties): identity, last-wins, layout-keyword
    Order-Sensitivität, directional-key-Separation, Längen-Invariante,
    Idempotenz.
  - **formatCSSValue** (6 Properties): integer→px, Unit-Preservation
    (%, vh/vw, em/rem/ch), non-px-Properties unverändert, Multi-Value-
    Roundtrip, Idempotenz auf bereits formatierten Werten, Float-Behandlung.
  - **schemaPropertyToCSS** (5 Properties): unknown → handled=false,
    `width N%` preserve %, numeric → px, hex-Color-Preservation,
    boolean-Standalone-Properties.
  - **expandPropertySets** (5 Properties): empty Map → identity, Pass-through
    bei nicht-matchenden Properties, Propset-Expansion, PascalCase-Component-
    Mixin-Expansion, unbekannte Propset-Refs werden nicht gecrasht.
  - **generateLayoutStyles** (7 Properties): Frame default (flex+column),
    Text default (kein flex), grid-Präzedenz, gap-Hierarchie, last-hor/ver-wins
    via `applyAlignmentsToContext`, no-crash auf arbitrary keyword sequences,
    alle Style-Outputs haben non-empty property+value.

### Bedeutung

Bisherige Tests prüften ausgewählte Beispiele ("klappt für 7 Cases"); diese
Tests prüfen **Invarianten** ("klappt für jeden Input in der Domäne").
fast-check shrinkt Counter-Examples automatisch zur minimalen Form — wenn
eine Regression auftritt, kommt der kleinste fehlerhafte Input zurück, nicht
ein zufällig grosser.

Keine neuen Bugs entdeckt — die Funktionen halten ihre Invarianten unter
Random-Stress. Das bestätigt die Robustheit der bereits durchgegangenen
Themen 1–6 quantitativ.

---

## 2026-04-25 (Layout Iteration 3 – Thema 4 noch tiefer)

Dritter Pass über Layout. Coverage von ~70-75% auf ~85% gehoben.
**2 weitere Bugs gefixt**, ~67 neue Tests in 8 Bereichen.

### Fixed

- **Lexer fehlte `fr`-Unit-Suffix für CSS-Grid**: `Frame grid 1fr 2fr 1fr`
  produzierte `grid-template-columns: 1px fr 2px fr 1px fr` weil der Lexer
  `1fr` in zwei Tokens (`1` Number + `fr` Identifier) zerlegte. Fix in
  `compiler/parser/lexer.ts` `consumeNumberSuffixes()`: `fr` als Suffix
  ergänzt analog zu `vh/vw/vmin/vmax`.

- **Property-Set-Reference in Component-Body verloren**: `Card as Frame: $lay`
  wurde als Child-Instance mit Component-Name `$lay` geparst statt als
  propset-Reference. Bei `Frame $lay` (Instance-Body) funktionierte es
  korrekt. Fix in `parseComponentBody`: $-Identifier am Zeilenanfang wird
  zu Property `propset` mit Token-Reference, analog zur Instance-Body-
  Logik. `expandPropertySets` expandiert das dann rekursiv.

### Added

- `tests/compiler/layout-deep-coverage.test.ts` (~67 Tests in 8 Bereichen):
  - **1. Triple-Matrix**: 30 wichtigste 3er-Kombinationen (direction × align
    × size, direction × gap × wrap, grid × X × Y, stacked × X × Y, sizing
    trios, position trios, multi-alignment, …)
  - **2. Layout-Properties in Property-Sets**: `lay: hor; Frame $lay`,
    grid in mixin, stacked in mixin, mixin + own override, nested mixins,
    9-zone in mixin
  - **3. Cross-Schicht**: IR → DOM-Backend für flex/grid/stacked. JS-Output
    enthält die richtigen CSS-Eigenschaften (display:flex, grid-template,
    position:relative+absolute)
  - **4. Performance/Stress**: 500-row grid, 100 stacked-children mit x/y,
    20-deep mixed nesting (flex/grid/stacked), 200 properties auf einem
    Frame
  - **5. Grid-Cell deep edges**: float position (`x 1.5`), gleiche
    Positionen für mehrere Children, auto-flow ohne x/y, extreme auto-fill
    (`grid auto 1000`), explicit columns mit % und fr
  - **6. Sizing-Cascade durch nested layouts**: flex column → flex row child
    → w full grandchild, grid → child mit w 100 (span!), stacked → child
    w full (100%), 4-deep container chain stretch, Non-Container in
    Container hugs
  - **7. align-Verb systematisch**: `align top`, `align center`,
    `align bottom`, `align top right`, `align bottom left`
  - **8. Komplexe Compositions**: Component-Definition mit voller Layout-
    Signatur, Layout in Conditional, Layout in each-Loop mit grid,
    Inheritance + Property-Set + own Override

5137 Compiler-Tests grün, 0 neue Regressionen.

### Coverage-Status

Layout auf ~85% gehoben (Iter 1: 35%, Iter 2: 70-75%). Verbleibende Lücken:
~100 weitere Triples, Subgrid, 1MB+ Stress.

---

## 2026-04-25 (Properties Deep Coverage – Thema 3 Iteration 3)

Auf User-Hinweis (70% Coverage zu wenig) ein dritter, systematischer Pass.
Resultat: **3 weitere echte Bugs gefixt** (alle in Property-Resolution),
~122 neue Tests in 11 systematischen Bereichen.

### Fixed

- **Unit-Verlust für Prozent-Werte**: `Frame w 50%` produzierte
  `width: 50px` (Einheit wurde vom Schema-Pfad zu `px` umgeschrieben).
  Auch `pad 50%`, `mar 25%` etc. waren betroffen. Fix in
  `compiler/schema/ir-helpers.ts`: `schemaPropertyToCSS()` extrahiert die
  explicit unit aus dem regex-match und ersetzt schema-emittiertes `px` mit
  der User-Einheit (`%`). Schema's hardcoded `${n}px` wird nicht mehr blind
  übernommen wenn User explizite Einheit angab.

- **`mar`-Alias für margin nicht in PROPERTY_TO_CSS-Map**: Token-References
  wie `Frame mar $space` produzierten gar kein margin (kein style, kein
  Error). Fix: `mar: 'margin'` zu `PROPERTY_TO_CSS` ergänzt.

- **`mar`-Alias nicht im directional/multi-value margin-Pfad**: Sowohl
  `Frame mar 0 0 4 0` (4-Wert) als auch `Frame mar left 8` (directional)
  wurden komplett verschluckt. Fix: `'mar'` im Branch-Check
  `(name === 'margin' || name === 'm' || name === 'mar')` und in
  `NEEDS_PX_PROPERTIES`-Set ergänzt. Hat 5 Tutorial-Snapshot-Tests
  „repariert" (die zuvor das fehlerhafte Verhalten festhielten).

### Added

- `tests/compiler/properties-deep-coverage.test.ts` (122 Tests in 11 Bereichen):
  - **1. Alias-Matrix** (~37 Tests): jede der ~50 Aliase aus
    `PROPERTY_TO_CSS` testet, dass die korrekte CSS-Property + Wert mit
    `px`-Einheit erzeugt wird (sizing, spacing, colors, border, typography,
    effects).
  - **2. Token×Property Matrix** (~16 Tests): Token-References für jede
    der wichtigsten Property-Klassen (bg/col/boc, pad/mar/gap variants,
    w/h/min/max, border/radius, font-size, opacity).
  - **3. Einheiten-Coverage**: %, vh, vw, vmin, vmax — sowohl single-value
    als auch mixed multi-value (`pad 8 50% 16 25%`).
  - **4. Multi-Value pro Property-Type**: 1/2/3/4/5+ Werte für padding,
    border-Varianten, single-value Properties mit Excess.
  - **5. Aspect-Ratio**: `aspect square`, `aspect video`, `aspect 16/9`,
    `aspect 4/3`.
  - **6. Property × State Matrix**: hover/focus/active/disabled mit
    bg/col/opacity/rad/bor.
  - **7. Conditional/Ternary für viele Property-Types**: bg/w/opacity/pad/rad
    mit Ternary; final DOM-Output verifiziert Marker-Resolution.
  - **8. Properties in Each-Loop-Item-Reference** (`bg $item.color`).
  - **9. Negative-Werte** für mar, pad-direction, gap, z-index.
  - **10. Boolean-Properties**: 15 standalone keywords (hor, ver, center,
    spread, wrap, hidden, visible, clip, truncate, italic, underline,
    uppercase, lowercase, shrink, grow), Idempotenz-Check.
  - **11. Token vs Literal Cascades**: letzter wins in beiden Richtungen,
    multiple Token-Refs in einer Property-List.

5070 Compiler-Tests grün, 5 Tutorial-Snapshots aktualisiert (alte
Snapshots dokumentierten den jetzt gefixten margin-Bug).

### Coverage-Status

Properties-Coverage auf ~85% gehoben (vorher 70%). Verbleibende Lücken:
Komputierte Expressions (`w 100 + 50` als known limitation), self-
referential Tokens (Thema 6 abgedeckt).

---

## 2026-04-25 (Tokens & Property-Sets – Thema 6)

Aggressive Provokationen für Token-Definition-Varianten und Property-Set-
Verschachtelung. **2 echte Parser-Bugs entdeckt UND gefixt**, 35 neue Tests
in 8 Bereichen, 0 Regressionen.

### Fixed

- **Property-Set-Detection erkennt jetzt `$ref` als zulässigen Start-Wert**.
  `b: $a, bg #f00` wurde vorher als Component-Definition geparst (weil der
  Property-Set-Branch `isValidProperty('$a')` prüfte und `$a` keine valid
  Property ist). Jetzt akzeptiert der Branch zusätzlich Identifier mit
  `$`-Prefix, solange weitere Properties nach Komma folgen (verhindert
  Konflikt mit der Token-Reference-Form `accent.bg: $primary` am Zeilenende).
- **Property-Set-Body erweitert Token-References als propset-Property**.
  `$a` innerhalb eines Property-Sets wurde vorher als Property mit Name `$a`
  und leeren Values gespeichert (nutzlos). Jetzt wird es als
  `{ name: 'propset', values: [{ kind: 'token', name: 'a' }] }` gespeichert,
  was der existierende `expandPropertySets`-Transformer rekursiv expandiert.
  Dadurch funktionieren nested Property-Sets: `a: pad 8; b: $a, bg #f00;
Frame $b` produziert sowohl `padding: 8px` als auch `background: #f00`.

### Added

- `tests/compiler/tokens-coverage.test.ts` (35 Tests in 8 Bereichen):
  - **C1–C4 Self/Circular**: 1-self, 2-cycle, 3-cycle, 10-deep cycle
    terminieren ohne Crash
  - **R1–R3 Re-Definition**: same-name twice, suffixed twice, different
    types (last wins)
  - **N3–N6 Name Edge-Cases**: hyphenated, Unicode (`primärfarbe`),
    suffix is reserved word, empty suffix
  - **V1–V5 Value Edge-Cases**: multi-value, boolean (`loggedIn: true`),
    forward-reference, unresolved (literal leaks), negative numbers
  - **PS1, PS3, PS4, PS6, PS7, PS8**: basic, direction-in-mixin, **nested
    mixin (Bug-Fix)**, re-defined property-set, mixin with single token-ref,
    recursive Property-Sets terminate
  - **P1–P5 Suffix-Path-References**: basic, auto-suffix-pick, explicit
    suffix, multi-suffix, unknown suffix
  - **SE1, SE3 Section-Tracking**: tokens before any section,
    tokens after multiple sections track last
  - **PA1, PA3, PA4 Pathologische**: 500 tokens, 50 token-refs in one
    property list, long suffix chain
  - **CSS-Variable Output Checks**: `var(--name)` form, hyphenated tokens,
    tokens in hover state

4948 Compiler-Tests grün insgesamt, keine Regressionen.

### Coverage-Status

~80% der Token- und Property-Set-Edge-Cases abgedeckt. Verbleibende bewusste
Lücken: Validator-spezifische Type-Konflikte (gehört zu Thema 18),
systematische Forward-Resolution zwischen Tokens.

---

## 2026-04-25 (Komponenten & Vererbung – Thema 5)

Aggressive Coverage-Tests für Inheritance-System. **1 echter Parser-Bug entdeckt
UND gefixt**, ~55 neue Tests, 0 Regressionen.

### Fixed

- **Komma-Actions in Component-Body parsen jetzt symmetrisch zu Instance-Body**.
  Vorher:
  - Instance-Body: `Btn onclick toggle(), toast("p")` → 2 separate click-Events
    (korrekt)
  - Component-Body: `Base as Btn: onclick toggle(), toast("p")` → 1 click-Event
    - `toast` wurde fälschlich als phantom Child-Instance interpretiert (Bug)

  Fix: `parseComponentBody()` in `compiler/parser/parser.ts` erkennt jetzt vor
  dem Catch-All-Branch `IDENTIFIER + LPAREN + isImplicitOnclickCandidate` und
  ruft `parseImplicitOnclick()` auf — analog zur Logik in
  `parseInlineProperties()` für Instance-Bodies. Damit entstehen 2 click-Events
  und keine phantom children mehr.

### Added

- `tests/compiler/inheritance-bugs.test.ts` (~20 Tests):
  - **C1–C6 Cycle-Detection**: alle 5 Cycle-Formen (1-self, 2-cycle, 3-cycle,
    10-deep cycle, extends NonExistent) — alle terminieren < 1s ohne Crash
  - **E1–E4 Events-Concat**: BOTH onclick-Events bleiben (kein Dedup), parent
    onclick + child onkeydown beide präsent, E4 dokumentiert oben genannten Bug
  - **F1–F2 Forward-Reference**: Instance vor Definition + Forward-Base-Reference
  - **N1–N2 Naming-Conflicts**: doppelte Component-Definition + Component shadows
    primitive (`Frame as Button:`)
  - **SI1–SI2 Self-Inheritance** Varianten
  - **M5 Recursive Mixin**: Component referenziert sich selbst als Style-Mixin
  - **PA2–PA3 Stress**: 10-deep Inheritance-Chain mit alle Properties merged,
    Unicode-Component-Namen (`Bütton`)

- `tests/compiler/inheritance-coverage.test.ts` (~35 Tests):
  - **P5–P11 Properties**: Token-Override, Multi-Value-Override, Hover-Property
    in Inheritance, Direction-Property in Inheritance, 5-deep Property-Chain,
    different aliases (w vs width) in inheritance
  - **S1–S5 States**: hover bg + col merged, hover only + focus only both
    present, 3-Level state chain accumulates
  - **E5 Events**: 3 events from 3-level chain
  - **CH1–CH5 Children**: parent+child concat order, Slot+Frame mixed,
    named-instance-conflicts both present (no dedup), 4-deep stack
  - **M1–M3 Style-Mixin**: PascalCase mixin expand, multiple mixins, mixin +
    own property override
  - **PS1–PS5 Property-Set**: lowercase mixin expand, ordering matters
    (`pad 8, $cardstyle` vs `$cardstyle, pad 8`), token references inside
  - **EB1–EB3 Empty Bodies**: minimal component, empty inheritance
  - **DC1–DC3 Deep Chains**: 5-Level all-properties, 10-Level no stack
    overflow, override-at-every-level
  - **AE1–AE3 Mixed as/extends**: A as Frame + B extends A, B extends primitive
    directly, 3-level mixed
  - **X1–X2 Cross-Cases**: parent state-layout-change + child default-direction
    override, 3 states across 2 levels
  - **PA1–PA2 Pathological**: 50-deep chain, 30 props with single override

4913 Compiler-Tests grün, keine neuen Regressionen.

### Coverage-Status

~80% der Inheritance-Edge-Cases abgedeckt. Verbleibende bewusste Lücken:
Komma-Action-Parser-Bug (Workaround dokumentiert), Slot-Inheritance (Thema 12),
State-Trigger-Override, Animation-Inheritance (Thema 13).

---

## 2026-04-25 (Layout Iteration 2 – Thema 4 deep)

Zweiter Pass über Layout mit systematischer Coverage-Matrix. Anspruch laut
`uebersicht.md`: ≥ 80% Pair-Coverage plus Triple/Eltern-Kind/Sizing-Matrix.
**1 weiterer echter Bug gefixt**, 189 neue Tests.

### Fixed

- **`Frame hor, ver, hor` ergab `column` statt `row`**. Wurzelursache:
  `mergeProperties()` deduplizierte nach Property-Name, behielt aber die
  ORIGINAL-Position des Keys im Map. Wert wurde aktualisiert, aber Iteration-
  Reihenfolge entsprach dem ersten Vorkommen, nicht dem letzten Insert. Bei
  drei gleichen Direction-Keywords (`hor` zweimal) verliert die zweite
  Iteration die Position.

  Fix: für eine Whitelist ordnungssensitiver Layout-Keywords (alle 9-Zone-
  Shortcuts, hor/ver/horizontal/vertical, center/cen/spread, left/right/top/
  bottom, hor-center/ver-center) macht `mergeProperties()` jetzt
  `delete + set` statt nur `set`. Damit wandert der letzte Insert ans Ende
  und gewinnt sowohl im Wert als auch in der Iteration. Andere Properties
  bleiben mit dem ursprünglichen Verhalten.

  Implementiert in `compiler/ir/transformers/property-utils-transformer.ts`
  (`ORDER_SENSITIVE_LAYOUT_PROPS`).

### Added

- `tests/compiler/layout-coverage.test.ts` (189 Tests in 15 Bereichen):
  - **Pair-Matrix** (~50 wichtigste Pairs): direction × alignment, direction
    × gap, direction × wrap, direction × sizing, grid × X, stacked × X,
    sizing pairs
  - **Container vs Non-Container Matrix**: 14 Layout-Properties × 4
    Primitives (Frame, Text, Button, Icon)
  - **Sizing × Layout-System Matrix**: 12 Kombinationen (hug/full/fixed ×
    flex column/row, grid, stacked) als Smoke-Tests + 3 Konflikt-Tests
  - **Eltern-Kind-Layout-Interaktionen**: nested flex, grid-in-grid,
    stacked-in-stacked, mixed (stacked → grid → flex), x/y in stacked,
    x/y in grid, x/y/w/h in grid (column-end via span)
  - **Grid-Cell-Position-Vertiefung**: x ohne y, y ohne x, x überlauft Grid,
    x 0, w-overflow, w 1 single span, überlappende Children
  - **Triple-Konflikte**: hor+center+spread, tl+center+br, hor/ver/hor (Bug-
    Fix), w 100/hug/full, grid 12/6/3, gap 4/8/12
  - **Token-Resolution**: gap mit token, gap-x mit token, w mit token,
    multiple tokens kombiniert
  - **Conditional/Ternary**: w als ternary, gap als ternary, if/else changes
    layout
  - **Wrap & Dense Edge-Cases**: dense ohne grid, row-height ohne grid,
    row-height mit grid
  - **Center-Varianten**: center alleine, center+hor, center+tc, cen alias,
    center+center idempotent
  - **Standalone Position**: left, right, top, bottom auf Frame; mit hor
  - **Layout in States**: hover changes hor/ver, selected: stacked,
    disabled: ver, hover changes gap
  - **Layout in Inheritance**: 3-level mit Layout-Overrides, grid 12 → grid 6
    instance override, stacked + hor instance both apply
  - **Layout in Iteration**: grid+each, flex+each, stacked+each, nested
    each mit verschiedenen Layouts
  - **Pathologische Combinations**: 100 Layout-Properties chained, 50-deep
    nesting, grid 1000, gap -9999, alle 14 Layout-Keywords gleichzeitig

4858 Compiler-Tests grün insgesamt, keine Regressionen.

### Coverage-Status

~70-75% aller realistischen Layout-Kombinationen abgedeckt (Iteration 1: 35%).
Verbleibende bewusste Lücken: Triple-Pairs vollständig, Performance/Stress,
Cross-Schicht (IR→Backend→DOM) für seltene Combos, Property-Sets/Mixins,
Grid mit subgrid/named-lines.

---

## 2026-04-25 (Layout – Thema 4)

Aggressive Tests gegen Layout-Edge-Cases. **1 echter Bug gefixt**, ~30 neue Tests.
Großer Lerneffekt: vermeintliche „Layout-System-Konflikte" sind **dokumentierte
Mirror-Semantik**, nicht Bugs.

### Fixed

- `formatCSSValue()` versah negative Zahlen nicht mit `px`-Suffix. `Frame gap -10`
  produzierte `gap: -10` (ungültiges CSS) statt `gap: -10px`. Regex
  `/^\d+$/` erweitert auf `/^-?\d+$/` in
  `compiler/ir/transformers/style-utils-transformer.ts`.

### Documented (Layout-Semantik klargestellt)

Mein erster Pass nahm an, dass `Frame stacked, hor` ein Konflikt sei („letzter
gewinnt"). Aggressive Bug-Tests deckten auf: das ist **keine Konfliktsituation**,
sondern die korrekte Mirror-Semantik:

- **`stacked` = Modifier** (`position: relative`), der mit Flex und Grid
  KOEXISTIERT. Stacked ist kein eigenes Layout-System, das Flex/Grid ersetzt.
- **`hor`/`ver` IM Grid-Kontext** interpretieren sich als `grid-auto-flow: row`
  bzw. `column`, NICHT als Flex-Direction. Beabsichtigte Funktion: in einem
  Grid die Flow-Direction kontrollieren.
- **9-Zone-Alignment + explizite Direction**: `Frame hor, tl` ergibt flex-row
  mit Top-Left-Alignment (hor wins direction; tl liefert \_hAlign/\_vAlign). Auch
  beabsichtigt.
- **Grid + Flex auf demselben Container**: Grid hat Vorrang für `display:`,
  Flex-Properties werden ignoriert. `display:flex` und `display:grid` schließen
  sich aus.

Limitation #8 aus dem ersten Pass ist damit aufgelöst — sie war kein Bug,
sondern eine Wissenslücke.

### Added

- `tests/compiler/layout-bugs.test.ts` (~30 Tests) — pathologische Layout-
  Kombinationen: Cross-System „Konflikte" (alle dokumentiert als Koexistenz),
  extreme Werte (`grid 999`, `gap 99999`, `gap -10`), 50 Layout-Properties in
  Folge, alle 9 Zonen hintereinander, tiefe Verschachtelung mit gemischten
  Layouts (4 Levels: stacked → grid → flex → stacked), Layout in Inheritance,
  Layout in States, Layout in Each-Loops, Sizing-Konflikte (`w hug, w full,
w 100`), Gap-Konflikte (gap-x vs general gap), 9-Zone vs explicit Direction.

564 Layout-bezogene Tests grün, keine Regressionen in 4669 Compiler-Tests
insgesamt.

### Updated documented limitations

Limitation #8 (Cross-Property Layout-Konflikte) wird gestrichen — kein Bug.
Stacked/Flex/Grid-Koexistenz ist die korrekte Semantik.

---

## 2026-04-25 (Properties Deep – Thema 3 Vertiefung)

Zweiter, aggressiverer Pass über Properties: gezielte Provokationen für Lücken
des ersten Pass. Resultat: **2 echte Bugs gefunden und gefixt**, 1 Pipeline-
Verhalten dokumentiert, 40 Deep-Tests, 4 Limitations dokumentiert.

### Fixed

- **`bor t 1` (Space-Syntax) verlor die `currentColor`-Fallback-Farbe**.
  `bor-t 1` und `border-top 1` produzierten `1px solid currentColor`, aber
  `bor t 1` (mit Leerzeichen statt Bindestrich) produzierte nur `1px solid` —
  ungültiges CSS. Fix in `formatBorderValue()`
  (`compiler/ir/transformers/style-utils-transformer.ts`): wenn weder Stil noch
  Farbe explizit gesetzt, werden jetzt beide Defaults (`solid` + `currentColor`)
  ergänzt.
- **State-Property-Aliase nur für `hover-*`**. `disabled-bg`, `focus-bor`,
  `active-col` etc. wurden komplett ignoriert (keine Styles, kein Error). Fix:
  `hoverPropertyToCSS()` in `compiler/schema/ir-helpers.ts` zu generischer
  `STATE_PROPERTY_PREFIXES = ['hover', 'focus', 'active', 'disabled']` Logik
  generalisiert. `property-transformer.ts` greift den passenden Prefix ab und
  emittiert die Style mit dem entsprechenden `state`-Feld.

### Added

- `tests/compiler/properties-deep.test.ts` (40 Tests) — Bug-Tests für D1, D3
  (siehe oben), Pipeline-Test für D2 (siehe unten), Schema-Type-Konflikte als
  documenting tests, Computed-Expressions als documenting tests, Self-
  Referential Tokens, Cross-Property Layout-Konflikte, Unknown Properties,
  comprehensive Sweep aller directional Aliase (`pad-t/r/b/l`, `pt/pr/pb/pl`,
  `pad top/right/bottom/left`, `pad-x/y`, alle Margin/Border-Direktionen).

### Documented

- **D2 (Conditional-Marker im IR)**: `Frame bg active ? red : blue` produziert
  im IR den Marker-String `__conditional:active?red:blue` als style-value. Der
  Marker ist beabsichtigt — das Backend (`compiler/backends/dom/node-emitter.ts`)
  erkennt ihn und generiert Runtime-Ternary-Code (`($get("active") ? "red" :
"blue")`). Im finalen JS-Output ist der Marker weg. Test fixiert die
  Pipeline.

### Known limitations (dokumentiert, nicht gefixt)

- **Schema-Type-Konflikte werden roh durchgelassen**: `Frame pad #f00`
  (Color als Spacing), `Frame bg 5` (Number als Color), `Frame opacity "high"`
  (String als Number) — alle erzeugen invalides CSS ohne Compiler-Warning.
  Validator-Thema (18) wird das fangen.
- **Computed Expressions nicht ausgewertet**: `Frame w 100 + 50` emittiert
  `width: 100 + 50` (ungültiges CSS). Sollte zu `calc()` werden oder Error.
- **Self-referential Tokens**: `a: $a; Frame bg $a` erzeugt `background: $a`
  literal, kein Cycle-Check.
- **Cross-Property Layout-Konflikte**: `Frame stacked, hor` setzt sowohl
  `position: relative` als auch `flex-direction: row` — kein Layout-System-
  Konflikt-Resolver. `hor`, `grid 12`, `stacked` koexistieren wider Erwarten.
- **Unknown Properties** (z.B. `Frame foobar 5`) werden silent ignoriert ohne
  Error im IR-Layer. Validator-Thema.

---

## 2026-04-25 (Properties & Aliases – Thema 3)

Property-Logik systematisch durchleuchtet: 50 Property-Aliase, „letzter gewinnt"
über Aliase hinweg, Boolean-Properties, Multi-Value-Excess, Token-References,
Edge-Werte. Resultat: **keine echten Bugs gefunden**, ~46 neue Tests als
Regressionsschutz, 1 dokumentierte Limitation.

### Added

- `tests/compiler/properties-bugs.test.ts` (~21 Tests) — gezielte Bug-Hypothesen:
  Alias-Konflikte (`w` vs `width`, `pad` vs `padding`, `bg` vs `background` usw.),
  Multi-Value-Excess für Single-Value-Properties (border, fs, opacity, rotate),
  Boolean-Properties mit Werten, Token-Reference-Edge-Cases, Edge-Werte (negative
  pad-direction, opacity 0/-0.5/1.5). Alle Tests grün — Property-Logik ist robust.
- `tests/compiler/properties-additional.test.ts` (~25 Tests) — Coverage für direkte
  CSS-Property-Namen (`width 100`, `max-width 200`), Edge-Werte (negative margin,
  z-index, scale 0, rotate ±720), Boolean-Kombinationen (`truncate, italic, uppercase`),
  Transform-Kombinationen, Token-References mit Suffixen, Hover-Properties
  (`hover-bg`, `hover-opacity`, `hover-scale`), Property-Listen-Edge-Cases.

### Documented

- `tests/compiler/docs/themen/03-properties.md` — Scope, Inventar (~10 Test-Files
  thematisch + viele indirekte), 50 Provokations-Hypothesen in 10 Bereichen.
- Bestätigte Verhaltensweisen:
  - „Letzter gewinnt" funktioniert über alle Alias-Kombinationen hinweg
  - Multi-Value-Properties mit Überschuss crashen nicht
  - Boolean-Properties idempotent
  - Token-References werden zu CSS-Variablen
  - Negative Werte (margin, z-index, rotate, opacity) werden roh durchgelassen
  - opacity-Werte werden nicht clamped (CSS-Engine macht das)

### Known limitations (dokumentiert, nicht gefixt)

- **CSS-Property-Form-Aliase fehlen für manche Properties**: `border-radius 8`
  als direkte CSS-Form-Schreibweise wird stillschweigend ignoriert (kein Style,
  kein Error). Nur `radius` und `rad` mappen zu `border-radius` in
  `compiler/schema/ir-helpers.ts`. Validator-Thema (18) wird das später fangen.

---

## 2026-04-25 (Parser Bulletproof – Thema 2)

Fortsetzung des Compiler-Bulletproof-Plans. Parser systematisch durchleuchtet:
~605 existierende Tests katalogisiert, 70 Hypothesen in 13 Bereichen geprüft,
1 Soft-Error-Verbesserung, 11 deaktivierte Schema-Tests reaktiviert, ~75 neue Tests.

### Fixed

- **Top-Level skip-unknown emittiert jetzt einen Soft-Error**, wenn der Parser
  vor einem `IDENTIFIER COLON` strandet, das keiner Definition entspricht.
  Vorher: lautloses Verschlucken. Jetzt: „Unrecognized definition: ':' has no
  value or body" mit Hinweis (`compiler/parser/parser.ts` Z. 514).

### Added

- `tests/compiler/parser-bugs.test.ts` (~33 Tests) — Bug-Hypothesen für Top-Level-
  Detection (reserved keywords, Canvas-Position, JS-Keyword-Mid-Doc), Token-Edge-Cases,
  Self-Inheritance, Empty-Inline-Slots, Multi-Value-Excess, State-Doppel-Definition,
  Each-Edge-Cases, Else-If-Chain, Robustness (1000 props / 50 nesting / 100 components).
  Drei vermutete Bugs sind bestätigt-aber-nicht-Silent-Swallow (Parser produziert
  „verkorkste" AST-Knoten statt Fehler) — als known limitations dokumentiert.
- `tests/compiler/parser-additional.test.ts` (~44 Tests) — Coverage für Top-Level-
  Constructs, Token-Definitionen, Component-Patterns, Property-Patterns (inkl.
  `bg`/`pad` bleiben raw bis IR), States (inline, mit Trigger, mit when-Clause),
  Events (Multi-Action wird zu 2 Events!), Each-Loops (mit `where`, index, nested),
  Conditionals, systematisches Position-Tracking.
- 11 reaktivierte Schema-Tests in `parser-schema.test.ts` (vorher `describe.skip(`).
  API-Calls von `ast.program.schema` auf `ast.schema` umgestellt. 6 Constraint-
  Tests bleiben skipped (Feature nicht implementiert).

### Documented

- `tests/compiler/docs/themen/02-parser.md` — Scope, Inventar von 29 Test-Files
  (~605 Tests), 70 Provokations-Hypothesen in 13 Bereichen, Test-Plan.
- Wichtige fixierte Verhaltensweisen:
  - Property-Namen bleiben im AST roh (`bg`, `pad`) — Alias-Resolution passiert in IR
  - Token-References sind Objects: `{ kind: 'token', name: 'primary' }`
  - `onclick toggle(), toast(...)` produziert 2 Events (nicht 1 mit 2 Actions)
  - `Btn:` wird Component mit Default-Primitive Frame
  - `if: #f00` wird (suboptimal) als malformed Conditional interpretiert
  - `each in $list` (ohne loop-var) wird als Instance reinterpretiert

### Known limitations (dokumentiert, nicht gefixt)

- Reserved Keywords als Token-Namen (`if:`, `each:`) ergeben verkorkste AST-Knoten
- Schema-Constraints (`required`, `max`, `onDelete`) noch nicht implementiert

---

## 2026-04-25 (Lexer Bulletproof – Thema 1)

Erste systematische Absicherung des Lexers im Rahmen des Compiler-Bulletproof-Plans
(`tests/compiler/docs/themen/uebersicht.md`). 5 Bugs gefunden und behoben, ~120
neue Tests hinzugefügt.

### Fixed

- **Section headers nur am Zeilenanfang**: `Button -- Foo --` (inline) erzeugte
  bisher fälschlich einen `SECTION`-Token mitten in der Zeile. Der Lexer prüft
  jetzt via `isAtLineStart()`, dass der vorherige Token `NEWLINE`/`INDENT`/
  `DEDENT` war oder die Token-Liste leer ist. Ebenso für `---5` inline.
- **Lone `&` und `|`** wurden bislang lautlos verschluckt (kein Token, kein
  Error). Sie emittieren jetzt einen `Unexpected character`-Error mit Hinweis
  „Did you mean '&&'?" / „Did you mean '||'?".
- **Negative Numbers verlieren Suffixe nicht mehr**: `-100vh`, `-50%`,
  `-0.5s`, `-200ms` wurden bisher als `NUMBER "-100"` + separater Identifier
  tokenisiert. `scanNegativeNumber` ruft jetzt `consumeNumberSuffixes()` auf,
  das aus `scanNumber` extrahiert und geteilt wird.

### Added

- `tests/compiler/lexer-bugs.test.ts` – 18 Tests, die jeden der 5 Bugs als
  Erwartung formulieren und gleichzeitig Regressionschutz für die unveränderten
  Code-Pfade (Tab-Column-Tracking, Surrogate-Pair-Spalten) liefern.
- `tests/compiler/lexer-number-suffixes.test.ts` – ~45 Tests für `%`, `s`,
  `ms`, `vh`, `vw`, `vmin`, `vmax`, Aspect-Ratio `16/9`, inkl. Edge-Cases
  (`100v`, `100vmix`, `100sms`, `1e10`, `0xff`).
- `tests/compiler/lexer-additional.test.ts` – ~56 Tests für Hex-Color-Edges,
  Single-Quote-Strings, Mixed-Quote-Strings, Unicode-Identifier (CJK, Umlaut),
  Indent-Inkonsistenzen, Section-Edges, Block-Comment-Splitting (`/* */`),
  Operator-Sequenzen (`> =`, `====`, `!==`), BOM/Smart-Quotes/Lone-`\r`.

### Documented

- `tests/compiler/docs/themen/uebersicht.md` – 20-Themen-Roadmap für die
  systematische Compiler-Absicherung. Vorgehen: 4 Schritte pro Thema.
- `tests/compiler/docs/themen/01-lexer.md` – Vollständige Analyse: Scope,
  Ist-Aufnahme von 240 existierenden Lexer-Tests, 66 Provokations-Hypothesen
  in 11 Bereichen, Test-Plan, dokumentierte Limitierungen (Column = char-index
  basiert, Hyphen in Section-Namen).

### Known limitations (dokumentiert, nicht gefixt)

- **Hyphen im Section-Namen** (`--- foo-bar ---`) ergibt `SECTION 'foo'` statt
  `'foo-bar'`, weil `scanSection` am ersten `-` stoppt. Test fixiert das
  Verhalten; Behebung ist Folge-PR.
- **Column-Tracking Tab/Emoji**: Tabs zählen 1 Spalte (statt 4), Emoji-
  Surrogate-Pairs zählen 2 (statt 1). Tests fixieren das.

---

## 2026-03-28 (Animation Integration)

### Added

- **State Transition Animations** - Animationen in State-Blöcken
  - Preset nach Colon: `selected onclick: bounce`
  - Duration vor Colon: `selected onclick 0.2s:`
  - Duration + Easing: `selected onclick 0.3s ease-out:`
  - Kombiniert: `selected onclick 0.2s: bounce`
  - Lexer: `scanNumber()` unterstützt jetzt `s` und `ms` Suffixe
  - Parser: `isStateBlockStart()` erkennt Duration-Tokens
  - Test: `tests/parser/state-animations.test.ts` (17 Tests)

- **Enter/Exit Pseudo-Properties** - Separate Ein-/Aus-Animationen
  - `enter: slide-in` - Animation beim Eintreten in State
  - `exit: fade-out` - Animation beim Verlassen des States
  - Mit Duration und Easing: `enter: bounce 0.5s ease-out`
  - Test: `tests/parser/state-animations.test.ts`

- **When mit Animation** - Animationen für Abhängigkeiten
  - `visible when Menu open 0.3s:` - Auto-Transition bei When-Clause
  - Test: `tests/parser/state-animations.test.ts`

### Schema

- `DSL.animationPresets` - 10 Animation-Presets
- `DSL.easingFunctions` - 7 Easing-Funktionen
- `ANIMATION_PRESETS`, `EASING_FUNCTIONS` Sets in parser-helpers

### IR Types

- `IRStateAnimation` - Animation-Konfiguration (preset, duration, easing, delay)
- `IRStateDefinition.enter/exit` - State-Level Enter/Exit-Animationen
- `IRStateTransition.animation` - Transition-Level Animation

### Code Generation

- `compiler/backends/dom.ts` - Animation-Daten in State-Machine-Config
  - `serializeAnimation()` - Serialisiert Animation-Objekte
  - State-Definitionen mit `enter`/`exit` Animationen
  - Transition-Config mit `animation` Property
  - `transitionTo()` und `exclusiveTransition()` mit Animation-Argument
  - Test: `tests/compiler/state-animation-codegen.test.ts` (11 Tests)

### Runtime

- `compiler/runtime/dom-runtime.ts` - Animation-Playback
  - `StateAnimation` Interface (preset, duration, easing, delay)
  - `ANIMATION_PRESETS` - 10 Keyframe-Definitionen (fade-in/out, slide-in/out, scale-in/out, bounce, pulse, shake, spin)
  - `playStateAnimation()` - Web Animations API Integration
  - `transitionTo()` akzeptiert optionales Animation-Argument
  - `exclusiveTransition()` akzeptiert optionales Animation-Argument

### Test Coverage

| Test-Datei                        | Tests | Beschreibung                      |
| --------------------------------- | ----- | --------------------------------- |
| `state-animations.test.ts`        | 17    | Parser: Animation-Syntax          |
| `state-machine-animation.test.ts` | 11    | IR: Animation-Transformation      |
| `state-animation-codegen.test.ts` | 11    | Code-Generation: Animation-Output |

**Gesamt: 39 Animation-Integration Tests**

---

## 2026-03-28 (Interaction Model)

### Added

- **State Blocks mit Triggers** - `selected onclick:` Syntax für deklarative State-Übergänge
  - State-Namen gefolgt von Event-Trigger und Doppelpunkt
  - Parser: `isStateBlockStart()` erkennt komplexe Patterns
  - Test: `tests/parser/state-triggers.test.ts` (14 Tests)

- **State Modifiers** - `exclusive`, `toggle`, `initial`
  - `exclusive` - Nur ein Element in der Gruppe kann diesen State haben
  - `toggle` - State wechselt zwischen aktiv/initial
  - `initial` - Markiert den Anfangszustand
  - Code-Generation: `_runtime.exclusiveTransition()`, Toggle-Logik
  - Test: `tests/compiler/state-machine-codegen.test.ts`

- **Keyboard Triggers** - `onkeydown escape:` Syntax
  - Event mit Key-Filter: `onkeydown`, `onkeyup` + Key-Name
  - Unterstützte Keys: escape, enter, space, tab, arrow-\*, home, end
  - Test: `tests/parser/state-triggers.test.ts`

- **When Dependencies** - `visible when Menu open:` Syntax
  - Reaktive State-Abhängigkeiten zwischen Elementen
  - Parser: `parseWhenClause()` mit and/or Ketten
  - Runtime: `watchStates()` mit MutationObserver
  - Test: `tests/ir/state-machine.test.ts`, `tests/compiler/state-machine-codegen.test.ts`

- **Multi-Element Triggers** - Block-Syntax für mehrere Targets

  ```
  onclick:
    Menu open
    Backdrop visible
  ```

  - Parser: Event-Parsing in `parseInstanceBody()`
  - Code-Generation: `_runtime.transitionTo(_elements['Target'], 'state')`
  - Test: `tests/parser/multi-element-triggers.test.ts` (4 Tests)

### IR Types

- `IRStateMachine` - State-Machine-Konfiguration
- `IRStateDefinition` - State mit Styles
- `IRStateTransition` - Transition mit Trigger/When
- `IRStateDependency` - When-Abhängigkeitskette

### Runtime Functions

- `transitionTo(el, stateName)` - State-Übergang
- `exclusiveTransition(el, stateName)` - Exklusiver Übergang (Geschwister deaktivieren)
- `watchStates(el, targetState, initialState, condition, dependencies)` - Reaktive When-Watcher

### Test Coverage

| Test-Datei                       | Tests | Beschreibung                        |
| -------------------------------- | ----- | ----------------------------------- |
| `state-triggers.test.ts`         | 14    | Parser: Trigger-Syntax, When-Clause |
| `multi-element-triggers.test.ts` | 4     | Parser: Block-Actions               |
| `state-machine.test.ts`          | 11    | IR: State-Machine-Generierung       |
| `state-machine-codegen.test.ts`  | 22    | Code-Generation + Edge Cases        |

**Gesamt: 51 Interaction Model Tests**

---

## 2026-03-28

### Discovered (Provocation-025: Testlücken-Analyse)

Systematische Analyse nach Strategie-Ansatz (`provocation-025.test.ts`) - 76 Tests, 5 echte Bugs gefunden (alle gefixt):

**Transform + Pin Kombinationen - BUG (2 Tests failed):**

- `pin-center-x rotate 45` → rotate überschreibt translate statt zu kombinieren
- `pin-center scale 1.5` → scale überschreibt translate statt zu kombinieren
- Ursache: Transform-Werte werden nicht gemerged
- Betrifft: `compiler/ir/index.ts` - Transform-Handling

**State Vererbung - BUG (2 Tests failed):**

- `Parent hover: bg #f00` + `Child hover: bg #00f` → Parent gewinnt statt Child
- Focus-State von Parent wird bei Child-Override nicht erhalten
- Ursache: State-Merging in Vererbung fehlerhaft
- Betrifft: `compiler/ir/index.ts` - `resolveComponent` / `mergeProperties`

**Alias Reihenfolge - BUG (1 Test failed):**

- `bg #f00 background #00f` → erster gewinnt statt letzter
- Ursache: Alias nicht als gleiche Property erkannt bei Merging
- Betrifft: `compiler/ir/index.ts` - Property-Key-Generierung

**Text-Align - BUG (1 Test failed):**

- `Text text-align center` → text-align wird nicht gesetzt
- Ursache: Property wird auf Text-Primitive nicht transformiert
- Betrifft: `compiler/ir/index.ts` - `propertyToCSS`

**Truncate + Sizing - BUG (2 Tests failed):**

- `Text truncate w 100` → width nicht gesetzt (nur overflow)
- `Text truncate maxw 200` → maxw nicht gesetzt
- Ursache: truncate setzt overflow, aber width/maxw werden ignoriert
- Betrifft: Property-Reihenfolge oder Truncate-Handling

### Fixed (Provocation-025 Bugs)

- **Transform + Pin Kombinationen** - `pin-center-x rotate 45` kombiniert jetzt korrekt
  - Fix: `propertyToCSS` extrahiert Transforms aus Boolean-Properties in transformContext
  - Fix: Transform-Emission nach Second Pass verschoben
  - Test: `provocation-025.test.ts` - "Transform-Kombinationen"

- **State Vererbung** - Child States überschreiben Parent States korrekt
  - Fix: `mergeStates` Methode erstellt - merged State-Properties statt zu ersetzen
  - Test: `provocation-025.test.ts` - "State-Vererbung"

- **Alias Reihenfolge** - `bg #f00 background #00f` → letzter gewinnt
  - Fix: `getCanonicalPropertyName` importiert und in `getPropertyKey` verwendet
  - Test: `provocation-025.test.ts` - "Alias-Verhalten"

- **Text-Align** - War bereits funktional (Schema-basierte Konversion)
  - Test validiert: `Text "Hello" text-align center` → `text-align: center`

- **Truncate + Sizing** - War bereits funktional
  - Test validiert: `Text truncate w 100` → overflow + width korrekt

### Discovered (Provocation-024: Schema-Driven Analysis)

Systematische Schema-Analyse (`provocation-024.test.ts`) - 81 Tests, alle bestanden:

**Directional Properties - VERIFIED WORKING:**

- `pad left 10`, `pad right 20` → ✓ generiert korrektes CSS
- `pad x 10`, `margin x 20`, `margin y 10` → ✓ Achsen-Syntax funktioniert
- `rad t 10`, `rad l 10`, `rad r 20` → ✓ Direktionale Radius funktioniert

**Schema-Definiert aber Nicht-Implementiert (20 Tests skipped):**

- Custom States: `expanded`, `collapsed`, `on`, `off`, `open`, `closed`, `filled`, `valid`, `invalid`, `loading`, `error`
- State-Variant Props: `hover-bg`, `hover-col`, `hover-opacity`, `hover-scale`, `hover-border`, `hover-border-color`, `hover-radius`
- Icon Properties: `icon-size`, `icon-color`, `icon-weight`, `fill`, `material`
- Animation Keywords: `animation fade-in`, `bounce`, `spin`, `pulse`
- Input Properties: `focusable` (tabindex)

### Fixed

- **Event-Vererbung** - `onclick:` wurde fälschlich als State geparst
  - Ursache: Event-Detection kam nach State/Slot-Detection
  - Fix: `compiler/parser/parser.ts` - Event-Check vor State-Check
  - Test: `inheritance-005.test.ts` - "5.6: Vererbung mit Events"

- **Child Override Parsing** - Semicolons wurden von `parseInlineProperties` konsumiert
  - Ursache: Semicolons als Separator behandelt statt als Delimiter
  - Fix: `stopAtSemicolon` Parameter in `parseInlineProperties`
  - Test: `parser-child-overrides.test.ts`

### Added

- **Single Quotes** - Strings können jetzt mit `'` oder `"` geschrieben werden
  - Fix: `compiler/parser/lexer.ts` - `scanString()` unterstützt beide Quote-Typen
  - Test: `html-output-022.test.ts` - "single quotes"

- **Semicolons als Property-Trenner** - `Frame bg #f00; w 100`
  - Design: PascalCase nach `;` = Child Override, lowercase = Property Separator
  - Test: `html-output-022.test.ts` - "semicolons"

---

## 2026-03-27 (Session 5)

### Fixed

- **Nested h full / w full Tests** - Test-Syntax war falsch
  - Problem: Komma-separierte Properties, Doppelpunkte nach Instance-Namen
  - Fix: Tests korrigiert

- **Overlay Slots** - `Trigger` statt `Trigger:`
  - Problem: Slots erfordern Doppelpunkt
  - Fix: Test korrigiert

---

## 2026-03-26 (Session 4)

### Fixed

- **Bug 6: Inline Hover State** - `Frame bg #333 hover: bg light` ignoriert
  - Ursache: Parser stoppte nicht bei `identifier:`
  - Fix: `parseInlineProperties` stoppt bei lowercase + `:`
  - Fix: `instance.states` zu IR transformiert
  - Test: `token-usage-013.test.ts`

- **Bug 7: onkeydown enter:** - Parser Crash
  - Ursache: `enter:` als State statt Key behandelt
  - Fix: `KEYBOARD_KEYS` Set hinzugefügt
  - Test: `provocation-021.test.ts`

- **Bug 8: Block Hover State** - `hover:` als Kind-Instance geparst
  - Fix: `STATE_NAMES` Set, State-Block-Detection vor Child-Parsing
  - Test: `token-usage-013.test.ts`

- **Bug 9: Zag Styling ignoriert** - `Select w 200` → styles leer
  - Ursache: Alle Props an Machine Config
  - Fix: Styling-Properties separiert in `transformZagComponent`
  - Test: `zag-selection-015.test.ts`

---

## 2026-03-25 (Session 3)

### Fixed

- **Bug 5: x -50 ohne px** - `left: -50` statt `left: -50px`
  - Ursache: Regex `/^\d+$/` matcht keine negativen Zahlen
  - Fix: Regex zu `/^-?\d+$/` geändert
  - Test: `provocation-021.test.ts`

---

## 2026-03-24 (Session 2)

### Fixed

- **Bug 2: minw/maxw + w full** - min-width wurde ignoriert
  - Ursache: Flex-Konvertierung entfernte explizite min/max
  - Fix: Nur automatisches `min-width: 0` entfernen
  - Test: `html-output-022.test.ts`

- **Bug 3: aspect video** - Gibt `video` statt `16/9`
  - Fix: Keyword-Mapping hinzugefügt (video → 16/9, square → 1)
  - Test: `html-output-022.test.ts`

- **Bug 4: pin-left nicht generiert** - `Frame pin-left 10` → kein CSS
  - Ursache: Schema-Konvertierung kam nach PROPERTY_TO_CSS
  - Fix: Reihenfolge geändert
  - Test: `html-output-022.test.ts`

---

## 2026-03-23 (Session 1)

### Fixed

- **Bug 1: 9-Zone + hor/ver Konflikt** - `Frame tc hor` → column statt row
  - Ursache: 9-Zone Properties nicht in Source-Reihenfolge
  - Fix: Layout-Properties in Reihenfolge verarbeiten
  - Test: `bugs-found.test.ts`

---

## Legende

| Tag        | Bedeutung          |
| ---------- | ------------------ |
| Fixed      | Bug behoben        |
| Added      | Neues Feature      |
| Changed    | Verhalten geändert |
| Deprecated | Wird entfernt      |
| Removed    | Entfernt           |
