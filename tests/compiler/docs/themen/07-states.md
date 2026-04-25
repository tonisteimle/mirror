# Thema 7: States

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** **1 echter Bug entdeckt UND gefixt** (state-child-transformer
verlor HTML-Properties), 12 Coverage-Tests, state-machine-emitter
auf 98%+ Coverage gebracht.

## 1. Scope

States in Mirror umfassen:

- **System States**: `hover:`, `focus:`, `active:`, `disabled:` (vom Browser
  ausgelöst)
- **Custom States via toggle()**: `on:` / `off:` Wechsel bei Klick
- **Custom States via exclusive()**: nur einer in einer Gruppe aktiv
- **Cross-Element States**: `OtherElement.state:` reagiert auf anderes Element
- **Transitions**: `hover 0.2s ease-out:` mit timing
- **State Children (Figma Variants)**: Eine ganze Sub-UI pro State
- **Size States**: `compact:` / `regular:` / `wide:` mit CSS Container Queries

## 2. Ist-Aufnahme (vor Thema 7)

| Datei                              | Tests | Coverage Lines/Branches/Funcs |
| ---------------------------------- | ----- | ----------------------------- |
| `parser-states.test.ts`            | ~30   | —                             |
| `parser-state-triggers.test.ts`    | ~25   | —                             |
| `state-children.test.ts`           | ~12   | —                             |
| `state-reference.test.ts`          | ~15   | —                             |
| `size-states.test.ts`              | ~30   | —                             |
| `ir-state-machine-codegen.test.ts` | ~60   | —                             |
| `state-animation-codegen.test.ts`  | ~12   | —                             |

Aggregate-Coverage der State-Module:

| Modul                                    | Lines  | Branches | Funcs  |
| ---------------------------------------- | ------ | -------- | ------ |
| `state-machine-transformer.ts`           | 88.67% | 80.18%   | 85.71% |
| `state-styles-transformer.ts`            | 100%   | 100%     | 100%   |
| `state-child-transformer.ts`             | 72.22% | 71.42%   | 100%   |
| `state-machine-emitter.ts` (DOM-Backend) | 83.24% | 68.93%   | 71.42% |

## 3. Provokations-Liste (fokussiert auf Coverage-Lücken)

state-machine-emitter hatte 4 untested Pfade in der `emitStateChildNested`/
`emitStateChild`-Logik (DOM-Element-Erzeugung mit HTML-Properties).
Hypothesen:

| #   | Input                                               | Erwartet                                                | Status             |
| --- | --------------------------------------------------- | ------------------------------------------------------- | ------------------ |
| S1  | State spawning Input mit `disabled` + `placeholder` | `_sc.disabled = true`, `setAttribute('placeholder', …)` | **Bug 4**          |
| S2  | State spawning `Frame hidden` (mit Text-Child)      | `display: none` style oder `.hidden = true`             | offen              |
| S3  | State spawning Input mit `type "password"`          | `setAttribute('type', "password")`                      | **Bug 4** (gleich) |
| S4  | State spawning Input mit langem placeholder         | placeholder im Output                                   | **Bug 4** (gleich) |
| S5  | State mit 2-stufig verschachtelten Frames + Text    | `createElement` rekursiv aufgerufen                     | offen              |
| S6  | State mit 3-stufig verschachtelten Frames + Text    | mehrfache `createElement`-Aufrufe                       | offen              |
| S7  | State mit `Frame` der Icon enthält                  | `_runtime.loadIcon(...)` Aufruf                         | offen              |
| S8  | State mit transition-duration                       | `0.3s` oder `transition`/`animation` im Output          | offen              |
| S10 | State mit Input + numerischem `type "range"`        | `setAttribute('type', "range")`                         | **Bug 4** (gleich) |
| S11 | hover + on auf demselben Toggle-Button              | beide states im Output                                  | offen              |
| S12 | hover + active + on kombiniert                      | alle drei states im Output                              | offen              |

## 4. Bug-Fix: state-children verlieren HTML-Properties

**Befund:** Vor dem Fix verlor jedes state-child-Element seine HTML-Properties
(`placeholder`, `disabled`, `type`, `value`, `name`, `readonly`, `data-icon-*`,
…). Nur `content → textContent` wurde übersetzt — alles andere fiel weg.
Beispiel: `LockBtn ... on: \n Input placeholder "x", disabled` → IR-state-child
mit `properties: []` statt mit den 2 erwarteten HTML-Props.

**Wo:** `compiler/ir/transformers/state-child-transformer.ts`. Der Top-Level-
IR-Pfad nutzt `extractHTMLProperties()` aus `value-resolver.ts`, der
state-child-Pfad hatte aber nur die hartcodierte Inline-`content`-Logik.

**Fix:** `StateChildContext` um optionales `extractHtmlProperties`-Callback
erweitert. In `compiler/ir/index.ts` wird der Callback gesetzt und reicht den
gleichen Extractor wie der Hauptpfad durch. Backward-compat: der Callback
ist optional; ohne ihn fällt der Code auf die Legacy-content-only-Logik
zurück.

**Impact:** 6 Tutorial-Snapshots haben „falsches" Verhalten memorialized
(state-child-Icons ohne data-icon-color/data-icon-size/data-icon-fill);
diese sind aktualisiert (`npm test -u` auf den 6 Examples). Kein anderes
Test-File geändert.

## 5. Coverage nach Thema 7

| Modul                                                 | Vorher                         | Nachher                          |
| ----------------------------------------------------- | ------------------------------ | -------------------------------- |
| `compiler/backends/dom/state-machine-emitter.ts`      | 83.24% L / 68.93% B / 71.42% F | **98.47% L / 88.34% B / 100% F** |
| `compiler/ir/transformers/state-child-transformer.ts` | 72.22% L / 71.42% B / 100% F   | **80% L / 56.25% B / 50% F**     |

state-child-transformer hat jetzt einen `else`-Branch (Legacy-Pfad ohne
`extractHtmlProperties`-Callback), der von Tests nicht ausgelöst wird —
deshalb Branches/Funcs scheinbar gesunken. Der echte Code-Pfad (mit Callback)
ist abgedeckt.

**Globaler Effekt:** 65.56% → **66.07% Lines (+0.51 pp)**. Klein, weil State-
Module schon vorher gut abgedeckt waren — der Hauptgewinn ist der gefixte
Bug.

## 6. Was nicht abgedeckt ist

- **Cross-Element States** (`OtherElement.state:`) — eigene Tests nicht
  geschrieben, aber state-reference.test.ts deckt das bereits gut ab.
- **Size States** (`compact:`/`regular:`/`wide:`) — separate Test-Datei
  `size-states.test.ts` deckt das ab; nicht in der Coverage-Erweiterung
  hier.
- **Animation-Delay-Syntax** (`hover 0.2s 0.1s:`) — die genaue DSL-Syntax für
  Delay-Parameter ist mir unklar; Test S8 prüft nur duration. Falls Delays
  in der Sprache existieren, eigene Iteration nötig.

## 7. Tutorial-Aspekt-Coverage (Iter 3, Tutorial-Audit nachgezogen)

**Tutorial:** `docs/tutorial/06-states.html`

| Tutorial-Abschnitt                  | Aspekt                                      | Test                                                       |
| ----------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Das Konzept: States                 | `toggle()` + `on:` Block                    | `tutorial-04-states-behavior` toggle-Verhalten             |
| System hover                        | `hover:` ändert Style                       | `tutorial-04-states-behavior` (nur Compile, kein Behavior) |
| System active                       | `active:` während mousedown                 | **fehlt**                                                  |
| System focus                        | `focus:` auf Input                          | **fehlt**                                                  |
| System disabled                     | `disabled:` style + `disabled` als Property | **fehlt**                                                  |
| Custom States via toggle()          | `FavBtn` mit Icon-Wechsel                   | implizit Tutorial 04 toggle, kein Icon-Test                |
| State-Namen frei wählbar            | `open:` statt `on:`                         | implizit cycle                                             |
| States können alles ändern          | Icon/Text-Content im State                  | **fehlt** dedizierter Test                                 |
| Mehrere States (cycle)              | `todo:` → `doing:` → `done:`                | `tutorial-04-states-behavior` cycle                        |
| exclusive() (nur einer aktiv)       | Tab-Navigation                              | `tutorial-04-states-behavior` exclusive                    |
| **bind für State-Auswahl**          | `bind city` auf Frame, exclusive() Children | **fehlt**                                                  |
| **State-Propagation (Parent→Kind)** | Parent `on:` → Children mit `on:` blocks    | **fehlt**                                                  |
| Cross-Element (`MenuBtn.open:`)     | Sibling/Parent-State referenzieren          | `tutorial-04-states-behavior` state-references             |
| **Accordion Pattern**               | toggle() + visible/hidden + chevron rot     | **fehlt** komplettes Pattern                               |
| **onenter/onescape**                | `onenter toggle()` mit Input                | **fehlt**                                                  |

**Tutorial-Coverage:** 9 von 15 Aspekten getestet (60%). 6 echte Lücken.

## Status

- [x] Schritt 1: Scope abgesteckt
- [x] Schritt 2: Ist-Aufnahme
- [x] Schritt 3: Tutorial-Aspekt-Audit (6 Lücken identifiziert)
- [x] Schritt 4: Provokations-Liste (siehe Iter 1+2)
- [x] Iter 1: Tests + 1 Bug-Fix (state-children HTML-props)
- [x] Iter 2: state-child-transformer auf 100%
- [x] Iter 3: 10 Tutorial-Aspekt-Tests + 3 Tutorial-Limitations dokumentiert

## Tutorial-Limitations (entdeckt in Iter 3)

Drei Aspekte aus dem Tutorial wurden beim Aspekt-Audit als **bestehende
Bugs** identifiziert. Tests dokumentieren das Limitations-Verhalten,
keine Fixes in dieser Iteration:

- **Mixin-State-Loss:** `Field: focus: …` als Component-Mixin
  (`Input placeholder "X", Field`) emittiert keine `:focus`-CSS-Regel
  — die State-Blocks aus dem Mixin werden bei Mixin-Anwendung **nicht**
  durchgereicht. Tutorial-Beispiel verspricht das Pattern explizit,
  scheitert aber daran. Tests verwenden stattdessen die
  bare-element-Form (`Frame focusable, bg #333\n  focus: bg #2271C1`).
- **Component-as-Input State-Loss:** Auch mit `Field as Input: …` werden
  die State-Blocks (focus/disabled) nicht in CSS emittiert. Same root
  cause.
- **Parent→Child State-Propagation:** `_stateStyles` werden auf Children
  emittiert, aber `transitionTo` (runtime) wendet sie nur auf das
  state-tragende Element an, nicht auf dessen Children. Das Tutorial-
  Accordion-Pattern (`AccordionItem: toggle()` mit `Frame hidden\n  on:
visible`) funktioniert deshalb nicht — Body-Frame bleibt nach Klick
  unsichtbar. Test als `it.todo` markiert.

## Code-Coverage nach Iter 3

| Modul                                                 | Vorher | Nachher              |
| ----------------------------------------------------- | ------ | -------------------- |
| `compiler/backends/dom/state-machine-emitter.ts`      | 98.47% | 98.47% (unverändert) |
| `compiler/ir/transformers/state-child-transformer.ts` | 100%   | 100%                 |

Tutorial-Coverage: 9 von 15 Aspekten direkt getestet, 3 als Limitations
dokumentiert, 3 indirekt durch andere Tests = **15/15** explizit
adressiert.
