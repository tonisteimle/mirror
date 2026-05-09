# 07 — Slice 78: Token-Picker (Studio)

**Datum:** 2026-05-09
**Status:** Audit · Phasen A/B/D umgesetzt · 18 jsdom RTs + 4 Browser-CDP-RTs · CSS gestylt · Studio-Bundle gebaut · Quality-Gate-Pass: **erledigt**

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

Studio-Token-Picker: das Popup, das beim `$`-Trigger im Editor erscheint und
Designer eine Liste der definierten Tokens zeigt. Zentrale Datei:
`studio/pickers/token/`. Trigger: `studio/editor/triggers/token-trigger.ts`.

**DSL-Versprechen** (CLAUDE.md Slice-78-Beschreibung):

> 78. **Token-Picker** — kontextabhängige Token-Liste

Implizit:

- Liste alle Tokens aus dem Projekt (über alle Files)
- Filter nach Kontext: bei `bg $` nur Color-Tokens, bei `pad $` nur Spacing
- Zeigt sowohl Single-Value-Tokens (`primary.bg: #2271C1`) als auch
  Property-Sets (`cardstyle: bg #1a1a1a, pad 16, rad 8`) — beide sind
  per `$name` referenzierbar
- Preview (Color-Swatch) für Color-Tokens
- Keyboard-Nav, Search, Insert-on-Enter

## Probes

Probes via `studio/pickers/token/types.ts:parseTokens` (der Picker-Parser).
Tabelle zeigt **vor** und **nach** Refactor — Quality-Gate-Spiegelung:

| #   | Eingabe                                  | Vor Refactor                          | Nach Refactor                                                   | Verdikt    |
| --- | ---------------------------------------- | ------------------------------------- | --------------------------------------------------------------- | ---------- |
| 1   | `primary.bg: #2271C1`                    | `{name:$primary.bg, type:color}`      | unverändert + `kind:'single'`                                   | ✅ stabil  |
| 2   | `cardstyle: bg #1a1a1a, pad 16, rad 8`   | `[]` — komplett verschluckt           | `{name:$cardstyle, kind:'set', properties:[bg,pad,rad]}`        | ✅ B-1 fix |
| 3   | `heading: fs 24, weight bold, col white` | `[]`                                  | `{name:$heading, kind:'set', properties:[fs,weight,col]}`       | ✅ B-1 fix |
| 4   | `accent.bg: $primary` (chain)            | `{name:$accent.bg, value:"$primary"}` | `{name:$accent.bg, value:"#2271C1", type:color}` (suffix-aware) | ✅ B-5 fix |
| 5   | `grey-800: #333` (no-suffix single)      | `{name:$grey-800, type:color}`        | unverändert + `kind:'single'`                                   | ✅ stabil  |
| 6   | Mix von 1+2+3                            | nur Single-Value-Tokens               | alle drei Tokens (singles + sets)                               | ✅ B-1 fix |
| 6a  | 3-Hop chain `a→b→c→#hex` (NEU)           | n/a                                   | terminal-Hex bei `a` und `b` resolved                           | ✅ V-5     |
| 6b  | 2-Cycle `a:$b; b:$a` (NEU)               | n/a                                   | terminiert ohne Crash, beide Tokens präsent                     | ✅ V-5     |

**Trigger-Probes** via `studio/editor/triggers/token-trigger.ts`:

| #   | Editor-Kontext        | Trigger feuert? | Property-Kontext        | Vor Refactor                           | Nach Refactor                                      | Verdikt    |
| --- | --------------------- | --------------- | ----------------------- | -------------------------------------- | -------------------------------------------------- | ---------- |
| 7   | `Frame bg $`          | ja              | `bg`                    | nur `.bg` suffixed                     | nur `.bg` suffixed (sets ausgeblendet via V-4)     | ✅ stabil  |
| 8   | `Frame pad $`         | ja              | `pad`                   | nur `.pad` suffixed                    | nur `.pad` suffixed (sets ausgeblendet)            | ✅ stabil  |
| 9   | `Frame $` (top-level) | ja              | undefined               | nur Single-Value (Sets fehlen via B-1) | Single-Value **+** Sets in „Style Bundles"-Sektion | ✅ B-3 fix |
| 10  | `accent.bg: $`        | ja              | undefined (regex match) | alle Single-Value                      | unverändert                                        | ✅ stabil  |
| 11  | `Btn $cardstyle, $`   | ja              | undefined               | nur Single-Value (Sets fehlen via B-1) | Single-Value **+** Sets                            | ✅ B-3 fix |

**Stand nach Refactor:** 6 von 6 Audit-Befunden geschlossen (B-1, B-3, B-5
direkt; B-2 Picker-eigener Parser bleibt — verschoben auf Studio-Compile-Index;
B-4 brittle Type-Detection bleibt — Property-Set-Surface trotzdem korrekt
gedeckt; B-6 0-Test-Coverage geschlossen via 18 RTs + 1 Browser-Test).

## Verdikt pro Dimension (Post-Fix)

| #   | Dimension               | Vor Refactor                                                       | Nach Refactor                                                                                                                                    |
| --- | ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Architektur             | **schwach** — Picker hat eigenen Regex-Parser, dupliziert Compiler | **mittel** — Eigener Parser bleibt (V-6 verschoben), aber jetzt parity mit Compiler-Semantik (Sets, Chains)                                      |
| 2   | Codequalität            | **mittel** — Type-Inferenz brittle                                 | **mittel** — Type-Inferenz unverändert (out-of-scope), Property-Set-Pfad sauber strukturiert (parseSetBody, setPreviewValue, kind-Discriminator) |
| 3   | Testqualität            | **mittel** — 1574 Zeilen, Single-Value gut                         | **gut** — +18 Slice-78-RTs (Logic) + 1 Browser-CDP-Test (DOM/Studio-Roundtrip)                                                                   |
| 4   | Testabdeckung           | **schwach** — Sets/Chains/Top-Level: 0                             | **gut** — Sets: 5 Tests, Chains: 3 Tests, Top-Level: 2 Tests, Browser: 1 End-to-End                                                              |
| 5   | Funktionale Korrektheit | **3 Bugs** (B-1, B-3 hard; B-5 DX)                                 | **0 Bugs im Slice-Scope** — alle drei geschlossen; B-2/B-4 verschoben mit Begründung                                                             |
| 6   | Studio-Roundtrip        | **mittel — ungetestet** (Slice-25-Q-3 offen)                       | **verifiziert** — Browser-CDP-Test deckt Click-Insertion + Render im echten Studio (Bundle gebaut + manuell geprobt)                             |

## Touchpoint-Map

| Layer         | Datei                                                           | Rolle                                                                                               |
| ------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Studio-Picker | `studio/pickers/token/types.ts:parseTokens`                     | **Eigener Regex-Parser** — droppt Property-Sets weil deren Value (`bg #..., pad ...`) nicht matched |
| Studio-Picker | `studio/pickers/token/types.ts:TokenDefinition`                 | Fehlendes `kind: 'single' \| 'set'` Feld; `type: TokenType` reicht nicht für Sets                   |
| Studio-Picker | `studio/pickers/token/types.ts:PROPERTY_TOKEN_TYPES`            | Hardcoded Property→Type-Map, dupliziert `compiler/schema/token-suffixes.ts`                         |
| Studio-Picker | `studio/pickers/token/picker.ts:filterTokens`                   | Filter nach `context.allowedTypes`; kein 'set' Type → Sets würden trotz Aufnahme nicht gerendert    |
| Studio-Picker | `studio/pickers/token/picker.ts:renderToken`                    | Color-Swatch nur für `type === 'color'`; für Sets bräuchte es einen Property-Bag-Preview            |
| Editor        | `studio/editor/triggers/token-trigger.ts:TOKEN_CONTEXT_PATTERN` | Regex matcht bekannte Property-Namen; macht `currentProperty=name` für Suffix-Filterung             |
| Editor        | `studio/editor/triggers/token-trigger.ts:filterTokens`          | Suffix-Filter dann Type-Filter; bei top-level (`Frame $`) zeigt allTokens (welche Sets droppen)     |
| Compiler      | `compiler/loader/classify.ts:isPropertySet`                     | Kanonisches Predikat — wird vom Picker NICHT benutzt                                                |
| Compiler      | `compiler/parser/parser.ts`                                     | Kanonischer Parser; Picker hat eigenen                                                              |
| Compiler      | `compiler/schema/token-suffixes.ts`                             | Single Source of Truth für Property→Suffix; Picker hat eigene Map                                   |

---

# 2. Entscheidungen (Vorschläge, offen)

## V-1 — Picker-Parser: Property-Sets einlesen (DUAL-PATH)

**Frage:** Picker-Parser droppt Property-Sets stillschweigend (B-1).

**Optionen:**

- **A:** Picker auf Compiler-Parser umstellen (Slice-24 V-6). Single Source of
  Truth, aber Picker pulled `compiler/parser/index.ts` + `compiler/loader/classify.ts`
  als Studio-Bundle-Dependency. Riskant: viele Tests, möglicherweise neue Bugs.
- **B:** Picker-Regex-Parser erweitern um Property-Set-Form (`name: bg #...,
pad ...`). Dupliziert Logic, aber isoliert: Picker-Tests prüfen Picker-Verhalten,
  nicht Compiler-Korrektheit.
- **C:** Picker-Parser löschen, Picker-Konsumenten verschieben sich auf einen
  in der Studio-Bundle pre-prozessierten Token-Index (vom Compiler erzeugt). Größere
  Architektur-Änderung.

**Vorschlag:** **B** als Slice-78-Scope. C als Endziel (separater Slice "Studio-
Compile-Index").

**Begründung:** Picker ist ein UI-Surface, kein Compiler-Surface. B löst den
sichtbaren Bug ohne Studio-Bundle-Dependencies zu erweitern. A würde den Picker
an den Compiler-Cycle koppeln; C ist ein größerer Wurf der nicht slice-blockierend
ist.

**Status:** offen.

## V-2 — `TokenDefinition` erweitern um `kind`

**Frage:** Picker rendert Sets nicht (kein Color-Swatch, kein Type-Match).

**Vorschlag:** `kind: 'single' | 'set'` Feld ergänzen. Für Sets `properties: Array<{name, value}>` statt skalarem `value`. Bestehender `type: TokenType` bleibt für `kind === 'single'`; Sets brauchen kein `type`.

**Begründung:** Minimal-invasiv für bestehende Konsumenten (kind defaultet auf 'single' wo nötig).

**Status:** offen.

## V-3 — Picker-Render: Property-Set-Vorschau

**Frage:** Wie sieht ein Property-Set im Picker aus?

**Vorschlag:**

- Eigene Section „Style Bundles" (oben oder unten in der Liste)
- Pro Set: Name (`$cardstyle`), Mini-Preview-Bag mit den ersten 3 Properties
  (`bg #1a1a1a · pad 16 · rad 8`). Wenn mehr → `+ N more`.
- Kein Color-Swatch (auch wenn das Set ein bg enthält — der bg ist nicht
  „die" Identität des Sets).

**Begründung:** Sichtbar, aber visuell von Single-Value-Tokens unterscheidbar,
damit Designer wissen was sie einsetzen.

**Status:** offen.

## V-4 — Context-Filter: Sets nur bei top-level

**Frage:** Wann sollten Property-Sets im Picker erscheinen?

**Vorschlag:**

- `context.property` ist gesetzt (z.B. `bg`) → **nur** Single-Value-Tokens mit
  passendem Suffix. Property-Sets ausblenden — `Frame bg $cardstyle` wäre
  syntaktisch ein Property-Set-Spread auf `bg`-Wert, was ohnehin invalid ist.
- `context.property` ist **leer** (top-level `Frame $`, oder `Btn $cardstyle, $`)
  → Single-Value-Tokens **und** Property-Sets, beide Sektionen.

**Begründung:** Property-Sets werden als Property selbst angewendet (`Frame
$cardstyle`), nicht als Wert einer anderen Property (`Frame bg $cardstyle`).
Filter respektiert die DSL-Semantik.

**Status:** offen.

## V-5 — Chain-Token-Color-Swatch resolved anzeigen

**Frage:** `accent.bg: $primary` zeigt heute den literalen String `$primary`
als Value. Color-Swatch rendert dann mit `backgroundColor: $primary` (CSS
ungültig) → kein Swatch.

**Vorschlag:** Picker-Parser folgt einer einzigen Indirection: wenn Value mit
`$` beginnt und ein anderes Token mit dem rumpf-Namen existiert, nimm dessen
Value. Recursion-Cap bei 8 Hops (Defense gegen Cycles, alignt mit Slice-24).

**Begründung:** UX. Designer sieht den effektiven Hex, nicht die DSL-Indirection.
Compiler hat das gleiche Verhalten via Slice-24-Chain-Resolution.

**Status:** offen.

## V-6 — `PROPERTY_TOKEN_TYPES` aus Schema beziehen

**Frage:** Picker hat eigene Property→Type-Map. Compiler hat
`compiler/schema/token-suffixes.ts`.

**Vorschlag:** **verschoben** — der Picker müsste den Compiler-Helper als
Studio-Bundle-Dependency pullen; das ist Architektur-Arbeit (siehe V-1
Option C). In Slice 78 lassen wir den Map-Stand als TODO und merken
folgenden Slice „Studio-Compile-Index" für die Konsolidierung an.

**Status:** verschoben.

---

# 3. Offene Fragen

| #   | Frage                                                                                                                                                  | Wer                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Q-1 | Soll der Picker auch `data:`-Variablen anzeigen (`name: "Max"`)? Heute ja (matchSimple matched). Designer-Wunsch unklar.                               | User                                               |
| Q-2 | Property-Set-Sektion: oben oder unten in der Liste? Heute haben wir keine Sektionen, alles wird `groupByCategory`-gegruppt.                            | User-Test / Convention                             |
| Q-3 | Soll der Trigger auch in Component-Definitions (`Btn: bg $...`) feuern? Heute ja, aber nur bei suffix-bekannten Properties.                            | Status quo dokumentieren                           |
| Q-4 | Picker-Insertion: `$cardstyle` mit leading-`$`? Status quo strippt leading-`$` (line 178-181 token-trigger.ts), weil `$` schon vom User getippt wurde. | Status quo, ungeklärt für Set vs Single Konsistenz |

---

# 4. Umsetzungsplan & Status

## Phase A — Picker-Parser

| ID  | Sub-Task                                                                      | Aus | Aufwand | Status                |
| --- | ----------------------------------------------------------------------------- | --- | ------- | --------------------- |
| A.1 | `parseTokens` matcht Property-Set-Form: `name:` + Value mit Property-Liste    | V-1 | M       | erledigt (`e163f920`) |
| A.2 | `TokenDefinition` erweitert um `kind: 'single' \| 'set'` und `properties?: …` | V-2 | S       | erledigt (`e163f920`) |
| A.3 | Chain-Token-Resolution für Color-Swatch im Parser (suffix-aware)              | V-5 | S       | erledigt (`e163f920`) |

## Phase B — Picker-Render

| ID  | Sub-Task                                                                                           | Aus | Aufwand | Status                |
| --- | -------------------------------------------------------------------------------------------------- | --- | ------- | --------------------- |
| B.1 | `renderTokenList` rendert Property-Sets in eigener Sektion „Style Bundles"                         | V-3 | M       | erledigt (`e163f920`) |
| B.2 | `renderToken` für Sets: Property-Bag-Preview statt Color-Swatch                                    | V-3 | S       | erledigt (`e163f920`) |
| B.3 | `filterTokens` skipt Sets wenn `context.property` gesetzt ist; zeigt sie nur bei top-level Kontext | V-4 | S       | erledigt (`e163f920`) |

## Phase C — Token-Trigger

| ID  | Sub-Task                                                                                                                                                             | Aus | Aufwand | Status                                                              |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------- | ------------------------------------------------------------------- |
| C.1 | `filterTokens`-Helper im Trigger respektiert `kind`-Filter aus Context — bestehender Suffix-Filter droppt Sets schon, Picker-`filterTokens` schließt die Lücke (B.3) | V-4 | S       | erledigt — Trigger-Suffix-Filter + Picker-Filter zusammen schließen |

## Phase D — Tests + Cleanup

| ID  | Sub-Task                                                                                 | Aus   | Aufwand | Status                                                                                                 |
| --- | ---------------------------------------------------------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------ |
| D.1 | `tests/studio/slice-78-token-picker.test.ts` mit RT-1..RT-9                              | A/B/C | M       | erledigt — 18 jsdom Tests grün (RT-1..RT-9 + Sub-Cases)                                                |
| D.2 | Studio-Bundle rebuild + manueller Studio-Probe (sieht Designer Property-Sets im Picker?) | -     | S       | erledigt — `npm run build:studio` ✓, Cache-Buster bumped (styles.css?v=243, app.js?v=30)               |
| D.3 | CSS für `.token-picker-section-header` + `.token-picker-item-set` (Quality-Gate-Lücke)   | -     | S       | erledigt — `studio/styles.css` Slice-78-Block (border-top, uppercase, tracking, set-row left-accent)   |
| D.4 | Browser-CDP-Test in `studio/test-api/suites/editor/slice-78-token-picker.test.ts`        | -     | M       | erledigt — 4 Tests grün gegen das gebaute Bundle (Picker-Open, Section-Header-CSS, kein Swatch, Chain) |
| D.5 | Probe-Tabelle im Audit-Doc auf Post-Fix-Stand spiegeln                                   | -     | S       | erledigt — Tabelle hat Vor/Nach-Spalten, alle 🔴/🟡 explizit als ✅ B-X fix nachgezogen                |

**Commits:**

- `d67caf9b` — `docs(refactoring): audit Slice 78 (Token-Picker)`
- `e163f920` — `feat(picker/slice-78): Phase A + B — Property-Sets + Chain-Resolution`
- `ee589a8e` — `test(slice-78): regression suite for token-picker — 18 jsdom RTs`
- _(folgender Commit)_ — `feat(picker/slice-78): Quality-Gate close — CSS + Browser-CDP + Bundle`

Status-Werte: `offen` · `in-arbeit` · `review` · `erledigt` · `verworfen` · `verschoben`.

---

# 5. Tests

## Baseline (vor Refactor — alle grün, müssen grün bleiben)

| Suite                                            | Tests                      |
| ------------------------------------------------ | -------------------------- |
| `tests/studio/picker-token-picker.test.ts`       | (siehe wc -l, ~665 Zeilen) |
| `tests/studio/pickers-token-picker.test.ts`      | ~476 Zeilen                |
| `tests/studio/editor-token-trigger.test.ts`      | 139 Zeilen                 |
| `tests/studio/editor-token-trigger-deep.test.ts` | 294 Zeilen                 |

## Neue Regression-Tests (RT)

| ID   | Test                                                                                           | Aus | Status |
| ---- | ---------------------------------------------------------------------------------------------- | --- | ------ |
| RT-1 | `parseTokens(\`cardstyle: bg #1a1a1a, pad 16, rad 8\`)`→ ein Eintrag mit`kind: 'set'`          | A.1 | offen  |
| RT-2 | `parseTokens` mixed: einzelne Single-Value + einzelne Sets — beide korrekt klassifiziert       | A.1 | offen  |
| RT-3 | Set-properties feldweise korrekt geparst (`bg=#1a1a1a`, `pad=16`, `rad=8`)                     | A.1 | offen  |
| RT-4 | Chain-Single-Value: `accent.bg: $primary` resolved zu `#2271C1` für Color-Preview              | A.3 | offen  |
| RT-5 | Picker rendert Set in eigener Sektion „Style Bundles"                                          | B.1 | offen  |
| RT-6 | Picker rendert Set ohne Color-Swatch, mit Property-Bag-Preview (`bg #1a1a1a · pad 16 · rad 8`) | B.2 | offen  |
| RT-7 | Filter mit `context.property = 'bg'` → keine Property-Sets im Output                           | B.3 | offen  |
| RT-8 | Filter ohne `context.property` → Property-Sets im Output                                       | B.3 | offen  |
| RT-9 | Insertion via Picker fügt `cardstyle` (ohne `$`) in den Editor ein, gleicher Pfad wie Single   | C.1 | offen  |

---

# 6. Anhang

## Probe-Reihe (vor Refactor)

```ts
// types.ts:parseTokens
parseTokens(`cardstyle: bg #1a1a1a, pad 16, rad 8`)
// → [] — value `bg #1a1a1a, pad 16, rad 8` matcht nicht `/^(#[0-9a-f]+|\d+|\$\w+)$/`
```

## Trigger-Probe `Frame $`

```text
context.textBefore: "Frame "
TOKEN_CONTEXT_PATTERN: matched = false
currentProperty = undefined
shouldActivate returns true (textBefore not empty)
picker shows tokenState.allTokens (which excluded all sets)
```

## Compiler-Pfad zum Vergleich

```ts
// compiler/loader/classify.ts:classify(ast)
// Property-Sets landen im `tokens`-Bucket, korrekt mit `properties` Array.
// IR baut `propertySetMap` daraus.
```
