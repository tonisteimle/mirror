# Findings

Zentrales Dokument für Architektur- und Code-Probleme, die in Mirror auffallen.
Jeder Dev (oder Claude-Session) trägt hier ein, was sie/er findet — egal ob
sofort fixbar oder nur eine Notiz.

## Wie tragen wir ein?

Pro Befund ein Listeneintrag in der passenden Sektion:

```
- **Wo:** `file:line` oder kurzer Bereich
  **Was:** Ein Satz Beschreibung des Problems.
  **Status:** offen | erledigt (`commit-hash`) | abgewiesen (kurze Begründung)
  **Notiz:** _(optional, max 2–3 Zeilen Kontext)_
```

Wenn ein Eintrag mehr als ~3 Zeilen Kontext braucht, ist er kein Eintrag mehr,
sondern eine eigene Untersuchung — dann separates Dokument, von hier verlinken.

Keine Phasen, keine Status-Tabellen, keine Quality-Gates. Append-only.

---

## Offen

- **Wo:** Studio dupliziert Compiler-Pfade
  - `studio/pickers/token/types.ts:parseTokens` — eigener Token-Parser
  - `studio/code-modifier/property-extractor.ts:302` — `componentMap`
  - `studio/sync/component-line-parser.ts` — eigener Component-Parser

  **Was:** Audit der drei Verdachts-Stellen:
  - `parseTokens` (175 LOC): echte Duplikation — Regex-basierter Parser
    produziert UI-spezifisches `TokenDefinition`-Shape mit Type-
    Klassifikation (color/spacing/size/font), Property-Set-Detection,
    Chain-Resolution (8 hops). Compiler-Token-Parser produziert AST-
    Knoten — andere Output-Shape. Migration = AST + Mapping-Layer in
    Studio. Multi-Day-Refactor.
  - `property-extractor.ts:302 componentMap`: **keine Duplikation** —
    `Map<string, ComponentDefinition>` ist nur Perf-Index aus
    `ast.components`. Standard-Pattern.
  - `component-line-parser.ts` (344 LOC): **keine Duplikation** —
    parses single lines for cursor-to-element sync DURING typing
    (vor Compile). Compiler-Parser braucht ganze Datei + AST-Bau,
    funktioniert nicht für diesen Use-Case.

  **Status:** teilweise abgewiesen — 2 von 3 sind keine Duplikation.
  `parseTokens`-Migration bleibt offen als Multi-Day-Slice.
  **Notiz:** Echter Refactor wäre: Compiler exposed `parseTokensToAST`,
  Studio mappt AST→`TokenDefinition` mit Type-Inference + Chain-
  Resolution als post-pass. Risiko: Regex-Parser hat Subtleties (z.B.
  Inline-Comments, Single-Property-Set-Reject) die der AST nicht 1:1
  reproduziert. Test-First nötig.

- **Wo:** `compiler/parser/ops/parse-blocks.ts` (Slice 21 V-1)
  **Was:** Verbleibender silent-failure-Pfad: undefined component →
  Frame-Fallback ohne Hinweis. Validator E002 fängt es im Studio-Pfad,
  aber Single-File-Compile (CLI) sollte ebenfalls fehlschlagen.
  V-3 (self-recursion `data-component="Unknown"`) erledigt in
  `e0ba0bda` — Marker ist jetzt `data-recursion-stopped="<Name>"`.
  V-4: `Name:` als Slot ist intentional gültiges Mirror — nur die
  Sub-Variante `ChildName extends Parent:` innerhalb einer
  Component-Body war wirklich silent-broken (wurde zu malformed
  Instance mit `extends` als Property-Name). body-parser.ts meldet
  jetzt einen Parse-Error und überspringt den Body sauber. Test in
  `parser-nested-state.test.ts`.
  **Status:** erledigt — V-1 löst sich an der IR-Schicht: der Resolver
  in `instance-ops.ts:transformInstance` emittiert jetzt eine
  `undefined-component`-Warnung, wenn `componentMap` nichts findet
  UND der Name weder Primitive noch Zag- noch Chart-Primitive ist.
  Damit greift die Diagnose in beiden Pfaden — Studio (Validator E002)
  und CLI (IR-Warnings). Neuer `IRWarningType` `undefined-component`
  in `compiler/ir/types.ts`. 7349/7349 compiler tests pass.
  **Notiz:** Audit in
  `docs/refactoring/21-komponenten.md` Section 3 (V-1).

- **Wo:** Dead-feature-Verdacht (zu prüfen vom Owner)
  **Was:** Slices wie Stacked-Overlay (8), Custom-Icons-Registry (51),
  Prose-Mode (66), Section-Header-Parsing (Slice 25 E002 Probe 22) — werden
  diese in echten Mirror-Projekten benutzt? Wenn nein, ersatzlos streichen
  spart Wartungsaufwand.
  **Status:** offen
  **Notiz:** Braucht Owner-Entscheidung, kein Refactor-Befund.

### Studio Sync/State (Hunt 2026-05-10)

- **Wo:** `studio/core/state.ts:328-331`
  **Was:** `setSelection()` schreibt im Defer-Pfad gleichzeitig
  `deferredSelection` (neue API) und `queuedSelection` (legacy) — Dual-Write
  öffnet Inkonsistenz, wenn beide Pfade auseinanderlaufen.
  **Status:** erledigt — alle 6 Caller in `commands.ts` (Delete/Move/
  MoveWithLayout je execute+undo) auf
  `actions.setDeferredSelection({ type: 'nodeId', … })` migriert. Dual-
  Write entfernt, `queuedSelection`-Block in `setCompileResult` raus,
  Feld aus `state-types.ts` und Initial-State entfernt, 5 Tests
  umgeschrieben. 5815/5815 studio passes.

- **Wo:** `studio/core/state.ts:216-241` (`setCompileResult`)
  **Was:** Drei überlappende Selection-Pfade (queued/pending/deferred) mit
  separaten if/return-Blöcken — schwer zu lesen, fehleranfällig beim
  Erweitern.
  **Status:** teilweise erledigt — `queuedSelection`-Block entfernt
  (siehe oben). Bleiben pending+deferred mit zwei Early-Returns; siehe
  unten unter `state.ts:243-278`.

- **Wo:** `studio/core/state.ts:281-305`
  **Was:** Race-Window: `state.get()` wird **nach** `compile:completed`
  emittiert gelesen — Handler können Selection mutieren, `latestState` ist
  dann veraltet.
  **Status:** abgewiesen mit Teilfix — die `latestState`-Re-Read am Ende
  war schon richtig (Kommentar erklärt es). Verwandte echte Lücke war
  oben: `hasPending`/`hasDeferred` wurden vor dem Emit gesnapshotet —
  Handler die während des Emits pending/deferred setzen, würden verpasst.
  Beide Booleans werden jetzt **nach** dem `compile:completed` Emit
  gelesen (`postEmitState`). 48/48 robustness tests pass.

- **Wo:** `studio/core/state.ts:243-278`
  **Was:** Early-Returns bei pending/deferred Selection überspringen die
  Final-Selection-Validierung — invalide Selections aus Handlern können
  ungeprüft durchrutschen.
  **Status:** erledigt — Early-Return passiert jetzt nur noch wenn
  Resolver erfolgreich war (`if (resolvedNodeId) return`). Schlägt
  Resolver fehl (gibt `null` — passiert bei `pending` ohne Treffer und
  bei `deferred` `lastChildOf`/`line` ohne Treffer; nur die `nodeId`-
  Variante hat eingebauten Fallback), fällt der Code auf die bestehende
  Validation durch — eine veraltete Selection wird damit auf den
  Fallback-Root gesetzt statt stehenzubleiben. Test
  `falls through to validate existing selection when pending resolution fails`
  pinnt das Verhalten.

- **Wo:** `studio/core/state.ts:189-205`
  **Was:** Multi-Selection-Validierung filtert Knoten still ohne
  `multiselection:changed`-Emit — Listener sehen geänderte Auswahl erst beim
  nächsten expliziten Set.
  **Status:** abgewiesen — Befund stale, Code hat den Emit bereits in
  `state.ts:209`.

- **Wo:** `studio/core/state.ts:736-750` (`findFallbackSelection`)
  **Was:** Simplistischer Fallback (`roots[0].nodeId`) ohne Sibling/Parent-
  Tracking. `findFallbackWithInfo()` direkt nebenan macht es richtig.
  **Status:** erledigt (`f78e7f00`) — umbenannt zu `findFirstRootNode`,
  unbenutzten Parameter entfernt, Doc-Comment auf `findFallbackWithInfo`
  als Smart-Variante zeigt. Echtes Sibling-Aware-Fallback (Caller müssen
  Info pre-computen) bleibt offen.

- **Wo:** `studio/core/change-pipeline.ts:127`
  **Was:** `(ctx.intent as any).nodeId`-Cast umgeht Type-Check auf
  kritischem Pfad — Discriminated Union oder Type-Guard fehlt.
  **Status:** abgewiesen — Cast ist bereits weg; nach den Type-Checks für
  intent-Varianten ohne `nodeId` (Z. 115-123) ist die Union narrowed,
  Direkt-Zugriff `ctx.intent.nodeId` typt korrekt.

- **Wo:** `studio/sync/sync-coordinator-v2.ts:161`
  **Was:** `(... as SourceMapPortWithSetter).setSourceMap(sourceMap as any)`
  versteckt Interface-Mismatch — Methode existiert nur optional auf der
  konkreten Implementierung.
  **Status:** erledigt (`b856832e`) — `setSourceMap` von `unknown` auf
  `SourceMap | null` getypt, beide Casts entfernt; Call-Site nutzt
  Optional-Chaining.

- **Wo:** `studio/sync/adapters/production-adapters.ts:148`
  **Was:** `window.setTimeout(...) as unknown as number` — Double-Cast
  signalisiert kaputte Typdefinition upstream (native Return ist bereits
  `number`).
  **Status:** erledigt (vor heutiger Session, Cast schon weg) —
  bei Inspektion verifiziert, Code zeigt `return window.setTimeout(callback, delay)`.

- **Wo:** `studio/core/command-executor.ts:54-56`
  **Was:** Re-Entrancy-Guard `if (this.executing) return { success: false }`
  ist synchron, fängt aber keine schnell aufeinanderfolgenden Aufrufe vor
  Abschluss.
  **Status:** erledigt — `execute`/`runHistoryOp`/`executeInSession`
  werfen jetzt `Error('CommandExecutor: re-entrant ...')` statt
  silent-fail. Test in `tests/studio/core.test.ts` pinnt das Verhalten.
  Re-Entrancy ist ein Programmierfehler (Command triggert synchron
  anderen Command) — soll laut sein, nicht stumm geschluckt.

- **Wo:** `studio/bootstrap.ts:522-554`
  **Was:** `setCommandContext()` wird nach Editor/Preview-Init aber vor
  Sync-Setup gerufen — early Events während Editor-Setup könnten
  unvollständigen Context sehen.
  **Status:** erledigt — `events.on('handle:drag-end', …)` (einziger
  Bootstrap-Subscriber, der `executor.execute` aufruft) ist in den
  „Wire events"-Block nach `setCommandContext` verschoben. Auch wenn
  zur Bootzeit normalerweise keine Events feuern, kann der Handler
  jetzt unmöglich vor dem Context aufgerufen werden.

### Studio Struktur — God-Objects & Duplikation (Hunt 2026-05-10)

- **Wo:** `studio/visual/{resize,padding,margin,gap}-manager.ts`
  **Was:** 3931 LOC über vier nahezu identische Manager-Klassen (Handles,
  Drag-State, Observer, RAF-Throttling, Snap-Logik) — massive Duplikation
  im größten Subsystem.
  **Status:** offen — Strukturanalyse 2026-05-10 (per Explore-Agent):
  Public API identisch (`showHandles`/`hideHandles`/`refresh`/`dispose`).
  RAF-Mouse-Loop (`onMouseDown`/`onMouseMove`/`processMouseMove`/`onMouseUp`
  mit `pendingMouseEvent`+`rafId`) verbatim in allen 4. Padding/Margin/Gap
  teilen zusätzlich Observer-Setup (Resize+MutationObserver+scroll+window-
  resize, `debouncedRefresh`) und Snap-Logik via
  `getSpacingSnapService`. ResizeManager ist Outlier (8 Handles, Multi-
  Selection, Grid, Sizing-Mode, double-click).
  **Notiz:** Inkrementeller Pfad: (1) `studio/visual/raf-mouse.ts` Helper
  für RAF-Mouse-Throttle, (2) `studio/visual/observer-pack.ts` für die
  Observer-Tripletts der Spacing-Manager, (3) `SpacingHandleManagerBase`
  für Padding/Margin/Gap (gleiche Modifier-Logik, gleicher Snap, gleiches
  Overlay-Pattern), (4) ResizeManager bleibt eigenständig.
  Tests: nur ResizeManager hat Unit-Tests
  (`tests/studio/visual-resize-manager.test.ts`,
  `visual/resize-manager-multi.test.ts`); Padding/Margin/Gap nur durch
  Browser-Tests gedeckt — Refactor braucht sorgfältige headed-
  Verification. Eigene Session, nicht inkrementell.

- **Wo:** `studio/panels/property/view.ts` (1037 LOC → 776 LOC)
  **Was:** PANEL_CONFIG mit 100+ Primitive-Typen + 12 Section-Creators in
  einer Datei — God-Objekt mit dichtem Repeat-Pattern.
  **Status:** teilweise erledigt — `PANEL_CONFIG`,
  `DEFAULT_PANEL_CONFIG`, `PanelConfig`-Interface und `getPanelConfig()`
  in eigenes Modul `studio/panels/property/panel-config.ts`
  ausgelagert (261 LOC). View ist 25 % kleiner und Config testbar
  ohne View-Instanz. 679/679 property-panel tests pass.
  **Notiz:** Bleibt: 12 Section-Creator-Aufrufe + `renderSections`-Switch
  in `view.ts` — könnte über Section-Registry weiter geschrumpft werden,
  aber Code ist bereits lesbar.

- **Wo:** `studio/app.ts` (heute 2532 LOC, vor Refactor 2557)
  **Was:** Bootstrap-Sprawl: 30+ globale Konstanten, 5 Extensions, 8
  Manager-Inits inline. Sieben Phasen nach `studio/init/` extrahiert:
  `init-notifications`, `init-sync`, `init-grid-overlay`,
  `init-draw-manager`, `init-inline-edit`, `file-tabs`,
  `init-editor-dispatch` (`8b92ae7a`). Verbleibend: `compile()` (~406
  LOC), `updateStudio()`, `handleStudioCodeChange()`, plus File-IO und
  Ext-Wiring.
  **Status:** offen — ongoing decomposition.
  **Notiz:** `compile()` ist das nächste grosse Stück, aber risk-heavy
  — zentrale Funktion mit vielen Closures auf top-level Variablen.
  Vor Extraktion müsste der Closure-Graph entwirrt werden.

- **Wo:** Fünf `mock-adapters.ts` (`studio/editor/triggers/adapters/`,
  `studio/editor/adapters/`, `studio/panels/property/adapters/`,
  `studio/autocomplete/adapters/`, `studio/sync/adapters/`)
  **Was:** ~2986 LOC über fünf Mock-Files. Audit zeigt: keine echte
  Duplikation — jede Datei mockt scope-spezifische Port-Interfaces,
  keine zwei Files exportieren dieselbe Factory. `createMockSelectionPort`,
  `createMockSourceMapPort`, `createMockTriggerPort`, `createMockPickerPort`
  etc. sind disjunkt. Das einzige was sich wiederholt sind triviale
  `new Map()`-Initializer für Mock-State (3 / 23 / 17 / 7 / 1 Verwendungen).
  Konsolidierung zu einer Datei würde Modularität verlieren ohne
  meaningful Code-Reduktion.
  **Status:** abgewiesen — keine Duplikation; jeder Mock ist
  scope-spezifisch nötig. Ggf. extra-kleine Helper für Mock-State-
  Storage in einem `mock-base.ts` (5-10 LOC), aber Aufwand/Nutzen
  steht nicht im Verhältnis.

- **Wo:** Studio-weit, `panels/`-Subsystem
  **Was:** ~113 `.on()`/`addEventListener` Subscriptions vs. ~25
  detektierbare Cleanups — Verdacht auf Memory-Leaks.
  **Status:** abgewiesen — Audit zeigt: Metrik ist irreführend.
  Tatsächliche Patterns sind solide: PropertyPanel trackt per
  `eventCleanups[]` Array (re-bind pro render mit `cleanupEventListeners()`);
  Controller pushed Event-Subs in `cleanups[]` mit dispose-chain;
  ActivityBar nutzt `AbortController` mit abort in dispose; Settings
  via `eventUnsubscribes[]`; Section-Dropdowns haben self-cleaning
  click-outside Listeners (entfernen sich beim nächsten Click). Die
  113-Zahl zählt DOM-Listener auf frisch erstellten Elementen, die
  beim nächsten render via `innerHTML = ''` mit den Elementen
  weggehen — kein Leak. Kleine Optimierung übrig: Section-Dropdown-
  Listener via AbortController statt self-heal (akkumuliert max 5
  stale Listener pro User-Session bis Click-Outside).

- **Wo:** `studio/inline-edit/` und `studio/rename/`
  **Was:** Zwei nahezu identische Setup-Flows für simple Name/Value-Edits
  (Editor + State-Management inline) ohne gemeinsame Factory.
  **Status:** abgewiesen — Oberflächen-Ähnlichkeit (beide haben
  Floating-Input + Enter/Escape) trügt. `inline-edit/` editiert
  **Text-Content** eines Preview-DOM-Elements (Typografie-Inheritance,
  Auto-Resize, Mouse-Drift-Detection, `state.inlineEditNodeId`).
  `rename/` editiert **Symbol-Identifier** im Editor-Source (Label
  „Rename component", Validation-Error-Display, Cross-File-Engine,
  `executor.execute(RenameSymbolCommand)`). Die ~40 LOC gemeinsamer
  Pattern (input + keydown + click-outside) sind zu wenig für eine
  geteilte Abstraktion, und ein Forced-Common-Factory würde beide
  Flows kompromittieren.

### Compiler Backends (Hunt 2026-05-10)

- **Wo:** `compiler/backends/dom/ops/resolve-templates.ts:132-220`
  `resolveConditionalExpression`
  **Was:** Hand-rolled String-Position-Parser mit `inConditional`-Flag,
  Depth-Counter und Marker-Lookahead (`__conditional:`, `__loopVar:`).
  Funktioniert, aber jeder neue Marker oder Edge-Case (String-Literal mit
  `:`, Token-Reference im else-Zweig) zwingt einen weiteren Sonderfall in
  die Loop. Smell, kein gemeldeter Bug.
  **Status:** offen
  **Notiz:** Re-Open bei nächster Marker-Erweiterung oder
  Conditional-Bug.

### Bug-Patterns & Type-Escapes (Hunt 2026-05-10)

- **Wo:** `studio/agent/generation-pipeline.ts:335`
  **Was:** Workaround filtert phantom Token-Refs aus String-Literalen.
  Root-Cause war im **Validator** (nicht Parser/Lexer): `validateProperty`
  normalisierte `TokenReference` zu `'$' + name` und re-iterierte den
  String-Array — Quoted-String-Content wie `Text "$48,217"` wurde zu
  `W500 Token "$48,217" is not defined`. Validator liest Token-Refs jetzt
  direkt aus dem AST, Workaround entfernt.
  **Status:** erledigt (`74e0b2d3`)

- **Wo:** `studio/agent/generation-pipeline.ts:378`
  **Was:** Pre-Flight-Check fängt Parser-Hang bei nested-state-Blöcken ab
  — Parser hat einen bekannten Infinite-Loop, Pre-Flight ist Pflaster.
  **Status:** erledigt — Parser hängt schon länger nicht mehr (Skip-
  Logik + MAX_ITERATIONS-Guard), aber er hat den Fehler stumm
  geschluckt. Beide nested-state-Branches in `body-parser.ts`
  (Instance- und Component-Pfad) melden den Fall jetzt explizit via
  `U.reportError(...)` und überspringen den indented Body sauber, so
  dass innere Properties nicht der äußeren State zugeschrieben werden.
  Test `tests/compiler/parser-nested-state.test.ts` + Probe
  `tools/probes/parser-nested-state.ts` pinnen das Verhalten. Pre-
  Flight bleibt als günstiger Vorab-Check (Regex statt Lex+Parse),
  ist aber kein Pflaster mehr.

- **Wo:** `studio/core/change-pipeline.ts:711`
  **Was:** `\`Unknown intent type: ${(intent as any).type}\``— Fallback-
Error-Message lockert exhaustiveness check; neue Intent-Variante kann
als`undefined`geloggt werden.
**Status:** erledigt —`const exhaustive: never = intent`als
Compile-Time-Check, Runtime-Read über`as { type?: string }`mit`?? 'unknown'`-Fallback. TS schlägt jetzt an, sobald eine Intent-
  Variante hinzukommt ohne Case.

- **Wo:** `studio/tauri-bridge.ts:172-173, 265-266`
  **Was:** Zwei `} catch { return false }` / `catch { document.title = ... }`
  schlucken Tauri-Fehler stumm — Permission/Plattform-Fehler werden
  unsichtbar.
  **Status:** erledigt — beide catch-Blöcke loggen jetzt via `log.warn`
  bevor Fallback (`return false` bzw. `document.title = title`) greift.

- **Wo:** `studio/tauri-bridge.ts:54, 63, 273, 281, 289` (5×)
  **Was:** `@ts-expect-error` für ESM-URL-Imports von CDN
  (`esm.sh/@tauri-apps`) — bei Interface-Drift kompiliert es weiter,
  crashed zur Laufzeit.
  **Status:** erledigt — `studio/types/tauri-modules.d.ts` deklariert
  die drei URL-Module ambient (ohne Body), die existierenden
  `as TauriCoreApi/TauriEventApi/TauriWindowApi`-Casts verifizieren
  die Call-Shape lokal. Alle 5 `@ts-expect-error` raus.
  Interface-Drift schlägt jetzt am Cast-Site an, nicht erst zur Laufzeit.

- **Wo:** `studio/storage/project-actions.ts:632, 641, 655, 665, 721, 722, 729`
  **Was:** 7× `(window as any).__TAURI_BRIDGE__` / `(window as any).JSZip`
  — Window-Globals umgehen Type-System; JSZip-Script-Load-Race nicht
  type-guarded.
  **Status:** erledigt — `TauriBridgeShim`, `JSZipConstructor`,
  `JSZipInstance` in `window-globals.d.ts`; Casts entfernt; Script-Load-Race
  durch Existenz-Check vor `resolve()` geschlossen.

- **Wo:** `studio/storage/project-actions.ts` (`tauriNewProject` &c)
  **Was:** Die vier Tauri-Helfer lesen `window.__TAURI_BRIDGE__`, das
  produktiv **nirgends gesetzt** wird — nur Tests injizieren. Runtime hat
  `window.TauriBridge` (anderer Name, andere Form, siehe
  `studio/tauri-bridge.ts:412`). API-Shapes passen auch nicht zusammen
  (`newProject(type)` vs. `TauriProject.createProject(name, path)`).
  Heißt: in der Desktop-App fallen alle vier Stubs durch zum Else-Pfad.
  **Status:** offen
  **Notiz:** Entweder Stubs an `window.TauriBridge.project` verdrahten
  und die API-Shape angleichen, oder die Stubs streichen, falls die
  Browser-Pfade die einzigen genutzten sind. Owner-Entscheidung.

- **Wo:** `studio/core/events.ts:493-494`
  **Was:** `(middleware as any).getStats = …` — Instrumentation an
  untyped middleware angehängt; keine Validierung dass Event-System
  Stats-API exponiert.
  **Status:** erledigt — `AnalyticsMiddleware`-Typ extrahiert,
  Funktions-Return-Type beim Konstruktions-Cast festgelegt, Property-
  Zuweisungen sind jetzt typed (kein `as any` mehr).

- **Wo:** Repo-weit
  **Was:** Aggregat: 105× `as any` (53 in `studio/`, 44 in `tools/`, 8 in
  `compiler/`), 7× `@ts-expect-error` (5 davon in `tauri-bridge.ts`), 1×
  `any[]` Parameter in `compiler/ir/ops/` Layout.
  **Status:** weitgehend erledigt — alle 5 `@ts-expect-error` in
  `tauri-bridge.ts` weg (siehe oben). 7 von 8 `compiler/` `as any` weg;
  verbleibt 1 in `animations.ts:262` (motion-Lib-API-Shape-Mismatch).
  In `studio/` (Production-Code, ohne `test-api/`) sind alle echten
  Casts weg — letzte zwei in `preview/drag/test-runner.ts` durch
  `editor?: EditorView` auf Window beseitigt. `tools/` (44 Casts) sind
  Probes/Diagnostik, nicht Produktionspfad.
  **Notiz:** Numerische Baseline — bei jedem Refactor sollte die Zahl
  runter.

---

## Erledigt

Chronologisch absteigend (neueste zuerst).

### 2026-05-10 — Differential Coverage Gap geschlossen

- **Wo:** `tests/differential/` (16 Files)
  **Was:** Alle vorher genannten Drift-Domänen jetzt per-Backend gepinnt:
  Icons (`c31df517`), Tables + Charts (`46d69e95`), Animations
  (`dba64f03`). Inline-Conditionals waren schon abgedeckt
  (`conditionals.test.ts`). Differential ist nicht mehr "compiles
  without throwing" — jeder gerichtete Drift erzeugt jetzt einen
  CI-Fail.
  **Status:** erledigt (`dba64f03`)
  **Notiz:** Differential-First-Policy für neue Feature-Slices bleibt
  laufende Konvention.

### 2026-05-10 — Animations Cross-Backend gepinnt

- **Wo:** `tests/differential/cleanup.test.ts` (Animations Block)
  **Was:** Pin: nur DOM emittiert `@keyframes mirror-*` und die
  `animation`-CSS-Property; React und Framework droppen den
  `anim`-Trigger silent. Gleiche Drift-Klasse wie Charts.
  **Status:** erledigt (`dba64f03`)

### 2026-05-10 — Tables + Charts Differential gehärtet

- **Wo:** `tests/differential/tables-charts.test.ts`
  **Was:** "Compiles without throwing" für React/Framework durch
  Per-Backend-Pins ersetzt. Drei Divergenzen explizit dokumentiert:
  React droppt `each`-Block in Tables; React und Framework haben kein
  Chart-Rendering (kein `createChart`, kein `Chart.js`); Framework
  rendert each-Tables via `M.each(...)`. CI fängt damit, wenn ein
  Backend einen der Pfade gewinnt oder verliert.
  **Status:** erledigt (`46d69e95`)

### 2026-05-10 — Self-Recursion Marker (Slice 21 V-3)

- **Wo:** `compiler/ir/ops/instance-ops.ts`,
  `compiler/backends/dom/node-emitter.ts`
  **Was:** Self-rekursive Komponente landete als
  `data-component="Unknown"` / `data-slot="Unknown"` im DOM. IR-Node
  trägt jetzt `recursionStopped`-Flag mit dem echten Komponentennamen,
  DOM emittiert `data-recursion-stopped="<Name>"`. Macht in Devtools/
  Studio sichtbar, _welche_ Komponente den Cycle gerissen hat.
  **Status:** erledigt (`e0ba0bda`)

### 2026-05-10 — Phantom W500 für `$N` in Quoted-Strings

- **Wo:** `compiler/validator/validator.ts:760-764` (`validateProperty`)
  **Was:** Validator hat TokenReference-Objekte zu `'$' + name`-Strings
  normalisiert und dann wieder als Token-Refs interpretiert — Quoted-
  String-Werte wie `Text "$48,217"` triggerten W500. Fix liest Refs
  direkt aus dem AST, der Workaround in `generation-pipeline.ts:339-345`
  konnte ersatzlos weg. Regression-Tests in `validator-error-codes.test.ts`.
  **Status:** erledigt (`74e0b2d3`)

### 2026-05-10 — Custom-Icons Differential gehärtet

- **Wo:** `tests/differential/cleanup.test.ts` (Custom Icons Block)
  **Was:** "Compiles without throwing" durch Per-Backend-Emit-Assertions
  ersetzt (DOM `_runtime.registerIcon`, React `_MIRROR_CUSTOM_ICONS[…]`,
  Framework `M.registerIcon`). Multi-Path und Lucide-Mixing neu
  abgedeckt. Slice 51 Pre-Fix wäre damit beim ersten CI-Run aufgefallen.
  **Status:** erledigt (`c31df517`)

### 2026-05-10 — Stale s08 Golden-Fixture regeneriert

- **Wo:** `tests/fixtures/states/s08-state-children/expected.dom.js`
  **Was:** Fixture via `UPDATE_GOLDEN=1` aktualisiert. Diff bestätigt drei
  intentionale Änderungen seit letztem Snapshot: Icon-Default 16→24
  (Slice 50), Default-Width 20→24, `data-icon-fill` boolean→`"true"`-
  String. Keine Code-Änderung nötig — nur Snapshot war veraltet.
  **Status:** erledigt (`69953ed7`)

### 2026-05-10 — `getHtmlTag`-Duplikation in React-Backend

- **Wo:** `compiler/backends/react.ts`, `compiler/schema/ir-helpers.ts`
  **Was:** Lokale Primitive-Map im React-Backend durch Schema-Helper
  ersetzt (`schemaGetHtmlTag` + neuer `isKnownPrimitive`). `compDef.primitive`-
  und Heuristik-Pfade behalten, Drift-Quelle für neue Primitives weg.
  **Status:** erledigt (`5fabe6e2`)

### 2026-05-10 — `*Extracted` Aliase (Kampagne abgeschlossen)

- **Wo:** `compiler/parser/ops/parse-blocks.ts`,
  `compiler/backends/dom/ops/emit-static.ts`, `compiler/backends/dom.ts`
  **Was:** Letzte 8 Aliase entfernt. `0` `*Extracted`-Aliase verbleiben in
  `compiler/` und `studio/` Production-Code (Start: ~38).
  **Status:** erledigt (`9c3a2795`)

- **Wo:** `compiler/parser/ops/parse-{control-flow,events,misc,expr,decls}.ts`
  **Was:** ~25 Aliase via Namespace-Imports
  (EachParser, StateChildParser, PropertyParser, EventParser, ZagParser,
  AnimationParser, ExpressionParser, TokenParser, DataObjectParser,
  DeclarationParser).
  **Status:** erledigt (`44ae031a`)

- **Wo:** `compiler/ir/index.ts`, `compiler/ir/transformers/validation.ts`
  **Was:** `addWarningExtracted` Alias war nur da wegen Namenskonflikt mit
  Klassenmethode. Funktion umbenannt zu `pushUniqueWarning` (beschreibt was
  sie tut), Alias weg.
  **Status:** erledigt (`d233dd4a`)

- **Wo:** `compiler/ir/ops/children-resolver.ts`
  **Was:** `mergeSlotPropertiesIntoFillerExtracted` Alias ohne Konflikt —
  reines Residuum. Direkt importiert.
  **Status:** erledigt (`ec9c3030`)

- **Wo:** `compiler/ir/ops/state-builder.ts`
  **Was:** Drei Aliase via Namespace-Imports ersetzt
  (`StateMachineTransformer`, `StateChildTransformer`, plus direkter
  `extractHTMLProperties`-Import).
  **Status:** erledigt (`1c9dd1d4`)

- **Wo:** `compiler/ir/ops/properties-ops.ts`
  **Was:** Fünf Aliase via Namespace-Imports
  (`PropertyTransformer`, `Validation`, `PropertySetExpander`).
  **Status:** erledigt (`4a74b385`)

- **Wo:** `compiler/ir/ops/instance-ops.ts`
  **Was:** Zehn Aliase via Namespace-Imports
  (`ChartTransformer`, `ComponentResolver`, `SlotUtils`, `StateStyles`,
  `InlineExtraction`, `ControlFlow`).
  **Status:** erledigt (`86ecc41b`)

- **Wo:** `compiler/ir/ops/zag-instance-builder.ts`,
  `compiler/backends/dom/ops/{emit-events,emit-state,emit-loops}.ts`
  **Was:** Acht Aliase quer durch vier Files via Namespace-Imports
  (`ZagTransformer`, `EventEmitter`, `StateMachineEmitter`, `ApiEmitter`,
  `LoopEmitter`).
  **Status:** erledigt (`4acde470`)

### 2026-05-10 — Token-Suffix-Drift (Slice 24 Iter-2)

- **Wo:** `studio/panels/property/utils/tokens.ts`,
  `studio/editor/triggers/token-extract-trigger.ts`,
  `compiler/parser/token-parser.ts`
  **Was:** Drei lokale `getTokenSuffix`/`stripDollar`/`PROPERTY_SUFFIXES`-
  Implementierungen wurden auf den kanonischen Helper
  `compiler/schema/token-suffixes.ts` konsolidiert. Konkreter Bug:
  Studio-Picker mappte `margin` auf Suffix `'m'`, der Compiler emittiert
  `name.mar:` — der Picker fand keine margin-Tokens.
  **Status:** erledigt (`b7b35b24`)

### 2026-05-10 — Picker-Schema-Lücke (Slice 78 Iter-2)

- **Wo:** `studio/pickers/token/types.ts`, `compiler/schema/token-suffixes.ts`
  **Was:** `getTokenTypesForProperty` war für 25 compiler-bekannte
  Property-Aliase blind (`c`, `p`, `m`, `mar`, `font-family`, `weight`,
  `ls`, `tracking`, `min-height`, `max-height`, …). Schema-Fallback
  hinzugefügt; `.weight` als COUNT_SUFFIXES klassifiziert (war in keiner
  Klassifizierung).
  **Status:** erledigt (in `aa341cdf` mitgebündelt)

---

## Notizen

- **Slice-Methodik archiviert (2026-05-10).** 88 Capability-Slices mit
  Audit-Doc + 9-Punkt-Quality-Gate hat Drift gefunden, aber Doku-Overhead
  skaliert linear mit Slice-Zahl. Bei Slice 21 war's zu 80 % Papierarbeit.
  Aktuelle Praxis: Findings hier eintragen, fixen, weiter. Slice-Audits
  bleiben in `docs/refactoring/` als historische Referenz, werden nicht
  aktiv weitergetrieben.

- **Tests sind Sicherheitsnetz, nicht Sauberkeits-Werkzeug.** Cross-Backend-
  Property-Tests fangen Drift, aber gut-getesteter Code kann immer noch
  schmutzig sein. Sauberkeit kommt aus kohärenten Abstraktionen, klaren
  Schichten und aggressivem Löschen — Werkzeuge dafür sind Findings-Doc,
  Schema-Drift-Grep und gelegentliche Architektur-Reviews.

- **`tools/probes/` als wiederverwendbares Werkzeug.** Re-runnable
  Schema-Drift- und Cross-Backend-Probes (committet, nicht in `/tmp`)
  überleben Sessions. Konvention: `tools/probes/slice-NN-*.ts` oder
  `tools/probes/<topic>.ts`.
