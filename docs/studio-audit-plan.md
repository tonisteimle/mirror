# Studio Audit & Umsetzungsplan

> Stand: 2026-05-02. Lebendes Dokument — nach Abschluss der Phasen
> nach `docs/archive/` verschieben.

Audit-Scope: `studio/` (ohne `compiler/`).
851 TS-Dateien, 0 JS — Migration vollständig.

---

## Audit-Befunde

### 1. Architektur

**CLAUDE.md vs. Realität:** ~40 % Treffer. Sechs **load-bearing**
Top-Level-Dirs fehlen in der Doku:

| Dir              | Rolle                                     | Größe                              |
| ---------------- | ----------------------------------------- | ---------------------------------- |
| `compile/`       | YAML/Component/Token-Renderer für Preview | 16 Dateien                         |
| `drop/`          | Strategy-Pattern Drag-Drop-Handlers       | 15 Dateien                         |
| `visual/`        | Drag/Resize/Snap/Layout-Inference         | **45 Dateien** (größtes Subsystem) |
| `agent/`         | LLM-Edit-Flow / Quality-Checks            | 11 Dateien                         |
| `storage/`       | File-Abstraction + User-Settings          | 10 Dateien                         |
| `ui/`, `rename/` | Zag-Inputs, F2-Rename                     | < 10 Dateien                       |

`studio/test-api/` mit **481 Dateien (193 KB)** liegt im Source-Tree —
gehört strenggenommen nach `tests/`.

**Boot-Pfade:**

- `studio/app.ts` (**2.517 LOC**, IIFE) — der reale Entry über
  `dist/app.js` in `index.html`.
- `studio/bootstrap.ts` (996 LOC) — `initializeStudio()`. Wird von
  `app.ts` aufgerufen (Alias `initNewStudio`), ist also der **Kernel**,
  nicht toter Code. `app.ts` ist der dicke Wrapper drumherum.

Keine Circular-Deps. Eine harmlose Layer-Verletzung: `core/events.ts`
importiert `ComponentDragData` aus `panels/components/types`.

### 2. Code-Qualität

| Smell                        | Zahl    | Hotspots                                               |
| ---------------------------- | ------- | ------------------------------------------------------ |
| `: any`                      | 75      | `preview/drag/studio-control.ts` (33), test-api        |
| `as any`                     | 242     | konzentriert in test-api (window-globals)              |
| `@ts-ignore`/-`expect-error` | 10      | —                                                      |
| `console.log(` (raw)         | **416** | `preview/drag/browser-test-api.ts` (56), `app.ts` (26) |
| `console.error/warn`         | 47 / 49 | —                                                      |
| TODO/FIXME/HACK              | 23      | meist Runtime-Bugs in Test-Suites                      |

**Logger existiert** (`compiler/utils/logger.ts`, `createLogger(prefix)`),
**52 Studio-Files nutzen ihn** — Problem ist inkonsistente Adoption,
nicht „kein Logger".

**Bemerkenswerte produktive TODOs:**

- `panels/property/adapters/production-adapters.ts:141` —
  _"TODO: Implement true batch update in CodeModifier"_
- `test-api/suites/actions/counter.test.ts:92` — _"runtime bug — reset()
  clears DOM text instead of setting to value"_
- `test-api/suites/actions/navigation.test.ts:9` — _"navigate() +
  show/hide combinations don't work correctly"_

### 3. Test-Coverage

361 Studio-Sources (ohne `test-api/`) ↔ 127 Vitest-Files (35 % Ratio)
↔ 409 Browser-Tests.

**Drei größte Coverage-Lücken (jeweils > 1.000 LOC, ~0 Vitest):**

1. `studio/visual/` — 45 Dateien, **20 (44 %) ohne Vitest**
2. `studio/preview/drag/studio-control.ts` — 1.199 LOC, **0 Vitest-Refs**
3. `studio/desktop-files.ts` — 1.444 LOC, **0 Vitest-Refs**

Außerdem: 70 `any`-Casts in `tests/studio/` selbst, 1 dokumentiert-flaky
Test (`component-state.test.ts`: "passes alone, fails in full suite"),
keine `.skip`/`.only`-Marker.

### 4. Top-10 größte Dateien

```
2517  app.ts                                 ← Monolith
1901  test-api/interactions.ts
1685  test-api/assertions.ts
1607  test-api/suites/tutorial/05-styling.test.ts
1444  desktop-files.ts                       ← 0 Tests
1382  pickers/color/full-picker.ts           ← 0 Tests
1199  preview/drag/studio-control.ts         ← 0 Tests, 33×any
1193  test-api/suites/interactions/gap-handlers.test.ts
1179  preview/drag/test-runner.ts
1163  test-api/layout-assertions.ts
```

### 5. Korrekturen aus Verifikation

- `mcp/state-collector.ts` (6,7 KB) **existiert**, wird aber **von
  nichts importiert** → echter Orphan-Code.
- `bootstrap.ts` ist **nicht tot**, sondern Kernel. Refactor-Richtung:
  `app.ts` schrumpfen.
- Logger ist da, nur halb adoptiert.

---

## Umsetzungsplan — 7 Phasen

Sequenziert nach Risiko und Abhängigkeit. Jede Phase besteht aus
Mikro-Schritten mit eigener Verifikation. Phasen A–C autonom
durchführbar; D–G mit Stop-Points.

### Phase A — Doku & Tot-Code (Risiko: null, ~30 min)

| #   | Schritt                                                                                                                                                                                                                                                   | Verifikation                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| A1  | `CLAUDE.md` „Projekt-Übersicht" um 6 fehlende Dirs ergänzen (`compile/`, `drop/`, `visual/`, `agent/`, `storage/`, `ui/`, `rename/`); `modules/` korrigieren („nur compiler-wrapper"); Hinweis ergänzen, dass `studio/test-api/` separater Test-Stack ist | Lesbarkeit, kein Build             |
| A2  | `studio/mcp/state-collector.ts` löschen (Orphan, 0 Importer); leeres `mcp/`-Dir entfernen                                                                                                                                                                 | `npm run build:studio`, `npm test` |
| A3  | Deprecated-Marker in `studio/sync/index.ts` und `studio/panels/files/index.ts` lesen → entweder echt entfernen (wenn unbenutzt) oder in echten TODO umbenennen                                                                                            | `npm run build:studio`, `npm test` |

**Stop-Point:** keiner — direkt weiter.

### Phase B — Type-Safety Quick Win (Risiko: niedrig, ~1 h)

Ziel: ~30+ `as any` aus `preview/drag/studio-control.ts` eliminieren.

| #   | Schritt                                                                                                                                                                                                                                                 | Verifikation                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| B1  | `studio/types/window-globals.d.ts` neu anlegen mit Interface-Deklarationen für `window.__mirrorStudio__`, `window.editor`, `window.MirrorLang`, `window.__compileTestCode`, `window.__setPreludeOffset` (Felder aus `studio-control.ts` zusammensuchen) | `tsc --noEmit`                                                   |
| B2  | `studio-control.ts`: alle `(window as any)` durch typsichere Zugriffe ersetzen                                                                                                                                                                          | `npm run build:studio`, Browser-Smoke (Studio öffnen, Drag-Test) |
| B3  | Andere `as any`-Hotspots prüfen (`preview/drag/browser-test-api.ts`, `test-api/studio-api.ts`) und gleiche Globals nutzen                                                                                                                               | Build grün                                                       |

**Stop-Point:** Bericht nach B1+B2 (DOM-Drag muss noch funktionieren).

### Phase C — Logger-Konsolidierung (Risiko: niedrig, ~3 h)

Ziel: Raw `console.log` in **produktivem** Studio-Code (nicht test-api)
ersetzen. Ziel-Reduktion: ~200 Calls.

| #   | Schritt                                                                                                                                                                                                                             | Verifikation                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| C1  | Liste aller produktiven Files mit `console.log` erstellen, Top-10 nach Count sortieren (`app.ts`, `desktop-files.ts`, `tauri-bridge.ts`, `core/events.ts`, `panels/property/*`, …)                                                  | grep-Liste sichtbar                                 |
| C2  | Pro File: `createLogger('<ModuleName>')` ergänzen; `console.log` → `log.debug`, `console.warn` → `log.warn`, `console.error` → `log.error`. Default-Level bleibt `warn`, also debug-Logs sind im Production-Build automatisch stumm | `npm test`, Studio im Browser noch loggt für Errors |
| C3  | Eine Default-Log-Level-Init in `bootstrap.ts` setzen (`setLogLevel(import.meta.env?.DEV ? 'debug' : 'warn')` o.ä.)                                                                                                                  | Studio-Startup                                      |
| C4  | Lint-Regel ergänzen: `no-console` für `studio/**` außer `test-api/`. ESLint-Config oder eigener Test in `tests/studio/no-console.test.ts`                                                                                           | Lint grün                                           |

**Stop-Point:** nach C2 für alle Top-10-Files — kurzer Zwischenbericht.

### Phase D — `app.ts` schrumpfen (Risiko: mittel, mehrere Sessions, Mikro-Schritte)

Ziel: `app.ts` von 2.517 LOC auf < 800 LOC. **Nicht in einem Wurf.**

Vorgehen pro Mikro-Schritt: ein logisches Setup-Häppchen extrahieren →
Build → Browser-Smoke → commit → reflektieren → nächstes Häppchen.

| #   | Schritt (jeder = eigene Iteration)                                                                                                                                                    | Reduktion-Ziel |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| D1  | Audit: `app.ts` strukturieren in Sections. Reine Sichtung, keine Änderung. Output: Liste der ~10–15 logischen Blöcke (CodeMirror-Setup, File-Loading, Compile-Loop, Drag-Hooks, etc.) | —              |
| D2  | CodeMirror-Editor-Setup → `studio/editor/setup.ts` extrahieren                                                                                                                        | -300 LOC       |
| D3  | Compile-Loop / Recompile-Trigger → `studio/modules/compiler/loop.ts`                                                                                                                  | -250 LOC       |
| D4  | Globals-Wiring (`window.editor =`, `window.__compileTestCode =`) → `studio/init/globals.ts` (typed)                                                                                   | -150 LOC       |
| D5  | Initial-Code-Template-Loading → `studio/init/initial-code.ts`                                                                                                                         | -100 LOC       |
| D6  | Verbleibende Hooks/Listeners überdenken: in `bootstrap.ts` integrieren oder lassen                                                                                                    | variabel       |

**Stop-Point:** nach D1 (Audit) — Bericht und Konsens; danach pro
Mikro-Schritt commit.

### Phase E — Batch-Update echt machen (Risiko: niedrig, ~1–2 h)

Ziel: TODO in `panels/property/adapters/production-adapters.ts:141`
einlösen.

| #   | Schritt                                                                                                                              | Verifikation                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| E1  | `code-modifier/`: API-Erweiterung `applyBatchChanges(changes: Change[]): ModificationResult` — atomar (Rollback bei Fehler in Mitte) | Vitest in `tests/studio/code-modifier-batch.test.ts` |
| E2  | `production-adapters.ts:139`: sequenzielle Schleife durch Aufruf von `applyBatchChanges` ersetzen                                    | bestehende Property-Tests grün                       |
| E3  | Property-Panel-Test, der mehrere Felder gleichzeitig ändert → eine Undo-Step (statt N)                                               | Browser-Test in `test-api/suites/propertyPanel/`     |

**Stop-Point:** nach E1 — Bericht zur API-Form, dann Integration.

### Phase F — Vitest-Coverage Risiko-Spots (Risiko: niedrig, langes Tail)

Ziel: Mindestens 60 % Line-Coverage für `studio/visual/*` und
`studio/desktop-files.ts`.

Pro Mikro-Schritt: ein Modul, eine Test-Datei, in einem Aufwasch lesen
→ Test schreiben → grün → commit.

| #   | Modul                                                       | Erwartete Test-Anzahl |
| --- | ----------------------------------------------------------- | --------------------- |
| F1  | `visual/measurements/*` (Geometrie-Helfer, pure Funktionen) | ~15 Tests             |
| F2  | `visual/snap-integration.ts` + `visual/smart-guides/*`      | ~12 Tests             |
| F3  | `visual/margin-handles/*`, `visual/padding-manager.ts`      | ~15 Tests             |
| F4  | `visual/layout-inference/*`                                 | ~10 Tests             |
| F5  | `visual/position-controls/*`, `visual/auto-layout/*`        | ~12 Tests             |
| F6  | `desktop-files.ts` (Tauri-Bridge mit gemockten Tauri-APIs)  | ~10 Tests             |

**Coverage-Ziel pro Schritt: ≥ 90 % der berührten Datei**
(Memory-Regel).

**Stop-Point:** nach jedem Schritt grünes commit; Bericht alle 2–3
Schritte.

### Phase G — `test-api/` aus Source-Tree (Risiko: hoch, eine Session)

Ziel: `studio/test-api/` → `tests/browser/` verschieben. 481 Dateien,
viele Imports.

| #   | Schritt                                                                                                                                                   | Verifikation                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| G1  | Trockenlauf: Anzahl `from '.*test-api'`-Importe in `studio/` außerhalb `test-api/` zählen. Wenn > 50, Plan überdenken (zu viele Cross-Cutting-Bezüge)     | grep-Output                                      |
| G2  | `git mv studio/test-api tests/browser` (alle Sub-Pfade auf einmal)                                                                                        | git status                                       |
| G3  | Bulk-Pfad-Update aller Imports via Codemod (sed-Skript oder ts-morph): `studio/test-api/...` → `tests/browser/...`, `'./test-api/...'` aus `studio/` raus | `tsc --noEmit`                                   |
| G4  | `tools/test.ts` und CDP-Runner-Pfade in `tools/test-runner/` anpassen                                                                                     | `npm run test:browser:progress` mit small subset |
| G5  | `tsup.config.ts` und Build-Excludes prüfen                                                                                                                | Full build grün                                  |

**Stop-Point:** nach G1 (Bestandsaufnahme) — Konsens, ob das wirklich
Wert hat angesichts des Aufwands. Möglicherweise reicht stattdessen ein
README-Hinweis im Source-Tree, dass `test-api/` Test-Code ist.

**G1 Bestandsaufnahme (2026-05-02):**

- Imports von `studio/test-api/` außerhalb test-api/: **2** (`studio/test-api.ts` Bridge, `studio/bootstrap.ts`).
  Plan-Schwelle (> 50 = Plan überdenken) klar **unterschritten**.
- Up-Imports innerhalb `studio/test-api/` (`../core`, `../visual`, `../../compiler` …): **790** in 481 Dateien.
  Bei einem Move nach `tests/browser/` müsste jede dieser 790 Pfad-Strings ein `../` mehr bekommen
  (sed-fähig, aber nicht trivial: relative Pfade durch absolute / `studio/` ersetzen wäre sauberer).
- Tools/Scripts mit Hard-Coded Pfaden: 3 (`tools/analyze-test-quality.ts`,
  `tools/generate-tutorial-tests.ts`, Kommentar in `tools/test-runner/demo/runner.ts`).
- Größe: 482 Dateien, 4,1 MB.
- Runtime-Bindung: `bootstrap.ts` ruft `initStudioTestAPI()` zur Laufzeit auf. Nach Move
  müsste der Build (tsup) auch `tests/browser/` einbinden, damit der Test-Stack im Studio
  bei `npm run studio` weiterhin verfügbar ist.

**Bewertung:** Der Move ist **mechanisch machbar**, der Mehrwert aber
gering: `studio/test-api/` IST Test-Infrastruktur, nur eben Browser-
Test-Suite (separater Stack). Die einzige neue Erkenntnis aus dem
Audit war "in CLAUDE.md nicht klar als Test-Code beschrieben" — das
ist mit Phase A bereits behoben.

**Empfehlung:** **G überspringen.** Stattdessen reicht der Hinweis in
CLAUDE.md (bereits in Phase A drin) und ein knappes
`studio/test-api/README.md` mit „Browser-Test-Suite, wird via CDP
geladen, nicht in Production-Bundle". Die 790 relativen Imports
würden nach Move alle länger und unleserlicher.

**Phase G: abgesagt.** Aufwand ≫ Nutzen, kein Bug, kein Coverage-
Verlust.

---

## Ablauf-Empfehlung

**Heute autonom abarbeitbar (Phasen A + B + Anfang C):**

- Phase A komplett (~30 min)
- Phase B komplett (~1 h)
- Phase C1 + C2 für Top-3-Files (`app.ts`, `desktop-files.ts`,
  `tauri-bridge.ts`) (~1,5 h)

**Folge-Sessions:**

- Phase D startet mit D1-Audit (Bericht), dann D2…D6 in einzelnen
  Iterationen
- Phase E parallel zu D möglich (unabhängiges Subsystem)
- Phase F als Hintergrund-Effort über mehrere Sessions
- Phase G nur wenn G1 zeigt, dass Aufwand vertretbar

**Dependency-Graph:**

- A → B (typed globals nutzen mcp-Aufräumung nicht, aber CLAUDE.md
  sollte vor anderen großen Refactors stimmen)
- B → C (typed `console`-Wrapping ist sauberer mit ambient.d.ts)
- C → D (logger-Pflicht erleichtert Code-Review beim app.ts-Schrumpfen)
- E ist unabhängig
- F kann parallel zu D laufen
- G nach D (sonst doppelte Pfad-Updates)

---

## Fortschritt

| Phase | Status        | Datum      | Notiz                                                                                                                   |
| ----- | ------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| A     | abgeschlossen | 2026-05-02 | CLAUDE.md aktualisiert + orphans entfernt                                                                               |
| B     | abgeschlossen | 2026-05-02 | window-globals.d.ts; alle 23 `(window as any)` casts entfernt; latenter Bug in setPanelVisibility gefunden              |
| C     | abgeschlossen | 2026-05-02 | createLogger über alle studio-files; ESLint `no-console: error`; localStorage-Override                                  |
| D     | partiell      | 2026-05-02 | D1 (setupNotificationHandlers extrahiert) — D2..D6 brauchen eigene Session                                              |
| E     | abgeschlossen | 2026-05-02 | applyBatchChanges atomar mit snapshot/restore + 5 Vitests; production-adapters delegiert                                |
| F     | abgeschlossen | 2026-05-02 | 111 neue Vitests über 8 Dateien; visual/\* + desktop-files-utils ≥60% Line-Coverage; margin/padding bewusst weggelassen |
| G     | abgesagt      | 2026-05-02 | G1-Recon: Aufwand ≫ Nutzen → README in studio/test-api/ als Mitigation                                                  |
