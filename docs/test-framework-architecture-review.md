# Test-Framework — Architektur-Review (Phase 1b)

**Status:** Phase-1b-Bericht, 2026-05-01
**Methodik:** 4 parallele Read-only-Subagents (CDP Runner / Browser Test API / Vitest Compiler-Tests / übrige Vitest-Tests). Konsolidiert.
**Anlass:** Toni's Frage — "du hast das Testframework dazu keinem review unterzogen". Berechtigt: ein Compiler ist nur so vertrauenswürdig wie seine Tests.

> Befund-IDs hier sind `T-01`, `T-02`, … damit sie nicht mit den Compiler-Befunden (`A-01`, …) kollidieren.

---

## 1. Die zentrale Frage

**Wenn das Test-Framework „grün" sagt — kann ich dem trauen?**

**Antwort, kurz:** Teilweise. Es gibt strukturelle Anti-Patterns, die echte Korrektheit nicht garantieren, sondern nur „kein Crash". Die wichtigsten Cluster sind unten.

---

## 2. Test-Schichten — was wir haben

| Schicht               | Ort                                            | Was es prüft                          | Vertrauen                               |
| --------------------- | ---------------------------------------------- | ------------------------------------- | --------------------------------------- |
| CDP Runner            | `tools/test-runner/`                           | Orchestriert Browser-Tests, Reporters | Mittel                                  |
| Browser Test API      | `studio/test-api/`                             | In-Browser Tests für Studio           | Mittel — Anti-Patterns                  |
| Vitest Compiler-Tests | `tests/compiler/` (133 Files, ~44k Z.)         | Parser/IR/Backends/Validator          | Mittel — strukturelle Schwächen         |
| Vitest Studio         | `tests/studio/` (149 Files)                    | Studio-Komponenten (JSDOM)            | Vermutlich solide                       |
| Vitest Integration    | `tests/integration/` (19)                      | Tutorial-Beispiele                    | Sinnvoll, aber dünn                     |
| Vitest Differential   | `tests/differential/` (16)                     | Compile über DOM/React/Framework      | **Wird obsolet** mit React-Eliminierung |
| Vitest Behavior       | `tests/behavior/` (16)                         | Echtes Runtime-Verhalten via JSDOM    | Sinnvoll                                |
| Vitest Contract       | `tests/contract/` (16)                         | Real-World `.mirror`-Files            | Sinnvoll                                |
| Vitest Probes         | `tests/probes/` (3)                            | Ad-hoc, schreibt zu /tmp              | **Müll, löschen**                       |
| Vitest Parser         | `tests/parser/` (1 Test)                       | State-Animation-AST                   | Untervertreten                          |
| Vitest IR             | `tests/ir/` (2 Tests)                          | State-Machine-IR                      | Untervertreten                          |
| Vitest Runtime        | `tests/runtime/` (3 Tests)                     | Test-API-Struktur (kein DOM)          | Sehr dünn                               |
| E2E                   | `tests/e2e/` (103 `.test.ts` + ~20 `.spec.ts`) | Hybrid: Vitest + Playwright           | **Inkohärent**                          |
| Demo-System           | `tools/test-runner/demo/`                      | Spec-by-Example                       | Eigenes Reich                           |

**Erste Beobachtung:** Die Anzahl der Schichten ist groß und teilweise redundant. `behavior/` und `differential/` haben **16 identische Dateinamen** (`actions.test.ts`, `bind.test.ts`, …) mit unterschiedlicher Semantik.

---

## 3. Befunde

### T-01 [hoch] Anti-Pattern „nur kein Crash" durchzieht alle Schichten

**Beobachtung:**

- `tests/compiler/`: **166x** `.not.toThrow()` (ohne nachfolgende Asserts in vielen Fällen, z. B. `tests/compiler/edge-cases.test.ts:47`).
- `tests/differential/`: **38 %** der Asserts (69/183) sind `expect(() => generateXYZ(parse(src))).not.toThrow()`.
- `studio/test-api/`: viele Tests mit nur 1–2 Asserts wie `api.assert.exists('node-1')` ohne Funktionsprüfung (z. B. `studio/test-api/suites/interaction-tests.ts:20`).
- `tools/test-runner/runner.ts:172–181`: `waitForTestSuites()` prüft nur Existenz von `window.__mirrorTestSuites.tests`, nicht den Inhalt.

**Problem:** Ein Test, der nur „nicht abstürzen" prüft, fängt das **silent skipping** im React-Backend (`A-06`) nicht ab. Generell: jeder Compiler-Bug, der zu „funktionierend aussehendem" Müll führt, bleibt unentdeckt.

**Empfehlung:** Systematischer Pass: jedes `.not.toThrow()` braucht entweder eine Folge-Assertion auf den Output oder muss als bewusster „Smoke-Test" dokumentiert werden. Lint-Regel oder Test-Helper, der das erzwingt.

---

### T-02 [hoch] CDP-Runner — hardcoded Wartezeiten + Polling statt Events

**Beobachtung:**

- `tools/test-runner/runner.ts:113` — `await sleep(1000)` nach `Page.load`.
- `tools/test-runner/runner.ts:158–180` — Polling auf `window.__mirrorTestSuites` mit 200 ms Intervall, 15 s Timeout.
- `tools/test-runner/cli.ts:802, 1005, 1015` — `setTimeout` 300/1000/2000 ms vor Token-Injection, Compile-Wait, Element-Select.
- `tools/test-runner/demo/os-mouse.ts` — Dutzende `setTimeout` für Maus-Simulation.

**Problem:** Auf langsameren Maschinen oder unter CI-Last reichen die Wartezeiten oft nicht; auf schnellen Maschinen ist es Verschwendung. **Flakiness** ist die Folge — Tests „passieren" oder „failen" abhängig vom Maschinenzustand, nicht vom Code.

**Empfehlung:** Wo möglich: CDP-Events nutzen (`Runtime.executionContextCreated`, `Page.frameStoppedLoading`) statt Polling. Wo Polling nötig: längeres Timeout, kürzeres Intervall, **klarer Failure-Mode** statt „nach 15 s gilt es als fertig".

---

### T-03 [hoch] Screenshot-Fehler werden silent geschluckt

**Beobachtung:**

- `tools/test-runner/runner.ts:307–312, 456–462` — `try { result.screenshot = ... } catch { /* ignore */ }`.

**Problem:** Wenn der Screenshot fehlschlägt (Disk voll, Permission, Browser hängt), wird das Test-Ergebnis trotzdem als `success: true` durchgereicht. Reports sehen ok aus, Beweise fehlen.

**Empfehlung:** Trivial: Screenshot-Fehler loggen, im Reporter sichtbar machen, optional als Test-Failure werten (per Flag).

---

### T-04 [hoch] Test-Isolation in der Browser-Test-API ist unvollständig

**Beobachtung:**

- `studio/test-api/test-runner.ts:757–873` — `resetTestState()` setzt Selection, Focus, Hover, Dialog zurück. **Nicht** zurückgesetzt: Custom States (`toggle`, `exclusive`), inline Styles auf Elementen, Pending Promises, registrierte Event-Listener aus vorigen Tests.

**Problem:** Tests können sich gegenseitig beeinflussen; Reihenfolge-abhängige Failures sind möglich. Schwer zu debuggen, weil sie nicht reproduzierbar erscheinen.

**Empfehlung:** Vollständiger Reset zwischen Tests: kompletter Studio-State-Reset (z. B. via Editor neu mounten). Oder: jeder Test in einem frischen Page-Reload.

---

### T-05 [hoch] Compile-Wait in der Browser-Test-API ist Heuristik

**Beobachtung:**

- `studio/test-api/test-runner.ts:91–143, 420–451` — wartet, bis `preview` mindestens einen Knoten mit `[data-mirror-id]` enthält, dann `setTimeout(resolve, 100)`.

**Problem:** „Mindestens ein Knoten" ist nicht „Compilation fertig". State-Machine-Aufbau, SourceMap-Build, Event-Listener-Attach laufen ggf. noch. 100 ms Buffer ist Magie.

**Empfehlung:** Studio sollte ein explizites „compilation complete"-Signal emittieren (Event/Promise), das die Test-API abwartet. Bis dahin: längeres deterministisches Warten.

---

### T-06 [hoch] Snapshot-File mit 137 KB / 6.768 Zeilen

**Beobachtung:**

- `tests/compiler/__snapshots__/integration-tutorial-examples.test.ts.snap` — ein einziges Riesen-Snapshot.

**Problem:** Update via `vitest -u` ist trivial, manuelle Review der Diff praktisch unmöglich. Ein subtiler Bug (z. B. NodeId-Drift, falsche Default-Property) wandert mit dem Update durch und keiner sieht's.

**Empfehlung:** In viele kleinere Snapshots zerteilen — mindestens einer pro Tutorial-Kapitel/Beispiel. Oder: strukturierte Asserts, die nur stabile Felder prüfen.

---

### T-07 [hoch] differential-Tests werden mit React-Eliminierung obsolet

**Beobachtung:**

- 16 Test-Files in `tests/differential/` testen Compile-Erfolg und Output-Strukturen über die drei Backends (DOM, React, Framework).
- 38 % Asserts sind `not.toThrow()`-Pattern (`T-01`).
- Wenn React entfernt wird (Compiler-Befund A-06, Toni's Entscheidung), werden ~69 Asserts sinnlos.

**Problem:** Verbleiben würden ~62 % strukturelle Asserts auf den DOM-Output. Aber: `tests/behavior/` hat **16 gleichnamige Files**, die echtes Runtime-Verhalten testen — das ist deutlich stärker. Differential wird zur dünnen Doppelung.

**Empfehlung:** Bei React-Eliminierung: `tests/differential/` komplett löschen (statt umbauen). Die starke Schicht ist `behavior/` + `contract/`.

---

### T-08 [hoch] Playwright ist da, CLAUDE.md sagt nein

**Beobachtung:**

- `tests/e2e/*.spec.ts` (~20 Files) importieren `@playwright/test` und öffnen echten Browser für Visual-Regression-Tests gegen Studio.
- `tests/e2e/*-snapshots/` Ordner mit PNG-Baselines.
- CLAUDE.md sagt explizit: _"Wichtig: Kein Playwright. Browser-Tests laufen über eigenen CDP Test Runner."_
- Keine `playwright.config.ts` im Repo-Root sichtbar.

**Problem:** Doku lügt oder ist veraltet. Unklar, wie/ob `.spec.ts`-Tests in CI laufen. Doppelte Browser-Test-Infrastruktur (Playwright + CDP-Runner).

**Empfehlung:** Klären: Playwright bleibt oder geht? Beides hat Vor- und Nachteile (Playwright-Maintenance + Tooling vs. eigenes CDP). CLAUDE.md muss zur Realität passen. Das ist eine Architektur-Entscheidung, keine Aufräum-Aktion.

---

### T-09 [mittel] Skipped Tests ohne Tracking

**Beobachtung:**

- `tests/compiler/`: 21 Skips/Todos verstreut in den Files (z. B. `tests/compiler/motion-one-ir.test.ts`, `tests/compiler/validator-error-codes.test.ts` 14×).
- `tests/SKIPPED-TESTS.md` existiert, ist aber kuratiert für andere Tests, deckt nicht alle.
- Skip-Gründe inline („NOT YET IMPLEMENTED", „parsing issue") — keine Issue-Verknüpfung.

**Problem:** Wenn der Grund gelöst wird, wer entfernt das `.skip`? Skipped Tests sammeln sich an und verlieren Wartung.

**Empfehlung:** Jeder `.skip` braucht entweder Issue-Link oder Eintrag in `SKIPPED-TESTS.md`. Vorhandene Skips: einmal durchgehen, Liste abgleichen, Stale entfernen.

---

### T-10 [mittel] String-Matching auf generiertem JS-Code

**Beobachtung:**

- `tests/compiler/backend-dom.test.ts` und Geschwister: `expect(js).toContain("'padding': '12px'")` als Hauptassertion.

**Problem:** Wenn der Code-Generator von `'padding': '12px'` zu `padding:'12px'` (oder `padding: "12px"`) wechselt, brechen Tests, ohne dass die Funktionalität sich geändert hat. Falsche Failures, keine echte Output-Prüfung.

**Empfehlung:** Tests sollten generiertes JS in JSDOM laufen lassen und die **resultierende DOM-Struktur** prüfen — nicht die String-Form. Das gibt es teilweise schon (`backend-html-dom-output.test.ts`, `smoke-real-apps.test.ts`).

---

### T-11 [mittel] Helper-Funktionen ohne eigene Tests

**Beobachtung:**

- `studio/test-api/inspector.ts` — `colorsMatchWithTolerance()`, `normalizeColor()` sind komplex, aber selbst nicht getestet.
- `studio/test-api/test-runner.ts:757` — `resetTestState()` ist 100 Zeilen Cleanup-Logik, ohne Test.
- `studio/test-api/interactions.ts:36–77` — komplexes Element-Finden via Pseudo-IDs, ohne Test.

**Problem:** Tests verlassen sich auf Helper, die selbst falsch sein können. Falsche grüne Tests sind möglich.

**Empfehlung:** Test-Helper sind Code wie anderer auch — Coverage-Anspruch (≥ 90 %) auch hier anwenden. Spezielle Vorsicht bei Cleanup/Reset-Funktionen, weil deren Bugs schwer zu diagnostizieren sind.

---

### T-12 [mittel] Zwei parallele APIs in `studio/test-api/index.ts`

**Beobachtung:**

- `StudioTestAPI` (l. 134–156): Event-basiert, low-level, ~20 Zeilen Implementierung.
- `MirrorTestAPI` (l. 325–547): vollständige Test-API.
- Nur `MirrorTestAPI` ist via `window.__mirrorTest` praktisch nutzbar; `StudioTestAPI` weitgehend nicht aufgerufen.

**Problem:** Toter API-Pfad oder unfertige Migration. Verwirrt Wartung.

**Empfehlung:** Einer von beiden ist Master, der andere weg. Trivialer Aufräum-Schritt.

---

### T-13 [mittel] Zwei Drag-API-Pfade (`__dragTest` und `__testDragDrop`)

**Beobachtung:**

- `studio/test-api/interactions.ts:729–742` — delegiert an `window.__dragTest` (echte Mouse-Events).
- `studio/test-api/index.ts:293` — alternative Initialisierung über `window.__testDragDrop` (manipuliert State direkt).
- Tests nutzen beide gemischt; unklar wann welche.

**Problem:** State-Manipulation umgeht echtes Browser-Verhalten — Tests sind nicht repräsentativ. Plus: zwei Pfade = doppelte Wartung.

**Empfehlung:** Einer Pfad bleibt (vermutlich `__dragTest` mit echten Events), der andere wird entfernt oder als Debug-Tool dokumentiert (klar als „kein Test-Pfad").

---

### T-14 [mittel] `tests/probes/` schreibt zu /tmp ohne Asserts

**Beobachtung:**

- `tests/probes/p.test.ts`, `p2.test.ts`, `p3.test.ts` — laden Examples, evaluieren Code, schreiben Fehler-Output zu `/tmp/addr.txt`.

**Problem:** Sind keine Tests im klassischen Sinne. Manueller Debug-Workflow als Test getarnt.

**Empfehlung:** Löschen, oder zu echten Tests umbauen (in `tests/contract/` mit Asserts).

---

### T-15 [mittel] `tests/parser/` (1 Test), `tests/ir/` (2), `tests/runtime/` (3) — untervertreten

**Beobachtung:**

- Sehr dünne Coverage in genau den Schichten, die der Compiler-Architektur-Review als „kritisch" identifiziert hat.

**Problem:** `tests/compiler/` deckt vermutlich vieles davon implizit ab (parser-Tests, IR-Tests dort verteilt). Aber die Trennung ist verwirrend: warum `tests/ir/state-machine.test.ts` und nicht `tests/compiler/ir-state-machine.test.ts`?

**Empfehlung:** Konsolidieren — entweder in `tests/compiler/ir/` integrieren oder die Wurzel-Verzeichnisse stärken. Kein Halbzustand.

---

### T-16 [niedrig] Console-Logging als primärer Test-Result-Kanal

**Beobachtung:**

- `studio/test-api/test-runner.ts:1020–1023` — `[TEST_PROGRESS] total:X completed:Y` über `console.log`, CDP-Runner parst Console.

**Problem:** Anfällig für Buffer-Overflow, Encoding, Console-Pollution durch andere Logs. Kein strukturierter Kanal.

**Empfehlung:** Strukturiertes API-Response über CDP `Runtime.evaluate` mit Return-Value. Niedrig-Prio, aber sauberer.

---

### T-17 [niedrig] Inline-DSL-Strings überall in Compiler-Tests

**Beobachtung:**

- Compiler-Tests benutzen meist Inline-Strings (`parse('Card as frame: pad 16')`), kaum externe `.mirror`-Fixtures.

**Problem:** Bug-Reports schwer portabel — der DSL-Code lebt in Tests, nicht in einer wiederverwendbaren Fixture.

**Empfehlung:** Niedrig-Prio. Bei größeren Test-Szenarien `.mirror`-Files in `tests/fixtures/` extrahieren.

---

### T-18 [niedrig] CodeMirror/`cli-bridge-shim.ts` — Mock ohne echten CLI-Test

**Beobachtung:**

- `studio/test-api/cli-bridge-shim.ts` mockt Tauri-Bridge für Agent-Tests.
- Produktions-Code (`FixerService.generateDraftCode`) nutzt diesen Mock.

**Problem:** Tests gegen Mock testen den Mock, nicht das echte Verhalten der Tauri-Bridge.

**Empfehlung:** Mindestens ein Contract-Test gegen die echte Bridge — entweder Headless oder als optional-CI-Run.

---

## 4. Cluster — was sich häuft

1. **„Kein Crash = grün"-Pattern** (T-01) — durchzieht alle Schichten. Systemisch.
2. **Timing-Heuristiken statt Events** (T-02, T-05) — fragile Tests.
3. **Silent Failure Modes** (T-03, T-04, T-09) — Tests „passieren", obwohl etwas schief läuft.
4. **Doppel-Strukturen** (T-07, T-08, T-12, T-13, T-15) — historisch gewachsen, nie aufgeräumt.
5. **Untestete Test-Infrastruktur** (T-11) — Helper können selbst falsch sein.

## 5. Wechselwirkung mit dem Compiler-Architektur-Review

- **A-06** (React skipped Features still) **+ T-01** (`not.toThrow()`-Pattern) **+ T-07** (differential 38 %): React-Eliminierung räumt eine ganze Test-Schicht weg. Sehr aufgeräumter Effekt.
- **A-09** (Runtime-Monolith) **+ T-04, T-05** (Test-Isolation, Compile-Wait): Wenn Runtime sauber konsolidiert wird, hilft das auch der Test-API (klare Signale, keine Heuristiken).
- **Coverage-Anspruch** aus dem Plan-Dokument (≥ 90 %) und Memory: Solange T-01 nicht systematisch behoben ist, ist die Coverage-Zahl irreführend — sie misst Zeilen-Ausführung, nicht Asserts.

## 6. Konsequenz für Phase 2

Der Plan sieht Phase 2 als Datei-für-Datei Detail-Review der Compiler-Schichten. Dieser Bericht zeigt:

- **Detail-Review pro Schicht muss die Tests dieser Schicht mitbeurteilen** — nicht „grün, also gut".
- Vor Phase-2-Detail-Review der React-betroffenen Bereiche: React eliminieren, differential weg.
- Vor Phase-2-Detail-Review der Studio-Browser-Test-Themen: Anti-Patterns aus T-01 berücksichtigen.

## 7. Offene Fragen

1. **Playwright bleibt oder geht?** (T-08) — entscheidet die Test-E2E-Strategie.
2. **`tests/probes/`** (T-14) — löschen?
3. **`tests/parser/`, `tests/ir/`, `tests/runtime/`** (T-15) — in `tests/compiler/` konsolidieren oder ausbauen?
4. **`StudioTestAPI` vs `MirrorTestAPI`** (T-12) — welche bleibt?
5. **`__dragTest` vs `__testDragDrop`** (T-13) — welche bleibt?
