# Thema 5: Komponenten & Vererbung

**Status:** Abgeschlossen (2026-04-25).

**Ergebnis:** 1 echter Parser-Bug entdeckt (asymmetrisches Komma-Handling in
Component-Body), als known limitation dokumentiert. ~55 neue Tests in 11 Bereichen.

**Was gefunden wurde:**

- **Cycle-Detection** funktioniert (alle 5 Cycle-Formen terminieren ohne Crash)
- **Properties-Inheritance** funktioniert über alle Aliase
- **States-Inheritance** mergt Properties pro State-Name korrekt
- **Children-Concatenation** funktioniert in Parent→Child-Reihenfolge
- **Style-Mixins** (PascalCase) funktionieren
- **Property-Sets** ($lowercase) funktionieren mit „letzter gewinnt"
- **5–10 Level Inheritance-Chains** funktionieren ohne Stack-Overflow
- **Forward-References** funktionieren
- **Naming-Conflicts** (zwei Komponenten gleichen Namens) crashen nicht

**Was nicht abgedeckt ist:**

- **Komma-Actions in Component-Body**: `Base as Btn: onclick toggle(), toast()`
  parst toast als Child statt als zweites Event. Workaround: separate Zeilen.
  Parser-Fix in eigener Iteration.
- **Slot-Inheritance** (Zag-spezifisch) — gehört zu Thema 12
- **State-Trigger-Override** in Inheritance (Parent toggle, Child onclick)
- **Animation-Inheritance**

Details: `tests/compiler/docs/changelog.md` Eintrag „2026-04-25 (Komponenten & Vererbung – Thema 5)".

## 1. Scope

**Im Scope:**

- Component-Definition: `Btn:` (default Frame), `Btn as Button:`, `Btn extends Button:`
- Inheritance via `as` (Component-Name als „primitive") oder `extends` (explicit)
- Inheritance-Resolution in `compiler/ir/transformers/component-resolver.ts` (162 Z.):
  - **Cycle-Detection** via `visited`-Set
  - Properties: `mergeProperties(parent, child)` — child overrides
  - States: `mergeStates(parent, child)` — per state-name; Properties merge, ChildOverrides concatenate
  - Events: simple `[...parent, ...child]` concat (KEIN dedup!)
  - Children: simple `[...parent, ...child]` concat
  - Slots (Zag): child overrides parent per slot-name; properties merge
- Component vs Primitive: `Btn as Frame` → Frame primitive, `Btn as Card` (where Card is component) → inheritance via primitive-name
- Style-Mixin: PascalCase Component-Name als Property (`Frame Base, pad 8`) — composiert Properties
- Property-Set: lowercase `cardstyle: pad 16, bg #f00; Frame $cardstyle`
- Named Instances: `Btn named saveBtn`
- Component-Body mit Default Properties + State + Events + Children
- Inheritance-Chain (transitiv)
- Forward Reference: Component-Use vor Definition

**Nicht im Scope:**

- Layout-Properties in Inheritance (Thema 4, abgeschlossen — getestet)
- State-Machine-Generation (Thema 7)
- Slot-Detail-Tests (Thema 11)
- Zag-Component-Inheritance (Thema 12)

## 2. Ist-Aufnahme

| Datei                                   | Tests | Bereich                                                                                    |
| --------------------------------------- | ----- | ------------------------------------------------------------------------------------------ |
| `parser-components.test.ts`             | 24    | Component-Definitions mit `as` (frame/text/button/etc.), inline+block properties, position |
| `parser-instances.test.ts`              | 24    | Basic + Named Instances, Nested, Position                                                  |
| `parser-inheritance.test.ts`            | 16    | `extends`-Syntax, Multiple Variants, Chain, Edge-Cases (hyphenated parent)                 |
| `parser-inheritance-model.test.ts`      | 10    | 4-Ebenen Vererbungsketten, Property-Override, Children-Merging, States/Events vererben     |
| `ir-component-merging.test.ts`          | 9     | Component-Resolution, Property-Merge, State-Merge                                          |
| `ir-child-overrides-ir.test.ts`         | 8     | Child-Property-Overrides in Instance                                                       |
| `regression-inheritance-layout.test.ts` | 18    | Regression-Tests für gefundene Inheritance-Bugs (Layout-spezifisch)                        |

**Summe:** ca. **109 bestehende Tests**.

**Bereits gut abgedeckt:**

- Basis-Inheritance (`extends` und `as` getrennt)
- 4-Level-Chains (in `parser-inheritance-model`)
- Property-Override via mergeProperties
- States-Merge (Parent hover + Child hover → properties merged)
- Layout-Property-Override durch Inheritance (mein Iteration-2-Fix)

**Auffällige Lücken:**

- **Cycle-Detection wird nicht direkt getestet** (Code hat es, aber kein Test prüft das Warning)
- **Multi-Level-Diamond** ist N/A (Mirror = Single-Inheritance), aber `as` vs `extends` Mix?
- **Events-Concat ohne Dedup** — wenn parent onclick toggle() und child onclick show(X) hat, gibt's ZWEI onclick? Tests fehlen
- **Children-Concat-Reihenfolge** — Parent-Children kommen vor Child-Children?
- **Slots-Merge** für Zag wird hier vermutlich nicht getestet
- **Component-as-Mixin** (PascalCase property) — getestet?
- **Property-Set-Mixin** in Inheritance-Kette
- **Forward Reference** (Instance vor Definition)
- **Naming-Conflicts** — zwei Komponenten gleichen Namens
- **5+ Level Chains**
- **Self-Inheritance** Edge Cases (verschiedene Formen)
- **Inheritance + Animation**
- **Inheritance + Token-Reference Properties**
- **Property-Override mit Token vs Hex** through inheritance

## 3. Provokations-Liste

### 3.1 Cycle-Detection (kritisch)

| #   | Input                              | Erwartet                       | Status    |
| --- | ---------------------------------- | ------------------------------ | --------- |
| C1  | `Btn as Btn:` (self via primitive) | Warning + keine Endlosschleife | **fehlt** |
| C2  | `Btn extends Btn:`                 | Warning                        | **fehlt** |
| C3  | `A as B; B as A` (2-cycle)         | Warning bei einem              | **fehlt** |
| C4  | `A as B; B as C; C as A` (3-cycle) | Warning                        | **fehlt** |
| C5  | 10-deep cycle                      | Warning + endet                | **fehlt** |
| C6  | `Btn extends NonExistent:`         | kein Crash, keine Inheritance  | **fehlt** |

### 3.2 Properties-Inheritance

| #   | Input                                                                    | Erwartet                                      | Status    |
| --- | ------------------------------------------------------------------------ | --------------------------------------------- | --------- |
| P1  | Parent `bg #f00`, Child `bg #0f0` → child wins                           | tested                                        | ✓         |
| P2  | Parent `bg #f00, pad 12`, Child `bg #0f0` → bg child, pad parent         | tested                                        | ✓         |
| P3  | 4-Level Chain: A→B→C→D, each adds one prop                               | All 4 props in D                              | tested    |
| P4  | 4-Level Chain mit Override an Level 3                                    | Level 3 wins                                  | tested    |
| P5  | Token Reference Override: A `bg $primary`, B as A `bg #f00`              | child hex wins                                | **fehlt** |
| P6  | Property-Set in Parent: A uses `$cardstyle`, B as A                      | child inherits property-set expansion?        | **fehlt** |
| P7  | Property mit Multi-Value: A `pad 8 16`, B as A `pad 4`                   | child single-value wins                       | **fehlt** |
| P8  | Hover-Property in Inheritance: A `hover-bg #f00`, B as A `hover-bg #0f0` | child wins                                    | **fehlt** |
| P9  | Same property different aliases: A `w 100`, B as A `width 200`           | child wins (mein Property-Fix sollte greifen) | **fehlt** |
| P10 | 5-deep override mit verschiedenen Aliasen                                | letzter wins                                  | **fehlt** |

### 3.3 States-Inheritance

| #   | Szenario                                                                                  | Erwartet                  | Status             |
| --- | ----------------------------------------------------------------------------------------- | ------------------------- | ------------------ |
| S1  | Parent hover: bg #f00, Child hover: col #fff → merged                                     | hover hat beide           | tested?            |
| S2  | Parent hover: bg #f00, Child hover: bg #0f0 → bg #0f0                                     | child wins                | tested             |
| S3  | Parent hover only, Child focus only → both states present                                 | beide                     | **fehlt** explizit |
| S4  | Parent hover, Child hover with childOverride → properties merge, overrides concat         | beide childOverrides drin | **fehlt**          |
| S5  | 3-Level state chain: A hover bg, B hover col, C hover fs → all merged                     | drei properties in hover  | **fehlt**          |
| S6  | State without name in parent (skipped)                                                    | nicht gemerged            | **fehlt** explizit |
| S7  | Same state name, different triggers (onclick vs onkeydown): A hover, B hover with trigger | trigger-aware?            | **fehlt**          |
| S8  | Cross-element state in inheritance                                                        | preserved                 | **fehlt**          |

### 3.4 Events-Inheritance (potentielle Bug-Quelle: kein Dedup)

| #   | Szenario                                                                              | Erwartet                               | Status    |
| --- | ------------------------------------------------------------------------------------- | -------------------------------------- | --------- |
| E1  | Parent onclick toggle(), Child onclick show(X) → 2 separate onclick?                  | fragwürdig — entweder dedup oder beide | **fehlt** |
| E2  | Parent onclick A, Child onkeydown B → beide events present                            | beide                                  | **fehlt** |
| E3  | Parent onclick A, Child onclick A (identical) → 2x dieselbe Action?                   | suboptimal                             | **fehlt** |
| E4  | Parent onclick mit 2 Actions, Child onclick mit 1 Action → 2 onclick-Events insgesamt | dokumentiert                           | **fehlt** |

### 3.5 Children-Concatenation (Reihenfolge)

| #   | Szenario                                                        | Erwartet                                                      | Status    |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------- | --------- |
| CH1 | Parent has [A, B], Child has [C, D] → final [A, B, C, D]        | parent first                                                  | tested    |
| CH2 | Parent has [Frame "1"], Child has [Frame "2"]                   | beide Frames als Geschwister                                  | tested    |
| CH3 | Parent has Slot, Child has Frame                                | beide kept                                                    | **fehlt** |
| CH4 | Parent has named instance "btn", Child has named instance "btn" | beide present (nicht dedupliziert über Namen?)                | **fehlt** |
| CH5 | 4-deep chain children stack                                     | A.children + B.children + C.children + D.children all present | **fehlt** |

### 3.6 Style-Mixin (PascalCase Property)

| #   | Szenario                                               | Erwartet                      | Status             |
| --- | ------------------------------------------------------ | ----------------------------- | ------------------ |
| M1  | Component `Base` mit pad/bg/rad; instance `Frame Base` | Properties expanded           | **fehlt** explizit |
| M2  | Multiple Mixins: `Frame Base, Theme`                   | both expanded                 | **fehlt**          |
| M3  | Mixin + own properties: `Frame Base, pad 24`           | mixin first, own override     | **fehlt**          |
| M4  | Mixin in component definition                          | properties available im child | **fehlt**          |
| M5  | Recursive Mixin (A uses B, B uses A)                   | cycle detection               | **fehlt**          |

### 3.7 Property-Set (lowercase)

| #   | Szenario                                                 | Erwartet                                                       | Status    |
| --- | -------------------------------------------------------- | -------------------------------------------------------------- | --------- |
| PS1 | `cardstyle: pad 16, bg #f00; Frame $cardstyle` → expand  | both props                                                     | tested?   |
| PS2 | `Frame $cardstyle, pad 8`                                | property-set expand, eigener pad wins (laut „letzter gewinnt") | **fehlt** |
| PS3 | `Frame pad 8, $cardstyle` → property-set wins (letzter)? | unklar                                                         | **fehlt** |
| PS4 | Property-Set in Inheritance: A uses `$cs`, B as A        | B inherits expansion                                           | **fehlt** |
| PS5 | Property-Set with Token Reference inside                 | nested resolution                                              | **fehlt** |

### 3.8 Forward Reference

| #   | Szenario                                       | Erwartet                | Status    |
| --- | ---------------------------------------------- | ----------------------- | --------- |
| F1  | Instance `Btn` vor Definition `Btn as Button:` | resolved?               | **fehlt** |
| F2  | Component A as B (B forward)                   | resolved im second pass | **fehlt** |

### 3.9 Naming-Conflicts

| #   | Szenario                                | Erwartet                         | Status    |
| --- | --------------------------------------- | -------------------------------- | --------- |
| N1  | Component `Btn` zweimal definiert       | last wins / first wins / Warning | **fehlt** |
| N2  | Component `Frame` (overrides primitive) | Verhalten?                       | **fehlt** |

### 3.10 Self-Inheritance Edge Cases

| #   | Szenario                                       | Erwartet                       | Status    |
| --- | ---------------------------------------------- | ------------------------------ | --------- |
| SI1 | `Btn as Btn:` mit body                         | cycle warning, resolved as own | **fehlt** |
| SI2 | `Btn extends Btn`                              | cycle warning                  | **fehlt** |
| SI3 | `Btn as Btn extends Btn` (illegal? syntactic?) | parse error oder cycle         | **fehlt** |

### 3.11 Empty Bodies

| #   | Szenario                        | Erwartet                    | Status             |
| --- | ------------------------------- | --------------------------- | ------------------ |
| EB1 | `Btn:` (default Frame, no body) | works als minimal Component | **fehlt** explicit |
| EB2 | `Btn as Button:` (no body)      | works                       | **fehlt**          |
| EB3 | `Btn extends Base:` (no body)   | inherits all from Base      | **fehlt**          |
| EB4 | Instance of empty component     | works without crash         | **fehlt**          |

### 3.12 Deep Chains

| #   | Szenario                            | Erwartet                   | Status    |
| --- | ----------------------------------- | -------------------------- | --------- |
| DC1 | 5-Level Chain A→B→C→D→E             | all properties accumulated | **fehlt** |
| DC2 | 10-Level Chain                      | works (no stack overflow)  | **fehlt** |
| DC3 | 5-Level mit Override an jedem Level | last override wins         | **fehlt** |

### 3.13 Mixed `as` and `extends`

| #   | Szenario                                                            | Erwartet                            | Status    |
| --- | ------------------------------------------------------------------- | ----------------------------------- | --------- |
| AE1 | A as Frame; B extends A                                             | B inherits A's frame primitive      | **fehlt** |
| AE2 | A extends Frame (Frame ist primitive, kein component)               | extends with primitive — Verhalten? | **fehlt** |
| AE3 | A as B, B extends C → A inherits via primitive of B which extends C | Chain durchläuft beide              | **fehlt** |

### 3.14 Inheritance + States/Events Cross-Cases

| #   | Szenario                                                                              | Erwartet                  | Status    |
| --- | ------------------------------------------------------------------------------------- | ------------------------- | --------- |
| X1  | Parent hover changes layout (`hover: ver`), child overrides default direction (`hor`) | child base + parent hover | **fehlt** |
| X2  | Parent has multi-state, child adds new state                                          | all states present        | **fehlt** |
| X3  | Parent toggle() trigger, child changes trigger to onclick                             | child trigger wins?       | **fehlt** |

### 3.15 Pathologische

| #   | Szenario                                         | Erwartet                    | Status    |
| --- | ------------------------------------------------ | --------------------------- | --------- |
| PA1 | 100 components in a chain                        | works (with cycle-detect)   | **fehlt** |
| PA2 | Component with 100 properties, child overrides 1 | 99 inherited + 1 overridden | **fehlt** |
| PA3 | Component named with Unicode (`Bütton`)          | works                       | **fehlt** |

## 4. Test-Plan

### 4.1 `tests/compiler/inheritance-bugs.test.ts` (~25 Bug-Tests)

Konzentrierte Bug-Hypothesen mit echten Erwartungen:

- C1–C6: Cycle-Detection für alle 4 Cycle-Formen
- E1, E3: Events-Dedup (vermutlicher Bug — kein Dedup)
- F1, F2: Forward Reference (kann brechen)
- N1, N2: Naming-Conflicts (Verhalten unklar)
- SI1, SI2: Self-Inheritance Edge-Cases
- M5: Recursive Mixin
- PA2: Großes Inheritance-Chain Stress

### 4.2 `tests/compiler/inheritance-coverage.test.ts` (~50 Coverage-Tests)

Systematische Coverage:

- **3.2 Properties (10)**: P5, P6, P7, P8, P9, P10 + Token-Hex-Overrides
- **3.3 States (8)**: S3, S4, S5, S6, S7, S8 + Multi-State-Chains
- **3.4 Events (4)**: E2, E4 + Event-in-Component vs Event-in-Instance
- **3.5 Children (5)**: CH3, CH4, CH5 + Mixed-Children-Types
- **3.6 Style-Mixin (4)**: M1, M2, M3, M4
- **3.7 Property-Set (5)**: PS1, PS2, PS3, PS4, PS5
- **3.11 Empty Bodies (4)**: EB1–EB4
- **3.12 Deep Chains (3)**: DC1–DC3
- **3.13 Mixed as/extends (3)**: AE1, AE2, AE3
- **3.14 Cross-Cases (3)**: X1, X2, X3
- **3.15 Pathologische (3)**: PA1, PA2, PA3

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme erfasst
- [x] Schritt 3: Provokations-Liste (~75 Hypothesen in 15 Bereichen)
- [x] Schritt 4: ~55 neue Tests, 1 Parser-Bug entdeckt + dokumentiert (Komma-Actions in Component-Body)
- [x] Schritt 5: Coverage-Audit dokumentiert (siehe „Was nicht abgedeckt ist")
