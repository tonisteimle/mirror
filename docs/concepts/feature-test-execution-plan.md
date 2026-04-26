# Feature Test Pyramid — Execution Plan

> Konkreter Umsetzungsplan für die Test-Pyramide-Roadmap aus
> [feature-test-inventory.md](./feature-test-inventory.md). Basiert auf
> [feature-testing-pyramid.md](./feature-testing-pyramid.md) (Strategie)
> und [feature-testing-blueprint.md](./feature-testing-blueprint.md)
> (Playbook).
>
> **Stand**: 2026-04-26 · **Verbleibender Umfang**: ~28h AI-paired,
> ~5-6 Wochen solo · **Ziel-Test-Stand**: ~11400 Tests in 5-Schichten-
> Pyramide.

## Vorgehensprinzipien

1. **Sequenziell, nicht parallel** — innerhalb eines Sprints ein Feature
   nach dem anderen. Sonst State-Kollisionen und unklare Bug-Zuordnung.
2. **Sprint-Boundaries als Re-Eval-Punkte** — nach jedem Sprint
   Erkenntnisse einarbeiten, Prioritäten neu bewerten.
3. **Bugs werden gepinnt, nicht gefixt** — siehe Blueprint, Anti-Pattern.
   Fix-PRs separat.
4. **Ein Commit pro Feature** — Pyramide für ein Feature ist ein PR.
5. **Erst ✅, dann das nächste** — Definition of Done strikt einhalten,
   keine "kommt später" für unfertige Schichten.
6. **Kein Codegen-Refactoring während der Pyramide** — Tests sollen den
   IST-Stand pinnen. Refactoring-Drift ist eine eigene Initiative.

## Pre-Flight Checklist

Vor jedem Sprint:

- [ ] `git status` clean
- [ ] `npm test` baseline grün (`pnpm test` falls pnpm)
- [ ] Coverage-Report angeschaut → relevante Module identifiziert
- [ ] [Blueprint](./feature-testing-blueprint.md) Anti-Patterns nochmal gelesen
- [ ] Branch-Name: `test/<feature-name>-pyramid` (z.B. `test/variables-pyramid`)

## Definition of Done (pro Feature)

Ein Feature gilt als _done_ wenn **alle** Punkte erfüllt sind:

- [ ] Sub-Features-Tabelle in `feature-test-inventory.md` aktualisiert
- [ ] **Schicht 1** Golden Fixtures: ≥ N Verzeichnisse, alle grün, alle
      `expected.dom.js` + `expected.html` manuell reviewed
- [ ] **Schicht 2** Behavior Spec: ≥ 1.5×N Tests, jsdom-basiert, deckt
      alle Sub-Features ab
- [ ] **Schicht 3** Per-App Contract: mind. 1 Real-App aus `examples/`
      mit explizitem Vertrag, ≥ 8 Tests
- [ ] **Schicht 4** Differential: alle 3 Backends getestet, Limits in
      Markdown-Tabelle dokumentiert
- [ ] **Schicht 5** Backend-Support-Doc: `docs/concepts/<feature>-backend-support.md`
- [ ] Alle bei der Implementierung gefundenen Bugs sind als Tests
      gepinnt (nicht gefixt)
- [ ] Volle Test-Suite grün (`npm test`)
- [ ] Inventory-Status auf ✅ + Commit-Hash in Notizen-Spalte
- [ ] Commit-Message folgt Schema aus dem Blueprint

## Sprint 1 — Daten-Fluss (~6h)

**Ziel**: Pinning der zuletzt gefixten String-/Conditional-/Each-Bugs
(#17-20) + grundlegende Datenfluss-Semantik. **Bug-Density-Cluster
kompetent abgedeckt.**

### S1.1 — Variables/Data (~2h)

**Sub-Features V1-V10**:

| ID  | Sub-Feature                    | Beispiel                          | Bug-Hotspot       |
| --- | ------------------------------ | --------------------------------- | ----------------- |
| V1  | Scalar (number)                | `count: 42`                       |                   |
| V2  | Scalar (string)                | `name: "Max"`                     |                   |
| V3  | Scalar (boolean)               | `active: true`                    |                   |
| V4  | Reference                      | `Text "$name"`                    | XSS               |
| V5  | Interpolation (single)         | `Text "Hi $name"`                 | XSS, Quote-Escape |
| V6  | Interpolation (multiple)       | `Text "$first $last"`             |                   |
| V7  | Nested object                  | `user: { name: "Max" }`           |                   |
| V8  | Property access                | `Text "$user.name"`               | undefined-Leaks   |
| V9  | Object-of-entries (collection) | `tasks: { t1: {...}, t2: {...} }` |                   |
| V10 | Aggregations                   | `$tasks.count`, `.first`, `.last` |                   |

**Tasks**:

1. Inventory-Tabelle ergänzen (V1-V10 als Sub-Feature-Liste).
2. `tests/fixtures/variables/` anlegen, Runner kopieren.
3. 10 Fixture-Inputs schreiben.
4. `UPDATE_GOLDEN=1 npx vitest run tests/fixtures/variables` → manuell
   reviewen. **Achten auf**: Quote-Escaping in `expected.dom.js`,
   undefined-Leaks bei nicht-existenten Properties, XSS-Vorbeugung.
5. `tests/behavior/variables.test.ts` mit ~15 Tests.
6. `tests/contract/<app>.contract.test.ts` — wahrscheinlich Erweiterung
   des bestehenden `portfolio-advisor.contract.test.ts` mit Variable-
   bezogenen Asserts (oder neue: `address-manager`).
7. `tests/differential/variables.test.ts` — alle 3 Backends.
8. `docs/concepts/variables-backend-support.md`.
9. Regression-Pins für die XSS-relevanten Bugs aus Tier-1-4.
10. Commit: `test: build full testing pyramid for Variables/Data feature`.

**Bekannte Bug-Hotspots** (zum Re-Pinnen):

- XSS via `Text "$user.input"` (Tier-1-Bugs)
- Quote-Escaping in Template-Literalen
- `undefined` String-Leaks bei `$user.nonExistent`
- `valueOf` als Property-Name (#15 — prototype pollution)

### S1.2 — Conditionals (~2h)

**Sub-Features T1-T12**:

| ID  | Sub-Feature                    | Beispiel                                     | Bug-Hotspot |
| --- | ------------------------------ | -------------------------------------------- | ----------- |
| T1  | Block `if`                     | `if active\n  Text "Yes"`                    |             |
| T2  | `if/else`                      | `if active\n  ...\nelse\n  ...`              |             |
| T3  | Boolean operators              | `if x && y`, `if a or b`                     |             |
| T4  | Comparison                     | `if count > 0`                               |             |
| T5  | String-Comparison              | `if cat == "Privat"`                         | #18         |
| T6  | Inline Ternary                 | `Text done ? "Ja" : "Nein"`                  |             |
| T7  | Nested Ternary                 | `Text x > 5 ? "big" : x > 0 ? "small" : "0"` | #19         |
| T8  | Ternary in Style               | `Frame bg active ? #2271C1 : #333`           | #18         |
| T9  | Ternary mit Token-Reference    | `col change > 0 ? $accent : $danger`         | #20         |
| T10 | Ternary mit `__loopVar`        | `Frame bg pos.change > 0 ? $green : $red`    | #20         |
| T11 | Ternary in Text                | `Text count > 0 ? "$count items" : "Empty"`  |             |
| T12 | Edge: Non-ASCII string operand | `if cat == "Geschäftlich"`                   | #18         |

**Tasks**: gleiche 10 Schritte wie S1.1. Bug-Pins für #18, #19, #20
sind hier zwingend.

### S1.3 — Each-Loop (~2h)

**Sub-Features E1-E13**:

| ID  | Sub-Feature                       | Beispiel                                  | Bug-Hotspot |
| --- | --------------------------------- | ----------------------------------------- | ----------- |
| E1  | Basic                             | `each task in $tasks`                     |             |
| E2  | Mit Index                         | `each task, idx in $tasks`                |             |
| E3  | Inline-Array                      | `each x in [1, 2, 3]`                     |             |
| E4  | Object-of-entries                 | `each user in $users` (object → entries)  |             |
| E5  | Mit `where` Filter                | `each ... where x.done`                   |             |
| E6  | Mit `by` OrderBy                  | `each ... by priority`                    |             |
| E7  | Mit `desc`                        | `each ... by priority desc`               |             |
| E8  | Filter + OrderBy kombiniert       | `each ... where ... by ...`               |             |
| E9  | Nested each                       | `each row in $rows\n  each cell in row.x` |             |
| E10 | Each mit innerem Conditional      | `each x ...\n  if x.done\n    ...`        |             |
| E11 | Each mit `bind` auf Item-Property | `each x ...\n  Input bind x.value`        |             |
| E12 | Two parallel each (gleiche Coll.) | `each x in $tasks\n...\neach y in $tasks` | **#17**     |
| E13 | Each mit Token-Reference inside   | `each x ...\n  Frame bg $primary`         | **#20**     |

**Tasks**: gleiche 10 Schritte. Bug-Pins #17 + #20 sind zwingend.

### Sprint 1 — Acceptance Criteria

- [ ] 3 neue Pyramiden komplett (Variables, Conditionals, Each-Loop)
- [ ] 33+ Fixtures, 50+ Behavior-Tests, 24+ Contract-Tests, 30+ Diff-Tests
- [ ] Bug-Pins für #17, #18, #19, #20 in den jeweiligen Behavior-Specs
- [ ] Volle Suite grün, **+200-250 Tests** netto
- [ ] Inventory aktualisiert: 4 Features auf ✅
- [ ] **Re-Eval**: Sprint 2-6 Prioritäten nochmal anschauen, ggf. anpassen

## Sprint 2 — Foundation (~6h)

**Ziel**: Cross-cutting Features die alles andere stützen.

### S2.1 — Tokens (~2h)

**Sub-Features TK1-TK10**:

- TK1: Single-value (`primary.bg: #2271C1`)
- TK2: Property-set (`btnstyle: pad 12, rad 6`)
- TK3: Suffix-Resolution (`bg $primary` → `primary.bg`)
- TK4: Direct match (`bg $primary-bg`)
- TK5: Reference in Component-Definition
- TK6: Token-in-Token (`secondary.bg: $primary`)
- TK7: Token in Conditional (`bg active ? $primary : $muted`)
- TK8: Token in Each (Token in Loop-Body)
- TK9: Runtime token registration (`$registerToken`)
- TK10: Override im Token-File-Import

### S2.2 — Bind (~2h)

**Sub-Features B1-B10**:

- B1: One-way text bind (`Text $var`)
- B2: One-way style bind (`Frame bg $var`)
- B3: Input two-way bind (`Input bind name`)
- B4: Bind in each-Loop-Item (`Input bind item.value`)
- B5: Bind mit Mask (`Input mask "###-####", bind phone`)
- B6: Exclusive-Bind (`exclusive(), bind selected`)
- B7: Bind auf Object-Property (`bind user.name`)
- B8: Cross-Element-Bind (`name X` + `X.value`)
- B9: Bind triggert Re-Render
- B10: Initial-Value aus Variable

### Sprint 2 — Acceptance

- 2 weitere Pyramiden, ~150-200 Tests netto
- Inventory: 6 Features auf ✅

## Sprint 3 — Interaktion (~5h)

### S3.1 — Toggle/Exclusive (~1.5h)

(Components-Pyramide hat das angerissen — hier dedizierte Suite mit
mehr Tiefe: Cross-Element, Initial-States, Transitions, alle Custom-
States.)

### S3.2 — Events (~1.5h)

19 Events einzeln testen: onclick, onhover, onkeydown (mit Filter),
oninput, onchange, onclick-outside, onviewenter/exit etc.

### S3.3 — Actions (~2h)

25 Actions: show/hide/toggle, navigate, scroll, set/get, CRUD, multi-
action, copy. Hier ist die Fixture-Anzahl groß; ggf. 2 Pyramiden:
"Stateful Actions" (set/get/inc/dec/CRUD) und "Effect Actions" (toast/
copy/scroll/navigate).

## Sprint 4 — Layout & Properties (~4h)

### S4.1 — Layout (~2h)

20 Layout-Sub-Features (direction, gap, center/spread, 9-position,
sizing, grow/shrink, wrap, grid, stacked, device-presets, position).
Wichtig: viele bestehen schon als Tutorial-Tests — die in Pyramide-
Format überführen, nicht doppelt schreiben.

### S4.2 — Properties (~2h)

Color, Gradients, Typography, Effects, Visibility, Hover-Properties,
Cursor, Aspect, Transform. Auch hier: Tutorial-Tests aufwerten.

## Sprint 5 — Integration & Compound (~5h)

### S5.1 — Multi-File (~1h)

Pyramide ist anders als bei Sprache-Features: hier sind Fixtures
**Verzeichnisse** mit mehreren Dateien (`tokens.tok`, `components.com`,
`app.mir`).

### S5.2 — Pure UI Components (~3h)

Dialog, Tooltip, Tabs, Select, Checkbox, Switch, Slider, RadioGroup —
8 Komponenten. Pro Komponente nur 5-8 Tests, da Component-Pyramide
schon viel deckt. Eine kombinierte Pyramide für alle 8.

### S5.3 — Tables + Charts (~1h)

Compound. Charts brauchen Chart.js-Mock (haben wir bereits in Smoke-
Tests). Table einfacher.

## Sprint 6 — Cleanup (~2h)

Animationen, Canvas, Custom Icons, DatePicker. Klein, fast trivial,
sammeln aber wichtige Edge-Cases ein. Eine kombinierte Pyramide oder
4 mini-Pyramiden.

## Risk Register

| Risk                                                  | Wahrsch. | Impact  | Mitigation                                    |
| ----------------------------------------------------- | -------- | ------- | --------------------------------------------- |
| Sprint 1 deckt Bugs auf, die Folge-Sprints blockieren | Hoch     | Mittel  | Bugs pinnen (nicht fixen), separater Fix-PR   |
| jsdom-Quirks brechen Behavior-Tests in neuen Features | Mittel   | Mittel  | Workaround-Library aus S1 erstellen           |
| Codegen-Refactoring (von anderen) bricht Schicht 1    | Mittel   | Hoch    | Goldfile-Drift in PR-Reviews ernst nehmen     |
| Solo-Tempo bricht ein                                 | Hoch     | Mittel  | Sprints sind unabhängig, jederzeit pausierbar |
| React/Framework-Backend-Lücken weiten sich aus        | Mittel   | Niedrig | Differential pinnt IST-Stand                  |
| Time-Estimates zu optimistisch                        | Hoch     | Niedrig | Re-Eval nach jedem Sprint                     |

## Bug-Discovery-Protokoll

Wenn beim Schreiben einer Pyramide ein Bug gefunden wird:

1. **Sofort**: Bug-Nummer im laufenden inventory-Doc (Bug-Tabelle) eintragen.
2. **In der Behavior-Spec**: Test mit Bug-Nummer im Namen, der den IST-Stand
   pinnt (z.B. `it.skip` mit Kommentar oder `expect(true).toBe(true)`
   Placeholder).
3. **Im Backend-Support-Doc**: Bug erwähnen mit Status "offen".
4. **NICHT**: in derselben Pyramide-PR fixen.
5. **Nach Pyramide-Merge**: Issue / separater Fix-PR. Wenn gefixt, den
   Pin-Test scharf machen (das ist der Regression-Test).

## Re-Prioritization-Triggers

Sprint-Reihenfolge anpassen wenn:

- **>5 Bugs in einem Sprint gefunden** → die affected Features hochpriorisieren
- **Ein Backend-Limit blockt mehrere Features** → Backend-Erweiterung
  als eigenen Stream parallel starten
- **Real-User-Bug-Report** → entsprechendes Feature hochpriorisieren
- **Codegen-Refactoring geplant** → Pyramide für betroffenes Feature
  vorziehen, dann erst refactorn

## Parallelisierung

- **Innerhalb Sprint**: nein. State-Kollisionen.
- **Zwischen Sprint und Bug-Fix**: ja. Während Sprint 2 läuft, kann
  jemand parallel #21 fixen (Pyramide-PR und Fix-PR sind unabhängig).
- **Mehrere Mitarbeitende**: theoretisch ja, aber Inventory-Datei wird
  zur Konflikt-Quelle. Empfehlung: ein Verantwortlicher pro Sprint, andere
  reviewen und pingen Bugs.

## Out-of-Scope

Bewusst **nicht** in diesem Plan:

- **Studio-UI-Tests** — separate Pyramide möglich, aber später
- **Visual-Regression** — eigenes Tooling (Pixelmatch, Chromatic)
- **Performance-Budgets** — Tier-7-Hypothesis-Tests reichen vorerst
- **Mutation-Testing** (Stryker) — als Schicht 6 _nach_ allen Sprints,
  validiert dann Test-Qualität
- **Cross-Browser-Tests** — Mirror Studio läuft Chrome-only

## Schedule (milestone-basiert, kein Kalender)

| Milestone    | Inhalt                       | Test-Zuwachs | Cumul. Tests | ✅?        |
| ------------ | ---------------------------- | -----------: | -----------: | ---------- |
| **Start**    | Components done              |            – |       10 064 | ✅ aktuell |
| **M1**       | Sprint 1 (Daten-Fluss)       |         ~250 |      ~10 314 | ⬜         |
| **M2**       | Sprint 2 (Foundation)        |         ~300 |      ~10 614 | ⬜         |
| **M3**       | Sprint 3 (Interaktion)       |         ~200 |      ~10 814 | ⬜         |
| **M4**       | Sprint 4 (Layout/Properties) |         ~250 |      ~11 064 | ⬜         |
| **M5**       | Sprint 5 (Integration)       |         ~250 |      ~11 314 | ⬜         |
| **M6**       | Sprint 6 (Cleanup)           |          ~80 |      ~11 394 | ⬜         |
| **Optional** | Mutation-Testing-Pass        |            – |      ~11 394 | ⬜         |

Nach M6: Mirror-Compiler hat Test-Niveau **TypeScript / Svelte / Babel**.

## Erste Aktion

**Jetzt starten** mit Sprint 1, Schritt S1.1 (Variables/Data).

```bash
# Pre-Flight
git status                                # clean
npm test                                  # baseline grün
git checkout -b test/variables-pyramid

# Schritt 1: Sub-Features-Tabelle ergänzen
$EDITOR docs/concepts/feature-test-inventory.md   # V1-V10 ergänzen

# Schritt 2: Runner kopieren
mkdir -p tests/fixtures/variables
cp tests/fixtures/components/runner.test.ts tests/fixtures/variables/

# Schritt 3-4: Fixtures schreiben + Baselines akzeptieren
# (siehe Blueprint, Schritt 3-4)
…
```

Beim ersten Schritt entlang Blueprint Schritt für Schritt arbeiten. Nach
jedem Feature: Definition of Done abhaken, Inventory updaten, separater
Commit.
