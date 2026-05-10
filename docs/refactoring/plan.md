# Mirror Refactoring — Gesamtplan

Vertikale, end2end prüfbare User-Fähigkeiten („Capability-Slices"). Jeder Slice wird einzeln entlang von 6 Dimensionen auditiert; Befunde werden als nummeriertes Audit-Dokument abgelegt; Follow-up-Tickets stehen am Ende jedes Audits.

**~88 Slices in 11 Surfaces.**

---

## Vorgehen

**Pro Slice:**

1. Audit gemäß den 6 Prüf-Dimensionen
2. Probes / Mini-Mirror-Beispiele dokumentieren — **Probe-Skripte committen** unter `tools/probes/slice-NN.ts` (nicht `/tmp`). Begründung aus Slice-4-Erfahrung: Cross-Slice-Re-Probes brauchen die Original-Skripte; ephemere `/tmp`-Files brechen die Reproducibility und zwingen den Nachfolger, die Probe-Geometrie selbst zu rekonstruieren.
3. Bewertung pro Dimension (stark / mittel / schwach)
4. Follow-up-Tickets (Bugs, Architektur, Cleanup)
5. Ergebnis als `XX-<name>.md` ablegen (XX = Slice-Nummer 2-stellig), Audit-Status-Tabelle aktualisieren
6. Implementierung in Runden — pro Phase ein Commit (in Praxis bündelt lint-staged / paralleles Slice-Work mehrfach; Plan-Realität: ein Commit pro Phase ist Ziel, nicht hartes Gesetz)
7. **Review-Pass nach Implementierung** (verbindlich, kein Skip):
   - Probe-Tabelle im Audit-Doc gegen den Post-Fix-Stand spiegeln (alle 🔴/🟡/🟠 die jetzt grün sind, müssen grün gemacht werden — sonst lügt das Doc). Re-Run gegen das committete Probe-Skript aus Step 2; Diff zwischen Skript-Output und Tabelle = sofortige Iter-N-Trigger.
   - Jede RT aus dem Audit-Plan effektiv schreiben oder begründet streichen — ein Plan-RT ohne Test ist eine offene Lücke, kein erledigter Punkt
   - **Schema-Drift-Grep** (verbindlich): wenn der Slice eine Schema-Liste erweitert hat (z. B. system-states von 4 → 13), repo-weit nach den alten enum-Werten greppen (`grep -rEn "['\"]hover['\"].*['\"]focus['\"]" --include="*.ts" compiler/ studio/ tests/`). Jede gefundene Stelle muss entweder schema-derived gemacht oder explizit als „bewusster Scope" dokumentiert werden. Das ist die Heuristik aus dem Slice-26/27/29-Cluster: ohne diesen Grep findet der Audit den Compiler, aber nicht den Sync-Layer / Syntax-Highlighter / etc.
   - **Cross-Slice-Probe**: wenn ein Helper neu eingeführt wurde (z. B. `isToggleableStateName` für `toggle()`), den Helper aktiv gegen die _Nachbar-Slices_ derselben Bug-Familie testen (`exclusive()`, `cycle()`, …). Eine RT pro Nachbar-Slice mit demselben Edge-Case (System-State im Body) ist die Versicherung, dass die Reform nicht nur den auditierten Slice, sondern die Familie deckt.
   - **Cross-Slice-Scope-Entscheidung** (wenn ein Fix Nachbar-Slices berührt — Slice-2-V-1 vs. Slice-4-V-2 Erfahrung):
     - **In-scope-fix**, wenn: (a) ein bereits existierender Helper trivial auf den Nachbar-Pfad angewendet werden kann (Slice 2: `pxify()` einmal geschrieben → 11 properties) UND (b) der Nachbar-Slice noch kein abgeschlossenes Audit hat (kein Risiko, dort eine andere Entscheidung zu unterlaufen).
     - **Deferred-Lock-RT**, wenn: (a) das Fixen in den Nachbar-Slice-Scope reichen würde (eigene Helper-Entscheidungen, eigene Probe-Tabelle nötig — Slice 4: `ver-center`/`hor-center` braucht `singleAxisCenterToFlex`, nicht `nineZoneToFlex`) ODER (b) der Nachbar-Slice schon „erledigt" ist (Behavior-Locks dort sind kanonisch — eine Verhaltens-Verschiebung ohne deren Audit ist Drift).
     - Egal welcher Pfad: das Verhalten muss per RT (in-scope-Test oder deferred-state-lock-RT) festgenagelt werden, damit der Nachbar-Slice die Erwartung kennt.
   - Alle 6 Prüf-Dimensionen gegen den neuen Stand re-verifizieren, **inklusive Cross-Backend-Konsistenz** (DOM ≡ React ≡ Framework-Export — wenn ein Backend ausgelassen wurde, ist der Slice nicht fertig) und **Studio-Roundtrip**:
     - Idealer Modus: Click im Preview → Property-Panel → Code-Edit → DOM-Update bleibt konsistent (Browser-CDP).
     - Pragmatischer Lower-Bar-Modus (für Slices, die nur Backend/Compiler ändern und kein neues Studio-UI bringen): **DOM-Backend cross-backend gelocked + Property-Panel-Test existiert + ggf. jsdom-Smoke-Check via studio/test-api**. Diese Variante muss im Audit-Doc explizit benannt sein („Studio-Roundtrip: Lower-Bar — DOM-Pfad gelocked via RT-X, kein CDP-Run") — anders als Hand-wave, das Slice 1/3/4 unbewusst gemacht haben.
   - Audit-Doc-Status auf `erledigt` erst nach diesem Pass; offene Sub-Tasks bleiben nicht als „done" verkleidet stehen — entweder umsetzen oder explizit als Follow-up dokumentieren mit Begründung warum verschoben
   - **Iterieren bis sauber:** der Review-Pass ist nicht ein einziger Durchlauf, sondern eine Schleife. Jede gefundene Issue (neue Drift, unehrliche Probe-Tabelle, fehlende RT, übersehene Cross-Slice-Wirkung) wird gefixt, danach wird der gesamte Review-Pass _erneut_ durchlaufen — denn der Fix kann selbst neue Issues erzeugen. Erst wenn ein vollständiger Durchlauf 0 neue Findings produziert, ist der Slice review-fertig. „Wir machen's beim nächsten Slice" ist Drift-Hülle, nicht Abschluss.
   - **Re-Open-Protokoll** (wenn ein als „erledigt" markierter Slice nachträglich neue Findings bekommt — Slice-4-Erfahrung): die Iter-1-Tabelle wird **nicht überschrieben**. Stattdessen: neue „Iter N" Sektion anhängen, alte Status-Zeilen mit „(Iter 1: …)" markieren, Status-Header oben mit der höchsten Iter-Nummer aktualisieren. Damit bleibt nachvollziehbar, _was_ in Iter-1 übersehen wurde — der nächste Slice profitiert von dem Lerneffekt, statt ihn neu zu entdecken.
8. **Quality-Gate vor Slice-Abschluss — mechanische Checkliste** (alle Punkte müssen ✅ sein, sonst Status-Reset auf „erledigt" zurücksetzen):
   1. Audit-Doc-Probe-Tabelle enthält **keinen 🔴-Marker außer in einer expliziten „deferred"/„out-of-scope"-Spalte** (kein 🔴 das einfach nur „noch nicht gefixt" bedeutet).
   2. Alle Phase-Tabellen-Stati ∈ {`erledigt`, `verschoben`, `verworfen`}; kein `pending`/`offen`/`in-arbeit`.
   3. Jeder RT-Plan-Eintrag hat einen geschriebenen Test (RT-Tabelle Spalte `Status` = `erledigt`, kein `pending`).
   4. Schema-Drift-Grep wurde explizit ausgeführt; gefundene Stellen sind entweder gefixt oder mit Begründung dokumentiert.
   5. Cross-Slice-Wirkung wurde geprüft; betroffene Nachbar-Slices haben entweder einen In-scope-Fix oder einen Deferred-Lock-RT (siehe Cross-Slice-Scope-Entscheidung in Step 7).
   6. Cross-Backend-Differential-RT existiert für jedes Property/Verhalten, das ≥ 2 Backends emittieren (DOM, React, Framework).
   7. Studio-Roundtrip ist explizit benannt: entweder „CDP-Run grün" oder „Lower-Bar: DOM gelocked via RT-X". Hand-wave („Studio nutzt DOM-Backend, also ok") **zählt nicht**.
   8. Vitest gesamt grün; vor-Slice-Vergleich bestätigt: keine Test-Subtraction, nur Addition.
   9. Wer auf „ist das nun richtig gut?" mit „substantiell besser, aber …" antwortet, hat Punkt 1–8 nicht durchlaufen — Slice ist nicht abgeschlossen.
9. **Schulden-Tracking & Cluster-Reviews** (verbindlich, ergänzt Step 7+8):
   1. **Cluster-Review-Pflicht an Phasengrenzen.** Vor Übergang von „Fundament (1–25)" → „States & Daten (26–49)" → „Inhalt & Patterns (50–66)" → „Studio-Loops (67–84)" → „CLIs & Export (85–88)" muss ein **Cluster-Review** durchgeführt werden, der den mechanischen Quality-Gate-Checklist (Step 8) über alle Slices der abgeschlossenen Phase laufen lässt. Phase-Übergang ohne Cluster-Review = Drift wird in nächste Phase gebaut. Stichprobe ≥ 3 Slices pro Phase, Pflicht-Slices: jeder mit „verschoben"/„deferred"-Markern und jeder mit „⚠️ offen"-Status.
   2. **Browser-CDP-Schuld-Limit: max 5.** Maximal 5 Slices dürfen gleichzeitig „Browser-CDP-E2E ⚠️ offen" tragen. Sobald das Limit erreicht ist, wird die CDP-Schuld der ältesten 2 Slices abgearbeitet, _bevor_ neue Slices mit Studio-Touchpoint angefangen werden. Aktueller Stand bei Plan-Update: 6 offen → schon über Limit, Slice 26 + 27 sind als nächstes fällig.
   3. **Slice-21-Probe-Pflicht.** Jeder Slice ab #5, dessen Probe-Skript Komponenten verwendet (`Btn:` o. ä.), muss einen expliziten Probe gegen Slice-21-deferred-Cases haben — entweder „Komponenten nicht touched" oder „diese B/C-Edge-Case wurde getestet". Komponenten ist die zentrale Abstraktion; ein partial Slice 21 darf nicht silent in 50 Slices propagieren.
   4. **Re-Open-Trigger mit Ziel-Slice.** Jedes als „deferred"/„verschoben" markierte Item bekommt einen **Ziel-Slice oder Ziel-Phase** im Audit-Doc. „Verschoben für später" ohne Adresse = unsichtbarer Drift. Format: `V-2 deferred — Ziel: Slice 5 V-3 (single-axis-center-helper)` statt `verschoben`. Beim Ziel-Slice-Audit MUSS die Re-Open-Liste mit allen darauf adressierten deferred-Items als erstes geprüft werden.

**Reihenfolge:**

1. Fundament zuerst (Slices 1–25): Layout, Styling, Komponenten, Tokens
2. States & Daten (26–49)
3. Inhalt & Patterns (50–66)
4. Studio-Loops (67–84)
5. CLIs & Export (85–88)

---

## Parallel-Arbeit

Nach Slice 4–7 ist klar: lint-staged-Stomping, Commit-Absorption und überlappende
Audit-Doc-Edits passieren, wenn mehrere Agenten gleichzeitig direkt auf `main`
arbeiten. Folgende Konvention macht parallele Arbeit deterministisch:

### Tracks

Slices verteilen sich auf vier weitgehend orthogonale Tracks (basierend auf
shared-file-Analysis):

- **Track A — Layout & Styling** (Slices 1–20): primär `compiler/backends/*`,
  `compiler/schema/*`, `compiler/ir/transformers/*`. Stark sequentiell, weil
  alle Slices dieselben Backend-switch-Statements anfassen.
- **Track B — States & Daten** (Slices 26–49): primär
  `compiler/parser/state-*`, `compiler/runtime/*`, `studio/sync/*`,
  `studio/code-modifier/*`. Wenig Overlap mit Track A.
- **Track C — Studio-Loops** (Slices 67–84): primär `studio/panels/*`,
  `studio/visual/*`, `studio/pickers/*`, `studio/preview/*`. Komplett
  separater Code-Bereich.
- **Track D — CLIs & Export** (Slices 85–88): `compiler/cli/*`, `tools/*`.
  Eigene Domäne.

**Dependencies:** Track A ist Voraussetzung für B (States bauen auf Layout-
Primitives auf) und C (Studio rendert Layout-Primitives). Slice 21 (Komponenten)
ist Voraussetzung für ALLE Pattern-/Studio-Slices und MUSS vor Track-C-Start
phase-B/C-fertig sein.

**Realistischer Parallel-Modus ab heute:**

- Track A läuft sequentiell weiter (Slice 8+).
- Track B kann **parallel** beginnen mit den State-Slices, deren DSL nicht
  von Layout-Slices >7 abhängt (Slices 26, 27, 29, 30 sind bereits Phase-A
  fertig — ideal für CDP-Schuld-Abarbeitung).
- Track C startet erst, wenn Slice 21 vollständig erledigt ist.
- Track D kann jederzeit als Solo-Spur laufen.

### Slice-Claiming-Protokoll

Vor Beginn eines Slices wird die Audit-Status-Tabelle in `plan.md` editiert:

```
| 8 | Stacked-Overlay | **in-arbeit (Agent X, 2026-05-11)** | [08-stacked.md] |
```

Der Slice ist „claimed" sobald der Commit auf `main` ist. Andere Agenten
sehen das beim eigenen `plan.md`-Read und wählen einen anderen Slice. Bei
Slice-Abschluss wird der Status auf `erledigt — …` aktualisiert und der
nächste Slice claimed werden.

### Worktree-Konvention

Jeder Track nutzt ein eigenes `git worktree` unter `../mirror-trackA/`,
`../mirror-trackB/` etc. Lint-staged läuft pro Worktree, kann andere
Tracks nicht stomping. Merge in `main` per `git merge --no-ff` aus dem
Worktree heraus (kein Force-Push).

### Shared-Resource-Reservation

Damit Tracks nicht in dieselben Number-Buckets schreiben:

- **Validator Error-Codes (`compiler/validator/types.ts`):**
  - E1xx: Layout (Track A) — bisher belegt: E101–E115
  - E2xx: Events (Track B) — bisher belegt: E200–E201
  - E3xx: States (Track B)
  - E4xx: Cross-Element (Track B) — bisher belegt: E404–E405
  - E5xx: Tokens (Track A für 24/25, sonst Track A)
  - W-Codes pro Domain entsprechend
- **CSS-Var-Präfixe:** `--<token-name>-<suffix>`-Konvention bleibt;
  Track A reserviert die Layout-Suffixe (`-x`, `-y`, `-w`, `-h`, `-grid`,
  `-pad`, `-mar`, `-gap`, `-rad`).
- **Test-File-Namespaces:** `slice-NN-<short-name>.test.ts` — durch die
  Slice-Nummer kollidiert nichts.

### Merge-Protokoll für Track-Übergreifende Änderungen

Wenn ein Track an Helper-Files muss, die ein anderer Track gerade aktiv
nutzt (z. B. `compiler/schema/layout-defaults.ts`):

1. Track-übergreifender Helper-Vorschlag wird in eigenem Commit auf `main`
   gemergt, bevor beide Tracks ihn nutzen.
2. Beide Tracks rebase ihre Worktrees gegen `main` vor dem nächsten Commit.
3. Wenn beide Tracks denselben Helper gleichzeitig brauchen: einer der
   Tracks pausiert kurz, der andere mergt zuerst, dann rebase + weiter.

**Was NICHT parallel geht:** zwei Slices, die denselben switch-case in
`react.ts` oder `framework.ts` erweitern. Beide müssen sequentiell oder
über einen schema-derived Lookup laufen, damit es _keinen_ switch mehr
gibt (Slice 4 V-1 ist das Vorbild — `nineZoneToFlex` statt 18 cases).

---

## Prüf-Dimensionen

1. **Architektur** — Modulgrenzen, Abhängigkeiten, Patterns, passt der Slice zur Gesamtstruktur?
2. **Codequalität** — Lesbarkeit, Naming, Komplexität, Duplikation, Clean-Code-Prinzipien, **Dead Code** (ungenutzte Exports/Branches/Files)
3. **Testqualität** — sind Tests sinnvoll, robust, deterministisch, gute Assertions?
4. **Testabdeckung** — was wird abgedeckt, was nicht (Edge-Cases, Fehlerpfade)?
5. **Funktionale Korrektheit** — tut der Slice tatsächlich, was DSL/Tutorial verspricht? Inkl. Cross-Backend-Konsistenz (DOM ≡ React ≡ Framework-Export) und DX (Fehlermeldungen bei kaputtem Input)
6. **Studio-Roundtrip** — Code ↔ Preview ↔ Property-Panel ↔ Drag/Resize-Handles: bleibt der Slice an jeder Edit-Quelle konsistent?

---

## Audit-Status

| #   | Slice                                     | Status                                                                                                                                                                      | Dokument                                                     |
| --- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 24  | Single-Value-Token                        | erledigt                                                                                                                                                                    | [24-tokens.md](24-tokens.md)                                 |
| 1   | Frame-Container                           | erledigt                                                                                                                                                                    | [01-frame.md](01-frame.md)                                   |
| 25  | Property-Set-Token                        | erledigt                                                                                                                                                                    | [25-property-set-tokens.md](25-property-set-tokens.md)       |
| 21  | Komponenten-Definition & -Verwendung      | Phase A erledigt · B/C verschoben                                                                                                                                           | [21-komponenten.md](21-komponenten.md)                       |
| 26  | System-States                             | DOM+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                                                                                      | [26-system-states.md](26-system-states.md)                   |
| 27  | Custom-State `toggle()`                   | DOM+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                                                                                      | [27-toggle.md](27-toggle.md)                                 |
| 78  | Token-Picker (Studio)                     | erledigt                                                                                                                                                                    | [78-token-picker.md](78-token-picker.md)                     |
| 29  | `exclusive()`                             | DOM+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                                                                                      | [29-exclusive.md](29-exclusive.md)                           |
| 28  | Multi-State-Cycle                         | Compile+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                                                                                  | [28-multi-state-cycle.md](28-multi-state-cycle.md)           |
| 2   | Vertical Stack (`gap N`)                  | erledigt (Phase 1 + Phase 2: gap-x/gap-y, Chain in React, Shorthand)                                                                                                        | [02-vertical-stack.md](02-vertical-stack.md)                 |
| 3   | Horizontal Stack (`hor`/wrap/spread)      | erledigt — V-1 React-Defaults gelocked (B-1); V-2/V-3a deferred mit Code-Kommentar + Test-Lock; 31 RTs grün                                                                 | [03-horizontal-stack.md](03-horizontal-stack.md)             |
| 30  | Cross-Element-State                       | Compile+Validator+Sync erledigt · Browser-CDP+Studio-Roundtrip offen                                                                                                        | [30-cross-element-state.md](30-cross-element-state.md)       |
| 6   | Grid 12-col                               | erledigt — V-1 React Grid-Container, V-2 React parent-context-Child, V-3 Framework Reverse, V-4 Token-Resolution, V-5 Validator E105; 19 RTs grün; B-1..B-9 alle zu         | [06-grid.md](06-grid.md)                                     |
| 4   | 9-Positions                               | erledigt — V-1 React-9-zone-Lookup, V-2 Framework reverse-map, V-3 E115 grid+flex-alignment, 63 RT-Subtests grün                                                            | [04-9-positions.md](04-9-positions.md)                       |
| 5   | center / spread / ver-center / hor-center | erledigt — V-1 Schema-Helper, V-2 React, V-3 DOM≡React-Tabelle, V-4 Framework Inverse-Helper, V-5 Studio-Disclosure (31 RTs grün)                                           | [05-center-spread.md](05-center-spread.md)                   |
| 7   | Grid mit expliziter Position              | erledigt — V-1 Token x/y, V-2 dedup, V-3 React grid+hor, V-4/V-5 Studio Position-Section grid-aware, V-6 w/h: { min: 1 }, V-7 schema sentinel (24 RTs + 8 Studio-RTs gruen) | [07-grid-explicit-position.md](07-grid-explicit-position.md) |

---

## Re-Open-Tracking (Deferred Items mit Ziel-Slice)

Per Step 9.4: jedes als „verschoben"/„deferred" markierte Item bekommt
hier eine Adresse. Wenn der Ziel-Slice gestartet wird, MUSS diese Liste
zuerst geprüft werden — die deferred-Items werden in den Probe-Plan und
die Phase-Tabelle des Ziel-Slices integriert.

| Quell-Slice | Item                             | Ziel                                               | Begründung                                                              |
| ----------- | -------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 1           | Phase B (Studio-Roundtrip-CDP)   | Phase-Boundary-Cluster-Review (Slice 25 → 26)      | DOM gelocked, CDP-Run nachholen vor Track-B-Übergang                    |
| 3           | V-2 (W120 Validator-Branch)      | Slice-Cluster Parser-Strict (geplant ≈ Slice 22)   | Parser-aware Change nötig, kein Validator-only-Fix                      |
| 3           | V-3a (Schema-Drift hor center)   | Slice 5 (center-Familie) bzw. dedicated Schema-PR  | Size-State-CSS-emit-Pfad muss mitbetrachtet werden                      |
| 4           | V-4 (align-self+width DOM/React) | Slice 11 (Sizing)                                  | Sizing-Slice owned die stretch-vs-width-Policy                          |
| 4           | V-5 (stacked + 9-zone)           | Slice 8 (Stacked-Overlay)                          | Stacked-Slice owned die stacked-Layout-Mode-Konflikte                   |
| 4           | V-6 (Framework `top`/`left`/…)   | Slice 5 (Single-Axis-Center)                       | Single-axis-alignment-Familie                                           |
| 5           | Browser-CDP-E2E                  | CDP-Schuld-Abarbeitung (vor Track-C-Start)         | Lower-Bar gelocked; CDP nachzuholen wenn Limit (Step 9.2) erreicht      |
| 7           | Browser-CDP-Studio-Roundtrip     | CDP-Schuld-Abarbeitung (vor Track-C-Start)         | Lower-Bar gelocked; CDP nachzuholen wenn Limit (Step 9.2) erreicht      |
| 21          | Phase B/C (Komponenten-Vollst.)  | **Slice 21 Phase B (höchste Prio vor Track C)**    | Komponenten ist Voraussetzung für Pattern/Studio-Cluster — nicht später |
| 26          | Browser-CDP-E2E                  | CDP-Schuld-Abarbeitung (Slice 26 + 27 als nächste) | Limit-überschreitend — Track B Erst-Aktion                              |
| 27          | Browser-CDP-E2E                  | CDP-Schuld-Abarbeitung (Slice 26 + 27 als nächste) | Limit-überschreitend — Track B Erst-Aktion                              |
| 28          | Browser-CDP-E2E                  | CDP-Schuld-Abarbeitung (Slice 26+27 zuerst)        | Wartet hinter 26+27                                                     |
| 29          | Browser-CDP-E2E                  | CDP-Schuld-Abarbeitung (Slice 26+27 zuerst)        | Wartet hinter 26+27                                                     |
| 30          | Browser-CDP-E2E                  | CDP-Schuld-Abarbeitung (Slice 26+27 zuerst)        | Wartet hinter 26+27                                                     |

**Aktuelle CDP-Schuld-Zähler (Step 9.2):** 6 offen → über Limit. Nächste
Track-B-Aktion ist verpflichtend Slice 26 + 27 CDP-Run, BEVOR weitere
Slices mit Studio-Touchpoint angefangen werden.

---

## Parallel-Plan: 4 Entwickler

**Ausgangslage:** 16 Slices erledigt, 72 Slices offen, plus Schulden-Backlog
(6 CDP-offen, Slice 21 Phase B/C deferred, 12 deferred V-Items, 1 Iter-2-
Stichprobe). Geschätztes Volumen: ~82 Slice-Units.

**Annahme:** 4 Entwickler arbeiten parallel, jeder im eigenen `git worktree`,
mergen periodisch über `main`. Slice-Claim per Edit der Audit-Status-Tabelle
(siehe Parallel-Arbeit-Sektion oben).

### Rollen-Aufteilung (Phase-1, ca. 3 Wochen)

| Dev   | Rolle                                 | Slices Phase 1 (~10–14 Tage)                                                                                                                           | Schulden-Aufgaben                                        |
| ----- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Dev 1 | **Compiler-A: Layout**                | 8 Stacked-Overlay → 9 Padding → 10 Margin → 11 Sizing → 12 Device-Presets                                                                              | Iter-2-Stichprobe Slice 24 vor Slice 8                   |
| Dev 2 | **Compiler-B: Komponenten + Styling** | **Slice 21 Phase B/C abschließen** (BLOCKER für Dev 4) → 22 `as`-Inheritance → 23 Kind-Slots → 13 Farben → 14 Gradients → 15 Border → 16 Radius        | Iter-2-Stichprobe Slice 21 vor Phase-B/C-Start           |
| Dev 3 | **States & Behavior**                 | **CDP-Schuld 26 + 27 abarbeiten** (Limit-Druck) → 31 Initialer State → 32 State-Transitions → 33 Animation-Presets → CDP-Schuld 28 + 29 + 30           | Iter-2-Stichprobe Slice 26 zusammen mit CDP-Schuld       |
| Dev 4 | **Inhalt-Primitives + CLI**           | 50 Lucide-Icons → 51 Custom-Icons → 52 Image → 53 Link → 54 Input → 55 Input-Mask + CLI-Spur: 85 mirror-build → 86 mirror-compile → 87 mirror-validate | Probe-Skripte committen für jeden Slice (Step 2 enforce) |

**Phase-1-Gesamt:** 16+ Slices in 4 Tracks. Jeder Dev macht 4–6 Slices plus
seine Schulden-Aufgabe. Ende Phase 1: ~32/88 erledigt.

**Phase-1 Sync-Punkt** (Pflicht):

- Cluster-Review **Layout 1–12** (Dev 1 zieht alle Layout-Slice-Audits durch
  den mechanischen Quality-Gate-Checklist; Stichprobe ≥ 3 Slices).
- Cluster-Review **States/Behavior 26–33** (Dev 3, mit CDP-Schuld als
  Eingangstor).
- **Vor Phase 2:** Slice 21 muss vollständig erledigt sein, sonst Dev 4
  Phase-2-Start blockiert.

### Phase 2 (ca. 3 Wochen)

| Dev   | Slices Phase 2                                                                                                | Bemerkung                                                            |
| ----- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Dev 1 | 17 Typografie → 18 Effekte → 19 Sichtbarkeit → 20 Cursor                                                      | Styling-Tail; Helper aus Slice 17 möglich groß                       |
| Dev 2 | Cluster-Review Komponenten/Tokens 21–25 → 44 Variablen → 45 Objekte → 46 Sammlungen + each → 47 Aggregationen | Wechsel auf Daten-Cluster, Komponenten als Voraussetzung gelegt      |
| Dev 3 | 34 Sichtbarkeit → 35 Counter → 36 Toast → 37 Input-Control → 38 Navigation → 39 Scroll → 40 Clipboard         | Functions-Cluster, kein Studio-Touchpoint nötig                      |
| Dev 4 | 56 Tabellen → 57 Charts → 58 Dialog → 59 Tooltip → 60 Tabs → 88 Export-Pipeline                               | UI-Patterns-Start (braucht Slice 21 done) + Export-Pipeline parallel |

**Phase-2-Gesamt:** 25 Slices. Ende Phase 2: ~57/88 erledigt.

**Phase-2 Sync-Punkt:**

- Cluster-Review **Styling 13–20** (Dev 1).
- Cluster-Review **Komponenten/Tokens/Daten 21–25 + 44–49** (Dev 2 + Dev 3
  gemeinsam).
- **CDP-Schuld neu zählen** — wenn wieder über 5, Schulden vor Phase 3
  abarbeiten.

### Phase 3 (ca. 3 Wochen)

| Dev   | Slices Phase 3                                                                                               | Bemerkung                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Dev 1 | 67 Paste-DSL → 68 Bidirektional-Sync → 69 Property-Panel-Roundtrip → 70 Drag & Resize                        | Studio-Loops-Start (Studio-Edit-Pfade)                       |
| Dev 2 | 41 CRUD → 42 Action-Verkettung → 43 List-Nav → 48 Block-Conditional → 49 Inline-Ternary + bind               | Funktionen-Tail + Daten-Tail                                 |
| Dev 3 | 61 Select → 62 Checkbox/Switch → 63 Slider → 64 RadioGroup → 65 DatePicker → 66 Prose                        | UI-Patterns-Tail + Prose                                     |
| Dev 4 | 71 Padding/Margin/Gap-Handles → 72 Snap → 73 Smart-Guides → 74 Multi-Selection → 75 Drop → 76 Inline-Edit/F2 | Studio Visual-Editor (großer Brocken; ggf. teilen mit Dev 1) |

**Phase-3-Gesamt:** ~25 Slices. Ende Phase 3: ~82/88 erledigt.

### Phase 4 — Final (ca. 1 Woche)

Verbleibend: **77 Color-Picker-Trigger, 79 Icon-Picker, 80 Animation-Picker,
81 AI-Sketch-Block, 82 AI-Edit, 83 Smart-Paste, 84 Undo/Redo**. Plus
Cluster-Review aller fünf Phasen, Final-Quality-Gate-Sweep, ggf. Restschulden
(deferred V-Items aus Re-Open-Tracking).

| Dev   | Phase 4                                                                 |
| ----- | ----------------------------------------------------------------------- |
| Dev 1 | 84 Undo/Redo + Final-Cluster-Review aller Phasen                        |
| Dev 2 | 77 Color-Picker + 79 Icon-Picker                                        |
| Dev 3 | 80 Animation-Picker + 83 Smart-Paste                                    |
| Dev 4 | 81 AI-Sketch-Block + 82 AI-Edit (komplex, Größenvergleich mit Slice 78) |

### Konflikt-Prevention-Regeln

1. **`compiler/backends/react.ts` Switch-Statements:** wenn Dev 1 + Dev 2 +
   Dev 3 alle gleichzeitig Cases ergänzen würden → Helper extrahieren. Slice
   4 V-1 (`nineZoneToFlex`) ist das Vorbild: schema-derived Lookup statt
   Switch ⇒ kein Merge-Konflikt mehr. **Regel:** wenn ein Dev einen 4. Case
   in einem Switch ergänzt, der nächste Dev macht den Refactor zu Lookup
   bevor seine Cases dazukommen.

2. **Validator E-Codes:** jeder Track reserviert seinen E-Code-Range
   (E1xx Layout, E2xx Events, E3xx States, E4xx Cross-Element, E5xx Tokens).
   Dev 1+2 teilen sich E1xx/E5xx; Dev 3 eigentliche E2xx+E3xx; Dev 4 W-Codes
   für Inhalt/UI. Vor jedem neuen E-Code: `git pull` + `grep "E1[0-9][0-9]"
compiler/validator/types.ts` um aktuell höchsten zu sehen.

3. **`docs/refactoring/plan.md` Audit-Status-Tabelle:** **immer first
   `git pull --rebase`**, dann edit+commit innerhalb von 60 Sekunden. Wer
   eine Stunde an seinem Slice arbeitet, ohne den Status zu pushen, riskiert
   dass zwei Devs denselben Slice claimen.

4. **`tools/probes/`:** kollidiert nicht (Slice-Nummer-namespacing), aber
   gemeinsame Helper sollten nach `tools/probes/_shared.ts` (gibt's noch
   nicht; wer als erstes einen Helper braucht, legt das File an).

5. **`compiler/schema/layout-defaults.ts` & `compiler/schema/dsl.ts`:** sind
   Hot-Files. Vor jedem Edit: `git pull --rebase`. Bei Konflikten: Konflikt-
   resolver konsolidiert; KEIN „nimm meine Version" force-merge.

### Realistische Geschwindigkeit

Annahmen:

- 1 Dev fertigt 1 Slice in 1–3 Tagen (Layout: schneller, Studio: langsamer).
- Phase-Sync-Punkte kosten je 0.5–1 Tag.
- CDP-Schuld-Abarbeitung kostet je 0.5–1 Tag pro Slice.

**Rechnung:** 4 Devs × 5 Tage/Woche × 12 Wochen × 0.7 Effizienz (Sync,
Konflikte, Cluster-Reviews) ≈ 168 Dev-Tage = ~70–80 Slice-Units. Passt zu
den 82 verbleibenden Units.

**Realistisches Ziel: ~12 Wochen / 3 Monate für 100 % Slice-Abdeckung +
Cluster-Reviews + Schulden-Abarbeitung mit 4 parallelen Devs.**

Solo-Modus zum Vergleich: ~12 Slices/Woche × 7 Wochen = ~84 Slices, also
ähnlich, aber **ohne Parallelisierungsgewinn nur wenn alle 4 Devs perfekt
synchron arbeiten**. In der Praxis lassen sich 30–40 % Effizienzgewinn aus
dem 1-Dev-Modus ziehen, was die ~12-Wochen-Schätzung halbiert auf ~6–8
Wochen für die 4-Dev-Variante.

### Was zuerst (heute / morgen)

1. **Plan-Update committen** (dieses Doc).
2. **Stichprobe Slice 24, 26, 21** (~6 h, durch einen einzelnen Dev — kann
   Dev 1 sein) — entscheidet, ob die existierenden 16 Slices ein
   Iter-2-Sweep brauchen.
3. **Bei Stichprobe-Resultat „grün":** 4 Devs claimen ihre Phase-1-Slices,
   richten Worktrees ein, fangen an.
4. **Bei Stichprobe-Resultat „2-3 fail":** Iter-2-Sweep über 12 Pre-Plan-
   Update-Slices (1, 2, 3, 21, 24, 25, 26, 27, 28, 29, 30, 78) durch alle
   4 Devs parallel (3 Slices pro Dev), dann Phase 1.

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

66. **Prose-Body** — `, prose` mit Markdown-Untermenge (Absätze/`-`/`1.`/`#`/Bold/Italic) → `BodyTxt`/`DashItem`/`H2`-Mappings

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
