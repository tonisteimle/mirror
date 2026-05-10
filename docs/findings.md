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
  - `studio/code-modifier/property-extractor.ts:302` — eigene `componentMap`
  - `studio/sync/component-line-parser.ts` — eigener Component-Parser
    **Was:** Drei Studio-Module re-implementieren Logik, die der Compiler
    bereits hat. Frage: warum kann Studio nicht den Compiler-Parser direkt
    benutzen? Vermutlich historisch (Studio war vor dem aktuellen Schema da).
    **Status:** offen
    **Notiz:** Architektur-Entscheidung nötig, kein einzelner Refactor.

- **Wo:** `compiler/parser/ops/parse-blocks.ts` (Slice 21 V-1/V-3/V-4)
  **Was:** Drei silent-failure-Pfade: undefined component → Frame-Fallback
  ohne Hinweis; nested-`Name:`-Definition wird zu Instance reinterpretiert
  und Definition geht verloren; self-recursion stoppt mit
  `data-component="Unknown"`. Validator E002 fängt nur den ersten Fall.
  **Status:** offen
  **Notiz:** Audit in `docs/refactoring/21-komponenten.md` Section 3 (V-1, V-4).

- **Wo:** `tests/fixtures/states/s08-state-children/expected.dom.js`
  **Was:** Stale golden-fixture nach Slice-50 V-1 (Icon-Defaults `16 → 24`).
  Fixture erwartet noch alte Defaults plus `data-icon-fill` Type-Drift
  (boolean vs `"true"`-String). Regenerieren oder Slice-50-Owner bitten.
  **Status:** offen
  **Notiz:** Bricht keine Funktionalität — nur Snapshot ist veraltet.

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
  **Status:** offen
  **Notiz:** Legacy-Pfad streichen.

- **Wo:** `studio/core/state.ts:216-241` (`setCompileResult`)
  **Was:** Drei überlappende Selection-Pfade (queued/pending/deferred) mit
  separaten if/return-Blöcken — schwer zu lesen, fehleranfällig beim
  Erweitern.
  **Status:** offen
  **Notiz:** Zu einem priorisierten Switch konsolidieren.

- **Wo:** `studio/core/state.ts:281-305`
  **Was:** Race-Window: `state.get()` wird **nach** `compile:completed`
  emittiert gelesen — Handler können Selection mutieren, `latestState` ist
  dann veraltet.
  **Status:** offen
  **Notiz:** State vor dem Emit lesen oder Validierung in Microtask deferen.

- **Wo:** `studio/core/state.ts:243-278`
  **Was:** Early-Returns bei pending/deferred Selection überspringen die
  Final-Selection-Validierung — invalide Selections aus Handlern können
  ungeprüft durchrutschen.
  **Status:** offen

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
  **Status:** offen

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
  **Status:** offen
  **Notiz:** Queue oder Throw statt silent-fail.

- **Wo:** `studio/bootstrap.ts:522-554`
  **Was:** `setCommandContext()` wird nach Editor/Preview-Init aber vor
  Sync-Setup gerufen — early Events während Editor-Setup könnten
  unvollständigen Context sehen.
  **Status:** offen

### Studio Struktur — God-Objects & Duplikation (Hunt 2026-05-10)

- **Wo:** `studio/visual/{resize,padding,margin,gap}-manager.ts`
  **Was:** 3931 LOC über vier nahezu identische Manager-Klassen (Handles,
  Drag-State, Observer, RAF-Throttling, Snap-Logik) — massive Duplikation
  im größten Subsystem.
  **Status:** offen
  **Notiz:** Gemeinsame `DragHandleManager`-Basisklasse mit
  orientierungsspezifischen Subklassen.

- **Wo:** `studio/panels/property/view.ts` (1037 LOC)
  **Was:** PANEL_CONFIG mit 100+ Primitive-Typen + 12 Section-Creators in
  einer Datei — God-Objekt mit dichtem Repeat-Pattern.
  **Status:** offen
  **Notiz:** Pro Primitiv-Kategorie in `studio/panels/property/configs/`
  splitten.

- **Wo:** `studio/app.ts` (2557 LOC)
  **Was:** Bootstrap-Sprawl: 30+ globale Konstanten, 5 Extensions, 8
  Manager-Inits inline. Phase A–D verstreut, Lesbarkeit leidet.
  **Status:** offen
  **Notiz:** Phase-Funktionen nach `studio/init/phase-*.ts` extrahieren,
  app.ts als reiner Orchestrator.

- **Wo:** Drei `mock-adapters.ts` (`studio/editor/triggers/adapters/`,
  `studio/editor/adapters/`, `studio/panels/property/adapters/`)
  **Was:** ~1990 LOC über drei separate Mock-Frameworks für ähnliche
  Use-Cases.
  **Status:** offen
  **Notiz:** In `studio/test-helpers/mock-adapters.ts` konsolidieren mit
  scope-spezifischen Factories.

- **Wo:** Studio-weit, `panels/`-Subsystem
  **Was:** ~113 `.on()`/`addEventListener` Subscriptions vs. ~25
  detektierbare Cleanups — Verdacht auf Memory-Leaks bei
  Panel-Re-Initialisierung.
  **Status:** offen
  **Notiz:** Audit von `PropertyPanelController` + Section-Klassen,
  systematisches `AbortController`-Wiring einziehen.

- **Wo:** `studio/inline-edit/` und `studio/rename/`
  **Was:** Zwei nahezu identische Setup-Flows für simple Name/Value-Edits
  (Editor + State-Management inline) ohne gemeinsame Factory.
  **Status:** offen

### Compiler Backends (Hunt 2026-05-10)

- **Wo:** `compiler/backends/react.ts:517` und `compiler/schema/ir-helpers.ts:735`
  **Was:** Zwei parallele `getHtmlTag`-Funktionen mit unterschiedlichen
  Signaturen — React-lokal `(componentName, compDef)` mit eigener
  Primitive-Map plus Heuristik (`name.includes('button')` etc.),
  Schema-Helper `(primitiveName)` ohne Heuristik. Neue Primitives müssen
  heute an beiden Stellen ergänzt werden, sonst React-Drift.
  **Status:** offen
  **Notiz:** DOM-Backend nutzt den Schema-Helper, React nicht. React auf
  Schema-Helper umstellen, Heuristik separat (oder löschen, wenn nicht
  durch Tests gedeckt).

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

- **Wo:** `tests/differential/` (16 Files)
  **Was:** Cross-Backend-Equivalenz nur für 16 Domänen abgedeckt — Icons
  (custom + Lucide), Charts/Tables, Animation-Trigger und
  Inline-Conditionals fehlen. Slice 51 hat den Custom-Icons-Drift (DOM
  ✅ / React ✗ / Framework ✗) erst beim manuellen Probe-Lauf gefunden.
  **Status:** offen
  **Notiz:** Symptom — neue Backends/Features driften silent. Heilt nur
  durch differential-First-Policy für jeden neuen Feature-Slice.

### Bug-Patterns & Type-Escapes (Hunt 2026-05-10)

- **Wo:** `studio/agent/generation-pipeline.ts:335`
  **Was:** Workaround filtert phantom Token-Refs aus String-Literalen —
  TODO verweist auf Parser-Root-Cause: Parser/Lexer emittiert Token-Refs
  innerhalb von Strings.
  **Status:** offen
  **Notiz:** Fix gehört in `compiler/parser/`.

- **Wo:** `studio/agent/generation-pipeline.ts:378`
  **Was:** Pre-Flight-Check fängt Parser-Hang bei nested-state-Blöcken ab
  — Parser hat einen bekannten Infinite-Loop, Pre-Flight ist Pflaster.
  **Status:** offen

- **Wo:** `studio/core/change-pipeline.ts:711`
  **Was:** `\`Unknown intent type: ${(intent as any).type}\``— Fallback-
Error-Message lockert exhaustiveness check; neue Intent-Variante kann
als`undefined`geloggt werden.
**Status:** offen
**Notiz:** Mit Discriminated Union +`assertNever` exhaustiv machen.

- **Wo:** `studio/tauri-bridge.ts:172-173, 265-266`
  **Was:** Zwei `} catch { return false }` / `catch { document.title = ... }`
  schlucken Tauri-Fehler stumm — Permission/Plattform-Fehler werden
  unsichtbar.
  **Status:** offen

- **Wo:** `studio/tauri-bridge.ts:54, 63, 273, 281, 289` (5×)
  **Was:** `@ts-expect-error` für ESM-URL-Imports von CDN
  (`esm.sh/@tauri-apps`) — bei Interface-Drift kompiliert es weiter,
  crashed zur Laufzeit.
  **Status:** offen
  **Notiz:** Lokales Type-Stub-Modul mit `declare module` bauen.

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
  **Status:** offen

- **Wo:** Repo-weit
  **Was:** Aggregat: 105× `as any` (53 in `studio/`, 44 in `tools/`, 8 in
  `compiler/`), 7× `@ts-expect-error` (5 davon in `tauri-bridge.ts`), 1×
  `any[]` Parameter in `compiler/ir/ops/` Layout.
  **Status:** offen
  **Notiz:** Numerische Baseline — bei jedem Refactor sollte die Zahl
  runter.

---

## Erledigt

Chronologisch absteigend (neueste zuerst).

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
