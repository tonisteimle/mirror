# LLM-Edit-Flow — Testkonzept

> Companion zu [`llm-edit-flow.md`](./llm-edit-flow.md) (Anforderungen) und [`llm-edit-flow-plan.md`](./llm-edit-flow-plan.md) (Umsetzung).
>
> Beschreibt **wie die Implementation testseitig begleitet wird**: welche Test-Schicht für welches Modul, welche Pflicht-Gates pro Phase, wie die Eval-Scenarios wachsen, was bewusst _nicht_ getestet wird.
>
> Das Dokument ist **lebendig** — Tests werden parallel zum Code geschrieben (TDD wo möglich), die Akzeptanz-Listen pro Phase wirken als hartes Merge-Gate.

---

## 1. Test-Pyramide

```
                     ┌──────────────────────┐
                     │  Eval (real Claude)  │   ~30 Scenarios, langsam (~5s/Run)
                     │  Quality + Hit-Rate  │   nightly + on-demand
                     └──────────────────────┘
                ┌──────────────────────────────┐
                │  Browser-Integration (CDP)   │  ~25 Tests, Mock-Bridge
                │  E2E-Flows + UI-Verhalten    │  per Phase-Merge
                └──────────────────────────────┘
        ┌────────────────────────────────────────────┐
        │           Unit (Vitest, jsdom)             │  ~150 Tests, schnell (<10s gesamt)
        │  Pure Logik + Mocked Bridge + Snapshots    │  per Commit (CI)
        └────────────────────────────────────────────┘
```

**Verhältnis:** ca. 75 % Unit, 20 % Browser-Integration, 5 % Eval. Eval ist **Quality-Gate**, nicht Regression-Gate — daher klein, aber präzise.

---

## 2. Test-Infrastruktur (Reuse, kein Neubau)

| Schicht                    | Tool / Pfad                                                            | Wiederverwendung                                                                                   |
| -------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Unit                       | `vitest` (`vitest.config.ts:1-39`)                                     | Bestehender Setup, Custom Matchers in `tests/utils/matchers.ts`, jsdom für `tests/studio/**`       |
| Mock-Bridge (Unit/Browser) | `tests/helpers/mock-tauri-bridge.ts:316` `createMockTauriBridge()`     | `setMockRawOutput()`, `setMockError()`, `clearMocks()` — bestehende API                            |
| Browser-Integration        | `tools/test-runner/` (CDP, headless Chrome)                            | `--category=ai`, `--only=...`, `--headed` Flags bestehen                                           |
| Browser-Real-AI-Pfad       | `studio/test-api/cli-bridge-shim.ts:33` `installCliBridgeShim()`       | HTTP-Shim ↔ `npm run ai-bridge` ↔ real `claude` CLI                                                |
| Eval                       | `scripts/eval-edit-flow.ts` (neu, modelliert nach `eval-ai-simple.ts`) | `Scenario`-Interface + Assertion-Builder-Pattern (`must.contain()`, `must.compileOk()`) übernehmen |

**Was wir _neu_ einführen müssen:**

- **Vitest-Snapshot-Tests** (`toMatchInlineSnapshot()`) für **Prompt-Strings** — Repo nutzt das aktuell nicht, wir brauchen es um Prompt-Regressionen zu fangen.
- **Eval-Driver** `scripts/eval-edit-flow.ts` — Pattern aus `eval-ai-simple.ts` übernehmen, aber Scenario-Struktur + Assertions auf Patch-Format anpassen.

---

## 3. Test-Schichten im Detail

### 3.1 Unit (Vitest) — _broad coverage, schnell, deterministisch_

#### `studio/agent/patch-format.ts`

**Pflicht-Cases (≥ 15):**

- ✅ Leerer Input → 0 patches, 0 parseErrors
- ✅ Single `@@FIND/@@REPLACE/@@END` → 1 patch
- ✅ Mehrere Blöcke → N patches in deklarierter Reihenfolge
- ✅ Leerer REPLACE-Block → patch mit `replace: ''`
- ✅ Multi-line FIND → byte-genau preserved (inkl. Whitespace)
- ✅ LLM-Vorrede vor dem ersten Block → wird ignoriert
- ✅ LLM-Nachrede nach `@@END` → wird ignoriert
- ✅ Defekt: fehlendes `@@END` → ein parseError
- ✅ Defekt: fehlendes `@@REPLACE` → ein parseError
- ✅ Defekt: zwei `@@FIND` ohne `@@END` dazwischen → parseErrors
- ✅ CRLF vs LF Line-Endings → beide akzeptiert, normalisiert
- ✅ BOM-Prefix in Eingabe → toleriert
- ✅ Umgebende Codefences (` ```... ``` `) → toleriert
- ✅ Tab-Indentation in FIND/REPLACE → preserved
- ✅ Unicode in Code → preserved

**Coverage-Ziel:** 100 % Lines/Branches/Functions (pure-function-Modul, keine Ausreden).

#### `studio/agent/patch-applier.ts`

**Pflicht-Cases (≥ 12):**

- ✅ Single Patch, eindeutiger Anker → `success: true`, korrekter `newSource`
- ✅ Mehrere Patches sequentiell → alle appliziert, `newSource` reflektiert beide
- ✅ Patches in geänderter Reihenfolge übergeben → identisches Ergebnis (anker-basiert, nicht position-basiert)
- ✅ Anker matched 0× → `retryHints: [{reason: 'no-match', matchCount: 0}]`
- ✅ Anker matched 3× → `retryHints: [{reason: 'multiple-matches', matchCount: 3}]`
- ✅ Leerer REPLACE → Anker-Stelle gelöscht
- ✅ Multi-line FIND matched korrekt
- ✅ Whitespace-Sensitivität: Spaces vs Tabs ergeben unterschiedliche Anker
- ✅ Apply von Patch P2, dessen Anker nur im Original (nicht in P1's Replace) vorkommt → match auf Original-Source-Position
- ✅ Apply mit gemischtem Erfolg: Patch 1 ok, Patch 2 no-match → `success: false`, retryHints für nur Patch 2

**Property-Tests** (introduziert via einfacher fast-check-Style-Loop, kein Lib-Import nötig):

- ✅ `applyPatches(s, []) === s` für beliebige Source `s`
- ✅ `applyPatches(s, [{find: snippet, replace: snippet}]) === s` für jedes Snippet das einmal in `s` vorkommt

**Coverage-Ziel:** 100 %.

#### `studio/agent/change-tracker.ts`

**Pflicht-Cases (≥ 8):**

- ✅ Initial: kein voriger Snapshot → leerer Diff
- ✅ Nach erstem `track()` und neuer Source → unified diff
- ✅ Nach `getDiffSinceLastCall()` wird Snapshot resettet
- ✅ Diff-Cap (`MAX_DIFF_LINES = 200`) wird respektiert: bei 300-Zeilen-Diff wird auf 200 getrimmt mit Hinweis-Zeile
- ✅ Identische Source → leerer Diff
- ✅ Per-File-Tracking: Datei A und B haben unabhängige Snapshots
- ✅ Sehr lange Zeilen werden nicht doppelt gezählt (nur Zeilen-Anzahl im Cap)
- ✅ Tracker-Reset via expliziter API

**Coverage-Ziel:** 100 %.

#### `studio/agent/source-diff.ts`

**Pflicht-Cases (≥ 6):**

- ✅ Identische Inputs → 0 hunks
- ✅ Reine Insertion → ein "add"-Hunk
- ✅ Reine Löschung → ein "remove"-Hunk
- ✅ Modifikation in der Mitte → "remove" + "add"-Hunk an gleicher Position
- ✅ Mehrere getrennte Änderungen → mehrere Hunks
- ✅ Performance-Smoketest: 10000-Zeilen-Diff < 100ms

**Coverage-Ziel:** 100 %.

#### `studio/agent/prompt-utils.ts`

**Pflicht-Cases:**

- ✅ Verhaltens-Parität zu `formatProjectFileSection()` aus `draft-prompts.ts` (Snapshot-Vergleich)
- ✅ Leere Section wird nicht gerendert (kein heading + kein body)

#### `studio/agent/edit-prompts.ts`

**Pflicht-Cases (≥ 10) — primär Snapshot-Tests:**

- ✅ Modus 1 (kein Selection, keine Instruction): erwarteter Prompt-String (`toMatchInlineSnapshot`)
- ✅ Modus 2 (mit Selection): Prompt enthält Selection-Header + Selection-Range
- ✅ Modus 3 (mit Instruction): Prompt enthält Instruction-Header
- ✅ Modus 3 + Selection: beide Header
- ✅ Mit Diff-Kontext: Diff-Section vorhanden
- ✅ Ohne Diff-Kontext: keine Diff-Section
- ✅ Mit Tokens/Components: Project-File-Sections gerendert
- ✅ Patch-Format-Beispiele (mind. 2) im Prompt vorhanden
- ✅ Anker-Uniqueness-Regel im Prompt vorhanden
- ✅ Output-Format-Vorgabe ("nur `@@FIND/@@REPLACE/@@END`") im Prompt vorhanden

**Coverage-Ziel:** 100 %.

#### `studio/agent/edit-flow.ts`

**Pflicht-Cases (≥ 10) — alle gegen `MockTauriBridge`:**

- ✅ Happy path: Capture → Prompt → Bridge → Parse → Apply → Ergebnis `ready`
- ✅ Bridge-Error → Ergebnis `error` mit Original-Error-Message
- ✅ Parse-Error im Bridge-Output → Ergebnis `error`, kein Retry
- ✅ Anker no-match → Retry mit Hint, dann Success
- ✅ Anker multi-match → Retry mit Hint, dann Success
- ✅ Max-Retries (2) erschöpft → Ergebnis `error`
- ✅ Cancel via AbortSignal mid-call → Ergebnis `cancelled`, kein Source-Change
- ✅ Leerer Source als Input → funktioniert (kein Crash)
- ✅ ProjectCtx mit 0 Tokens/Components → funktioniert
- ✅ ProjectCtx mit Tokens und Components → werden in Prompt durchgereicht

**Coverage-Ziel:** ≥ 95 % Lines, ≥ 90 % Branches.

> **Repo-Default ist 80 %** (`vitest.config.ts:32-35`). Für die neuen `studio/agent/edit-*` und `patch-*` Module heben wir das per per-Modul-Threshold auf **≥ 90 %** an — der Flow ist der primäre AI-Pfad und Test-Lücken hier sind teuer (siehe Memory: "Coverage-Anspruch nicht ablassen").

---

### 3.2 Browser-Integration (CDP) — _Happy Paths + UI-Verhalten_

**Suite:** `studio/test-api/suites/ai/edit-flow-integration.test.ts` (NEU).
**Registrierung:** in `studio/test-api/suites/ai/index.ts` aufnehmen, alte `draft-mode-*` Files in Phase 3 löschen.

**Setup-Pattern** (analog zu bestehendem `withDraftContext`):

```ts
async function withEditFlowContext(
  api: TestApi,
  fn: (ctx: EditFlowContext, assert: EditFlowAssertions) => Promise<void>
) {
  // 1. Install MockTauriBridge with predictable response
  // 2. Reset editor source
  // 3. Run test fn
  // 4. clearMocks() in finally
}
```

**Pflicht-Tests (≥ 12):**

- ✅ `Cmd+Enter` ohne Selection → Mock-Bridge wird mit Doc als Context aufgerufen
- ✅ `Cmd+Enter` mit Selection → Prompt enthält Selection-Marker
- ✅ `Cmd+Shift+Enter` → Prompt-Field erscheint, Auto-Focus aktiv
- ✅ `Cmd+Shift+Enter` → Prompt-Field schliesst bei `Esc` ohne Aufruf
- ✅ Bridge-Response triggert Ghost-Diff-Rendering (Decoration-Klassen sichtbar)
- ✅ `Tab` während Ghost akzeptiert: Source wird zum proposed Source
- ✅ `Esc` während Ghost verwirft: Source bleibt unverändert
- ✅ Direct-Edit während Ghost → Auto-Verwerfen + Toast
- ✅ Bridge-Error → Error-Banner statt Ghost
- ✅ Doppeltes `Cmd+Enter` während laufendem Call → vorigen Call abbrechen, neuen starten
- ✅ `Tab`-Akzept registriert genau **eine** History-Entry (Cmd+Z setzt komplett zurück)
- ✅ `??`-Marker im Source haben **keine** Wirkung mehr (regression check nach Phase 3)

**Isolation:** jede Suite ruft `clearMocks()` + `setCode('')` zwischen Tests (kein globales beforeEach im Browser-Framework).

---

### 3.3 Eval (Real Claude) — _Quality + Hit-Rate_

**Treiber:** `scripts/eval-edit-flow.ts` (NEU, modelliert nach `scripts/eval-ai-simple.ts:42-120`).

**`Scenario`-Struktur** (Anpassung an Edit-Flow):

```ts
interface EditScenario {
  id: string                    // '1-typo-fix', '2-extract-component', ...
  label: string
  files: Record<string, string> // multi-file project context
  currentFile: string
  source: string                // current file content
  selection?: { from: number; to: number }
  instruction?: string          // mode 3
  asserts: EditAssert[]         // patch-shape + result-shape assertions
}

const must = {
  patchAnchorUnique: () => ...,    // each FIND matches exactly once in source
  resultCompiles: () => ...,        // newSource via compiler/validator
  resultContains: (snippet: string) => ...,
  resultUsesToken: (name: string) => ...,
  retryCountAtMost: (n: number) => ...,
  noUnrelatedChanges: () => ...,    // patches don't touch lines outside expected range
}
```

**Aufrufe:**

```bash
npx tsx scripts/eval-edit-flow.ts --list             # Scenario-IDs
npx tsx scripts/eval-edit-flow.ts --only=2-typo-fix  # einzelnes Scenario
npx tsx scripts/eval-edit-flow.ts                    # alle (langsam, nightly)
```

**Metriken die der Driver reportet:**

- **Anker-Hit-Rate** (Anteil der Scenarios bei denen alle Patches im 1. Versuch unique matchen)
- **Retry-Verteilung** (wieviele Scenarios brauchen 0/1/2 Retries)
- **Compile-Pass-Rate** (Anteil der Scenarios deren resultierender Source compileert)
- **Latenz P50/P95** (Capture → ready)
- **Pass-Rate pro Modus** (1 = no-selection, 2 = selection, 3 = instruction)

---

## 4. Pattern + Konventionen

### 4.1 Snapshot-Tests für Prompts

Kein Repo-Pattern existiert. **Wir führen `toMatchInlineSnapshot()` ein** — vitest-Built-in, keine Lib-Erweiterung nötig:

```ts
test('Modus 1 prompt renders correctly', () => {
  const ctx: EditCaptureCtx = {
    source: 'Frame gap 12\n  Text "Hi"',
    cursor: { line: 2, col: 10 },
    selection: null,
    diffSinceLastCall: '',
    instruction: null,
    projectFiles: { tokens: {}, components: {} },
  }
  expect(buildEditPrompt(ctx)).toMatchInlineSnapshot(`
    "Du bist eine Mirror-DSL Edit-Engine.
    ...
    "
  `)
})
```

**Update-Befehl:** `npx vitest --run -u` aktualisiert Snapshots nach Prompt-Änderung. Diff im PR sichtbar.

### 4.2 Property-Tests für Patch-Applier

Kein `fast-check`-Lib im Repo — **simple table-driven Property-Tests** reichen:

```ts
const SAMPLE_SOURCES = ['', 'Frame gap 12', 'Frame gap 12\n  Text "x"' /* ... */]

test('apply([]) is identity', () => {
  for (const src of SAMPLE_SOURCES) {
    expect(applyPatches(src, []).newSource).toBe(src)
  }
})
```

### 4.3 Mock-Bridge zwischen Tests reseten

**Pattern (Unit + Browser identisch):**

```ts
beforeEach(() => bridge.clearMocks())
// oder
afterEach(() => bridge.clearMocks())
```

Im Browser-Framework explizit im `withEditFlowContext`-Wrapper.

### 4.4 Fixture-Files für komplexe Inputs

Grosse Source-Beispiele für Patch-Tests landen in `tests/fixtures/edit-flow/*.mir`. Pure-Text-Files, importiert via `readFileSync()` im Test:

```ts
import { readFileSync } from 'fs'
const SAMPLE_LARGE = readFileSync('tests/fixtures/edit-flow/large-app.mir', 'utf8')
```

### 4.5 Test-Naming

Folgt bestehender Konvention (`tests/behavior/bind.test.ts:15`):

- `describe()`-Block: `'PatchApplier — Anker-Validierung'` (Module + Aspekt)
- `it()` / `test()`: `'returns retryHints when anchor matches multiple times'` (Verhaltensaussage, kein "should")

### 4.6 Test-Daten-Generation für Eval-Scenarios

Per Memory-Feedback "Eval-Scenarios inkrementell bauen + sofort prüfen":

- **Niemals** ein Batch von 10 Scenarios auf einmal anlegen und am Ende laufen lassen.
- Jedes neue Scenario einzeln anlegen, mit `--only=<id>` laufen, Assertions prüfen, dann committen.
- Gescheiterte Scenarios werden _diagnostiziert_ (Output anschauen, Hypothese, fix), nicht "nochmal versucht".

---

## 5. Test-Akzeptanz pro Phase _(Pflicht-Gates)_

### Phase 1 — Foundation

| Modul            | Min-Tests | Coverage | Pattern          |
| ---------------- | --------- | -------- | ---------------- |
| `patch-format`   | 15        | 100 %    | Cases + Snapshot |
| `patch-applier`  | 12        | 100 %    | Cases + Property |
| `change-tracker` | 8         | 100 %    | Cases            |
| `source-diff`    | 6         | 100 %    | Cases            |

**Merge-Gate:** alle Tests grün, Gesamt-Coverage der vier Module ≥ 95 %.

### Phase 2 — Prompt + Bridge

| Modul                 | Min-Tests | Coverage                |
| --------------------- | --------- | ----------------------- |
| `prompt-utils`        | 4         | 100 %                   |
| `edit-prompts`        | 10        | 100 %                   |
| `fixer.runEdit()`     | 3         | n/a (existing module)   |
| `edit-flow`           | 10        | ≥ 90 %                  |
| `eval-edit-flow.ts`   | 1× Smoke  | n/a                     |
| Eval-Set: 5 Scenarios | —         | mind. 3 grün ohne Retry |

**Merge-Gate:** Tests grün + Eval-Smoke (`--only=1-typo-fix` läuft erfolgreich gegen real Claude).

### Phase 3 — Editor-UI + `??`-Removal _(härtester Gate)_

| Bereich                                               | Anforderung                                                                      |
| ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| Browser-Suite `edit-flow-integration`                 | ≥ 12 Tests grün                                                                  |
| Vitest komplett                                       | grün, **inkl.** keine verwaisten Imports auf gelöschte Files                     |
| `grep -r 'draftMode\|draft-prompts\|??-mode' studio/` | nur Doku-Kommentare, kein Code                                                   |
| `app.js` start                                        | keine Console-Errors beim App-Start                                              |
| Manueller End-to-End-Stichprobe                       | `Cmd+Enter` auf realer App produziert plausibles Ghost (mit `npm run ai-bridge`) |
| Coverage-Schwelle                                     | nicht gesunken vs. Phase-2-Baseline                                              |

**Merge-Gate:** alles oben + Phase-3-Stack als zusammenhängende Einheit reviewed.

**Implementation-Stil (Memory: "Iterativer Mikro-Schritt-Ansatz"):** Phase 3 wird intern als **viele kleine Commits** umgesetzt — die 22 Schritte aus `llm-edit-flow-plan.md` § 4.4 werden einzeln gemacht, nach jedem Schritt laufen die Tests, der Schritt wird kurz reflektiert, dann der nächste. Der **Merge** an `main` ist atomar (alle Schritte zusammen), die **Entwicklung** dahin ist mikro-stepped. Kein "Big-Bang" — auch wenn das Endergebnis als ein PR landet.

Konkret bedeutet das pro Mikro-Schritt:

1. Genau eine Datei löschen / einen Import bereinigen / eine Wiring-Stelle umstellen.
2. `npx vitest --run` + `npx tsx tools/test.ts --filter="ai"` laufen.
3. Grün? → committen mit beschreibender Message ("Phase 3 — Step C.8: delete draft-lines.ts"). Reflektieren (was hat sich verändert? Test-Anzahl plausibel?).
4. Erst dann zum nächsten Schritt.

Ein Stack aus 20+ kleinen Commits ist hier _besser_ als 3 grosse — er macht Bisect/Rollback billig und erzwingt nach jedem Schritt eine Stabilitätsprüfung.

### Phase 4 — Verfeinerung

- Retry-Loop-Tests (Unit) ≥ 3 Cases
- Cancel-Tests (Unit + Browser) je 1
- Edge-Case-Tests: leerer Source, sehr lange Files (> 5000 Zeilen Smoke), Bridge offline (Banner-Test)
- Auto-Verwerfen-bei-Direct-Edit Test

### Phase 5 — Eval + Tuning

- Eval-Set ausgebaut auf **30 Scenarios** (10 pro Modus)
- Scenarios werden inkrementell gebaut (siehe § 4.6)
- **Erfolg:** Anker-Hit-Rate ≥ 95 % über alle 30, Compile-Pass ≥ 90 %, P50-Latenz dokumentiert

### Phase 6 — Edit-im-Ghost (V2)

- Variante (a): 1 Browser-Test ("Tippen-im-Ghost commited Source und macht editierbar")
- User-Test mit 3 Designern dokumentiert (kein automatischer Test, aber Ergebnis-Memo)

---

## 6. Eval-Scenarios (Inkrementelles Wachstum)

| Phase     | Scenarios   | Verteilung Modi (1/2/3)             | Wer schreibt sie |
| --------- | ----------- | ----------------------------------- | ---------------- |
| Phase 2   | 5 (initial) | 2 / 2 / 1                           | Implementer      |
| Phase 4   | +10         | +3 / +3 / +4 (Edge-Cases)           | Implementer      |
| Phase 5   | +15         | +5 / +5 / +5 (komplexere Refactors) | Tuning-Iteration |
| **Total** | **30**      | **10 / 10 / 10**                    | —                |

**Scenarios werden NICHT in einem Schwung erstellt.** Pro Scenario:

1. Datei `scripts/eval-edit-flow/scenarios/<id>.ts` neu anlegen.
2. `npx tsx scripts/eval-edit-flow.ts --only=<id>` laufen.
3. Output ansehen, Assertions prüfen.
4. Falls grün: committen mit Scenario-ID im Commit-Subject.
5. Falls rot: diagnostizieren (warum hat das LLM nicht gematched? Anker zu kurz? Prompt unklar?), Fix, neu laufen.
6. Erst dann zum nächsten Scenario.

---

## 7. Was wir bewusst NICHT testen

- **Echte LLM-Antwort-Qualität** im Unit-Layer — das ist Job des Eval-Drivers gegen real Claude.
- **Tauri-Runtime selbst** — wird gemockt (existierendes Pattern aus `??`-Mode).
- **Cross-Browser-Kompatibilität** — Studio läuft im CDP-Chrome, Tauri liefert Chromium-Webview. Keine Firefox/Safari-Tests.
- **Network-Failures auf HTTP-Level** — Bridge wird gemockt; reale Network-Layer ist `fetch()`-Standard.
- **A11y im Detail** des Prompt-Fields — manuelle Review, keine axe-Test-Suite.
- **Performance-Benchmarks gegen Echtzeit-Latenz** — Latenz wird in Eval gemessen (P50/P95), nicht als CI-Regression-Gate.
- **Mehrsprachigkeit von User-Instructions** — Eval-Scenarios in Deutsch (Studio-Sprache), kein bewusster Multi-Locale-Test.

---

## 8. Tool-Erweiterungen

### 8.1 Vitest-Snapshot-Convention etablieren

Bisher kein Repo-Pattern. Wir **führen `toMatchInlineSnapshot()`** für Prompt-Tests ein. Erfolgskriterium: nach Phase 2 stehen ≥ 5 Inline-Snapshots in `tests/studio/edit-prompts.test.ts`.

### 8.2 Per-Modul-Coverage-Threshold (≥ 90 %)

Anpassung in `vitest.config.ts:31-36` um eine `perFile`-Option:

```ts
coverage: {
  ...,
  thresholds: {
    lines: 80, functions: 80, branches: 70, statements: 80,
    perFile: false,
    // Strenger für die neuen AI-Module:
    'studio/agent/patch-format.ts': { lines: 100, branches: 100, functions: 100 },
    'studio/agent/patch-applier.ts': { lines: 100, branches: 100, functions: 100 },
    'studio/agent/change-tracker.ts': { lines: 100, branches: 100, functions: 100 },
    'studio/agent/source-diff.ts': { lines: 100, branches: 100, functions: 100 },
    'studio/agent/prompt-utils.ts': { lines: 100, branches: 100, functions: 100 },
    'studio/agent/edit-prompts.ts': { lines: 100, branches: 100, functions: 100 },
    'studio/agent/edit-flow.ts': { lines: 90, branches: 85, functions: 90 },
  },
}
```

Wird in T1.1 (oder spätestens T2.4) committed.

### 8.3 Eval-Driver `scripts/eval-edit-flow.ts`

- Übernimmt `Scenario` + `must`-Assertion-Pattern aus `eval-ai-simple.ts:42-120`.
- Zusätzliche Assertions: `must.patchAnchorUnique()`, `must.retryCountAtMost(n)`, `must.noUnrelatedChanges()`.
- Output-Format: stdout (PASS/FAIL pro Scenario + Aggregate-Metriken) + optional `--json=path` für CI.

### 8.4 Browser-Test-API: `withEditFlowContext`-Helper

Analog zu `withDraftContext` in `studio/test-api/suites/draft-mode/draft-mode-api.ts:97-130`. Wird in Phase 3 erstellt, deckt Setup/Teardown für Edit-Flow-Tests.

---

## 9. Test-Manifest (Module → Test-File)

### Vitest (`tests/studio/`)

| Modul                             | Test-File                             | Phase |
| --------------------------------- | ------------------------------------- | ----- |
| `studio/agent/patch-format.ts`    | `tests/studio/patch-format.test.ts`   | 1     |
| `studio/agent/patch-applier.ts`   | `tests/studio/patch-applier.test.ts`  | 1     |
| `studio/agent/change-tracker.ts`  | `tests/studio/change-tracker.test.ts` | 1     |
| `studio/agent/source-diff.ts`     | `tests/studio/source-diff.test.ts`    | 1     |
| `studio/agent/prompt-utils.ts`    | `tests/studio/prompt-utils.test.ts`   | 2     |
| `studio/agent/edit-prompts.ts`    | `tests/studio/edit-prompts.test.ts`   | 2     |
| `studio/agent/edit-flow.ts`       | `tests/studio/edit-flow.test.ts`      | 2     |
| `studio/agent/fixer.ts (runEdit)` | `tests/studio/fixer-edit.test.ts`     | 2     |

### Browser-Integration

| Suite                   | Datei                                                     | Phase |
| ----------------------- | --------------------------------------------------------- | ----- |
| Edit-Flow E2E (Mock)    | `studio/test-api/suites/ai/edit-flow-integration.test.ts` | 3     |
| Edit-Flow Safety (Mock) | `studio/test-api/suites/ai/edit-flow-safety.test.ts`      | 4     |
| Helper-API              | `studio/test-api/suites/edit-flow/edit-flow-api.ts`       | 3     |

### Eval (Real Claude)

| Driver      | Pfad                                                 | Phase |
| ----------- | ---------------------------------------------------- | ----- |
| Eval-Driver | `scripts/eval-edit-flow.ts`                          | 2     |
| Scenarios   | `scripts/eval-edit-flow/scenarios/<id>.ts` (einzeln) | 2/4/5 |

### Fixtures (gemeinsam)

| Zweck                            | Pfad                                              |
| -------------------------------- | ------------------------------------------------- |
| Kleine Source-Beispiele für Unit | inline in Tests                                   |
| Grosse Source-Beispiele für Unit | `tests/fixtures/edit-flow/*.mir`                  |
| Eval-Source-Inputs               | inline in `scripts/eval-edit-flow/scenarios/*.ts` |

---

## 10. Sichtbare Ausführung _(Memory-Hygiene)_

Per Memory-Feedback "Sichtbar arbeiten — KEINE Background/Monitor für Iteration":

- **Vitest-Iteration** während Implementation: `npx vitest --run --reporter=verbose tests/studio/patch-format.test.ts` (Foreground, voller Output).
- **Browser-Tests** während Implementation: `npx tsx tools/test.ts --filter="Edit-Flow" --headed` (sichtbar).
- **Eval** während Tuning: `npx tsx scripts/eval-edit-flow.ts --only=<id>` (Foreground, Output direkt sichtbar).
- **Nicht** in Background-Files verstecken, **nicht** mit Monitor pollen, **nicht** Pipes zu Output-Files. Bei Hängern → diagnostizieren, nicht nochmal versuchen.

---

## 11. Glossar (Test-spezifisch)

- **Anker-Hit-Rate** — Anteil der Eval-Scenarios bei denen alle vom LLM gelieferten Patches im **ersten Versuch** unique matchen (kein Retry nötig). Erfolgskriterium: ≥ 95 % über 30 Scenarios.
- **Compile-Pass-Rate** — Anteil der Eval-Scenarios deren resultierender Source vom Compiler-Validator (`compiler/validator/cli.ts`) ohne Errors akzeptiert wird.
- **Mock-Bridge** — `MockTauriBridge` aus `tests/helpers/mock-tauri-bridge.ts`; ersetzt `window.TauriBridge` mit deterministischen Antworten.
- **CLI-Bridge-Shim** — `installCliBridgeShim()` aus `studio/test-api/cli-bridge-shim.ts`; ersetzt `window.TauriBridge` mit HTTP-Aufrufen an `ai-bridge-server`. Brückt Browser-Tests zu echtem Claude.
- **Inline-Snapshot** — `toMatchInlineSnapshot('...')` aus vitest, der Snapshot-String steht direkt im Test-File. Aktualisierbar via `vitest -u`.
- **Atomarer Cut** (Phase 3) — alle Änderungen müssen als zusammenhängende Einheit gemerged werden. Tests vor Cut grün auf neuem Pfad, Tests nach Cut weiterhin grün ohne `??`-Stack.
