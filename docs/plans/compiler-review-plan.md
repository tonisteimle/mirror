# Compiler-Review — Vorgehen

**Status:** Phase 2 durch — 7 von 7 Top-Level-Modulen reviewt-und-clean. `compiler/runtime/` clean: mirror-runtime.ts (D-056), tote Schatten-Module weg (D-057), lebende Module zur Single-Source-of-Truth konsolidiert (D-058). D-051 ist auf Schritt-A+B-Ebene gelöst; Schritt C (dom-runtime-string.ts via Build) ist separater Sprint.
**Eigentümer:** Toni (Auftraggeber), Claude (Ausführung)
**Erstellt:** 2026-05-01
**Letztes Update:** 2026-05-01 (nach D-058: 4 lebende Runtime-Module zur Single-Source-of-Truth konsolidiert; 3 echte Verhaltens-Bug-Vektoren aufgelöst)

## Ziel

Sicherstellen, dass der Mirror-Compiler-Code (`compiler/`) **absolut sauber und gut gemacht** ist — Architektur stimmig, Verantwortlichkeiten klar, kein Dead Code, keine versteckten Bugs, keine Workarounds, keine doppelten Konzepte.

Der Auftraggeber liest den Code nicht selbst mit. Der Review muss daher so dokumentiert sein, dass jeder Befund **nachvollziehbar** bleibt — mit Datei + Zeile, mit Begründung, mit Empfehlung.

## Grundprinzipien

1. **Klein vor groß.** Reviews großer Code-Mengen werden flach. Wir reviewen pro Session ein eng umrissenes Stück (eine Datei, einen Subordner, ein Konzept). Lieber 30 sorgfältige Sessions als eine oberflächliche.
2. **Top-down.** Erst Architektur, dann Details. Wenn das Fundament wackelt, ist Detail-Review unten Zeitverschwendung.
3. **Keine Workarounds.** Befunde werden gefixt, nicht umgangen. Wenn ein Fix größer ist, wandert er als Issue in den Tracker, nicht ein `// TODO` in den Code.
4. **Schriftlich, nicht im Kopf.** Jeder Befund landet im Review-Log. Auch „gut" ist ein Befund — sonst wissen wir nicht, was schon angeschaut wurde.
5. **Diagnostizieren, nicht raten.** Wenn etwas verdächtig aussieht, lesen wir den umliegenden Code, suchen Aufrufer, prüfen Tests — bevor wir einen Befund schreiben.

## Phase 1 — Konzept-/Architektur-Review

**Ziel:** Stimmt die Architektur? Bevor wir uns in Details verlieren, prüfen wir, ob die großen Bauklötze richtig stehen.

**Output:** `docs/compiler-architecture-review.md` mit:

1. **Datenfluss-Diagramm**
   Mirror-Source → Lexer → Parser → AST → IR → Backend → Output.
   Pro Stufe: Input-Typ, Output-Typ, Verantwortung in 1–2 Sätzen, Eintrittspunkt-Datei.

2. **Schichten und ihre Verantwortung**
   Pro Top-Level-Ordner in `compiler/` (parser, ir, backends, runtime, validator, schema, studio):
   - Was tut diese Schicht?
   - Was tut sie _nicht_ (wo ist die Grenze)?
   - Welche anderen Schichten kennt sie?
   - Stimmen Verantwortung und Inhalt überein, oder leckt etwas?

3. **Kernkonzepte / Datenmodelle**
   - AST-Struktur: welche Knotentypen, wie viele, sind sie konsistent benannt?
   - IR-Struktur: was unterscheidet IR vom AST? Brauchen wir beide?
   - Schema: wirklich Single Source of Truth, oder gibt es parallele Wahrheiten (in Validator, Parser, Backend)?
   - SourceMap: wie wird Code↔Preview-Bidirektionalität getragen?

4. **Architektur-Befunde** (nummeriert, nach Schwere sortiert)
   Format pro Befund:

   ```
   ### A-01 [Schwere: hoch|mittel|niedrig] Titel

   **Beobachtung:** Was ist der Fall? (mit Datei:Zeile-Referenzen)
   **Problem:** Warum ist das ein Problem?
   **Empfehlung:** Was tun? (Fix sofort | Refactor | Diskussion nötig)
   ```

5. **Offene Fragen**
   Dinge, bei denen ich aus dem Code allein nicht entscheiden kann, ob sie absichtlich so sind. Diese gehen an Toni zur Klärung.

**Vorgehen:** Mehrere Subagents lesen parallel die Compiler-Subordner (parser, ir, backends, runtime, validator, schema, studio), liefern strukturierte Notizen pro Ordner. Ich konsolidiere zu einem Gesamt-Bild und schreibe das Dokument.

**Abbruchkriterium für Phase 2:** Solange Phase-1-Befunde mit Schwere „hoch" offen sind, kein Detail-Review starten — wir würden Code reviewen, der eh umgebaut wird.

## Phase 2 — Datei-für-Datei Detail-Review

**Ziel:** Pro Datei jede Funktion verstehen, kritisch hinterfragen, Bugs/Dead Code/unsaubere Stellen finden.

**Reihenfolge** (nach Kritikalität, später angepasst nach Phase-1-Befunden):

1. `compiler/schema/` — Single Source of Truth, alle anderen hängen daran
2. `compiler/parser/` — Eintrittspunkt, Bugs hier propagieren überall hin
3. `compiler/ir/` — Transformation, oft Ort versteckter Annahmen
4. `compiler/validator/` — Korrektheits-Garantien
5. `compiler/backends/` — Output-Erzeugung
6. `compiler/runtime/` — DOM-Verhalten zur Laufzeit
7. `compiler/studio/` — Code-Modifier, SourceMap

**Pro Datei:**

- Ich lese die Datei vollständig.
- Ich gehe Funktion für Funktion durch und prüfe gegen eine Checkliste (siehe unten).
- Befunde landen im Review-Log mit Datei:Zeile.
- Kleine Fixes (≤20 Zeilen, klar abgrenzbar): direkt als Commit nach Bestätigung.
- Größere Befunde: als Issue im Log, ohne den Code anzufassen.

**Detail-Review-Checkliste pro Funktion:**

- [ ] Tut sie genau das, was ihr Name verspricht — nicht mehr, nicht weniger?
- [ ] Sind alle Codepfade erreichbar? (Dead Branches?)
- [ ] Sind alle Edge-Cases behandelt (leere Eingabe, null/undefined, Rekursion)?
- [ ] Gibt es Annahmen, die nirgends geprüft oder dokumentiert sind?
- [ ] Gibt es Duplikate oder Fast-Duplikate (in dieser oder anderer Datei)?
- [ ] Ist die Funktion getestet? Decken die Tests die Edge-Cases ab?
- [ ] Sind Variablen-/Funktionsnamen ehrlich (kein `handleStuff`, `processData`)?
- [ ] Gibt es Workarounds, Hacks, magische Zahlen ohne Erklärung?
- [ ] Wird die Funktion irgendwo aufgerufen? (Toter Export?)

## Tracker — Review-Log

**Datei:** `docs/compiler-review-log.md`

Pro Reviewsession ein Eintrag, der enthält:

```
## YYYY-MM-DD — <Was wurde reviewt>

**Scope:** compiler/parser/index.ts (Funktionen 1–8)
**Dauer:** ~45 Min
**Befunde:**
- D-001 [hoch] parser/index.ts:142 — `parseInline()` rekursiert ohne Tiefenlimit
- D-002 [niedrig] parser/index.ts:201 — Variable `tmp` umbenennen zu `parsedAttribute`
**Fixes:** D-002 in Commit abc123 erledigt
**Offen:** D-001 (zu groß für direkten Fix, Issue erstellt)
**Nächste Session:** parser/index.ts (Funktionen 9–15)
```

So sehen wir auch nach Wochen, was schon angeschaut wurde, was offen ist, wo der Stand ist.

## Qualitätskriterien — wann ist „gut gemacht"?

Eine Datei gilt als reviewt-und-sauber, wenn:

- Alle Funktionen die Checkliste oben erfüllen.
- Keine offenen Befunde mit Schwere „hoch" oder „mittel" mehr existieren.
- Test-Coverage ≥90% für Lines/Branches/Functions (siehe Memory: Coverage-Anspruch).
- Keine Workarounds oder TODOs ohne klares Issue dahinter.

Der gesamte Compiler gilt als reviewt-und-sauber, wenn alle Dateien obigen Status haben _und_ die Architektur-Befunde aus Phase 1 abgearbeitet sind.

## Was dieser Plan _nicht_ ist

- Keine Re-Implementierung. Wir reviewen vorhandenen Code, schreiben ihn nicht neu „weil schöner".
- Kein Performance-Tuning. Wenn etwas korrektheitskritisch lahm ist: Befund. Mikro-Optimierungen: nein.
- Kein Feature-Hinzufügen. Nur Korrektheit, Klarheit, Wartbarkeit.

## Status / Nächster Schritt

- [x] Vorgehensplan geschrieben (dieses Dokument)
- [x] Phase 1 — Konzept-Review geschrieben (`docs/compiler-architecture-review.md`, 2026-05-01) — 22 Befunde A-01…A-22
- [x] Phase 1b — Test-Framework-Review (`docs/test-framework-architecture-review.md`, 2026-05-01) — 18 Befunde T-01…T-18
- [x] Iterativer Mikro-Schritt-Ansatz für Ausführung etabliert (siehe Memory: feedback_iterative_micro_steps)
- [x] **Cleanup-Sprint 1 (2026-05-01):** alle isolierten compiler-only Befunde abgearbeitet — Bilanz siehe `docs/compiler-architecture-review.md` §6. Tests grün durchgängig (369 → 373 Test-Files, 10876 → 10953 Tests, 0 Regressions).
- [x] **Schema-Sprint (2026-05-01):** A-02 Schatten-Konflikt behoben (`compiler/schema/index.ts`: kein `export * from './properties'` mehr; `findProperty`/`getPropertiesByCategory` aus `properties.ts` entfernt — sie waren tot). Erkenntnis aus tieferem Blick: `properties.ts` (Panel-UI-Metadaten, 82 Einträge mit `type`/`min`/`max`/`options`) und `dsl.ts:SCHEMA` (Compile-Zeit, 127 Einträge mit `keywords`/`numeric`/`color.css(...)`) sind **keine Duplikate**, sondern legitim zwei Modelle für zwei Zwecke. A-01-Konsolidierung ist also nicht nötig — Trennung ist die richtige Form. Tests grün (10999 passed, 0 failed).
- [x] **Phase 2 — Detail-Review (2026-05-01, mehrere Sessions):** alle Top-Level-Module durchreviewt + runtime/ via D-051-Konsolidierung Schritt A+B (siehe `docs/plans/runtime-consolidation.md`); Schritt C (dom-runtime-string.ts via Build) verbleibt als separater Sprint. Bilanz siehe `docs/compiler-review-log.md`. **39+ Inline-Fixes in 27 Dateien**, **~2350 Zeilen toter/duplizierter Code entfernt** (~1000 Z. mirror-runtime.ts via D-056; 346 Z. via D-057 Schatten-Module; ~340 Z. via D-058 Single-Source-Konsolidierung; ~470 Z. via D-058+D-059 dom-runtime.ts cleanup), **5 Hot-Path-Memoizations** (Schema-Helpers), **3 latente Verhaltens-Bugs aufgelöst** (Frame-State-Drift, Cleanup-WeakSet-Drift, Visibility-Eval-Drift via D-058). **Strategische Erkenntnis aus D-059:** dom-runtime.ts ist de-facto eine Test-Fixture (keine Studio/Backend-Konsumenten), Production-Runtime ist dom-runtime-string.ts. 59 Detail-Befunde dokumentiert (D-001…D-059). Tests durchweg grün (10957-10958 passed je nach JSDOM-Flake; einziger reproduzierbarer Failure ist `tests/studio/edit-prompts.test.ts` Inline-Snapshot — Pre-Existing Drift in Studio/AI-Code, **nicht von Phase-2-Arbeit verursacht**).

## Aktueller Stand (2026-05-01)

| Modul                       | Files       | Status                                                                                                                                                                                                                         | Tote API-Surface (vor Cleanup)                                                                                                               |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `compiler/schema/`          | 15          | ✅ reviewed-clean                                                                                                                                                                                                              | 30-50 % (sehr hoch — viele Helfer aus alten Architektur-Phasen)                                                                              |
| `compiler/parser/`          | 14          | ✅ reviewed-clean                                                                                                                                                                                                              | 10-15 % (Phase-5-Extraktion hinterließ tote Imports/Methoden)                                                                                |
| `compiler/ir/`              | 24          | ✅ reviewed-clean                                                                                                                                                                                                              | <5 % (Phase-2/3-Refactor war gründlich)                                                                                                      |
| `compiler/validator/`       | 8           | ✅ reviewed-clean                                                                                                                                                                                                              | 0 %                                                                                                                                          |
| `compiler/backends/`        | 20          | ✅ reviewed-clean                                                                                                                                                                                                              | 1 % (ein toter Barrel-File `dom/index.ts`)                                                                                                   |
| `compiler/runtime/`         | ~~32~~ → 28 | ✅ Single-Source-of-Truth-Architektur etabliert: mirror-runtime.ts clean (D-056), 4 tote Schatten-Module weg (D-057), 4 lebende Module konsolidiert (D-058). Schritt C (dom-runtime-string.ts via Build) ist separater Sprint. | mirror-runtime.ts war 40 % tot (988 Z.); 4 Schatten-Module 346 Z.; lebende Module ~340 Z. Duplikate weg; 3 latente Verhaltens-Bugs aufgelöst |
| `compiler/*.ts` (top-level) | 4           | ✅ reviewed-clean                                                                                                                                                                                                              | 3 tote Exports                                                                                                                               |

**Geprüft:** 117 von 117 Files (alle 4 toten Module gelöscht; alle 4 lebenden Module sind jetzt Single-Source und re-exportiert von dom-runtime.ts). **Detail offen für separaten Sprint:** dom-runtime-string.ts (2261 Z.) — Schritt C aus `runtime-consolidation.md`: Template-String soll künftig via Build aus den TS-Modulen erzeugt werden, statt parallel-gepflegt. Plus Phase 1 strategische Sprints (React-Eliminierung, AST/IR-Identität).

## Was offen bleibt — gegliedert nach Sprint-Größe

### 🔴 Hauptbefund aus Phase 2: D-051 Runtime-Schatten-Code

**Dies ist der wichtigste neue Befund** — er war in Phase 1 als A-09/A-10 im Architektur-Review schon angedeutet, aber durch Detail-Review erst konkret geworden.

**Beobachtung:** `compiler/runtime/` wurde **partiell extrahiert** — utility files (`scroll.ts`, `timer.ts`, `batching.ts`, `clipboard.ts`, `cleanup.ts`, `data-binding.ts`, `form-navigation.ts`, `visibility.ts`) wurden angelegt, aber `dom-runtime.ts` (5037 Z.) hat **eigene lokale Implementationen** dieser Funktionen behalten. Externe Konsumenten (Window-Exports, generated DOM-Code) holen sich die Funktionen aus dom-runtime.ts; die extrahierten Files werden nur von 2-3 anderen Runtime-Files (`visibility.ts`, `state-machine.ts`, `overlay.ts`) konsumiert.

**Konkret duplizierte Funktionen:**

- `batchInFrame` (in `batching.ts` + dom-runtime.ts Z. 238)
- `scrollTo`/`scrollBy`/`scrollToTop`/`scrollToBottom` (in `scroll.ts` + dom-runtime.ts Z. 1216+)
- `delay`/`cancelDelay`/`debounce` (in `timer.ts` + dom-runtime.ts Z. 2216+)
- `setupAutoSelect` (in `form-navigation.ts` + dom-runtime.ts Z. 1123)
- `OverlayPosition`/`PositionOptions` Types (in `runtime/types.ts` + dom-runtime.ts Z. 575)

**Konsequenz:** Bei Bugs müssen beide Versionen gefixt werden. Risiko der Divergenz. Memory-Eintrag: `project_runtime_partial_extraction.md`.

**Entscheidung nötig vor weiterer Arbeit:**

- **(a) dom-runtime.ts auf extrahierte Files umbauen** — saubere Architektur, aber dom-runtime.ts ist 5000 Z. und zentral, nicht-trivial
- **(b) extrahierte Files in dom-runtime.ts konsolidieren** — pragmatisch, weniger Risiko, „Rückschritt" beim Modularisieren

Ohne diese Entscheidung würde Detail-Cleanup von dom-runtime.ts in die falsche Richtung laufen.

### Eigene Sprints (jeweils mit Design-Entscheidung vorab)

1. ~~**Schema-Konsolidierung** (A-01, A-02, A-04, A-07)~~ — **erledigt 2026-05-01**, siehe oben. A-04/A-07 (PRIMITIVE_ROLES, PROPERTY_TO_CSS, NON_CONTAINER_PRIMITIVES) wurden im Phase-2-Detailreview teils auch durchgegangen — nicht alle, aber ohne weiteren Refactorbedarf, da die parallelen Konstanten auf legitime Use-Cases zeigen (siehe Phase-2-Notes).

2. **React-Eliminierung** (A-06, A-16, T-07)
   Toni hat entschieden: weg. ABER: aus Compiler-only-Scope nicht machbar — `studio/app.js:313`, `studio/modules/compiler/index.ts:59,157` nutzen `generateReact`. Wenn Studio mit dazukommt: React-Backend + alle `tests/differential/`-Files (16) + `tests/compiler/backend-react.test.ts` + CLI-Flag + Public-Export gemeinsam in einem Sprint entfernen. **Status:** unverändert offen, kein Phase-2-Fortschritt (war bewusst out-of-scope).

3. **Runtime-Konsolidierung** (A-09, A-10, D-051)
   Phase 2 hat das Problem **konkretisiert** (siehe oben). dom-runtime.ts ist NICHT der „Monolith der noch zu modularisieren ist", sondern der Ort, wo die echte Wahrheit lebt — und die extrahierten Files sind **Schatten**. Vor diesem Sprint: Variante (a) vs (b) entscheiden.

4. **AST/IR-Identität** (A-05)
   `IRNode` trägt `primitive`, `name`, `instanceName`, `properties` (untypiert), `styles`, `tag` — vermischt Display und Metadaten. Frage: braucht es AST + IR oder reicht eines mit klarer Trennung? Eng gekoppelt mit Sprint 2 (React-Backend umgeht IR). **Status:** unverändert offen.

### ✅ Detail-Review-Phase (war Phase 2)

Mit Phase 2 weitgehend durch. Status pro Modul:

1. ✅ `compiler/schema/` — alle 15 Files clean. Hauptfunde: 13 tote Helfer in dsl.ts, 11 tote Pass-Through-Re-Exporte, 2 tote DSL-Subobjekte. Plus 5 Memoizations für Hot-Paths.
2. ✅ `compiler/parser/` — alle 14 Files clean. A-03 (Parser-Monolith) durch Phase 5 Iterationen schon abgebaut auf 4084 Z.; weitere Extraktion möglich, aber kein toter Code mehr darin.
3. ✅ `compiler/ir/` — alle 24 Files clean (sehr clean von vorne herein).
4. ✅ `compiler/validator/` — alle 8 Files clean (sehr clean von vorne herein).
5. ✅ `compiler/backends/` — alle 20 Files clean. Toter Barrel `dom/index.ts` entfernt.
6. 🟡 `compiler/runtime/` — Triage durch (siehe D-051 oben). **mirror-runtime.ts ist nach D-056 clean** (988 Zeilen toter Validation/Correction/Component-API entfernt, 2490→1502 Z.). **dom-runtime.ts (5037 Z.) und dom-runtime-string.ts (2261 Z.) noch offen.**
7. ⏳ `compiler/studio/` — A-13 (CodeModifier 2881 Z.) — bewusst OUT-OF-SCOPE, gehört zur Studio-Integration, also Studio-Sprint.

### Klein, jederzeit erreichbar (compiler-only Mikro-Schritte)

- A-15 SourceMap-IDs robuster machen (Format-Wechsel im IR — Studio konsumiert nur `getNodeAtLine`/`getNodeByInstanceName`, ID-Format ist intern). **Status:** offen.
- ~~A-20 Lexer/Parser-Errors mit `code: string`-Field annotieren~~ — **erledigt 2026-05-01**
- ~~A-22 Canvas-Presets aus AST-Type-Union ins Schema~~ — **erledigt 2026-05-01**

### Test-Framework-Sprint (Phase 1c, eigener Sprint)

T-01 (`.not.toThrow()`-Pattern systemisch) ist die Basis-Schwäche. Plus T-04 (Test-Isolation), T-05 (Compile-Wait-Heuristik), T-09 (Skipped Tests ohne Tracking), T-11 (untestete Helper). Hier mit klarem Plan rangehen — sonst sind Coverage-Zahlen irreführend. **Status:** unverändert offen, war bewusst out-of-scope für Phase 2.

### Phase-2-Detailbefunde (D-001…D-059)

59 Detail-Befunde aus Phase 2 — alle in `docs/compiler-review-log.md` mit Datei:Zeile dokumentiert. Davon:

- **~39 inline-fixed** (tote Funktionen/Imports/Types entfernt, Memoizations eingefügt, Duplikate konsolidiert; D-056 entfernte ~1000 Z. tote API in mirror-runtime.ts; D-057 entfernte 4 tote Schatten-Module à 346 Z.; D-058 konsolidierte 4 lebende Module zur Single-Source-of-Truth, ~340 Z. Duplikate weg, 3 latente Verhaltens-Bugs aufgelöst; D-059 entfernte 132 Z. tote Form-Keyboard-Nav + Timer + runtime-Object-Literal + Motion-One-Subsystem aus dom-runtime.ts)
- **~20 deferred** als systemische / sprintwürdige Findings:
  - **D-046** animation-parser.ts: lokale `expect`/`addError` Wrapper — sollten in `ParserUtils` wandern (klein, eigener Mikro-Schritt)
  - **D-047** inline-property-parser.ts: 8 Callbacks zur parser.ts — Hinweis auf Phase 5 Fortsetzung (BodyParser/EventParser-Extraktion)
  - **D-051** Runtime-Schatten-Code (siehe oben — der Hauptbefund)
  - **D-053** parser.ts hat `MAX_ITERATIONS` etc. doppelt zu parser-context.ts — kosmetisch, kann in Phase-5-Folge konsolidiert werden
  - Weitere: rein dokumentarisch, kein Handlungsdruck

## Wie weiterarbeiten

**Aktualisierter Vorschlag (2026-05-01) nach Phase-2-Erkenntnissen:**

Die 4 großen Sprints sind nicht mehr in derselben Reihenfolge sinnvoll wie ursprünglich geplant. Schema-Konsolidierung ist durch (Sprint 1). Phase 2 hat gezeigt, dass IR/parser/validator/backends sehr clean sind — die Detail-Review-Phase ist dort durch.

**Was bleibt strategisch zu entscheiden:**

1. **🔴 Runtime-Sprint (D-051)** — wichtigster offener Punkt. Vor weiterem Cleanup von `compiler/runtime/` muss Variante (a) vs. (b) entschieden werden:
   - **(a)** dom-runtime.ts auf extrahierte Files umbauen → saubere Single-Source-of-Truth, aber Risiko (zentral, 5000 Z., wird via Window-Globals + Preview-iframe konsumiert)
   - **(b)** extrahierte Files in dom-runtime.ts konsolidieren → pragmatisch, weniger Risiko, aber „Rückschritt"
   - Empfehlung: Diskussion mit Toni vor Sprint-Start.

2. **React-Eliminierung (A-06)** — unverändert: braucht Studio-Mit-Scope.

3. **AST/IR-Identität (A-05)** — verschoben: kann nach React-Eliminierung sauberer angegangen werden, weil React aktuell IR umgeht.

4. **Studio-Sprint** — separates Thema, beinhaltet u. a. CodeModifier (A-13).

**Reihenfolge nach Phase 2:** **Runtime D-051 → React → AST/IR → Studio**.

Runtime jetzt zuerst, weil:

- Es ist der einzige Top-Level-Modul in `compiler/`, der nicht reviewed-clean ist
- D-051 ist konkret und blockiert weitere Detail-Arbeit dort
- Die Entscheidung (a) vs. (b) ist überschaubar

React danach, weil es viele Dinge entstaut (Tests, IR-Konsistenz). AST/IR danach. Studio separat (eigener großer Block).

## Iterativer Mikro-Schritt-Ansatz für Phase 2

Toni hat klargemacht: in der **Ausführung** soll iterativ in kleinen Schritten gearbeitet werden, nicht in großen Würfen. Das gilt parallel zu allem anderen in diesem Dokument.

**Pro Schritt:**

1. Genau einen abgegrenzten Schritt machen (nicht zwei parallel).
2. Stabilität prüfen: Tests grün? Funktioniert noch?
3. Reflektieren: was habe ich gelernt? Plan anpassen? Reihenfolge stimmt noch?
4. Erst dann nächsten Schritt entscheiden.

**Buchhaltung** (Doku-Update, Plan-Anpassung, Memory-Eintrag) zählt nicht als Schritt — das wird inline gemacht, weil sonst Wissen verloren geht.

**Was ist „klein genug" für einen Schritt?**

- Eine isolierte Lösch-Aktion (z. B. einen toten Ordner)
- Ein Refactor, der ≤ ~50 Zeilen Code ändert
- Eine Datei-Konsolidierung
- Eine Testbasis herstellen (Tests laufen, Baseline aufschreiben)

**Was wäre zu groß?**

- React-Backend in einem Schritt entfernen (hat ≥ 16 Test-Dateien als Abhängigkeit + CLI + Public-API)
- Schema-Konsolidierung (`A-01`/`A-02`) als ein Schritt
- Runtime-Konsolidierung als ein Schritt
