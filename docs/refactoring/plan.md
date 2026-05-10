# Mirror Refactoring — Plan

Vertikale, end2end prüfbare User-Fähigkeiten („Capability-Slices") werden einzeln entlang von 6 Dimensionen auditiert, durch einen mechanischen Quality-Gate gefahren und als nummeriertes Audit-Dokument abgelegt.

**~88 Slices · 16 erledigt (Iter-1) · 72 offen · Sweep nötig vor neuer Arbeit.**

---

## Status (2026-05-10)

- 16 Slices durch initialer Pass (Iter-1).
- **Iter-2-Stichprobe Slice 24 hat Iter-1-Schwäche bestätigt:** 4 von 9 Quality-Gate-Checks fail; konkreter Drift-Bug `studio/panels/property/utils/tokens.ts:204` ungesehen.
- 6 Browser-CDP-E2E-Schulden, 1 Slice (21) mit „Phase B/C verschoben", 14 deferred V-Items ohne Re-Open-Trigger.
- 15 012 Vitest-Tests grün.
- Plan wurde mit mechanischem Quality-Gate (Step 8 unten) erweitert, NACHDEM die ersten 16 Slices schon „erledigt" markiert waren.

**Konsequenz:** Phase 1 (neue Slices) startet nicht direkt. Vorher kommt Phase 0 — Iter-2-Sweep der 12 Pre-Quality-Gate-Slices.

---

## Lessons aus Slices 1–7 (kondensiert)

Die folgenden Lehrsätze sind in den Quality-Gate (Step 8) und ins Vorgehen (Step 1–9) eingearbeitet:

1. **„Substantiell besser, aber …" zählt nicht als done.** Wer das beim Quality-Gate sagt, hat ihn nicht durchlaufen.
2. **Probe-Skripte gehören committet** (`tools/probes/slice-NN-*.ts`), nicht in `/tmp` — sonst sind sie für Cross-Slice-Re-Probes weg.
3. **Schema-Drift-Grep ist verbindlich.** Mein Slice-24-Stichproben-Befund: `studio/panels/property/utils/tokens.ts:204` ist ein Duplikat von `compiler/schema/token-suffixes.ts.getTokenSuffix` — wurde im Iter-1 nicht gefunden, weil der Grep nicht ausgeführt wurde.
4. **Studio-Roundtrip muss explizit benannt sein.** „Studio nutzt DOM-Backend, also ok" ist Hand-wave, kein Lock. Lower-Bar-Modus (DOM cross-backend gelocked + Property-Panel-Test existiert) ist legitim — aber muss als „Lower-Bar — DOM-Pfad gelocked via RT-X, kein CDP-Run" deklariert werden.
5. **Re-Open ist Append-only.** Wenn ein Slice nachträglich neue Findings bekommt: neue „Iter N" Sektion anhängen, alte Status-Zeilen mit „(Iter 1: …)" markieren. Niemals überschreiben.
6. **Cross-Slice-Wirkung muss aktiv geprüft werden.** Slice 2 V-1 (`pxify`) hat 11 properties auf einmal gefixt — weil aktiv geprobt wurde. Slice 4 V-2 hat 4 deferred Slice-5-Cases — weil aktiv geprobt wurde. Ohne Probe: Drift propagiert silent.
7. **Hot-Files brauchen Schema-Lookups, nicht Switch-Cases.** Wenn 3+ Slices denselben Switch in `react.ts` erweitern, wird daraus ein schema-derived Lookup (Slice 4 V-1 Vorbild: `nineZoneToFlex` statt 18 cases). So kollidiert keine Phase mit der nächsten.
8. **Themenblöcke (Tracks) sind theatralisch.** Konfliktlinien sind Hot-Files, nicht Tracks. Pool-Ansatz mit Dependencies + Hot-File-Tags arbeitet besser als rigide Track-Phasen.

---

## Vorgehen pro Slice (Step 1–9, knapp)

1. Audit gemäß den 6 Prüf-Dimensionen.
2. Probes als ausführbares Skript in `tools/probes/slice-NN-*.ts` committen.
3. Bewertung pro Dimension (stark / mittel / schwach), Befunde nummerieren (V-1, V-2, …).
4. Follow-up-Tickets (Bugs, Architektur, Cleanup), jedes mit Re-Open-Trigger (Ziel-Slice/Phase).
5. Audit-Doc als `XX-<name>.md`, Audit-Status-Tabelle aktualisieren, Slice-Claim per `in-arbeit (Dev N)` Marker.
6. Implementierung in Runden — pro Phase ein Commit (Ziel, kein Gesetz; lint-staged kann bündeln).
7. **Review-Pass nach Implementierung** (verbindlich):
   - Probe-Skript re-runnen, Probe-Tabelle gegen Output spiegeln (Pre-Fix-Zustand markiert, Post-Fix grün).
   - Jede RT effektiv geschrieben oder begründet gestrichen — kein „pending"-Eintrag erlaubt.
   - **Schema-Drift-Grep** repo-weit (`compiler/`/`studio/`/`tests/`) für jeden Helper/Schema-Wert, der eingeführt oder erweitert wurde.
   - **Cross-Slice-Probe** für jeden neuen Helper gegen ≥ 2 Nachbar-Slices aus derselben Bug-Familie.
   - **Cross-Slice-Scope-Entscheidung:** in-scope-fix wenn Helper trivial extendable + Nachbar-Slice noch offen; deferred-lock-RT wenn Nachbar-Helper neu nötig oder Nachbar erledigt.
   - 6 Prüf-Dimensionen re-verifizieren inkl. Cross-Backend-Konsistenz und Studio-Roundtrip (Voll-Modus oder Lower-Bar).
   - **Iterieren bis sauber.** Jedes neue Finding triggert einen weiteren Review-Pass-Durchlauf. Erst 0 neue Findings = review-fertig.
   - **Re-Open-Append-only.** Bei nachträglichen Findings: neue Iter-N-Sektion, alte Stati markiert.
8. **Quality-Gate — mechanische 9-Punkt-Checkliste.** Alle 9 müssen ✅, sonst Status-Reset:
   1. Audit-Doc-Probe-Tabelle: kein 🔴 außer in expliziter „deferred"/„out-of-scope"-Spalte.
   2. Phase-Stati ∈ {erledigt, verschoben, verworfen}; kein „pending"/„offen"/„in-arbeit".
   3. Jeder RT-Plan-Eintrag hat einen geschriebenen Test (Status `erledigt`).
   4. Schema-Drift-Grep ausgeführt; gefundene Stellen gefixt oder dokumentiert.
   5. Cross-Slice-Wirkung geprüft; betroffene Nachbar-Slices haben In-scope-Fix oder Deferred-Lock-RT.
   6. Cross-Backend-Differential-RT existiert pro Property/Verhalten, das ≥ 2 Backends emittieren.
   7. Studio-Roundtrip explizit benannt: „CDP-Run grün" oder „Lower-Bar: DOM gelocked via RT-X". Hand-wave zählt nicht.
   8. Vitest gesamt grün; vor-Slice-Vergleich bestätigt: keine Test-Subtraction.
   9. Wer auf „ist das nun richtig gut?" mit „substantiell besser, aber …" antwortet, hat 1–8 nicht durchlaufen.
9. **Schulden-Tracking & Cluster-Reviews:**
   1. CDP-Schuld-Limit: max 5 Slices gleichzeitig „CDP-E2E ⚠️ offen". Bei Limit: 2 älteste abarbeiten bevor neue Studio-Touchpoint-Slices.
   2. Slice-21-Probe-Pflicht: jeder Slice ab #5, der Komponenten verwendet, MUSS einen expliziten Probe gegen Slice-21-deferred-Cases haben.
   3. Re-Open-Trigger mit Ziel: jedes deferred Item bekommt eine Adresse („V-2 deferred — Ziel: Slice 5 V-3"), nicht nur „verschoben".
   4. Hard-Sync-Punkt: Slice 21 (Komponenten) muss vollständig erledigt sein, BEVOR Studio-Loop-Slices (67–84) angefangen werden. Sonst silent-Drift in 17 Slices.

---

## Phase 0 — Iter-2-Sweep (vor neuer Arbeit, ~5 Tage)

12 Slices durch das Iter-2-Protokoll. Geclustert nach gemeinsamem Code-Surface, ein Dev pro Cluster für Cross-Slice-Konsistenz.

### Hausputz (vor jedem Slice-Claim, ~5 min pro Dev)

Bevor der erste Slice claimed wird:

1. `git status` — alle untracked `_*.ts`/`_slice*.ts`/`_fixt*.ts` Probe-Reste prüfen.
2. Falls vorhanden: relevante migrieren nach `tools/probes/slice-NN-*.ts` (Konvention `tools/probes/README.md`); irrelevante löschen.
3. Eigener Commit `chore(probes): hausputz — migrate untracked probes` BEVOR die erste Slice-Iter-2 startet.

Damit ist sichergestellt, dass keine Iter-2 mit „verlorenen" Probe-Files startet.

### Dev 1 — Layout-Fundament-Sweep (~3 Tage)

Reihenfolge: leichte Audit-Slices zuerst (1 → 2 → 3), CDP-Schuld am Schluss (Slice 7), weil CDP-Setup L-Effort und unbekannt ist. Slice 1 etabliert das Iter-2-Sektionsformat als Vorlage für die anderen Devs.

| #   | Slice                            | Aufgabe                                                                                                                                                      | Effort |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | 1 (Frame)                        | Schema-Drift-Grep für `isLayoutPrimitive`/Primitive-Markers; Studio-Roundtrip explizit (CDP nachholen oder Lower-Bar deklarieren); Iter-2-Vorlage etablieren | ~3-4 h |
| 2   | 2 (gap)                          | Re-Probe Cross-Slice (gap-x/gap-y, chain-tokens); Studio-Roundtrip explizit                                                                                  | ~2-3 h |
| 3   | 3 (hor)                          | V-2 Re-Open-Trigger setzen (W120 → Parser-Strict-Slice), V-3a Schema-Drift-Stand klären                                                                      | ~2-3 h |
| 4   | 7 (Grid mit expliziter Position) | **CDP-Run nachholen** (`x`/`y`/`w`/`h` als grid-line-indices im Studio per Browser-CDP) + Iter-2-Pass; Lower-Bar nur wenn CDP-Setup blockiert                | ~4-5 h |

**Outputs:** je Slice eine Iter-2-Sektion im Audit-Doc, gefundene Drifts gefixt oder mit Ziel-Slice deferred-tracked, vitest grün. Probe-Skripte committen unter `tools/probes/`. Slice 7 nimmt die CDP-Schuld vom Limit-Zähler.

### Dev 2 — Komponenten/Tokens-Sweep (~3 Tage, schwerster Cluster)

| Slice                      | Aufgabe                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 24 (Single-Value-Token)    | **Pilot-Iter-2** (Stichprobe-Befund). Drift-Fix: `studio/panels/property/utils/tokens.ts:204` `getTokenSuffixForProperty` durch `compiler/schema/token-suffixes.ts:getTokenSuffix` ersetzen. Plus dedizierter `tests/compiler/slice-24-tokens.test.ts`. |
| 25 (Property-Set-Token)    | Schema-Drift-Grep (Property-Set-Resolver-Pfade in Studio); Cross-Slice-Probe gegen 24                                                                                                                                                                   |
| 78 (Token-Picker)          | Slice 24 V-6 deferred-Item — Picker-Refactor jetzt mit-machen oder explizites Re-Open-Trigger setzen (Ziel: dedizierter Studio-Picker-Slice)                                                                                                            |
| 21 (Komponenten Phase B/C) | **Hard-Sync-Punkt für Phase 1.** Phase B + C abschließen oder beide explizit als Re-Open-Trigger mit Ziel-Slice eintragen (z. B. „Slice 22 `as`-Inheritance"). Komponenten-Vollständigkeit ist Voraussetzung für Studio-Loops.                          |

**Wichtig:** Slice 21 erst NACH 24/25/78 anfassen — die Token-Drift muss erst gefixt sein, weil Slice 21 Property-Set-Resolver berührt.

### Dev 3 — States-Sweep + CDP-Schuld-Abarbeitung (~4-5 Tage, schwerste Schulden-Last)

| Slice                    | Aufgabe                                                                                |
| ------------------------ | -------------------------------------------------------------------------------------- |
| 26 (System-States)       | Iter-2 + **CDP-Run nachholen** (Hover/Focus/Active/Disabled im Studio per Browser-CDP) |
| 27 (toggle())            | Iter-2 + **CDP-Run nachholen** (Klick wechselt 2 Bodies live)                          |
| 28 (Multi-State-Cycle)   | Iter-2 + **CDP-Run nachholen** (todo→doing→done bei wiederholtem Klick)                |
| 29 (exclusive())         | Iter-2 + **CDP-Run nachholen** (Tab-Gruppe, nur einer aktiv)                           |
| 30 (Cross-Element-State) | Iter-2 + **CDP-Run nachholen** (`MenuBtn.open: visible` wirkt cross-element)           |

**Annahme:** ~0.5–1 Tag pro CDP-Run, plus Iter-2-Audit-Pass. Wenn CDP-Setup fehlt: Lower-Bar-Modus dokumentieren mit explizitem Property-Panel-Test-Lock und Re-Open-Trigger. Nach Dev 3 fertig: 0 von 6 CDP-Schulden offen → unter Limit.

### Dev 4 — Phase-1-Vorlauf (parallel-safe Slices, ~5 Tage)

Parallel-fähig weil keine Pre-Quality-Gate-Slice-Coupling. Liefert Lehrobjekte für die anderen Devs (zeigt: so sieht Phase 1 unter neuem Quality-Gate aus).

| Slice                      | Reihenfolge                             |
| -------------------------- | --------------------------------------- |
| 50 (Lucide-Icons)          | Erst — kein Komponenten-Touchpoint      |
| 51 (Custom-Icons-Registry) | Folgt direkt aus 50                     |
| 85 (mirror-build CLI)      | Reine CLI-Spur, getrennter Code-Bereich |
| 86 (mirror-compile CLI)    | Folgt direkt aus 85                     |
| 87 (mirror-validate CLI)   | Schließt CLI-Cluster ab                 |

**Wichtig:** Dev 4 muss `compiler/backends/*` und `compiler/validator/types.ts` (E-Code-Range) checken vor Slice-Beginn — Dev 1+3 könnten parallel daran arbeiten. Konvention: vor Edit `git pull --rebase`, Edit innerhalb von 60s pushen.

### Phase-0 Sync-Punkt (Ende ~Tag 5)

- Alle 12 Pre-Quality-Gate-Slices haben Iter-2-Sektion und sind durch den 9-Punkt-Quality-Gate.
- Audit-Status-Tabelle in `plan.md` ehrlich aktualisiert.
- CDP-Schuld-Zähler: 0 von max 5.
- Re-Open-Tracking-Tabelle: jedes deferred Item hat Ziel-Adresse.
- Vitest gesamt: grün, mehr Tests als am Sweep-Anfang (RT-Files dazugekommen).

---

## Phase 1+ — Pool-Ansatz für die 72 verbleibenden Slices

Kein „Phase 1 → 2 → 3 → 4". Stattdessen ein Slice-Pool mit Dependencies + Hot-File-Tags. Devs greifen Slices vom Pool nach diesem Algorithmus:

1. Slice ist offen (nicht claimed).
2. Alle Depends-on-Slices sind erledigt.
3. Hot-Files kollidieren nicht mit aktuell-claimed-Slices.
4. Skill-Match (Dev mit Compiler-Erfahrung greift Compiler-heavy Slice).

### Hard-Sync-Punkte (nicht-verhandelbar)

| Sync-Punkt                         | Bedingung                                                           | Folge                                                         |
| ---------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| **HSP-1: Komponenten vollständig** | Slices 21, 22, 23 alle „erledigt"                                   | freigibt Studio-Loops (67–76) und UI-Patterns (58–65)         |
| **HSP-2: Tokens vollständig**      | Slices 24, 25 + Token-Picker (78) alle „erledigt"                   | freigibt Token-heavy Slices (Theme-Switching, AI-Edit)        |
| **HSP-3: Layout-Fundament**        | Slices 1–12 alle „erledigt"                                         | freigibt Studio-Drag-Resize (70), Padding/Margin-Handles (71) |
| **HSP-4: States vollständig**      | Slices 26–33 alle „erledigt"                                        | freigibt Funktionen/Aktionen (34–43) komplett                 |
| **HSP-5: Daten vollständig**       | Slices 44–49 alle „erledigt"                                        | freigibt Inhalt-Patterns (Tabellen 56, Charts 57)             |
| **HSP-6: Phase-Cluster-Review**    | nach jedem 10-Slice-Block, ein Cluster-Review-Stichprobe (3 Slices) | Drift-Frühwarnung; bei systemischer Drift: Sub-Sweep          |

### Slice-Skill-Aufteilung der 4 Devs (Empfehlung, nicht zwingend)

| Dev   | Skill-Schwerpunkt                      | Bevorzugte Slices                                                                           |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| Dev 1 | **Compiler-Layout/Styling/Sizing**     | 8 Stacked, 9 Padding, 10 Margin, 11 Sizing, 12 Device-Presets, 13–20 Styling                |
| Dev 2 | **Compiler-Komponenten/Tokens/Schema** | 22 `as`-Inheritance, 23 Kind-Slots, 17 Typografie-Helpers, 50/51 Icon-Schema-Erweiterungen  |
| Dev 3 | **States/Behavior/Functions/Daten**    | 31–33 Animation, 34–43 Funktionen, 44–49 Daten, 67–69 Sync-Loops                            |
| Dev 4 | **Inhalt/Patterns/Studio/CLI/AI**      | 52–57 Inhalt, 58–65 UI-Patterns, 66 Prose, 70–76 Studio-Visual, 77–84 Pickers/AI, 88 Export |

**Wenn ein Dev frei wird**, nimmt er einen Slice vom Pool, der zu seinem Skill passt. Wenn nichts in seinem Skill verfügbar ist (alles claimed oder geblockt), nimmt er einen aus einem benachbarten Skill (z. B. Dev 1 hilft bei Inhalt 50–55 wenn alle Layout/Styling claimed sind).

### Pool-Status-Tracking

Die Audit-Status-Tabelle unten ist der Pool. Jeder Slice hat:

- **Status:** `offen` / `in-arbeit (Dev N, JJJJ-MM-TT)` / `erledigt` / `verschoben` / `verworfen`
- **Hot-Files:** Tags für Konflikt-Erkennung (z. B. `react.ts/switch`, `validator/types.ts:E-codes`)
- **Depends-on:** Slice-Nummern, die vorher fertig sein müssen

---

## Konflikt-Prevention & Sync

### Hot-Files (verbindliche Vor-Edit-Routine)

Vor jedem Edit dieser Files: `git pull --rebase`. Edit + Commit innerhalb von 60s.

- `compiler/backends/react.ts` — switch-cases
- `compiler/backends/framework.ts` — reverse-mapper
- `compiler/backends/dom/*.ts` — DOM-emitter
- `compiler/validator/types.ts` — E-Codes (Reservierung siehe unten)
- `compiler/validator/validator.ts` — checkLayoutConflicts u. a.
- `compiler/schema/layout-defaults.ts` — Single-Source-of-Truth-Helper
- `compiler/schema/dsl.ts` — Primitive-Definitionen
- `compiler/schema/property-schema.ts` — Property-Definitionen
- `compiler/schema/token-suffixes.ts` — Token-Suffix-Map
- `compiler/ir/transformers/layout-transformer.ts` — IR-Transform
- `compiler/ir/transformers/property-transformer.ts` — Property-Transform
- `docs/refactoring/plan.md` — Audit-Status-Tabelle (Slice-Claims)

### Schema-Lookup-statt-Switch-Regel

Wenn ein Switch in `react.ts` / `framework.ts` von 3+ Slices erweitert werden würde: einer der Devs **muss** den Switch zu einem schema-derived Lookup refactorn (Vorbild: Slice 4 V-1 `nineZoneToFlex`). Erst dann erweitern die anderen Devs ihre Cases. Verhindert Merge-Konflikt-Hölle.

### Validator-E-Code-Reservierung

| Range     | Domäne                      | Belegt heute                     |
| --------- | --------------------------- | -------------------------------- |
| E101–E199 | Layout / Sizing / Property  | E101–E115 (durch Slice 1–7)      |
| E200–E299 | Events                      | E200–E201                        |
| E300–E399 | States                      | (frei)                           |
| E400–E499 | Cross-Element / Names       | E404, E405                       |
| E500–E599 | Tokens                      | (frei für Slice 24/25 follow-up) |
| W004–W199 | Layout-Warnings             | W004, W110, W112, W120           |
| W200+     | Domain-spezifische Warnings | (siehe Slices)                   |

Vor neuem E-Code: `grep -E "E[0-9]{3}" compiler/validator/types.ts | sort -u` für aktuell höchsten in Domäne.

### Slice-Claim-Protokoll

1. Dev macht `git pull --rebase`.
2. Editiert die Audit-Status-Tabelle: `Status` von `offen` auf `in-arbeit (Dev N, 2026-MM-TT)`.
3. Committet diesen 1-Zeilen-Edit als eigenen Commit (`chore: claim slice NN`) und pusht innerhalb 60s.
4. Andere Devs pull-rebase vor ihrem Slice-Pick und sehen claimed-Stati.

Bei Slice-Abschluss: Status auf `erledigt` setzen, Slice-spezifischer Status-String (z. B. „erledigt — V-1, V-2, V-3 geprüft, 22 RTs grün").

### Worktree-Konvention

Jeder Dev arbeitet in eigenem `git worktree`:

- `../mirror-dev1/` für Dev 1
- `../mirror-dev2/` für Dev 2
- etc.

Lint-staged läuft pro Worktree, kann andere nicht stomping. Merge in `main` per `git push origin <branch>` und `git merge --no-ff` aus `main`-Worktree heraus, KEIN force-push.

---

## Re-Open-Tracking (Deferred Items mit Ziel-Slice)

Jedes als „verschoben"/„deferred" markierte Item hat eine Adresse. Beim Start des Ziel-Slice-Audits zuerst prüfen.

| Quell-Slice | Item                                          | Ziel                                                      | Begründung                                                                                                                                                                                                                                 |
| ----------- | --------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- | ---------- | ------------- | ------------------------------------------------------------------------- |
| 1           | D-2 ALL_PRIMITIVES test-matrix schema-derived | Slice 50/51 (Icon-Phase-1)                                | `studio/test-api/suites/property-panel/primitive-matrix.test.ts:38` listet 11/26 Primitives — Test-Drift, kein Runtime-Drift. Slice 50 erweitert Icon-Pfad, dort schema-derive oder Subset explizit dokumentieren. (Slice-1-Iter-2-Befund) |
| 1           | Phase B (Studio-Roundtrip-CDP)                | erledigt (Iter-2)                                         | Lower-Bar deklariert in Iter-2-Sektion 7.4 — DOM via RT-1..RT-13, CDP via existierende `property-panel/`-Suite                                                                                                                             |
| 3           | V-2 (W120 Validator-Branch)                   | Slice 21 Phase B/C ODER dedizierter Parser-Audit-Slice    | Parser-aware Change nötig (Iter-2-Schärfung Dev 1: Slice 22 ist `as`-Inheritance, nicht Parser-Strict — V-2 wartet auf Parser-Strict-Mode in Slice 21 oder eigenen Parser-Slice)                                                           |
| 3           | V-3a (Schema-Drift hor center)                | Slice 5-Cluster Re-Open (Sweep Dev 2)                     | Size-State-CSS-emit-Pfad mit-betrachten                                                                                                                                                                                                    |
| 4           | V-4 (align-self+width DOM/React)              | Slice 11 (Sizing)                                         | Sizing-Slice owned die stretch-vs-width-Policy                                                                                                                                                                                             |
| 4           | V-5 (stacked + 9-zone)                        | Slice 8 (Stacked-Overlay)                                 | Stacked-Slice owned die stacked-Layout-Mode-Konflikte                                                                                                                                                                                      |
| 4           | V-6 (Framework `top`/`left`/…)                | Phase-0 Sweep (Dev 2 mit Slice 5)                         | Single-axis-alignment-Familie                                                                                                                                                                                                              |
| 5           | Browser-CDP-E2E                               | Phase-0 Sweep (Dev 3 zusammen mit 26–30)                  | CDP-Schuld-Abarbeitung im Sweep                                                                                                                                                                                                            |
| 7           | Browser-CDP-Studio-Roundtrip                  | erledigt (Iter-2, Dev 1)                                  | 14/14 CDP-Tests grün via `npx tsx tools/test.ts --filter="Grid element                                                                                                                                                                     | grid layout | row-height | grid with gap | grid creates"`— siehe Iter-2-Sektion 8.1 in`07-grid-explicit-position.md` |
| 21          | Phase B (compile-strict undefined component)  | Successor-Slice 21b (V-1+V-3+V-4) — nach HSP-1, vor 67    | Phase A erledigt; 21b ist DX-Improvement, kein HSP-1-Blocker. Hot-Files: parse-blocks.ts, component-resolver.ts, instance-ops.ts                                                                                                           |
| 21          | Phase C (Studio-Pipeline-Validator-Hook)      | Successor-Slice 21c (Q-A + V-1) — nach 21b                | Editor-Linter-Diagnostiken; Hot-Files: studio/modules/compiler/, studio/editor/                                                                                                                                                            |
| 24          | V-6 Studio-Picker-Refactor                    | erledigt (Iter-2, Dev 2 mit Slice 78 V-7 Schema-Fallback) | Picker-Schema-Drift gefixt. Vollständiger Picker-Parser-Refactor bleibt verschoben → Studio-Picker-Cluster-Slice                                                                                                                           |
| 26          | Browser-CDP-E2E                               | Phase-0 Sweep (Dev 3)                                     | Limit-Druck                                                                                                                                                                                                                                |
| 27          | Browser-CDP-E2E                               | erledigt (Iter-2, Dev 3)                                  | 4 Schema-Drift-Safeguard CDP-RTs (visited/checked/focus-visible/cycle-alias) grün — 66/66 toggle CDP-Tests, 65/65 states-Suite                                                                                                             |
| 27          | V-Iter2-3 Naming-Konflikt SYSTEM_STATES       | Slice 32 (State-Transitions)                              | Lokales `SYSTEM_STATES` in `state-styles-transformer.ts:27` ist 6-State-Subset, shadowt schema-derived 13-State-Set. Rename auf `TRANSITION_ELIGIBLE_SYSTEM_STATES` Slice 32 territory                                                     |
| 28          | Browser-CDP-E2E                               | Phase-0 Sweep (Dev 3)                                     | Limit-Druck                                                                                                                                                                                                                                |
| 29          | Browser-CDP-E2E                               | Phase-0 Sweep (Dev 3)                                     | Limit-Druck                                                                                                                                                                                                                                |
| 30          | Browser-CDP-E2E                               | Phase-0 Sweep (Dev 3)                                     | Limit-Druck                                                                                                                                                                                                                                |

---

## Audit-Status (Pool)

Spalten: `Status` · `Hot-Files` · `Depends-on`. Slices in Bearbeitung kommen mit `in-arbeit (Dev N, JJJJ-MM-TT)`.

| #     | Slice                                     | Status                                                                                                                                                      | Dokument                                                     |
| ----- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1     | Frame-Container                           | erledigt (Iter-1+2) — Iter-2: D-1 fix `isPrimitive()` in rename-engine, RT-16 lockt 26 Primitives, Lower-Bar Studio-Roundtrip explizit                      | [01-frame.md](01-frame.md)                                   |
| 2     | Vertical Stack (`gap N`)                  | erledigt (Iter-1+2) — Iter-2: Schema-Drift-Grep (0 Funde), Cross-Slice-Probe lockt pxify auf 5 Nachbar-Slices, Lower-Bar Studio-Roundtrip explizit          | [02-vertical-stack.md](02-vertical-stack.md)                 |
| 3     | Horizontal Stack (`hor`/wrap/spread)      | erledigt (Iter-1+2) — Iter-2: V-2 Re-Open-Adresse präzisiert (Slice 21 B/C oder Parser-Audit-Slice), V-3a Drift-Stand bestätigt, Lower-Bar Studio-Roundtrip | [03-horizontal-stack.md](03-horizontal-stack.md)             |
| 4     | 9-Positions                               | erledigt (Iter-1+2) — V-1 React-Lookup, V-2 Framework Reverse, V-3 E115, 69 RTs grün                                                                        | [04-9-positions.md](04-9-positions.md)                       |
| 5     | center / spread / ver-center / hor-center | erledigt (Iter-1) · **Sweep-pending (Dev 2 mit V-3a/V-6 aus Slice 3+4)**                                                                                    | [05-center-spread.md](05-center-spread.md)                   |
| 6     | Grid 12-col                               | erledigt (Iter-1)                                                                                                                                           | [06-grid.md](06-grid.md)                                     |
| 7     | Grid mit expliziter Position              | erledigt (Iter-1+2) — Iter-2: CDP-Schuld nachgeholt, 14/14 CDP-Tests grün, Studio-Roundtrip auf "stark" hochgestuft                                         | [07-grid-explicit-position.md](07-grid-explicit-position.md) |
| 8     | Stacked-Overlay                           | offen · Hot: react.ts/switch, layout-transformer.ts · Depends: 7                                                                                            | —                                                            |
| 9     | Padding                                   | offen · Hot: react.ts/switch, property-schema.ts · Depends: —                                                                                               | —                                                            |
| 10    | Margin                                    | offen · Hot: react.ts/switch, property-schema.ts · Depends: 9 (px-Pattern)                                                                                  | —                                                            |
| 11    | Sizing                                    | offen · Hot: react.ts/switch, layout-defaults.ts · Depends: — (löst Slice 4 V-4 ein)                                                                        | —                                                            |
| 12    | Device-Presets                            | offen · Hot: schema/property-schema.ts · Depends: 11                                                                                                        | —                                                            |
| 13    | Farben                                    | offen · Hot: react.ts/switch, theme-generator.ts · Depends: 24                                                                                              | —                                                            |
| 14    | Gradients                                 | offen · Hot: react.ts/switch, schema/colors · Depends: 13                                                                                                   | —                                                            |
| 15    | Border                                    | offen · Hot: react.ts/switch, property-schema.ts · Depends: —                                                                                               | —                                                            |
| 16    | Radius                                    | offen · Hot: react.ts/switch · Depends: —                                                                                                                   | —                                                            |
| 17    | Typografie                                | offen · Hot: react.ts/switch, schema/typography · Depends: 24                                                                                               | —                                                            |
| 18    | Effekte                                   | offen · Hot: react.ts/switch · Depends: —                                                                                                                   | —                                                            |
| 19    | Sichtbarkeit & Overflow                   | offen · Hot: react.ts/switch · Depends: —                                                                                                                   | —                                                            |
| 20    | Cursor                                    | offen · Hot: schema · Depends: —                                                                                                                            | —                                                            |
| 21    | Komponenten Definition+Verwendung         | erledigt (Iter-2 — Phase A vollständig, Phase B/C als Slice-21b/21c verschoben)                                                                             | [21-komponenten.md](21-komponenten.md)                       |
| 22    | `as`-Inheritance                          | offen · Hot: ir/transformers, property-set-expander.ts · Depends: 21                                                                                        | —                                                            |
| 23    | Kind-Slots                                | offen · Hot: ir/transformers · Depends: 21                                                                                                                  | —                                                            |
| 24    | Single-Value-Token                        | erledigt (Iter-2 — V-7/V-8/V-9, RT-17..20, Quality-Gate 9/9 ✅)                                                                                             | [24-tokens.md](24-tokens.md)                                 |
| 25    | Property-Set-Token                        | erledigt (Iter-2 — V-10/V-11/V-12, RT-17/RT-18, DOM ≡ React ≡ Framework)                                                                                    | [25-property-set-tokens.md](25-property-set-tokens.md)       |
| 26    | System-States                             | erledigt (Iter-1+2) — V-Iter2-1 STATE_PROPERTY_PREFIXES schema-derived (longest-match-fix), 5 advanced-state CDP-RTs grün, 9-Punkt-QG ✅                    | [26-system-states.md](26-system-states.md)                   |
| 27    | Custom-State `toggle()`                   | erledigt (Iter-1+2) — V-Iter2-1 STATE_BLOCK_NAMES schema-derived (LLM-pipeline pre-flight), 4 Schema-Drift-Safeguard CDP-RTs grün, 9-Punkt-QG ✅            | [27-toggle.md](27-toggle.md)                                 |
| 28    | Multi-State-Cycle                         | erledigt (Iter-1, CDP offen) · **Sweep-pending (Dev 3, CDP nachholen)**                                                                                     | [28-multi-state-cycle.md](28-multi-state-cycle.md)           |
| 29    | `exclusive()`                             | erledigt (Iter-1, CDP offen) · **Sweep-pending (Dev 3, CDP nachholen)**                                                                                     | [29-exclusive.md](29-exclusive.md)                           |
| 30    | Cross-Element-State                       | erledigt (Iter-1, CDP offen) · **Sweep-pending (Dev 3, CDP nachholen)**                                                                                     | [30-cross-element-state.md](30-cross-element-state.md)       |
| 31    | Initialer State                           | offen · Hot: parser-state · Depends: 26                                                                                                                     | —                                                            |
| 32    | State-Transitions                         | offen · Hot: schema/animation, parser-state · Depends: 26                                                                                                   | —                                                            |
| 33    | Animation-Presets                         | offen · Hot: schema/animation · Depends: 32                                                                                                                 | —                                                            |
| 34–43 | Funktionen / Aktionen (10)                | offen · Hot: schema/actions · Depends: 26 (States), teilweise 44–49 (Daten)                                                                                 | —                                                            |
| 44–49 | Daten & Bedingungen (6)                   | offen · Hot: parser/data-parser, runtime/collections · Depends: 21 (Komponenten), teilweise                                                                 | —                                                            |
| 50    | Lucide-Icons                              | erledigt (Dev 4, 2026-05-10) — V-1..V-8, 23 RTs grün, 4 Review-Iter, Quality-Gate 9/9 ✅                                                                    | [50-lucide-icons.md](50-lucide-icons.md)                     |
| 51    | Custom-Icons-Registry                     | in-arbeit (Dev 4, 2026-05-10) · Hot: schema/icons · Depends: 50 · **Phase-0 (Dev 4 parallel)**                                                              | —                                                            |
| 52    | Image                                     | offen · Hot: schema/primitives · Depends: —                                                                                                                 | —                                                            |
| 53    | Link                                      | offen · Hot: schema/primitives · Depends: —                                                                                                                 | —                                                            |
| 54    | Input                                     | offen · Hot: schema/primitives · Depends: —                                                                                                                 | —                                                            |
| 55    | Input-Mask                                | offen · Hot: schema/primitives, runtime/input-mask · Depends: 54                                                                                            | —                                                            |
| 56    | Tabellen                                  | offen · Hot: schema/primitives, ir/transformers · Depends: 21, 44–49                                                                                        | —                                                            |
| 57    | Charts                                    | offen · Hot: schema/charts, ir/transformers · Depends: 21, 44–49                                                                                            | —                                                            |
| 58–65 | UI-Patterns (8)                           | offen · Hot: studio/component-templates, schema/zag · Depends: HSP-1 (21+22+23)                                                                             | —                                                            |
| 66    | Prose-Body                                | offen · Hot: parser/prose · Depends: 21                                                                                                                     | —                                                            |
| 67–76 | Studio Edit-Loops (10)                    | offen · Hot: studio/sync, studio/visual, studio/code-modifier · Depends: HSP-1                                                                              | —                                                            |
| 77    | Color-Picker-Trigger                      | offen · Hot: studio/pickers/color · Depends: 13                                                                                                             | —                                                            |
| 78    | Token-Picker                              | erledigt (Iter-2 — V-7/V-8 Schema-Fallback + `.weight`-Fix, RT-19/RT-20)                                                                                    | [78-token-picker.md](78-token-picker.md)                     |
| 79    | Icon-Picker                               | offen · Hot: studio/pickers/icon · Depends: 50                                                                                                              | —                                                            |
| 80    | Animation-Picker                          | offen · Hot: studio/pickers/animation · Depends: 33                                                                                                         | —                                                            |
| 81    | AI-Sketch-Block                           | offen · Hot: studio/agent · Depends: HSP-1, HSP-2                                                                                                           | —                                                            |
| 82    | AI-Edit                                   | offen · Hot: studio/agent · Depends: HSP-1, HSP-2                                                                                                           | —                                                            |
| 83    | Smart-Paste / Image-Drop                  | offen · Hot: studio/agent, studio/inline-edit · Depends: 81                                                                                                 | —                                                            |
| 84    | Undo/Redo                                 | offen · Hot: studio/core/commands · Depends: HSP-1, HSP-2                                                                                                   | —                                                            |
| 85    | mirror-build CLI                          | offen · Hot: compiler/cli · Depends: — · **Phase-0 (Dev 4 parallel)**                                                                                       | —                                                            |
| 86    | mirror-compile CLI                        | offen · Hot: compiler/cli · Depends: 85 · **Phase-0 (Dev 4 parallel)**                                                                                      | —                                                            |
| 87    | mirror-validate CLI                       | offen · Hot: compiler/cli · Depends: — · **Phase-0 (Dev 4 parallel)**                                                                                       | —                                                            |
| 88    | Export-Pipeline                           | offen · Hot: tools/export · Depends: 86                                                                                                                     | —                                                            |

---

## Realistische Geschwindigkeit

- **Phase 0 (Sweep):** ~5 Tage Wall-Clock mit 4 Devs parallel.
- **Phase 1+ (Pool):** ~6–8 Wochen Wall-Clock für die 72 verbleibenden Slices (~10 Slices/Woche bei 4 Devs).
- **Cluster-Reviews:** je ~0.5 Tag, alle 10 Slices → ~3.5 Tage über die Gesamtzeit.

**Realistisches Ziel:** ~8 Wochen / 2 Monate von heute bis 100 % Coverage + alle Iter-2-Sweeps + alle Cluster-Reviews + 0 CDP-Schulden.

---

## Capability-Slices

### 1. Layout & Sizing (12)

1. **Frame-Container** — leerer Frame rendert als `<div>`
2. **Vertical Stack** — `gap N` zwischen Kindern
3. **Horizontal Stack** — `hor`, gap, optional `wrap`
4. **9-Positions** — `tl`/`tc`/`tr`/`cl`/`center`/`cr`/`bl`/`bc`/`br`
5. **center / spread / ver-center / hor-center**
6. **Grid 12-col** — `grid 12`, `w 4`, `row-height`
7. **Grid mit expliziter Position** — `x`/`y`/`w`/`h`
8. **Stacked-Overlay** — Kinder übereinander
9. **Padding** — `pad N`, `pad-x/y/t/r/b/l`, Kombinationen
10. **Margin** — `mar`, `mar-x/y/t/r/b/l`
11. **Sizing** — `w/h`, `full`/`hug`, `minw/maxw`, `grow/shrink`, `aspect`
12. **Device-Presets** — `mobile`/`tablet`/`desktop` als Frame oder Canvas

### 2. Styling (8)

13. **Farben** — Hex, Named, rgba, Hex+Alpha
14. **Gradients** — `grad`/`grad-ver`/`grad 45`
15. **Border** — `bor`, `boc`, side-spezifisch (`bor 0 0 1 0`)
16. **Radius** — inkl. `rad 99` (Kreis)
17. **Typografie** — `fs`/`weight`/`font`/`italic`/`underline`/`uppercase`/`line`/`truncate`/`text-align`
18. **Effekte** — `shadow sm/md/lg`, `opacity`, `blur`, `backdrop-blur`
19. **Sichtbarkeit & Overflow** — `hidden`/`visible`/`clip`/`scroll`
20. **Cursor**

### 3. Komponenten & Tokens (5)

21. **Komponenten-Definition & -Verwendung** — `Btn:` / `Btn "Text"`, Property-Override an Use-Site
22. **`as`-Inheritance** — `PrimaryBtn as Button: ...`, mehrstufig (`as Btn`)
23. **Kind-Slots** — `Card: ... \n Title: ... \n Desc: ...` + Use-Site mit benannten Slots
24. **Single-Value-Token** — `primary.bg:`, Suffix-Mapping bei `bg $primary`
25. **Property-Set-Token** — `btnbase: pad ..., rad ...` + Mehrfach-Spread

### 4. States & Animationen (8)

26. **System-States** — `hover:`/`focus:`/`active:`/`disabled:`
27. **Custom-State `toggle()`** — Klick wechselt 2 Bodies
28. **Multi-State-Cycle** — todo → doing → done bei wiederholtem Klick
29. **`exclusive()`** — Tab-Gruppe, nur einer aktiv
30. **Cross-Element-State** — `MenuBtn.open: visible`
31. **Initialer State** — `Btn "Aktiv", on`
32. **State-Transitions** — `hover 0.15s:`, `on 0.2s ease-out:`
33. **Animation-Presets** — `anim pulse/bounce/shake/spin`

### 5. Funktionen / Aktionen (10)

34. **Sichtbarkeit** — `show(X)`, `hide(X)`
35. **Counter** — `increment`/`decrement`/`set`/`reset`
36. **Toast-Varianten** — default/error/warning/info × Positionen
37. **Input-Control** — `focus(F)`/`clear(F)`/`setError`/`clearError`
38. **Navigation** — `navigate(View)`/`back()`/`forward()`/`openUrl(...)`
39. **Scroll** — `scrollToTop`/`scrollToBottom`/`scrollTo(Section)`
40. **Clipboard** — `copy("...")` + Toast-Kombi
41. **CRUD** — `add(list, ...)` / `remove(item)` (mit `each`)
42. **Action-Verkettung** — mehrere Funktionen pro Element
43. **List-Nav** — `loop-focus`, `typeahead`, `highlightNext/Prev`, `selectHighlighted`

### 6. Daten & Bedingungen (6)

44. **Variablen** — `name: ...`, `$name`, Interpolation in Strings
45. **Verschachtelte Objekte** — `user.name`/`user.role`
46. **Sammlungen + `each`** — Iteration
47. **Aggregationen** — `.count`/`.first`/`.last`
48. **Block-Conditional** — `if`/`else`, Vergleichs- und Bool-Ops
49. **Inline-Ternary + `bind`** — `done ? "X" : "Y"`, `bind varName`

### 7. Inhalt-Primitives (8)

50. **Lucide-Icons** — Name, `is`, `ic`, `fill`
51. **Custom-Icons-Registry** — `$icons:` mit Pfad-Daten
52. **Image** — `src`, Sizing
53. **Link** — `href`
54. **Input** — placeholder, type, disabled
55. **Input-Mask** — `###.####`/`AAA-###`/`##'###.##`
56. **Tabellen** — statisch, datengebunden, `where`/`by`
57. **Charts** — Line/Bar/Pie/Donut/Area + Title/Axes/Grid/Point/Line

### 8. UI-Patterns (Pure-Mirror + Zag) (8)

58. **Dialog** — Trigger/Backdrop/Content/CloseTrigger
59. **Tooltip** — Trigger/Content + `positioning`
60. **Tabs** — `defaultValue`, mehrere `Tab`s
61. **Select** — Trigger + Items, `trigger-text`, Keyboard-Nav
62. **Checkbox / Switch** — `checked`, Toggle-Verhalten
63. **Slider** — value/min/max/step
64. **RadioGroup** — `value`, `RadioItem value "..."`
65. **DatePicker (Zag)** — selectionMode/range/min/max/locale

### 9. Prose-Mode (1)

66. **Prose-Body** — `, prose` mit Markdown-Untermenge → `BodyTxt`/`DashItem`/`H2`-Mappings

### 10. Studio Edit-Loops (10)

67. **Paste DSL → Preview rendert**
68. **Bidirektionaler Sync** — Code-Edit ↔ Preview-Update; Klick im Preview → Cursor im Code
69. **Property-Panel-Roundtrip** — Klick im Preview → Properties anzeigen → ändern → Code-Update
70. **Drag & Resize** — Direktmanipulation aktualisiert Code
71. **Padding/Margin/Gap-Handles** — visuelle Spacing-Editierung
72. **Snap** — Alignment / Grid-Cell / Spacing
73. **Smart-Guides** — Live-Linealien während Drag
74. **Multi-Selection + Distribution** — gleichmäßige Abstände
75. **Drop aus Komponenten-Panel** — in Preview oder Editor
76. **Inline-Edit + F2-Rename** — Text-Slot ändern, Komponenten/Token umbenennen über alle Verwendungen

### 11. Studio Pickers & AI & Tooling (12)

77. **Color-Picker-Trigger im Code** — Hex-Wert öffnet Picker
78. **Token-Picker** — kontextabhängige Token-Liste
79. **Icon-Picker** — Lucide-Suche + Custom
80. **Animation-Picker** — Preset wählen
81. **AI-Sketch-Block** — `-- ... --` → AI generiert Mirror-Code
82. **AI-Edit** — Selektion + Prompt → Patch
83. **Smart-Paste / Image-Drop** — Bild → Mirror-Code
84. **Undo/Redo** — Command-Pattern über alle Edit-Quellen
85. **`mirror-build` CLI** — Single-File + Project, `--minify`, `--external-*`, `--watch`
86. **`mirror-compile` CLI** — JS- und React-Output, `--project`
87. **`mirror-validate` CLI** — Schema-Errors, `--json`
88. **Export-Pipeline** — React/Vue/Svelte/Vanilla, `--snapshot`, `--incremental`, `--run`
