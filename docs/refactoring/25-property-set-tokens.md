# Slice 25: Property-Set-Token

**Datum:** 2026-05-09
**Status:** Audit · Phasen A/B + Follow-up V-6/V-7/V-8 umgesetzt · 26 Regression-Tests · Slice **green** · DOM ≡ React

## Inhalt

1. [Audit (Zusammenfassung)](#1-audit-zusammenfassung)
2. [Entscheidungen (Vorschläge, offen)](#2-entscheidungen-vorschläge-offen)
3. [Offene Fragen](#3-offene-fragen)
4. [Umsetzungsplan & Status](#4-umsetzungsplan--status)
5. [Tests](#5-tests)
6. [Anhang](#6-anhang)

---

# 1. Audit (Zusammenfassung)

## Scope

Property-Sets als **Mixins** — benannte Bündel mehrerer Properties, per `$name`
auf Elemente verteilt:

```mirror
cardstyle: bg #1a1a1a, pad 16, rad 8
heading:   fs 24, weight bold, col white

Frame $cardstyle, gap 12
  Text "Hi", $heading
```

**DSL-Versprechen** (Tutorial Kapitel „Style-Bündel (Property Sets)" + CLAUDE.md
Slice-25-Beschreibung):

- Definition `name: prop value, prop value, ...` — kein Suffix, mehrere Properties
- Verwendung `$name` — alle Properties auf das Element angewendet
- **Mehrfach-Spread** explizit dokumentiert: `Frame $a, $b`
- Property-Sets dürfen Single-Value-Tokens referenzieren (`btnstyle: bg $primary, ...`)
- Property-Sets dürfen andere Property-Sets referenzieren (`b: $a, bg #f00`)
- Override an Use-Site möglich (`Frame $cardstyle, bg #f00`)
- Klare Abgrenzung zu Single-Value-Tokens: **mit Suffix** = single-value;
  **ohne Suffix** = property-set

## Probes

23 Probes gegen den aktuellen Compiler (`/tmp/slice-25-*.ts`). Vollständige Render-
Trees: [Anhang](#6-anhang). Kurz:

| #   | Eingabe                                                            | DOM-Backend                                        | React                 | Validator | Verdikt                                                      |
| --- | ------------------------------------------------------------------ | -------------------------------------------------- | --------------------- | --------- | ------------------------------------------------------------ |
| 1   | `cardstyle: bg #1a1a1a, pad 16, rad 8` + `Frame $cardstyle`        | korrekt                                            | n/a                   | clean     | ✅                                                           |
| 2   | mit Children                                                       | korrekt                                            | n/a                   | clean     | ✅                                                           |
| 3   | `heading: fs 24, …` auf `Text`                                     | korrekt                                            | n/a                   | clean     | ✅                                                           |
| 4   | **Mehrfach-Spread** `Frame $a, $b`                                 | korrekt                                            | n/a                   | **W110**  | 🔴 **B-1** Validator false-positive auf dokumentierte Syntax |
| 5   | Override AFTER `Frame $cardstyle, bg #f00`                         | korrekt (`bg #f00` wins)                           | n/a                   | clean     | ✅                                                           |
| 6   | Override BEFORE `Frame bg #f00, $cardstyle`                        | `bg #1a1a1a` (Set wins)                            | n/a                   | clean     | ⚠️ Ordnungs-Sensitivität, ungetestet/-dokumentiert           |
| 7   | `btnstyle: bg $primary, …` + `Frame $btnstyle`                     | `var(--primary-bg)` korrekt                        | n/a                   | clean     | ✅                                                           |
| 8   | 2-level Chain `b: $a, bg #f00`                                     | korrekt                                            | n/a                   | clean     | ✅                                                           |
| 9   | 2-Cycle `a: $b; b: $a`                                             | `node.innerHTML = formatInlineMarkdown($get("a"))` | n/a                   | clean     | 🔴 **B-2 + B-3** (siehe unten)                               |
| 10  | Self-Ref `a: $a, bg #f00`                                          | `'background': '#f00', 'background': '#f00'` 2×    | n/a                   | clean     | 🔴 **B-4** Doppel-Emit                                       |
| 11  | `centeredrow: hor, center, gap 12`                                 | korrekt (flex-row, justify-center, align-center)   | n/a                   | clean     | ✅                                                           |
| 12  | Re-Def `cs: pad 16; cs: pad 24`                                    | last-wins (`24px`)                                 | n/a                   | clean     | 🟡 **B-9** silent overwrite                                  |
| 13  | Set in Component-Def `Btn: $btnbase, …`                            | korrekt                                            | n/a                   | clean     | ✅                                                           |
| 14  | Empty Set `empty:` + `Frame $empty`                                | `node.innerHTML = $get("empty")` (Frame!)          | n/a                   | clean     | 🔴 **B-2 + B-7**                                             |
| 15  | `primary: #2271C1` + `primarybg: bg $primary` + `Frame $primarybg` | `var(--primary)`                                   | n/a                   | clean     | ✅                                                           |
| 16  | Undef-Ref `Frame $undefined`                                       | `node.innerHTML = $get("undefined")`               | n/a                   | clean     | 🔴 **B-2 + B-8**                                             |
| 17  | `hover: \n $hovered` (Component-Def, ungenutzt)                    | (component nie instanziiert)                       | n/a                   | clean     | n/a                                                          |
| 18  | `hover: \n $hovered` (Instance-State)                              | hover-State **fehlt** im Output                    | n/a                   | clean     | 🔴 **B-5** State-Body-Set verloren                           |
| 19  | React-Backend `Frame $cardstyle`                                   | n/a                                                | `<div />` ohne Styles | clean     | 🔴 **B-11** React-Backend expandiert Sets nicht              |
| 20  | Name-Kollision `card.bg: #111` + `card: pad 16, rad 8`             | Frame hat nur `bg`; `pad`/`rad` aus Set verloren   | n/a                   | clean     | 🔴 **B-6** Single-Value-Token shadow'd das Property-Set      |
| 21  | 3-Cycle `a→b→c→a`                                                  | `node.innerHTML = $get("a")`                       | n/a                   | clean     | 🔴 **B-2 + B-3**                                             |
| 22  | `# Buttons` + `btnbase: …` + `Frame $btnbase`                      | bogus `Buttons`-Instance + Frame korrekt           | n/a                   | E002      | ⚠️ **scope-out** (Section-Header-Parsing)                    |
| 23  | Pure-Token-Bundle `btn: bg $primary, col $primary`                 | korrekt                                            | n/a                   | clean     | ✅                                                           |

**11 Befunde**, davon 7 hard bugs. Validator deckt nur 1 (E002) und feuert sogar in 1 Fall fälschlich (W110).

### 3-/4-/5-Level-Chains (Probe-Erweiterung)

```mirror
c: pad 8           // single-ref-only-Chain
b: $c              // wird vom Parser stillschweigend verworfen
a: $b
Frame $a
```

→ TOKENS: nur `c`. `b` und `a` existieren nicht. `$a` fällt auf
`formatInlineMarkdown($get("a"))` zurück. **B-3.**

```mirror
d: pad 8           // multi-prop-Chain (jede Zeile ≥ 2 Properties)
c: $d, gap 4
b: $c, bg #f00
a: $b, rad 8
Frame $a
```

→ Output: `bg #f00, rad 8` — `pad 8` und `gap 4` verloren. Expansion-Depth ist
**fest auf 2 Level** beschränkt (instance-ops:295 + properties-ops:83). **B-10.**

## Verdikt pro Dimension

| #   | Dimension               | Bewertung                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Architektur             | **schwach** — Expansion in zwei Phasen verteilt (instance-ops + transformProperties), implizit fixe Tiefe = 2. Parser-Dispatch hat Sonderfall für `accent.bg: $primary` (Slice-24-Chain), aber kein Sonderfall für `b: $c` (Slice-25-Chain). Frontends (DOM/React) implementieren Property-Sets unabhängig — React tut es nicht.    |
| 2   | Codequalität            | **mittel** — `propset` als magische Property-Name, `value-resolver` skippt sie kommentiert. Content-Fallback in `property-set-expander.ts:48-52` ist eine Heuristik („`Text $name` Bare-Ref") die jetzt jeden Layout-Container betrifft. Self-Ref-Cycle-Detection unvollständig (Probe 10).                                         |
| 3   | Testqualität            | **schwach an einer Stelle** — `tests/compiler/tokens-coverage.test.ts:168-218` PS1, PS3, PS4, PS6, PS7, PS8 (PS2/PS5 fehlen). Fast nur „smoke"-Assertions; keine cross-backend, keine validator-konsistenz, keine deep-chain.                                                                                                       |
| 4   | Testabdeckung           | **schwach** — Mehrfach-Spread ungetestet (B-1 Bug deckt). Recursion-Depth ungetestet (B-10 Bug deckt). React-Backend ungetestet (B-11 Bug deckt). State-Body-mit-Set ungetestet (B-5). Name-Kollision ungetestet (B-6). Validator-Coverage = 0 für Property-Sets.                                                                   |
| 5   | Funktionale Korrektheit | **6 hard bugs (B-1, B-2, B-3, B-5, B-10, B-11) + 4 weichere (B-4, B-6, B-7, B-8) + 1 DX (B-9)**. Davon CRITICAL: B-3 (Parser drop), B-10 (depth-limit), B-11 (React-Parität). HIGH: B-1 (Validator false-pos), B-2 (Wrong-fallback), B-5 (State drop). MED: B-4, B-6, B-8. LOW: B-7, B-9.                                           |
| 6   | Studio-Roundtrip        | **untested** — Property-Panel-Verhalten bei `Frame $cardstyle`-Instanz nicht probt. Picker-Integration für Property-Sets vs. Single-Value-Tokens nicht probt. Risiko: Picker bietet nur Single-Value-Tokens an (Stand Slice-24-Audit), Property-Sets sind nicht klickbar. Out-of-scope für diesen Audit, aber als Q-3 dokumentiert. |

**Gesamt:** Slice 25 hat ein hartes funktionales Defizit. Die "Mehrfach-Spread"-
Syntax — explizit dokumentiert — emittiert eine Validator-Warnung. Tieferes Set-
Nesting verliert silent Properties. Der Frontend-Vertrag (DOM ≡ React) wird vom
React-Backend gebrochen. Mehrere Bugs schließen sich an einen einzigen Symptom-
Pfad an: das Heuristik-`content`-Fallback im IR-Expander.

## Touchpoint-Map

| Layer         | Datei                                                                | Rolle                                                                                               |
| ------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Parser        | `compiler/parser/parser.ts:262-277`                                  | Token-Reference-Branch (`accent.bg: $primary`) — verlangt `.` in left-side                          |
| Parser        | `compiler/parser/parser.ts:347-398`                                  | Property-Set-Branch — schließt single-ref-form explizit aus                                         |
| Parser        | `compiler/parser/ops/parse-decls.ts:138-203`                         | `parsePropertySet` — sammelt Properties bis NEWLINE                                                 |
| Parser        | `compiler/parser/body-parser.ts:571,1312`                            | Erzeugt `propset:`-Properties bei Use-Site                                                          |
| AST           | `compiler/parser/ast.ts:TokenDefinition`                             | Property-Set wird als TokenDefinition mit `properties` repräsentiert                                |
| Loader        | `compiler/loader/classify.ts:70 isPropertySet`                       | Predikat: `properties !== undefined && value === undefined`                                         |
| IR            | `compiler/ir/index.ts:142-148`                                       | `propertySetMap.set(token.name, token.properties)`                                                  |
| IR            | `compiler/ir/transformers/property-set-expander.ts`                  | **One-shot-Expander** — kein Recursion, mit Heuristik-Content-Fallback                              |
| IR            | `compiler/ir/ops/instance-ops.ts:295`                                | First-pass-Expansion über Instance-Properties                                                       |
| IR            | `compiler/ir/ops/properties-ops.ts:83`                               | Second-pass-Expansion in `transformProperties`                                                      |
| IR            | `compiler/ir/transformers/value-resolver.ts:282`                     | Skipt verbleibende `propset`-Properties („handled in transformProperties")                          |
| IR            | `compiler/positional-resolver.ts:419`                                | Single-Value-Token-Suffix-Mapping — schluckt `$set` wenn gleichnamiges Single-Value-Token existiert |
| Validator     | `compiler/validator/validation-config.ts:88-90`                      | `propset` in `KNOWN_NON_SCHEMA_PROPERTIES` (skip in unknown-prop check)                             |
| Validator     | `compiler/validator/validator.ts:1105-1124 checkDuplicateProperties` | **Skipt `propset` NICHT** → Mehrfach-Spread → W110                                                  |
| Validator     | `compiler/validator/validator.ts:879-921 checkUndefinedReferences`   | `$tokenname` checks `definedTokens`. Property-Set-Refs gehen anderen Weg (via `propset` property).  |
| Backend-DOM   | `compiler/backends/dom/style-emitter.ts`                             | Konsumiert IR-Output — Property-Set ist hier bereits expandiert                                     |
| Backend-React | `compiler/backends/react.ts`                                         | **Nutzt Property-Set-Map nicht**, emittiert `<div />` ohne Styles                                   |
| Studio        | `studio/pickers/token/types.ts parseTokens`                          | Picker-eigener Parser — listed Property-Sets vermutlich nicht (Q-3, ungeklärt)                      |
| Tests         | `tests/compiler/tokens-coverage.test.ts:168-218`                     | 6 PS-Tests; PS2/PS5 fehlen; nur smoke-asserts                                                       |
| Tests         | `tests/behavior/tokens.test.ts:78-89` TK2                            | 1 jsdom-Test                                                                                        |
| Tests         | `tests/fixtures/tokens/tk02-property-set/`                           | 1 fixture                                                                                           |
| Tests         | `tests/differential/tokens.test.ts`                                  | **Keine** Differential-Tests für Property-Sets                                                      |

---

# 2. Entscheidungen (Vorschläge, offen)

Alle Punkte sind Vorschläge — bitte zustimmen oder überschreiben bevor Umsetzung.

## V-1 — Recursive `expandPropertySets` mit Cycle-Detection

**Frage:** Tieferes Set-Nesting (3+ Level) verliert Properties (B-10).

**Vorschlag:** Expander wird **rekursiv** mit `visited: Set<string>` als
Argument. Am Eingang prüft er, ob der Set-Name bereits expandiert wird;
wenn ja, skipt er (ohne Content-Fallback). Sonst markiert er den Namen als
visited und expandiert die Set-Properties. Bei jeder rekursiv geleieteten
`propset`-Property in den Set-Properties ruft er sich erneut mit dem gleichen
visited-Set auf.

**Begründung:** Eindeutige Semantik („Property-Sets sind transitiv"),
Cycle-Termination, kein willkürliches Tiefen-Limit. Code wird einfacher
(nur ein Aufruf in `transformProperties`; instance-ops:295 entfällt).

**Ausnahme:** Component-Mixin-Pfad (`Input ..., InputField`) bleibt
einstufig wie heute — Components sind keine Property-Sets, das Mischen
ist eigene Semantik.

**Risiko:** Existing 2-level cases müssen weiter funktionieren. Tests
PS3/4/7 + Probe 8 bleiben grün.

**Status:** offen.

## V-2 — Parser: `name: $other` (single-ref, ohne Suffix) als Property-Set

**Frage:** `b: $c` (Probe 9, 21, 3-level) wird vom Parser stillschweigend
verworfen (B-3).

**Optionen:**

- **A:** Property-Set-Branch erweitern — wenn `afterColonIsRef && NEWLINE` und
  **left-side hat keinen `.`**, parse als Property-Set mit einer einzigen
  `propset`-Property.
- **B:** Parser-Error („`name: $other` ist kein gültiger Top-Level — bitte
  einen Suffix in `name` ergänzen oder eine Property hinzufügen.")
- **C:** Status quo (silent drop)

**Vorschlag:** **A**. Single-Value-Token-Chain (`accent.bg: $primary`) bleibt
unverändert (left-side mit `.`). Property-Set-Chain (`b: $c`) wird symmetrisch
unterstützt — folgt dem DSL-Versprechen „Property-Sets können andere Property-
Sets referenzieren". Mit V-1 (rekursiv) funktioniert das automatisch.

**Begründung:** Die heutige Disambiguation („single ref + NEWLINE = nicht
Set") wurde für Single-Value-Tokens eingeführt; sie ist symmetrisch falsch
für Property-Sets ohne Suffix.

**Risiko:** Code-Modifier könnte heute auf der vermeintlichen "Drop-Semantik"
basieren — extrem unwahrscheinlich, aber `npm run validate examples/**` und
Test-Lauf verifizieren.

**Status:** offen.

## V-3 — Validator: `propset` in Duplicate-Check skippen

**Frage:** `Frame $a, $b` (Mehrfach-Spread) → W110 false-positive (B-1).

**Vorschlag:** `checkDuplicateProperties` (validator.ts:1105) skipt
parser-internal `propset`-Properties.

**Begründung:** Bug. `propset` ist in `KNOWN_NON_SCHEMA_PROPERTIES` für
`validateProperty` schon ausgenommen — die Duplicate-Check-Liste vergaß diese
Ausnahme. Trivialer Fix.

**Status:** offen.

## V-4 — Validator: Undefined Property-Set Reference

**Frage:** `Frame $undefined` → silent text-content-Fallback ohne Validator-
Warn (B-8). Slice 24 löst das für Single-Value-Tokens via W500.

**Vorschlag:** Validator extrahiert aus `propset`-Properties den
Token-Namen und prüft gegen `definedTokens`-Set. Wenn nicht definiert →
**W500** „Token "$name" is not defined" (gleicher Code, gleiche Message wie
Single-Value-Tokens; aus Designer-Sicht ist „Token" der gemeinsame Begriff).

**Begründung:** Symmetrie zu Slice 24 V-3 (Compiler skipt → Validator deckt
DX). Ein Code-Pfad, kein neues Errorcode-Inventar.

**Risiko:** False-positive bei Component-Mixin-Syntax (`Input …, Field`) —
aber das ist `propset:Field` mit kapitalem Anfang (PascalCase), und der
Mixin-Pfad behandelt das vor dem Token-Lookup. Also kein Konflikt.

**Status:** offen.

## V-5 — Layout-Primitives: kein content-Fallback bei unresolved propset

**Frage:** Unresolvable Property-Set-Refs werden zu `content` umgeschrieben —
auch auf Frame/Btn/Section/etc. (B-2). Layout-Container bekommen
`node.innerHTML = formatInlineMarkdown(...)`.

**Optionen:**

- **A:** `expandPropertySets` skipt unresolvable Refs komplett — kein content,
  kein Fallback. DX-Quelle ist V-4 (Validator-W500).
- **B:** Fallback nur auf content-bearing Primitives (Text/Button/Label/Link/
  H1-H6) — Layout-Container droppen.
- **C:** Status quo

**Vorschlag (revidiert nach Test-Lauf):** **B**. Initial-Vorschlag war A
(kompletter Drop). Bei der Umsetzung zeigte die Test-Suite mehrere
load-bearing Verwendungen von `Text $name` / `Button $label` —
dokumentiert als Bug-#22-Fix in `behavior/variables.test.ts`,
`integration/two-way-binding-integration.test.ts`,
`behavior/positional-args.test.ts`. Der Heuristik-Pfad ist also kein
Workaround, sondern die laufende API für Variable-zu-Content-
Substitution.

**Begründung:** Option B respektiert die laufende Bare-Form
`Text $name` ohne den falschen `innerHTML`-Pfad auf Layout-
Containern. Die Liste „content-bearing primitives" ist klein
(Text/Button/Label/Link/H1–H6) und schemaseitig stabil (DSL-Schema
deklariert Tags und Content-Slots).

**Risiko:** Wenn neue content-bearing Primitives ins DSL kommen
(`Heading`?), muss `CONTENT_BEARING_PRIMITIVES` mitgepflegt werden.
Mitigation: einzige Liste, an einer Stelle.

**Status:** erledigt — Phase B.2 (`62dab545`).

## V-6 — React-Backend Property-Set-Parität — erledigt (Follow-up)

**Frage:** React emittiert `<div />` ohne Set-Expansion (B-11).

**Vorschlag (revidiert):** React-Backend baut eigene `propertySetMap` aus
`program.tokens` und ruft den geteilten IR-Helper `expandPropertySets` vor
dem Property-Merge in `generateJSX` auf — Single Source of Truth für die
Expansions-Semantik, kein dupliziertes Logic.

**Begründung:** Statt auf einen separaten Cross-Backend-Slice zu warten
direkt unter Slice 25 erledigt — der Helper ist bereits als pure Function
extrahiert (Phase B), keine grosse React-Architektur nötig. Property-Set-
Surface ist jetzt DOM ≡ React für: basic, multi-spread, deep chains,
cycles, Component-side spreads.

**Status:** erledigt — `6f2b6138` (RT-13 + RT-14).

## V-7 — State-Body Property-Set-Refs — erledigt (Follow-up)

**Frage:** `hover:` mit `$set`-Body wird verloren (B-5).

**Vorschlag (revidiert):** Direkt unter Slice 25 erledigt, nicht in den
States-Slices. Zwei Pfade nötig:

1. Parser: state-body-Loops (instance + component) hatten `$`-prefix
   in den child-override-Pfad geroutet (`'$'.toUpperCase() === '$'`),
   wodurch `$hovered` als `state.childOverrides[].childName` landete.
   Neuer expliziter `$`-prefix-Branch in beiden Loops macht das zur
   `propset:`-Property auf `state.properties`.
2. IR: `transformStates` liess die `propset`-Marker durch — gefixt durch
   `expandStates`-Wrapper in `instance-ops.ts:419-425`, der die
   Properties durch `expandPropertySets` führt bevor der State-Styles-
   Transformer übernimmt.

**Begründung:** Der State-Compile-Pfad benötigt keine Re-Architektur,
nur die zwei Punkte oben. Beide Slice-25-spezifisch (V-1/V-2 Logic,
nicht State-Slice-Logic).

**Status:** erledigt — `53e3eacc` (RT-16).

## V-8 — Name-Kollision Single-Value vs. Property-Set — erledigt (Follow-up)

**Frage:** `card.bg: ...` + `card: ...` → Property-Set silent shadowed (B-6).

**Vorschlag (revidiert):** Validator-Warn W505 TOKEN_NAME_COLLISION
fires, wenn ein Property-Set-Name = root eines suffixed Single-Value-
Tokens. Der positional-resolver gewinnt (kein Behavior-Change), aber
der Designer sieht den Konflikt.

**Begründung:** Behavior-Change wäre invasiv (positional-resolver vs.
expandPropertySets-Order). Diagnostic-only Pfad respektiert
Stabilität bestehender Mirror-Files und gibt klares Signal.

**Status:** erledigt — `5974fdeb` (RT-15).

## V-9 — Re-Definition + Empty-Set + Self-Ref-Edge — verworfen

**Frage:** Probes 10, 12, 14.

**Vorschlag:** Verworfen.

- B-9 (Re-Def): Last-wins ist konsistent mit Single-Value-Token-Re-Def. Doku
  per Tutorial reicht.
- B-7 (Empty-Set): Mit V-2 wird `empty:\nFrame $empty` zwar einen leeren
  Property-Set definieren, aber V-4 deckt einen verbleibenden Fall (token-
  ref `$empty` zu nicht-definiert) — sofern V-2 `empty:` weiterhin ignoriert.
  Das Risiko ist minimal; doc-only.
- B-4 (Self-Ref-Doppel-Emit): Mit V-1 (rekursiv mit visited) wird `a: $a, bg #f00`
  korrekt expandiert (visited-guard schluckt die Self-Ref); das Doppel-Emit
  verschwindet. Kein expliziter Fix nötig.

**Status:** verworfen (ggf. von V-1 mit-erschlagen).

---

# 3. Offene Fragen

| #   | Frage                                                                                                                                                    | Wer entscheidet/untersucht                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Q-1 | Wieviele Mirror-Files in `examples/`/`studio/demo`/`tests/fixtures/` nutzen `Text $variable` als Bare-Form? Migrationsaufwand für V-5.                   | Untersuchung — grep + `mirror-validate`           |
| Q-2 | Verändert V-1 (rekursiv) die Performance der Compile-Phase merklich? Worst case 1000-Set-Tiefe — wir cap'en bei `visited.size` automatisch terminierend. | Bench (optional)                                  |
| Q-3 | Listet der Studio-Token-Picker Property-Sets? Wenn nein, wie macht ein Designer Property-Set-Verwendungen sichtbar? Out-of-scope; Probe nötig.           | Studio-Probe (separater Slice)                    |
| Q-4 | Soll `name: $other` (single-ref, kein Suffix) eine eigene AST-Form werden oder als Property-Set mit einer `propset`-Property repräsentiert werden?       | Architektur-Entscheidung — Vorschlag: 2. Variante |

---

# 4. Umsetzungsplan & Status

Zwei Phasen + Cleanup. Phase A (Parser/Validator) ohne IR-Risiko; Phase B
(IR) mit Test-Lock. Sub-Tasks fein-granular, jede Phase einzelner Commit.

## Phase A — Parser & Validator

| ID  | Sub-Task                                                                                                                        | Aus | Aufwand | Status                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --- | ------- | -------------------------------------------------------------- |
| A.1 | Parser: `name: $other` (left ohne `.`, single-ref + NEWLINE) parst als Property-Set mit `[propset:other]` als einziger Property | V-2 | M       | erledigt (`f2af176c`)                                          |
| A.2 | Validator `checkDuplicateProperties`: skipt `propset`                                                                           | V-3 | S       | erledigt (durch parallelen Slice-21-Commit `10208bd6` gepickt) |
| A.3 | Validator: `propset`-Property → Token-Lookup → wenn unresolved, W500-Warn                                                       | V-4 | S       | erledigt (`f2af176c`)                                          |

## Phase B — IR

| ID  | Sub-Task                                                                                                                                               | Aus | Aufwand | Status                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ------- | -------------------------------------------------------------------------- |
| B.1 | `expandPropertySets`: rekursiv mit `visited: Set<string>`-Argument; Cycle-skip statt Content-Fallback                                                  | V-1 | M       | erledigt (`62dab545`)                                                      |
| B.2 | `expandPropertySets`: unresolved propset → content-fallback nur auf content-bearing Primitives (Text/Button/Label/Link/H1-H6); Frame/Section/… droppen | V-5 | S       | erledigt (`62dab545`) — V-5 Option B (statt A)                             |
| B.3 | Cleanup `instance-ops.ts:295`: ein einziger `expandPropertySets`-Aufruf reicht (in `transformProperties`)                                              | V-1 | S       | verworfen — beide Aufrufe nötig (pre-merge + post-merge), jetzt full-depth |

## Phase C — Tests + Cleanup

| ID  | Sub-Task                                                                                       | Aus | Aufwand | Status                                               |
| --- | ---------------------------------------------------------------------------------------------- | --- | ------- | ---------------------------------------------------- |
| C.1 | Regression-Suite `tests/compiler/slice-25-property-set-tokens.test.ts` (RT-1..RT-12)           | A/B | M       | erledigt — 15 Tests grün                             |
| C.2 | Q-1 — `npm test`-Lauf identifiziert betroffene `Text $variable`-Stellen; Migration falls nötig | V-5 | S       | erledigt — keine Migration nötig (V-5 → Option B)    |
| C.3 | Tutorial-Update: deep-chain explizit erlaubt; `Text $variable` Bare-Form raus                  | V-5 | S       | verworfen — Bare-Form bleibt erhalten (V-5 Option B) |

**Commits:**

- `3d34536a` — `docs(refactoring): audit Slice 25 (Property-Set-Tokens)`
- `f2af176c` — `fix(parser/validator): Slice 25 Phase A — property-set chain + undefined-ref warn`
- `62dab545` — `fix(ir): Slice 25 Phase B — recursive property-set expansion + content-fallback gate`

Status-Werte: `offen` · `in-arbeit` · `review` · `erledigt` · `verworfen` · `verschoben`.
Aufwand: `S` (≤30min) · `M` (≤2h) · `L` (≤1d).

---

# 5. Tests

## Baseline (vor Refactor — alle grün, müssen grün bleiben)

| Suite                                                               | Tests Property-Set-relevant                |
| ------------------------------------------------------------------- | ------------------------------------------ |
| `tests/compiler/tokens-coverage.test.ts` PS-Block                   | 6 (PS1, PS3, PS4, PS6, PS7, PS8)           |
| `tests/behavior/tokens.test.ts` TK2                                 | 1                                          |
| `tests/fixtures/tokens/tk02-property-set/`                          | 1                                          |
| `tests/compiler/parser-data-objects.test.ts` (property-set Parsing) | 4 (overlap mit data-object disambiguation) |
| `tests/compiler/inheritance-coverage.test.ts`                       | 2 (Component-Mixin)                        |
| **Gesamt Baseline**                                                 | **~14**                                    |

## Neue Regression-Tests (RT)

| ID    | Test                                                                                                                  | Layer            | Aus      | Status |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ---------------- | -------- | ------ |
| RT-1  | `Frame $a, $b` (Mehrfach-Spread): Validator clean, beide Sets expandiert                                              | validator+ir     | V-3      | offen  |
| RT-2  | 3-Level-Chain `c: pad 8\nb: $c\na: $b\nFrame $a` → Frame hat `pad 8`                                                  | parser+ir        | V-1, V-2 | offen  |
| RT-3  | 5-Level-Chain → terminiert + alle Properties durchgereicht                                                            | ir               | V-1      | offen  |
| RT-4  | 2-Cycle `a:$b; b:$a` → terminiert, kein content-Fallback, kein Crash                                                  | ir               | V-1      | offen  |
| RT-5  | 3-Cycle `a→b→c→a` → terminiert, kein content-Fallback                                                                 | ir               | V-1      | offen  |
| RT-6  | Self-Ref `a: $a, bg #f00` → genau **ein** `'background': '#f00'` im Output                                            | ir               | V-1      | offen  |
| RT-7  | Undefined Ref `Frame $undefined` → Validator W500, kein content-Rewrite                                               | validator+ir     | V-4, V-5 | offen  |
| RT-8  | Empty-Set `empty:\nFrame $empty` → kein content-Rewrite, V-4 W500 (`empty` zwar parsed, aber wenn nicht parsed: W500) | parser+validator | V-4      | offen  |
| RT-9  | Override AFTER `Frame $cardstyle, bg #f00` → `bg #f00` wins (existierendes Verhalten lock'n)                          | ir               | -        | offen  |
| RT-10 | Override BEFORE `Frame bg #f00, $cardstyle` → `bg #1a1a1a` wins (existierendes Verhalten lock'n; Doc-Hinweis)         | ir               | -        | offen  |
| RT-11 | `Text $name` (bare) — V-5 zieht: kein innerHTML-Set, Validator W500 (oder migrationspfad gewählt)                     | ir+validator     | V-5      | offen  |
| RT-12 | Component-Mixin `Input placeholder "x", Field` (mit `Field: w full`) bleibt grün — abgrenzung zu propset              | ir               | V-1      | offen  |

## Test-Status

| Phase                       | Tests            | Status |
| --------------------------- | ---------------- | ------ |
| Baseline                    | ~14              | grün   |
| Neu zu schreiben            | 12 (RT-1..RT-12) | offen  |
| Nach Refactor erwartet grün | ~14 + 12         | —      |

---

# 6. Anhang

## Probe #4 (Bug B-1) — Multi-Spread Validator-False-Positive

```mirror
a: pad 16
b: rad 8
Frame $a, $b
```

**AST:**

```json
{
  "type": "Instance",
  "component": "Frame",
  "properties": [
    {
      "type": "Property",
      "name": "propset",
      "values": [{ "kind": "token", "name": "a" }],
      "line": 3,
      "column": 9
    },
    {
      "type": "Property",
      "name": "propset",
      "values": [{ "kind": "token", "name": "b" }],
      "line": 3,
      "column": 13
    }
  ]
}
```

**DOM:** korrekt (`'padding': '16px', 'border-radius': '8px'`).

**Validator:** ⚠️ `W110 Duplicate property "propset" - previous definition on line 3`.

**Cause:** `validator.ts:1105 checkDuplicateProperties` skipt `propset` nicht.

## Probe #9 + #21 (Bug B-2 + B-3) — 2/3-Cycle führt zu Text-Content auf Frame

```mirror
a: $b
b: $a
Frame $a
```

**AST:**

- TOKENS: leer (kein Token wird erzeugt — Parser droppt `a: $b` und `b: $a`)
- INSTANCES: `Frame` mit einer `propset:a`-Property

**DOM:**

```js
node_1.innerHTML = formatInlineMarkdown($get("a"))
node_1._textTemplate = () => $get("a")
_runtime.bindText(node_1, "a")
Object.assign(node_1.style, { display: 'flex', flex-direction: 'column', ... })
```

**Cause B-3:** Parser-Branches in `parser.ts:262-277` (Token-Reference) und
`parser.ts:347-398` (Property-Set) decken `name: $other` (left ohne `.`) nicht
ab. Line wird nicht zu Token konvertiert.

**Cause B-2:** `expandPropertySets` (property-set-expander.ts:48-52) rewritet
unresolvable propset → `content`-Property — auch auf Frame.

## Probe #10 (Bug B-4) — Self-Ref Doppel-Emit

```mirror
a: $a, bg #f00
Frame $a
```

**DOM-Output (relevant):**

```js
Object.assign(node_1.style, {
  ...,
  'background': '#f00',
  'background': '#f00',  // ← Doppel-Emit
})
```

**Cause:** Beide Expansion-Pässe (instance-ops:295 + properties-ops:83)
hängen die `bg #f00`-Property an, ohne Dedup. `Object.assign` macht's
silent durch (last-wins), aber das Output-JS ist redundant.

## Probe #14 (Bug B-7 + B-2) — Empty-Set

```mirror
empty:
Frame $empty
```

**AST:** TOKENS: leer. Frame hat `propset:empty`.

**DOM:** `node_1.innerHTML = formatInlineMarkdown($get("empty"))` (Frame bekommt Text-Content!).

**Cause:** `parser.ts:347-398` Property-Set-Branch verlangt
`afterColon && (isValidProperty(afterColon) || afterColonIsRef)` — bei NEWLINE
direkt nach `:` schlägt das fehl. Token wird nicht erzeugt. Im IR fällt der
Expander zurück auf content-Rewrite.

## Probe #16 (Bug B-2 + B-8) — Undef-Ref auf Frame

```mirror
Frame $undefined
```

**DOM:** `node_1.innerHTML = formatInlineMarkdown($get("undefined"))`.

**Validator:** ⚠️ keine Warnung.

**Cause:** Validator's `checkUndefinedReferences` checkt nur `usedComponents`
mit `$`-Prefix. `propset`-Properties gehen einen anderen Pfad und werden nicht
geprüft.

## Probe #18 (Bug B-5) — State-Body-Set verloren

```mirror
hovered: bg #f00
Btn: bg #333
Btn "Click"
  hover:
    $hovered
```

**DOM:** Btn-Element hat `bg #333`. Kein hover-Style-Hookup für `$hovered`.

**Cause:** State-Body-Compile-Pfad ruft `expandPropertySets` nicht auf
State-Body-Properties auf (siehe `state-styles-transformer.ts`).

## Probe #19 (Bug B-11) — React-Backend ignoriert Property-Sets

```mirror
cardstyle: bg #1a1a1a, pad 16, rad 8
Frame $cardstyle
```

**React-Output:**

```tsx
const tokens = { cardstyle: undefined }
export default function App() {
  return <div />
}
```

**Cause:** `compiler/backends/react.ts` baut `tokens`-Map nur aus single-
value-Tokens. Property-Sets werden mit `undefined` registriert. Die
Instanz-Properties werden nicht durch Set-Expansion geleitet.

## Probe #20 (Bug B-6) — Name-Kollision

```mirror
card.bg: #111
card: pad 16, rad 8
Frame $card
```

**AST:** Frame hat `[Property bg = $card]` (kein propset!) — der **positional
resolver** in `compiler/positional-resolver.ts:419` findet `card.bg` und mappt
`$card` → `bg $card`. Property-Set `card` wird komplett übersprungen.

**DOM:** `'background': 'var(--card)'`. Kein padding, kein radius.

**Cause:** Positional-Resolver-Suffix-Mapping passiert vor dem IR-
Property-Set-Expander; mit Single-Value-Suffixes anwesend, schluckt der
Suffix-Mapper das Set.

## 3-Level-Chain (Bug B-10) — Expansion-Depth = 2

```mirror
d: pad 8
c: $d, gap 4
b: $c, bg #f00
a: $b, rad 8
Frame $a
```

**Expected:** `padding: 8px, gap: 4px, background: #f00, border-radius: 8px`.

**Actual:** `background: #f00, border-radius: 8px` (d und c verloren).

**Cause:** Expansion läuft genau 2× (instance-ops:295 + properties-ops:83 in
transformProperties). Ab 3-Level-Nesting verlieren tiefere Sets ihre
Properties — der verbleibende `propset`-Property wird vom value-resolver
silent geskipt.
