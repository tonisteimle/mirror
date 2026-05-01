# LLM-Edit-Flow — Implementation-Plan

> Companion zu `llm-edit-flow.md`. Beschreibt **heutigen Stand**, **Handlungsbedarf**, **Zielarchitektur**, **Migrationsweg** und **konkrete Tasks** für die Einführung des neuen, user-gesteuerten LLM-Edit-Flows im Studio.
>
> Die Anforderungen liegen in `llm-edit-flow.md` — dieses Dokument ist der **Umsetzungsplan**.
>
> **Wichtige Architektur-Entscheidung:** Der existierende `??`-Draft-Mode ist ein **altes Konzept** und wird durch den neuen Flow **vollständig abgelöst**, nicht in Coexistenz gehalten. Die Ablösung passiert atomar in **Phase 3** (zusammen mit der UI-Migration). Es gibt keinen Wrapping-Handler, keine Coexistenz-Phase, keinen Telemetrie-Gate.

---

## 1. Heutiger Stand (IST)

Die Studio-AI-Integration ist heute **vollständig auf den `??`-Draft-Mode zentriert**. Es gibt **nur einen einzigen AI-Trigger** (`??`-Marker), nur **eine einzige LLM-Aufruf-Methode** (`FixerService.generateDraftCode()`), und keinerlei generische Patch- oder Diff-Infrastruktur.

### 1.1 AI-Pfad: `??`-Draft-Mode

**Trigger + Editor-Integration**

- `studio/editor/draft-mode.ts:83` — `DRAFT_MARKER_REGEX` parst `^(\s*)\?\?\s*(.*)$`.
- `studio/editor/draft-mode.ts:109-158` — `parseDraftBlock()` findet Open/Close-Marker im Source.
- `studio/editor/draft-mode.ts:224-267` — `draftModeField: StateField<DraftBlockState>` mit drei Effects (`updateDraftStateEffect`, `setDraftProcessingEffect`, `clearDraftBlockEffect`).
- `studio/editor/draft-lines.ts:36-65` — `draftLinesField` für muted-Decorations.
- `studio/editor/draft-mode-manager.ts:293-309` — Keymap: **`Mod-Enter` submittiert**, `Escape` cancelt.
- `studio/editor/draft-mode.ts:481-499` — `replaceDraftBlock()` führt das Apply als single `dispatch({ changes: { from, to, insert } })` aus.

**Wiring + Bridge-Aufruf**

- `studio/bootstrap.ts:451-476` — verdrahtet `events.on('draft:submit')` → `fixer.generateDraftCode()` → `events.emit('draft:ai-response')`.
- `studio/agent/fixer.ts:83-140` — `FixerService.generateDraftCode(prompt, content, fullSource)`: sammelt Tokens/Components, baut Prompt, ruft Bridge, extrahiert Code-Block.
- `studio/agent/fixer.ts:147-152` — `getTauriBridge()` greift **hardcoded** auf `window.TauriBridge` zu (kein Abstraktions-Interface).

**Prompt-Bauer + Splice**

- `studio/agent/draft-prompts.ts:25-77` — `buildDraftPrompt()` mit Token-/Component-Sections, `??`-Marker im Source, Output-Format-Regeln.
- `studio/agent/draft-prompts.ts:79-92` — `formatProjectFileSection()` für Token + Komponenten (wiederverwendbar).
- `studio/agent/draft-prompts.ts:99-114` — `extractCodeBlock()` (parst ` ```mirror ` Block).
- `studio/agent/draft-prompts.ts:204-224` — `spliceDraftBlock()` (pure String-Op, ersetzt `??…??`-Bereich).

**Tests**

- `tests/studio/agent-fixer.draft-mode.test.ts` — Unit-Tests mit `createMockTauriBridge({ useRealCli: false })`.
- `tests/studio/agent-fixer.draft-wiring.test.ts` — Wiring (`draft:submit` → Fixer → `draft:ai-response`).
- `tests/studio/draft-prompts.test.ts` — Pure-Function-Tests für Prompt/Extract/Splice.
- `studio/test-api/suites/ai/draft-mode-integration.test.ts` — Browser-Integration inkl. `executeKeyBinding('Mod-Enter')`.
- `studio/test-api/suites/ai/draft-mode-safety.test.ts` — Output-Validierung.

### 1.2 Editor (CodeMirror 6)

- `studio/app.js:1529-1557` — Editor wird **in Legacy-`app.js`** instanziiert; Extensions inkl. `draftModeExtension()`, `draftLinesExtension()`, `draftModeKeymap`, `defaultKeymap`, `historyKeymap`, `indentWithTab`, `completionKeymap`.
- `studio/editor/index.ts:181-205` — `EditorController` (Legacy v1).
- `studio/editor/editor-controller.ts` — Hexagonal v2 mit Ports.
- **Belegte Keys:** `Mod-Enter` (Draft-Submit), `Mod-]`/`Mod-[` (Indent), Standard-Keymaps. **`Cmd+Shift+Enter` ist frei.**
- **History:** CM6-Default (`history()` + `historyKeymap`), keine Custom-Logik.

### 1.3 Transport: Tauri + HTTP-Shim

- `studio/agent/fixer.ts:36-52` — `TauriBridge` Interface (`isTauri()`, `agent.checkClaudeCli()`, `agent.runAgent(prompt, agentType, projectPath, sessionId?)`).
- `studio/test-api/cli-bridge-shim.ts:33-120` — `installCliBridgeShim()` mocked `window.TauriBridge` per HTTP für Browser-Tests.
- `scripts/ai-bridge-server.ts` — HTTP-Server (Port 3456) ↔ `claude` CLI Subprocess.
- **Einziger `runAgent()`-Aufruf in Produktion:** `fixer.ts:127`.

### 1.4 Multi-File-Kontext

- `studio/agent/fixer.ts:107-126` — sammelt Token (`type==='tokens'`) + Component (`type==='components'`) Files via `getFiles()`-Callback.
- `studio/agent/draft-prompts.ts:79-92` — `formatProjectFileSection()` formatiert die Sections.
- **Source-of-Truth:** `app.js` injiziert via `getFiles()` / `getCurrentFile()` Callbacks in den Fixer.

### 1.5 Patch- / Code-Modifikation (existierend, aber spezialisiert)

- `compiler/studio/code-modifier.ts:117-254` — `CodeModifier` für **Property-Panel-Edits** (`updateProperty`, `addProperty`, `setLayoutDirection`, etc.). Arbeitet mit SourceMap, nicht für general Patches geeignet.
- `studio/agent/draft-prompts.ts:204` — `spliceDraftBlock()` — der einzige Source-Splicer für AI-Output, hardcoded auf `??`-Marker.
- **Kein generisches Diff-System** im Repo.
- **Keine Search/Replace-Patch-Infrastruktur.**

### 1.6 Tests + Eval

- `scripts/eval-ai-simple.ts` — Node-Eval (real `claude` CLI, kein Browser).
- Mock-Pattern: `createMockTauriBridge({ useRealCli, responseDelay, mockRawOutput })`.
- Browser-Integration via `cli-bridge-shim.ts` + laufender `ai-bridge-server`.

### 1.7 Was es NICHT gibt

- Keine `Cmd+Enter`-Variante ausserhalb `??`-Block (existierender Handler ist `??`-spezifisch).
- Keine `Cmd+Shift+Enter`-Bindung.
- Kein Inline-Prompt-Feld.
- Kein generischer Patch-Parser (Search/Replace-Format).
- Kein Anker-Validator / Retry-Loop.
- Kein Diff-Renderer (Source-zu-Source-Diff als CM-Decoration).
- Kein "Working-Copy"-Konzept (Editor-State ist immer der echte Source).
- Kein Change-Tracking zwischen LLM-Calls.

---

## 2. Handlungsbedarf (Gap-Analyse)

| Anforderung (`llm-edit-flow.md`)                     | Status heute                                          | Lücke                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **F1** Freies Schreiben ohne Auto-Trigger            | ✅ erfüllt — heute existiert kein Auto-Trigger        | —                                                                                         |
| **F2** `Cmd+Enter` ohne Selection → Whole-Doc-Edit   | ⚠️ Key heute durch `??`-Submit belegt                 | `??`-Mode in Phase 3 entfernt; `Cmd+Enter` wird unconditional auf den neuen Flow gebunden |
| **F3** `Cmd+Enter` mit Selection → fokussiert        | ❌ nicht vorhanden                                    | Selection-Awareness in neuem Handler + Prompt                                             |
| **F4** `Cmd+Shift+Enter` → Inline-Prompt-Feld        | ❌ nicht vorhanden                                    | Floating-Widget + Keybinding + Prompt-Erweiterung                                         |
| **F5** Kontext-Bündel (source/cursor/selection/diff) | 🟡 teilweise — Source + Tokens/Comps schon vorhanden  | Cursor-Position, Selection, Diff-since-last-Call müssen ergänzt werden                    |
| **F6** Search/Replace-Patches als Antwort            | ❌ nicht vorhanden                                    | Neuer Patch-Parser + neues Prompt-Format                                                  |
| **F7** Anker-Validierung mit Retry                   | ❌ nicht vorhanden                                    | Anker-Suche + Uniqueness-Check + Retry-Loop                                               |
| **F8** Diff-Ghost als Visualisierung                 | ❌ nicht vorhanden                                    | Source-Diff-Lib + CM-Decoration (red-strike + green-add)                                  |
| **F9** Tab/Esc/Edit-Gesten                           | ❌ nicht vorhanden                                    | Ghost-Acceptor-Keymap + (V2) Editierbarkeit im Ghost                                      |
| **F10** Cancel laufender Calls                       | 🟡 `AbortController` existiert in Draft-Mode-State    | Wiederverwendbar, aber muss sauber an Bridge-Calls verdrahtet werden                      |
| **NF1** Reuse Bridge-Infrastruktur                   | ✅ direkt nutzbar                                     | —                                                                                         |
| **NF2** Minimaler Studio-State-Footprint             | 🟡 erfordert 1–2 neue StateFields                     | `editFlowField` (parallel zu `draftModeField`) + `ghostDiffField`                         |
| **NF3** Latenz-Toleranz, Diff-Cap                    | ❌ Diff-Tracker existiert nicht                       | Neuer `change-tracker` mit Hard-Cap                                                       |
| **NF4** Keine destruktiven Auto-Apply                | ✅ aktuell auch so                                    | —                                                                                         |
| **NF5** Provenance via single Undo-Step              | ✅ CM6-History reicht (single Transaction = single Z) | Apply muss als **eine** Transaction laufen                                                |

**Zusammenfassung:** ca. 70 % muss neu gebaut werden. Stark wiederverwendbar sind: (a) Bridge-Pfad inkl. Mock/Shim, (b) `formatProjectFileSection` (wandert nach `studio/agent/prompt-utils.ts`), (c) Test-Mock-Infrastruktur. Der Rest des `??`-Stacks (`draft-mode.ts`, `draft-mode-manager.ts`, `draft-lines.ts`, `draft-prompts.ts`, `extractCodeBlock`, `spliceDraftBlock`, `buildDraftPrompt`) wird in Phase 3 **gelöscht**.

---

## 3. Zielarchitektur (SOLL)

### 3.1 Modul-Diagramm

```
studio/agent/
├── edit-flow.ts          [NEU]      Orchestrator
├── patch-format.ts       [NEU]      Parser für @@FIND/@@REPLACE/@@END
├── patch-applier.ts      [NEU]      Anker-Suche + Apply + Retry-Hints
├── edit-prompts.ts       [NEU]      Prompt-Templates Modi 1/2/3
├── change-tracker.ts     [NEU]      Diff-since-last-call
├── source-diff.ts        [NEU]      Line-Diff-Adapter (Lib-Wrapper)
├── prompt-utils.ts       [NEU]      formatProjectFileSection() (extrahiert)
├── fixer.ts              [ERSETZT]  nur runEdit(); generateDraftCode() entfernt
├── types.ts              [BLEIBT]   FileInfo Interface
├── index.ts              [ERSETZT]  Re-exports nur für neuen Flow
└── draft-prompts.ts      [LÖSCHEN]  alle Funktionen ersetzt oder obsolet

studio/editor/
├── llm-keymap.ts         [NEU]      Cmd+Enter / Cmd+Shift+Enter (unconditional)
├── ghost-diff.ts         [NEU]      CM Decoration für Diff-Overlay
├── prompt-field.ts       [NEU]      Inline-Prompt-Widget
├── draft-mode.ts         [LÖSCHEN]  ??-Marker-Erkennung
├── draft-mode-manager.ts [LÖSCHEN]  ??-Keymap + State-Management
└── draft-lines.ts        [LÖSCHEN]  ??-Lines-Decorations
```

### 3.2 Datenstrukturen (TypeScript)

```ts
// patch-format.ts
export interface Patch {
  find: string // exact source snippet (multi-line allowed)
  replace: string // can be empty (= delete)
}
export interface ParsedPatchResponse {
  patches: Patch[]
  parseErrors: string[] // empty = clean parse
}

// patch-applier.ts
export interface ApplyResult {
  success: boolean
  newSource?: string
  retryHints?: RetryHint[]
}
export interface RetryHint {
  patch: Patch
  reason: 'no-match' | 'multiple-matches'
  matchCount: number
}

// change-tracker.ts
export interface ChangeSnapshot {
  baseline: string // source at time of last LLM call
  current: string // source now
  diffSummary: string // capped, formatted for prompt-injection
}

// edit-flow.ts
export interface EditCaptureCtx {
  source: string
  cursor: { line: number; col: number }
  selection: { from: number; to: number; text: string } | null
  diffSinceLastCall: string // capped
  instruction: string | null // Mode 3 only
  projectFiles: { tokens: Record<string, string>; components: Record<string, string> }
}
export interface EditResult {
  status: 'ready' | 'no-change' | 'error'
  proposedSource?: string // working copy after patches
  error?: string
}

// ghost-diff.ts
export interface GhostDiffState {
  baseSource: string // editor source at time of Cmd+Enter
  newSource: string // proposed source after patches
  active: boolean
}
```

### 3.3 Sequenz: Cmd+Enter ohne Selection (Modus 1)

```
User: Cmd+Enter
  └─> llm-keymap.ts: handleModEnter()
        ├─ Inside ??-block? → forward to draftModeKeymap.run()
        └─ Else: edit-flow.ts: handleEdit({ instruction: null })

edit-flow.handleEdit():
  1. Capture EditCaptureCtx (source, cursor, selection?, diff, projectFiles)
  2. dispatch ghostDiffField "thinking" indicator
  3. edit-prompts.buildPrompt(ctx) → fullPrompt: string
  4. fixer.runEdit(fullPrompt, abortSignal) → rawResponse: string
  5. patch-format.parse(rawResponse) → ParsedPatchResponse
     ├─ parseErrors? → status='error', show banner, return
  6. patch-applier.apply(source, patches) → ApplyResult
     ├─ retryHints? AND retries < MAX_RETRIES:
     │     loop: build hint-prompt → fixer.runEdit() → parse → apply
     │     until success OR retries == MAX
     ├─ still failing? → status='error', show banner, return
  7. dispatch ghostDiffField { baseSource, newSource: applyResult.newSource }
  8. ghost-diff.ts renders Decorations (red-strike + green-add)

User: Tab
  └─> ghost-diff keymap: acceptGhost()
        └─ single transaction: source := newSource, clear ghostDiffField,
           focus moves to first changed line

User: Esc
  └─> ghost-diff keymap: dismissGhost()
        └─ clear ghostDiffField, no source change
```

### 3.4 Sequenz: Anker-Retry-Loop

```
patch-applier.apply(source, patches):
  workingCopy = source
  for patch in patches:
    matches = findAll(workingCopy, patch.find)
    if matches.length == 1:
      workingCopy = workingCopy.replace(patch.find, patch.replace)
    elif matches.length == 0:
      retryHints.push({ patch, reason: 'no-match', matchCount: 0 })
    else:
      retryHints.push({ patch, reason: 'multiple-matches', matchCount: N })

  if retryHints.empty: return { success, newSource: workingCopy }
  else: return { success: false, retryHints }

edit-flow retry loop:
  while retries < MAX (default 2) AND result.retryHints:
    hintMsg = formatHints(result.retryHints)
    rawResponse = fixer.runEdit(originalPrompt + hintMsg)
    patches = parse(rawResponse)
    result = apply(source, patches)  // ← from ORIGINAL source, not partial workingCopy
    retries++
```

### 3.5 Ablösung des `??`-Modes

`Cmd+Enter` wird **unconditional** auf den neuen Flow gebunden — kein Wrapping, keine Delegation:

```ts
// llm-keymap.ts
export const llmEditKeymap = [
  { key: 'Mod-Enter', run: handleEditFlow },
  { key: 'Mod-Shift-Enter', run: openPromptField },
]

// app.js extensions (nach Phase 3):
extensions: [
  keymap.of(llmEditKeymap),
  ghostDiffField,
  ...defaultKeymap,
  // KEINE draftModeKeymap, draftModeExtension, draftLinesExtension mehr
]
```

**Atomare Migration:** In Phase 3 wird in einem Commit

1. der neue Flow verdrahtet (`llmEditKeymap`, `ghostDiffField` aktiv),
2. das `??`-Wiring aus `bootstrap.ts` entfernt (`draft:submit`/`draft:ai-response`-Listener weg),
3. `draftModeExtension`, `draftLinesExtension`, `draftModeKeymap` aus dem Extensions-Array von `app.js` entfernt,
4. die Files `studio/editor/draft-mode*.ts`, `studio/editor/draft-lines.ts`, `studio/agent/draft-prompts.ts` gelöscht (`formatProjectFileSection` ist vorher nach `prompt-utils.ts` extrahiert),
5. Tests gelöscht oder ersetzt (siehe § 4.4).

Nach Phase 3 ist `??` **vollständig weg** — keine Toleranz im Source, kein Marker-Parsing, keine Tests.

---

## 4. Migrationsweg

### 4.1 Strategie

**Inkrementell, dann atomar.** Phasen 1 und 2 bauen die neue Logik (Patch-Parser, Applier, Prompts, Bridge-Aufruf) **parallel zum bestehenden `??`-Stack** — ohne Editor-Sichtbarkeit, daher keine User-Auswirkung. Der `??`-Mode bleibt in dieser Zeit voll funktional.

In **Phase 3** erfolgt die **atomare Ablösung** in einem zusammenhängenden Commit (oder Kleinst-Stack): neuer Flow wird live, `??`-Stack wird gelöscht. Nach Phase 3 gibt es nur noch _einen_ AI-Pfad.

Es gibt **keine** Coexistenz-Periode, **kein** Telemetrie-Gate, **keine** Deprecation-Warning. Die Anforderungen aus `llm-edit-flow.md` sind explizit als Ablösung formuliert; ein temporäres Nebeneinander würde nur Verwirrung erzeugen und doppelt-getestete Pfade hinterlassen.

### 4.2 Reihenfolge (Begründung)

1. **Foundation** (Phase 1) — Patch-Parser, Patch-Applier, Change-Tracker, Source-Diff. Reine Logik, vitest-getestet, keine UI/Bridge nötig. `??`-Stack unangetastet.
2. **Bridge + Prompt** (Phase 2) — `fixer.runEdit()`, Prompt-Templates, Orchestrator-Skeleton, Eval-Driver. `??`-Stack unangetastet, alte Methoden bleiben weiter funktional.
3. **Editor-UI + `??`-Removal** (Phase 3) — atomarer Cut: neuer Flow verdrahtet + alter Stack gelöscht. Ab hier ist `??` Geschichte.
4. **Verfeinerung** (Phase 4) — Retry-Loop, Cancel, Edge-Cases.
5. **Eval-Tuning** (Phase 5) — Anker-Hit-Rate ≥ 95 % über realistisches Eval-Set.
6. **Edit-im-Ghost** (Phase 6, V2) — entscheidet sich nach User-Test.

### 4.3 Risiken + Mitigation

| Risiko                                                   | Wahrsch. | Auswirkung | Mitigation                                                                                                                               |
| -------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Anker-Hit-Rate < 95 % auch nach Tuning                   | Mittel   | Hoch       | Phase 5 = harter Gate; ggf. SDK-Streaming-Pfad parallel evaluieren                                                                       |
| Prompt-Bloat (Diff zu fett, ProjectCtx zu fett)          | Mittel   | Mittel     | Diff hart gecappt (200 Zeilen), ProjectCtx auf relevante Files                                                                           |
| Phase 3 atomarer Cut bricht versehentlich AI-Funktion    | Niedrig  | Hoch       | Phase-3-Commit muss vollständige neue Test-Suite passen, _bevor_ alte Tests/Files gelöscht werden (interne Reihenfolge im Phase-3-Stack) |
| Diff-Ghost-Decoration kostet Performance bei 1000+ Lines | Niedrig  | Niedrig    | Decorations sind line-basiert; CM6 ist effizient. Profiling Phase 4                                                                      |
| Retry-Loop-Latenz × 3 wirkt unangenehm                   | Mittel   | Mittel     | Retries hart auf 2 limitieren; danach Fehler-Banner statt 3. Versuch                                                                     |
| Streaming-Antworten sind essenziell für UX               | Niedrig  | Mittel     | Status-Indicator macht Latenz tolerierbar; SDK-Pfad als Eskalation                                                                       |
| User editiert während Ghost sichtbar                     | Hoch     | Niedrig    | Auto-Verwerfen + Toast (siehe Anforderungen)                                                                                             |
| User-Source enthält noch `??`-Marker (alte Files)        | Niedrig  | Niedrig    | `??` ist im neuen Flow nur normaler Text — wird vom LLM einfach mitberücksichtigt; keine Migration nötig                                 |

### 4.4 Removal-Strategie

In Phase 3, **interne Reihenfolge** des atomaren Cuts (kann auf mehrere Commits gestackt sein, muss aber als zusammenhängende Einheit gemerged werden):

**Schritt A — Vorbereitung _(neue Tests grün, alte noch da):_**

1. `studio/agent/prompt-utils.ts` extrahieren (`formatProjectFileSection` aus `draft-prompts.ts` kopieren).
2. Neue `edit-prompts.ts` nutzt `prompt-utils.ts`, _nicht_ `draft-prompts.ts`.
3. Komplette Test-Suite des neuen Flows läuft grün.

**Schritt B — Wiring umstellen:** 4. `studio/bootstrap.ts`: `initDraftModeManager()` und `draft:submit`/`draft:ai-response`-Listener entfernen, durch `initEditFlow()` ersetzen. 5. `studio/app.js` Extensions-Array: `draftModeExtension`, `draftLinesExtension`, `draftModeKeymap` entfernen, durch `llmEditKeymap`, `ghostDiffField` ersetzen. 6. `studio/agent/fixer.ts`: `generateDraftCode()` entfernen, nur `runEdit()` bleibt. 7. `studio/agent/index.ts`: Re-exports auf neuen Flow umstellen.

**Schritt C — Files löschen:** 8. `studio/editor/draft-mode.ts` löschen. 9. `studio/editor/draft-mode-manager.ts` löschen (auch das `draft-mode-manager 2.ts` Duplikat). 10. `studio/editor/draft-lines.ts` löschen. 11. `studio/agent/draft-prompts.ts` löschen. 12. `studio/autocomplete/codemirror.ts:18`: Import von `draftModeField` entfernen, betroffener Block (`isLineInDraftBlock`-Check) löschen.

**Schritt D — Tests aufräumen:** 13. `tests/studio/agent-fixer.draft-mode.test.ts` löschen. 14. `tests/studio/agent-fixer.draft-wiring.test.ts` löschen. 15. `tests/studio/draft-prompts.test.ts` löschen. 16. `studio/test-api/suites/ai/draft-mode-integration.test.ts` löschen. 17. `studio/test-api/suites/ai/draft-mode-safety.test.ts` löschen oder als `edit-flow-safety.test.ts` umschreiben. 18. `studio/test-api/suites/draft-mode/` Verzeichnis löschen. 19. `studio/test-api/test-runner.ts:732,748`: Draft-Mode-API-Registrierung entfernen.

**Schritt E — Validierung:** 20. Komplette Test-Suite (vitest + Browser) grün. 21. App startet ohne Konsolen-Errors. 22. Manuelle Stichprobe: Cmd+Enter auf einem realen Layout liefert plausibles Diff-Ghost.

**Pflicht-Gate für Phase 3:** Schritt E.20 muss vollständig grün sein, _bevor_ der Phase-3-Stack als gemerged gilt.

---

## 5. Tasks

Format: `T<phase>.<n> — <subject>`. Effort: **S** = ½ Tag, **M** = 1–2 Tage, **L** = 3–5 Tage.

### Phase 1 — Foundation _(Logik, no UI, no bridge)_

- **T1.1 (S)** — `studio/agent/patch-format.ts` schreiben.
  Funktion: `parsePatchResponse(rawText: string): ParsedPatchResponse`. Erkennt `@@FIND … @@REPLACE … @@END`-Blöcke, robust gegen umgebenden Text (LLM-Vorrede), liefert `parseErrors` bei syntaktisch defekten Blöcken.
  **DoD:** ≥ 15 vitest-Cases (gut/leer/multi/defekt/whitespace-edge), 100 % branch-coverage.

- **T1.2 (M)** — `studio/agent/patch-applier.ts` schreiben.
  Funktion: `applyPatches(source: string, patches: Patch[]): ApplyResult`. Sequenzielles Apply mit Anker-Uniqueness-Check; Sammlung von `RetryHint`s bei Fehlschlag. Apply ist **nicht** transaktional (Working-Copy mutiert), aber bei jedem Retry beginnt der Loop wieder vom Original-Source.
  **DoD:** ≥ 12 vitest-Cases (single/multi/no-match/multi-match/leeres-replace/multi-line-anker), Property-Test "applyPatches(s, [no-op]) === s".

- **T1.3 (S)** — `studio/agent/change-tracker.ts` schreiben.
  Funktion: `track(currentSource: string)` registriert; `getDiffSinceLastCall()` liefert formatted unified diff (capped auf `MAX_DIFF_LINES = 200`). State pro File-Identifier.
  **DoD:** ≥ 8 vitest-Cases, Cap-Verhalten getestet.

- **T1.4 (S)** — Diff-Library Wahl + Adapter.
  Empfehlung: `diff` von npm (line-based). Adapter `studio/agent/source-diff.ts` mit `computeLineDiff(a: string, b: string): DiffHunk[]`.
  **DoD:** Adapter-Tests, kein direkter Lib-Import in anderen Modulen.

### Phase 2 — Prompt + Bridge

- **T2.1 (S)** — `studio/agent/prompt-utils.ts` extrahieren.
  `formatProjectFileSection()` aus `draft-prompts.ts` kopieren (noch nicht löschen — das passiert in Phase 3). Pure-Function-Tests.
  **DoD:** Tests für leere/befüllte Sections; identisches Output-Format wie Original.

- **T2.2 (M)** — `studio/agent/edit-prompts.ts` schreiben.
  `buildEditPrompt(ctx: EditCaptureCtx): string` mit drei Varianten (Modi 1/2/3). Nutzt `prompt-utils.formatProjectFileSection()`. Patch-Format-Beispiele + "Anker MUSS unique sein"-Regel im Prompt.
  **DoD:** Snapshot-Tests pro Modus + Test dass `buildEditPrompt` mit/ohne Selection/Instruction unterschiedliche Header erzeugt.

- **T2.3 (S)** — `studio/agent/fixer.ts` erweitern um `runEdit(prompt, signal): Promise<string>`.
  Parallel zu `generateDraftCode()` (alte Methode bleibt bis Phase 3). Nutzt `agentType: 'edit'` für Telemetry-Trennung. `signal` für Cancel-Support.
  **DoD:** Mock-Tests mit `createMockTauriBridge`; Cancel-Test (Abort during call).

- **T2.4 (M)** — `studio/agent/edit-flow.ts` Orchestrator (skeleton, ohne UI).
  Kombiniert Capture → Prompt → Bridge → Parse → Apply → Retry. Liefert `EditResult`. Pure-async-function, keine Editor-Abhängigkeit (nimmt Source als Input).
  **DoD:** Integration-Test gegen Mock-Bridge mit canned `@@FIND/@@REPLACE`-Antwort, plus Retry-Test (zwei Mock-Antworten in Folge).

- **T2.5 (S)** — Eval-Driver für Edit-Flow.
  `scripts/eval-edit-flow.ts` analog zu `eval-ai-simple.ts`. Initiales Set: 5 Beispiele pro Modus.
  **DoD:** Lokal lauffähig gegen real `claude` CLI; Output: Hit-Rate-Report.

### Phase 3 — Editor-UI + `??`-Removal _(atomarer Cut)_

**Schritt A — Neue UI bauen (alte bleibt parallel funktional):**

- **T3.1 (M)** — `studio/editor/ghost-diff.ts` (CM-Decoration + StateField).
  `ghostDiffField: StateField<GhostDiffState>` mit Effects (`setGhostDiff`, `clearGhostDiff`). Decoration-Logik: rote line-strike-Decorations für entfernte Zeilen, grüne block-Decorations für neue Zeilen.
  **DoD:** Browser-Test (kein Diff sichtbar wenn `active=false`; korrekt rendert Diff bei manueller Test-Setup).

- **T3.2 (S)** — `studio/editor/llm-keymap.ts` (unconditional `Mod-Enter` + `Mod-Shift-Enter`).
  Direkte Bindung, kein Wrapping. `Mod-Enter` → `handleEditFlow(view)`. `Mod-Shift-Enter` → `openPromptField(view)`.
  **DoD:** Vitest-Tests für Keymap-Resolver (mit Mock-Edit-Flow).

- **T3.3 (M)** — `studio/editor/prompt-field.ts` (Inline-Floating-Widget).
  Position: relativ zum aktuellen Cursor (über `view.coordsAtPos()`). Einfaches `<input>` mit Auto-Focus, Enter submittiert, Esc schliesst.
  **DoD:** Visueller Test, A11y (Focus-Trap), Position-Korrektur bei Scroll.

- **T3.4 (S)** — Status-Indicator + Tab/Esc-Akzept-Keymap.
  DOM-Element für "denkt…" / "Ergebnis bereit" / "Fehler". Tab/Esc-Bindings akzeptieren bzw. verwerfen das Diff-Ghost (nur aktiv wenn `ghostDiffField.active`).
  **DoD:** Browser-Test der drei States + Tab/Esc-Verhalten.

**Schritt B — Wiring umstellen + Alt entfernen _(siehe § 4.4 für Reihenfolge):_**

- **T3.5 (M)** — `prompt-utils.ts` extrahieren + Bootstrap-Wiring umstellen.
  Schritt A.1, A.2, B.4 aus § 4.4. Neue `initEditFlow()` ersetzt `initDraftModeManager()` in `bootstrap.ts`. `app.js` Extensions-Array auf neuen Stack umstellen.
  **DoD:** App startet, manuelle Stichprobe Cmd+Enter funktioniert E2E.

- **T3.6 (S)** — `fixer.ts` + `agent/index.ts` aufräumen.
  `generateDraftCode()` entfernen, Re-exports umstellen. Schritte B.6, B.7.
  **DoD:** Compile + alle Tests grün.

- **T3.7 (S)** — Files löschen (Schritt C aus § 4.4).
  `draft-mode.ts`, `draft-mode-manager.ts`, `draft-mode-manager 2.ts`, `draft-lines.ts`, `draft-prompts.ts`. Plus `studio/autocomplete/codemirror.ts` Import bereinigen.
  **DoD:** `grep -r "draftMode\|??-Mode\|draft-prompts" studio/` liefert nur noch History/Doku-Referenzen.

- **T3.8 (S)** — Tests löschen (Schritt D aus § 4.4).
  Sechs Test-Files + Test-Runner-Wiring + Suite-Verzeichnis.
  **DoD:** Test-Suite läuft, gleiche oder höhere Test-Anzahl (neue Tests für Phase 1–2 + 3a kompensieren die gelöschten).

**Pflicht-Gate für Phase 3:** Validierung (Schritt E) komplett grün vor Merge.

**Implementation-Stil:** die 22 Schritte werden als **viele kleine Commits** umgesetzt, nicht als ein Big-Bang. Pro Mikro-Schritt: ein File / ein Import / eine Wiring-Stelle ändern → Tests laufen → reflektieren → committen. Der Merge an `main` ist atomar (alle Commits zusammen), die Entwicklung dahin ist mikro-stepped. Siehe `llm-edit-flow-test-concept.md` § 5 für Details.

### Phase 4 — Verfeinerung

- **T4.1 (M)** — Retry-Loop hardening.
  `MAX_RETRIES = 2`, formatierte Hint-Strings ("dein Anker '...' matched 0× / 3×"), Telemetry pro Retry-Stufe.
  **DoD:** Eval-Set zeigt: bei Hit-Rate-Failure trifft mindestens 50 % der Retries.

- **T4.2 (M)** — Cancel-Handling.
  Esc cancelt In-Flight-`runEdit()` über `AbortController`; neuer `Cmd+Enter` cancelt vorigen Aufruf und re-captured.
  **DoD:** Browser-Test "Esc während denken bricht sauber ab, kein dangling Promise".

- **T4.3 (S)** — Edge-Cases.
  Leerer Source, sehr lange Files (Token-Budget-Estimate, evtl. Trim), Bridge offline (Banner + Hinweis auf `npm run ai-bridge`).
  **DoD:** je ein Test pro Edge-Case.

- **T4.4 (S)** — Auto-Verwerfen bei Direct-Edit während Ghost.
  StateField-Listener: `view.docChanged` while `ghostDiffField.active` → clear ghost + Toast.
  **DoD:** Browser-Test verifiziert.

### Phase 5 — Eval + Tuning

- **T5.1 (L)** — Eval-Set ausbauen auf 30 Beispiele.
  10 pro Modus, gemischter Schwierigkeitsgrad (einfache Tippfehler bis komplexe Refactorings).
  **DoD:** `scripts/eval-edit-flow.ts --all` läuft, dokumentierte Hit-Rate pro Kategorie.

- **T5.2 (M)** — Prompt-Tuning Iterationen.
  Bis Anker-Hit-Rate ≥ 95 %. Methode: incremental, max 3 Versuche pro Failure-Cluster.
  **DoD:** Hit-Rate-Report ≥ 95 %, dokumentiert.

- **T5.3 (S)** — Latenz-Messung + Entscheidung Streaming.
  P50/P95 über Eval-Set messen. Entscheidungs-Memo: bleiben bei CLI oder SDK-Streaming evaluieren.
  **DoD:** Memo committed in `docs/concepts/llm-edit-flow-plan.md` als Update.

### Phase 6 — Edit-im-Ghost (V2, optional)

- **T6.1 (M)** — Variante (a): Ghost-Acceptance bei erstem Tastendruck commited Source, dann normal weiter editierbar.
  Implementierung relativ einfach: `view.docChanged while ghostDiffField.active` → applyGhost + clear.
  **DoD:** UX-Test mit 3 Designern.

- **T6.2 (L)** — _(Falls (a) nicht überzeugt)_ Variante (b): Mini-Editor im Ghost-Overlay.
  Nicht-trivial, eigene CM-Sub-View. Nur falls (a) Phase-6-Test scheitert.
  **DoD:** Tasks 6.2.x werden bei Bedarf zugeschnitten.

---

## 6. Erfolgskriterien (Recap aus `llm-edit-flow.md`)

- Anker-Hit-Rate ≥ 95 % auf 30-Beispiel-Eval-Set (max 2 Retries).
- E2E-Latenz median < 4 s mit CLI bzw. < 1.5 s mit SDK.
- 3-5-Designer-User-Test: alle bestätigen "in Kontrolle".
- Nach Phase 3: kein einziger `??`-Mode-Code-Pfad mehr im Repo (`grep` zeigt nur Doku-Referenzen).

## 7. Glossar (Ergänzung)

- **Wrapping-Handler** — CM6-Keymap-Eintrag der vor anderen Handlern bindet und durch `return false` an den nächsten delegiert.
- **Working-Copy** — In-Memory-Source nach Patch-Apply, vor Editor-Commit.
- **Anker-Hit-Rate** — Anteil der LLM-Antworten bei denen ALLE Patches im ersten Versuch eindeutig matchen.

---

## Anhang: Datei-Manifest

**Neu zu erstellen:**

- `studio/agent/edit-flow.ts`
- `studio/agent/patch-format.ts`
- `studio/agent/patch-applier.ts`
- `studio/agent/edit-prompts.ts`
- `studio/agent/change-tracker.ts`
- `studio/agent/source-diff.ts`
- `studio/agent/prompt-utils.ts` _(extrahiert `formatProjectFileSection` aus `draft-prompts.ts`, vor dessen Löschung)_
- `studio/editor/llm-keymap.ts`
- `studio/editor/ghost-diff.ts`
- `studio/editor/prompt-field.ts`
- `scripts/eval-edit-flow.ts`
- `tests/studio/patch-format.test.ts`
- `tests/studio/patch-applier.test.ts`
- `tests/studio/change-tracker.test.ts`
- `tests/studio/edit-flow.test.ts`
- `tests/studio/edit-prompts.test.ts`
- `tests/studio/prompt-utils.test.ts`
- `studio/test-api/suites/ai/edit-flow-integration.test.ts`

**Zu modifizieren _(Phase 3, Schritt B):_**

- `studio/agent/fixer.ts` — `generateDraftCode()` entfernen, `runEdit()` ist die einzige Methode
- `studio/agent/index.ts` — Re-exports auf neuen Flow umstellen
- `studio/bootstrap.ts` — `initDraftModeManager` raus, `initEditFlow` rein
- `studio/app.js` — Extensions-Array: `draftModeExtension`, `draftLinesExtension`, `draftModeKeymap` raus; `llmEditKeymap`, `ghostDiffField` rein
- `studio/autocomplete/codemirror.ts:18,71-80` — Import von `draftModeField` entfernen, `isLineInDraftBlock`-Block entfernen
- `studio/test-api/test-runner.ts:732,748` — Draft-Mode-API-Registrierung entfernen

**Zu löschen _(Phase 3, Schritte C + D):_**

- `studio/editor/draft-mode.ts`
- `studio/editor/draft-mode-manager.ts`
- `studio/editor/draft-mode-manager 2.ts` _(bestehendes Duplikat)_
- `studio/editor/draft-lines.ts`
- `studio/agent/draft-prompts.ts`
- `tests/studio/agent-fixer.draft-mode.test.ts`
- `tests/studio/agent-fixer.draft-wiring.test.ts`
- `tests/studio/draft-prompts.test.ts`
- `studio/test-api/suites/ai/draft-mode-integration.test.ts`
- `studio/test-api/suites/ai/draft-mode-safety.test.ts` _(oder umschreiben als `edit-flow-safety.test.ts`)_
- `studio/test-api/suites/draft-mode/` _(ganzes Verzeichnis)_

**Unverändert (relevante Reuse):**

- `scripts/ai-bridge-server.ts` — HTTP-Bridge bleibt
- `studio/test-api/cli-bridge-shim.ts` — Tauri-Shim bleibt
- `studio/agent/types.ts` — `FileInfo` Interface bleibt
