# Findings

Zentrales Dokument für die schrittweise Beseitigung von Architektur- und
Code-Defiziten in Mirror — Studio, Schema, Compiler-Layering, Dead-Code,
Module-Grenzen. Append-only. Geführt nach dem **Architektur-Hunt-Ansatz**
(unten); die History („Erledigt") bleibt erhalten.

## Architektur-Hunt — Ansatz

Ziel ist **rigorose Qualität**, nicht Tempo.

- **Klein inkrementieren.** Ein Befund → eine Probe → ein Fix → ein
  Commit. Keine Multi-Befund-Bündel. Jeder Schritt isoliert.
- **Findings direkt beheben, nicht deferren.** Wenn ein Befund
  beim Hunt aufgemacht wird, gehört zur Bearbeitung der reale Fix
  (Code löschen, refactoren, Bug schließen) — nicht das Verschieben
  in eine Policy-Watchlist oder das Aufschieben auf später. Tracker-
  Mechanismen (z. B. WATCHLIST in der Dead-Feature-Policy) sind nur
  legitim, wenn der Owner noch entscheiden muss; Code-Findings mit
  klarer Lösung werden im selben Inkrement gelöst.
- **Regelmäßig committen.** Jeder grüne Inkrement-Schritt geht sofort
  ins Git, nicht batchen. Parallele Sessions und externe Reverts haben
  in der Vergangenheit uncommitteten Stand vernichtet — Disk ist kein
  sicherer Speicher, Git ist es. Auch WIP-Snapshots (`wip:`-Commit)
  sind besser als drei Stunden uncommitteter Arbeit.
- **Findings-Doc führt.** Jeder Befund landet zuerst unter „Offen",
  dann fixen, dann nach „Erledigt" mit Commit-Hash verschieben. Auch
  nicht sofort fixbare Befunde bleiben als offener Eintrag stehen —
  damit eine spätere Session weiß, was gefunden wurde.
- **Rigorose Qualität.** Vor jedem Commit: relevante Test-Suite grün
  (Differential / Smoke / Tutorial / Studio — je nach Berührungs-
  fläche). Keine Inkremente die „wahrscheinlich okay" sind.
- **Pre-Refactor-Pin.** Wenn unklar ist ob ein Refactor regression-
  frei ist: zuerst ein Differential-Pin schreiben, der das gewünschte
  Verhalten festhält. Refactor erfolgt dann gegen den Pin.
- **Lieber langsamer.** Wenn ein Befund größer ist als ein Findings-
  Eintrag (>3 Zeilen Kontext, mehrere Subsysteme), kommt er als eigene
  Lane-Doc nach `docs/refactoring/` bevor Code geändert wird.

**Was der Ansatz NICHT ist:** kein Quality-Gate-Wiederbeleben, kein
9-Punkte-Audit pro Slice. Die archivierte Slice-Methodik (88 Capability-
Slices mit 9-Punkt-Quality-Gate) hat gezeigt, dass Doku-Overhead linear
mit Slice-Zahl skaliert — bei Slice 21 war's zu 80 % Papierarbeit.
Findings-Eintrag + Commit + Pin ist die volle Doku-Verpflichtung.
Slice-Audits in `docs/refactoring/` bleiben als historische Referenz,
werden nicht aktiv weitergetrieben.

### Eintragsformat

Pro Befund ein Listeneintrag in „Offen" oder „Erledigt":

```
- **Wo:** `file:line` oder kurzer Bereich
  **Was:** Ein Satz Beschreibung des Problems.
  **Status:** offen | aktiv (Bearbeiter, Beginn) | erledigt (`commit-hash`) | abgewiesen (kurze Begründung)
  **Plan:** _(nur bei `aktiv` — was als nächstes passiert, damit parallele Sessions nicht doppelt anfassen)_
  **Notiz:** _(optional, max 2–3 Zeilen Kontext)_
```

Mehr als ~3 Zeilen Kontext → eigene Untersuchung als separates Dokument,
von hier verlinken.

### Parallelitäts-Regel

Wer einen offenen Eintrag in Bearbeitung nimmt, ändert ihn **vorher** auf
`Status: aktiv` und füllt den `Plan:`-Block. Damit sieht eine parallel
laufende Session sofort, dass jemand dran ist, und greift zu einem anderen
Eintrag. Nach Commit: Status auf `erledigt` mit Hash, Eintrag nach
„Erledigt" verschieben.

### Lanes (Hunt-Reihenfolge)

1. **Dead-Feature-Watchlist abarbeiten.**
   `tests/policy/dsl-features-have-examples.test.ts` führt expired
   Watchlist-Einträge. Per Policy: Beispiel hinzufügen ODER Feature
   komplett löschen (Parser + AST + IR + Backends + Runtime + Tests +
   Docs). Reine Deletion-Wins.

2. **Schema-Drift-Audit.** Property-Aliase scattered über Parser, IR,
   Backends. Es gibt bereits einen Findings-Eintrag
   (`getTokenTypesForProperty` für 25 Aliases blind). Systematischer
   Grep über alle Property-Listen, Drift-Pins als Pre-Refactor.

3. **TokenReference-Resolution zentralisieren.** Heute in jedem
   Transformer dupliziert (padding, margin, border, chart-slot —
   2026-05-10 in Border + Chart-Slot zugefügt, ohne zentrale Funktion).
   Eine `resolveTokenReference(tokenRef, propertyContext)`-Funktion
   ablösen. Pre-Refactor: ein Pin pro existierender Caller.

4. **Compiler-Backend-Layering.** React-Backend bypassed IR; DOM und
   Framework nutzen IR. Die ~30 React-Bugs der vorherigen Session
   waren Symptome dieser Drift. Refactor-Prospect groß — eigene
   Lane-Doc unter `docs/refactoring/` bevor Code geändert wird.

5. **Studio-Modul-Grenzen.** 30+ Subdirs, expliziter „Legacy-IIFE-
   Wrapper" in `studio/app.ts`. Import-Graph-Analyse (z. B. `madge`)
   als erster Schritt, dann pro identifiziertem Cluster eine eigene
   Lane.

Lane 4+5 sind Refactor-Tracks und brauchen Lane-Doc bevor Code-
Veränderung. Lane 1–3 können als Findings-Einträge laufen.

### Werkzeuge & Prinzipien

- **Tests sind Sicherheitsnetz, nicht Sauberkeits-Werkzeug.** Cross-
  Backend-Property-Tests fangen Drift, aber gut-getesteter Code kann
  immer noch schmutzig sein. Sauberkeit kommt aus kohärenten
  Abstraktionen, klaren Schichten und aggressivem Löschen.
- **`tools/probes/` als wiederverwendbares Werkzeug.** Re-runnable
  Schema-Drift- und Cross-Backend-Probes (committet, nicht in `/tmp`)
  überleben Sessions. Konvention: `tools/probes/slice-NN-*.ts` oder
  `tools/probes/<topic>.ts`.

---

## Offen

- **Wo:** `compiler/ir/ops/instance-ops.ts`, `compiler/ir/ops/properties-ops.ts`,
  `compiler/backends/react.ts`
  **Was:** Lane 2, Inkrement 2 — Folge-Refactor zu Inkrement 1.
  Hardcoded `name === '<alias>' || ...` in IR-Ops und React-Backend
  durch `getCanonicalPropertyName` ersetzen.
  **Status:** erledigt (`c3d420b5` Slice A, `f743a44c` Slice B, Slice C
  nachfolgend) — neuer Helper `matchesCanonical(name, canonical)` in
  `compiler/schema/parser-helpers.ts`. Konvertiert: properties-ops
  (minw/minh/w/h/size, hor/ver, gap, gap-x/y, row-height, rotate,
  scale), instance-ops (icon-size, width 5×, hor, keyboard-nav,
  loop-focus, trigger-text), react.ts (animation, icon-size/color/
  weight, width/height, hor/ver, color/background-Gradient).
  Verbleibend `readOnly`/`readonly`, `value`/`defaultValue`, `propset`/
  `data`, `tension`/`min`/`max`, `title`/`xLabel`/`yLabel`, `content`/
  `textContent` — alles **keine Schema-Aliase**, sondern HTML-Attribute
  oder Chart-spezifische Properties. 15481/15481 vitest grün.

- **Wo:** `compiler/schema/properties.ts` vs. `compiler/ir/transformers/property-transformer.ts`
  **Was:** Lane 2, Inkrement 3 (Schema-Drift-Befund während Inkrement 1):
  Der IR-Transformer akzeptiert ~8 Properties die NICHT im Schema
  deklariert sind: `animation`/`anim`, `backdrop-blur`/`blur-bg`,
  `blur`, `scale`, `aspect`, `scroll-ver`/`scroll-hor`/`scroll-both`
  (`scroll-*` ist im Schema, aber als getrennte Properties statt
  Aliases). Folgen: kein Schema-Validator-Hint, kein Studio-Picker-
  Support, kein zentrales TypeScript-Type. Klärung: jeden Eintrag
  einzeln: ins Schema aufnehmen (mit Aliases) ODER aus IR entfernen.
  **Status:** erledigt — Audit zeigt: alle 5 fehlenden Properties haben
  IR-Backends + Backend-Emit + sind in CLAUDE.md dokumentiert + werden
  in examples/tests verwendet. Entscheidung: ins Studio-Schema
  aufnehmen. PropertyDefinition-Einträge in `properties.ts` für
  scale, aspect, blur, backdrop-blur (alias blur-bg), animation
  (alias anim). Pin: neuer Test in
  `tests/compiler/schema/schema-map-coherence.test.ts` —
  „every property the IR transformer accepts is in PANEL_PROPERTIES".
  **Notiz:** Zwei Schema-Files koexistieren: `property-schema.ts` (SCHEMA,
  IR-Side, hatte alle 5 schon) und `properties.ts` (PANEL_PROPERTIES,
  Studio-Side, hatte sie nicht). Drift war Studio-Picker-Side. `scroll-*`
  ist nicht zu konsolidieren — sind 4 verschiedene Properties für 4
  verschiedene CSS-Targets, keine Aliase.

- **Wo:** `compiler/schema/dsl.ts:213` (`'route' // @deprecated`)
  **Was:** Schema-Annotation widerspricht der Realität. Das
  `@deprecated`-Comment sagt „use navigate() or Tab/NavItem without
  children instead", aber `route` ist aktiv genutzt — nicht in
  `examples/` direkt, sondern in der Studio-Multi-Page-App-
  Infrastruktur: `autoCreateReferencedFiles` scannt Source nach
  `route <name>` und erzeugt Page-Files (4 Tests pinnen das in
  `tests/studio/compile-orchestrators.test.ts:226-249, 746-754`).
  Volle Parser-Plumbing (Lexer-Token `ROUTE`, `parseRouteClause`,
  IR-Field `Instance.route`, DOM-Backend `data-route`-Emit, Runtime-
  Navigation in `compiler/runtime/component-navigation.ts`) ist
  legitimes Production-Feature. Owner-Entscheidung nötig: entweder
  `@deprecated` entfernen (Feature ist nicht deprecated) oder Wording
  refinen (z. B. „nur für top-level page declarations, nicht inline").
  **Status:** offen — Owner-Entscheidung
  **Notiz:** Mein erster Versuch (Hunt 2026-05-10 ~19:00) wollte das
  als pure-dead löschen — falsche Prämisse, vom User korrigiert.
  Hier dokumentiert als Owner-Item.

- **Wo:** `studio/panels/components/usage-tracker.ts` (123 LOC)
  **Was:** Komplettes Modul (`UsageTracker` Klasse + `getUsageTracker()`
  Singleton + `createUsageTracker()` Factory + `UsageTrackerConfig`
  Interface, plus localStorage-Persistenz für „recent components") ohne
  einen einzigen Consumer im Repo. Suche über `*.ts/*.tsx/*.json/*.md`
  liefert 0 Treffer für `UsageTracker`/`usage-tracker`/`getUsageTracker`/
  `createUsageTracker`. Vermutlich Vorstufe für ein nie geliefertes
  Recent-Components-Feature.
  **Status:** aktiv (Claude-Session, 2026-05-10 ~20:50)
  **Plan:** Datei löschen, Tests grün halten.

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

  **Status:** erledigt für `parseTokens`. 2 von 3 sind keine
  Duplikation; `parseTokens` als Multi-Day-Item in 5 Slices zerlegt
  und in einer Session vollständig migriert:
  - **Slice 1** (`8a509c96`): `parseTokensViaAST` als parallele
    Implementation in `studio/pickers/token/parse-via-ast.ts`.
    Mapping Compiler-AST → Studio-TokenDefinition deckt single-value,
    suffix, chain-ref, property-set ab. 13 Equivalence-Tests gegen
    den Regex-Parser über Slice-78-Fixtures.
  - **Slice 1.5** (`8e1e9394`): Real-world fixture test gegen
    `examples/personas-informatik/tokens.tok` (63 LOC, mixed types).
  - **Slice 2** (`4f610c24`): `parseTokensFromFilesViaAST` companion
    mit dedup-by-name (matches Regex-Verhalten).
  - **Slice 3** (`fdee1688`): Cut-over `studio/editor/triggers/
token-trigger.ts:85` zur AST-Variante. Einziger direkter
    Production-Consumer.
  - **Slice 4** (`52f9872d`): Cut-over der drei Characterization-
    Test-Suiten (slice-78, picker-token-picker, pickers-token-picker
    — 145 Tests insgesamt) auf `parseTokensViaAST`. Dabei
    `$$primary`-Bug im Mapper gefixt (Compiler ist inkonsistent ob
    `$` im Namen bleibt oder gestripped wird; Mapper normalisiert
    jetzt zu bare-no-`$` vor dem Prepend).
  - **Slice 5** (`bc94c4ca`): Regex-Parser komplett gelöscht (175 LOC
    weg). Barrels exportieren weiter unter den alten Namen, jetzt als
    Re-Export aus `parse-via-ast.ts`. Equivalence-Tests gelöscht
    (jetzt tautologisch). 5953/5953 studio tests pass.

  Die behauptete Divergenz `text: hello world` existierte nicht —
  Compiler skipt das genauso wie der Regex-Parser. Real divergent
  war nur die `$`-Behandlung in der no-suffix-Form (compiler hält
  das `$`, mit-suffix-Form strippt es), gefixt im Slice-4-Commit.

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
  **Status:** offen — Audit 2026-05-10:
  - **Stacked-Overlay**: USED — `examples/hospital-dashboard/dashboard.mirror:218`.
    Behalten.
  - **Prose-Mode**: USED — 4× in
    `examples/personas-informatik/components.com` (`prose` als
    Frame-Property). Behalten.
  - **Custom-Icons-Registry (`$icons:`)**: keine Verwendung in
    `examples/`. Test-Coverage in 4 Test-Files (slice-50, slice-51,
    behavior/cleanup, differential/cleanup) + Probe
    `tools/probes/slice-51-custom-icons.ts`. **Owner-Entscheidung
    nötig**: Feature dokumentiert in CLAUDE.md, kein Realnutzer.
  - **Section-Header-Parsing (`--- Title ---`)**: keine Verwendung in
    `examples/` _oder_ irgendwelchen DSL-Files (`*.mir`/`.com`/`.tok`)
    repo-weit. Test-Coverage in 5 Test-Files (lexer-sections,
    tokens-coverage, lexer-bugs, parser-components, lexer-additional).
    **Owner-Entscheidung nötig**: Feature parst, aber niemand nutzt.
    **Notiz:** Braucht Owner-Entscheidung für die zwei verbleibenden
    Kandidaten (`$icons:` + section-header). Audit-Daten oben sollten
    reichen.

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
  **Status:** erledigt — alle drei Pfade konvergiert. (1) `queuedSelection`-
  Block raus (siehe oben). (2) `pendingSelection` als ebenfalls
  `@deprecated` markierter Mechanismus auf `deferredSelection` mit
  `type: 'line'` migriert: 1 Caller in `drop-result-applier.ts`, 1 in
  `app-adapter.ts`, 1 in `test-harness.ts`; alle drei Pending-Actions
  (`setPendingSelection`/`clearPendingSelection`/`resolvePendingSelection`),
  `pendingSelection`-Feld in StudioState, `PendingSelection`-Interface
  und der `resolvePendingPhase`-Helper komplett entfernt. (3) Bleibt
  ein `resolveDeferredPhase` + `validateExistingSelection`,
  `setCompileResult` hat zwei Zeilen statt drei nach dem Emit. 5832/5832
  studio tests pass.

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

### Studio Hunt — Type-Duplikate (2026-05-10 Iter-N)

- **Wo:** Studio, fünf duplizierte Value-Types
  **Was:** `Rect` (6×), `Point` (3× exportiert), `LineInfo` (3×),
  `CursorPosition` (4×), `CodeChange` (2×) — überall identische Shapes.
  TS-Strukturtypen machten sie austauschbar (kein Bug), aber jede
  Definition war eine Drift-Falle.
  **Status:** erledigt (`190381d9`) — kanonische Homes:
  Geometrie → `studio/visual/models/coordinate.ts`, Editor-Primitives
  → `studio/editor/ports.ts`, `CodeChange` → `code-modifier.ts`
  (mit re-export aus `core/events.ts` für die `source:changed`-Payload).
  Andere Files haben nur `export type { ... } from '<canonical>'` —
  alle Import-Pfade bleiben gültig. 5856/5856 studio tests pass.

### Dead-Export-Sweep (2026-05-10 Iter-N+1)

Repo-weiter Audit auf Top-Level-Exports mit **0 Konsumenten** (geprüft
über `*.ts`, `*.tsx`, `*.js`, `*.json`, `*.md` — also incl. Tests, Docs,
Packages, NPM bin entries, beide compiler/index.ts und der Studio-Build):

- **Wo:** `compiler/schema/{dsl,ir-helpers,layout-defaults}.ts`
  **Was:** 18 dead exports (`isReservedKeyword`, `getReservedKeywords`,
  `getKeywordsForProperty`, `isValidKey`, `getAllStates`,
  `getSystemStates`, `getCSSPropertyName`, `hasKeywordValue`,
  `getKeywordCSS`, `getNumericCSS`, `getColorCSS`, `getStandaloneCSS`,
  `isStandaloneProperty`, `getTokenAcceptingProperties`,
  `getColorAcceptingProperties`, `isCorner`, `getDirections`,
  `getCorners`) + 1 (`nineZoneToSemantic` — internal use, `export`
  abgelöst). 7 davon waren der **unfertige Zerlegungsversuch** von
  `schemaPropertyToCSS` in Atom-Helper, die niemals integriert wurden.
  **Status:** erledigt (`d60c8432`) — −206 LOC, 7349/7349 compiler +
  5898/5898 studio tests pass.

- **Wo:** `studio/{autocomplete,editor,preview}` + `compiler/ir/transformers/`
  **Was:** 10 dead exports + 1 orphaned File (`studio/preview/grid-
overlay.ts`, 134 LOC, ersetzt vor langem durch
  `studio/visual/grid-overlay/grid-overlay.ts`). Konkret:
  `generateAllZagSlotCompletions`, `getAllActionTargets`,
  `getStandaloneProperties`, `getColorProperties`,
  `getNumericProperties`, `getTokenProperties`,
  `getCurrentDragData`, `getEditorController`, `setEditorController`
  (beide `@deprecated`), `resolveGridColumns`.
  **Status:** erledigt (`4fa88b11`) — −265 LOC.

### Naming-Collision-Smells (2026-05-10 Iter-N+2)

Drei Stellen, wo derselbe Symbolname unterschiedliche Semantik hat —
echte Drift-Fallen, aber Behebung braucht Owner-Entscheidung.

- **Wo:** `studio/visual/{models/coordinate.ts, models/coordinate-
calculator.ts, snap/alignment-snap.ts}` — drei `snapPointToGrid`-
  Funktionen
  **Was:** Alle drei nehmen `(point: Point, gridSize: number): Point`,
  haben aber unterschiedliche Edge-Case-Semantik:
  - `coordinate.ts`: simple snap, kein Clamping.
  - `coordinate-calculator.ts`: clampt zu `>= 0`, snapt zu integer wenn
    `gridSize <= 0`.
  - `snap/alignment-snap.ts`: gibt input unverändert zurück wenn
    `gridSize <= 0`.

  Drei Caller könnten die "falsche" Variante importiert haben.
  **Status:** erledigt (`9fa8bb80`) — Audit zeigt: nur **eine** Variante
  ist genuinely different — `coordinate-calculator.ts` mit Clamp-zu-≥0
  - Round-zu-integer auch wenn gridSize=0. Die anderen beiden sind
    funktional äquivalent (gleicher Output für jeden Input; nur Snap
    preserviert Reference-Identity die kein Test pinnt). Der eine echt-
    divergente wurde umbenannt zu `snapPointToGridClamped` mit JSDoc
    cross-reference auf die zwei simple-Variante-Geschwister. Dabei
    zwei dead aliases in `models/index.ts` weg
    (`snapPointToGridWithResult`, `snapRectToGridWithResult` — nie
    importiert). Die zwei simple-Varianten bleiben getrennt, sind aber
    über ihre Barrels (`visual/models` vs `visual/snap`) am Import-Pfad
    disambiguiert.

- **Wo:** `studio/panels/property/{types,ports}.ts` +
  `studio/visual/snap/spacing-snap.ts` — drei `SpacingToken`-Interfaces
  **Was:** Panels-Version hat `{ name, fullName, value: string }`
  (3 Felder). Snap-Version hat
  `{ name, fullName, value: number, suffix }` (4 Felder). Gleicher
  Name, unterschiedliche Konzepte: UI-Anzeige vs. Snap-Engine-Input.
  **Status:** erledigt (`3f6686f3`) — `PanelSpacingToken` +
  `SnapSpacingToken` als kanonische Namen, beide Files behalten
  `@deprecated SpacingToken`-Alias als Übergang. Duplikat in
  `panels/property/ports.ts` gleich mit dedupliziert (Re-Export aus
  types.ts). Beide Barrels (panels/property/index.ts,
  visual/snap/index.ts) exportieren neuen + alten Namen
  side-by-side. 5922/5922 studio tests pass.

- **Wo:** `studio/desktop-files-utils.ts`, `studio/storage/types.ts`,
  `studio/panels/components/component-templates.ts` — drei
  `getFileType`-Funktionen mit drei verschiedenen Return-Types
  (`FileTypeInfo`, `MirrorFileType`, `'mir' | 'com'`).
  **Status:** erledigt (`e9666352`) — alle drei umbenannt:
  `getFileTypeInfo` (FileTypeInfo struct mit icon/color),
  `getMirrorFileType` (MirrorFileType union string),
  `getComponentTemplateFileType` (`'mir' | 'com'` Template-Wahl).
  Alle vier Aufrufer (incl. bootstrap.ts) + drei Test-Files
  umgeschrieben. JSDoc auf jedem listet Geschwister-Helper, damit
  Auto-Import-Verwirrung am Definitionsort behoben wird. Vierte
  module-private Variante in app.ts bleibt — kann nicht falsch
  importiert werden.

### Type-Dedupe Round 2 (2026-05-10 Iter-N+2)

- **Wo:** `studio/{autocomplete,sync,editor,editor/triggers,panels/property}/ports.ts`
  **Was:** `CleanupFn = () => void` 5× identisch, `SelectionOrigin`-
  Union 1× redundant in `editor/ports.ts` (sync hatte schon Re-Export).
  **Status:** erledigt (`2e6b0a4a`) — beide auf
  `studio/core/state-types.ts` als kanonische Quelle, Re-Exports.
  5913/5913 studio tests pass.

### Schema-Direction-Sharing (2026-05-10 Iter-N+2)

- **Wo:** `compiler/ir/transformers/property-{transformer,utils-transformer}.ts`
  **Was:** 15-Entry direction-Liste 2× inline in `property-transformer.ts`
  (für `pad`/`margin`), parallel zur 19-Entry `DIRECTIONS`-Set in
  `property-utils-transformer.ts` (für `border`/`radius` mit Corners).
  Differenz war intentional — Padding/Margin haben kein CSS-
  `padding-top-left` — aber als Magic-Literals an drei Stellen.
  **Status:** erledigt (`15a6280b`) — `EDGE_DIRECTIONS` (15) +
  `CORNER_DIRECTIONS` (4) + `DIRECTIONS = union` als komponierte
  Konstanten in `property-utils-transformer.ts`. Padding/Margin nutzen
  jetzt explizit `EDGE_DIRECTIONS`.

### Property-Section-Registry (2026-05-10 Iter-N+2)

- **Wo:** `studio/panels/property/view.ts` → `sections/index.ts`
  **Was:** Section-Hinzufügen erforderte Edits in 2 Dateien (Import
  - `this.sections.set(...)`-Zeile). Beide jetzt durch eine Zeile
    in `sections/index.ts:SECTION_FACTORIES` ersetzt; View iteriert
    `Object.entries()`.
    **Status:** erledigt (`ba615bad`) — view.ts –16 LOC, 868/868
    panel tests pass.

### Tutorial-Blocking Gaps (2026-05-10, per `docs/concepts/studio-tutorial.md`)

Hunting durch das Tutorial-Konzept `docs/concepts/studio-tutorial.md`
ergibt eine kleine Anzahl konkreter Lücken, die produktion-blocking sind
für den geplanten MVP-Tutorial-Vollausbau (Kapitel 19/20/21/24).

- **Wo:** `tools/test-runner/demo/types.ts` (DemoAction-Union)
  **Was:** Vier in `studio/test-api/step-runner/types.ts` existierende
  Test-Actions sind im Demo-Runner nicht verfügbar:
  `extractComponent`, `extractToken`, `batchReplace`, sowie die
  `switchFile`-Variante mit Cmd+P-Quick-Switch-Animation. Tutorial
  Kapitel 20 (Komponenten-Workflow geführt) und 21 (Token-Extract)
  brauchen sie als Demo-Actions, sonst lässt sich der Workflow nicht
  als Loop-Video aufnehmen.
  **Status:** offen
  **Notiz:** Lösung: dünner Demo-Runner-Wrapper, der die existierenden
  step-runner-Actions als DemoAction-Variante exposed (Wiederverwendung
  der step-runner-Logik, nur eigenes Pacing/Cursor-Animation).
  ~50–100 LOC pro Action.

- **Wo:** Studio-Keyboard
  **Was:** Cmd+P-Quick-Switch (Fuzzy-Search-File-Palette) ist im
  Tutorial Kapitel 24 als Loop geplant, existierte aber nicht im
  Code.
  **Status:** erledigt (`a00396c9`) — `studio/file-palette/`
  Modul (Controller + CSS + Tests), in `bootstrap.ts` als globaler
  Cmd/Ctrl+P-Handler verdrahtet. Keyboard-Vertrag: Cmd+P toggle
  open/close, ↑/↓ wrappen, Enter switcht + close, Esc/click-out
  close ohne Switch. Filter rankt startsWith vor contains, beide
  case-insensitive. 19 Unit-Tests in jsdom pinnen Lifecycle, Filter,
  Keyboard, Maus, Error-Handling. 5953/5953 studio tests pass.
  Erste der vier Tutorial-Blocking-Gaps geschlossen — die anderen
  drei (Demo-Runner-Actions, generischer Picker-Handler, Tutorial-
  Mode-Selektor-Versionierung) bleiben offen.

- **Wo:** `tools/test-runner/demo/types.ts` (PickColorAction)
  **Was:** `pickColor` ist die einzige Picker-Action im Demo-Runner.
  Tutorial Kapitel 19 plant Loops für 5 Pickers: Color (Hex+Token-
  Tab), Token, Icon, Animation, Action. Kein generischer
  `openPicker`/`selectPickerOption`/`pickerTabSwitch` heute.
  **Status:** offen
  **Notiz:** Drei Wege:
  1. `pickColor` → `pickValue` mit `pickerType`-Diskriminator.
  2. Eigene Actions pro Picker (`pickToken`, `pickIcon`,
     `pickAnimation`, `pickAction`).
  3. Generisch: `openPicker` + `pickerSelect` + `pickerTabSwitch`.
     Variante 3 ist am kleinsten — nutzt die schon existierenden
     Picker-DOM-Patterns (`base/picker.ts`).

- **Wo:** Tutorial-Mode-Setup, Selektoren
  **Was:** Tutorial-Mode (`tools/test-runner/demo/fragments/tutorial-mode.ts`)
  versteckt Panels per Class-Toggle. Bei Studio-UI-Änderungen
  (Panel-Layout-Refactor, neue Selektoren) brechen alle Tutorials
  gleichzeitig — keine Versionierung der Selektor-Verträge.
  **Status:** offen
  **Notiz:** Niedrige Priorität, aber: ein `data-testid`-basierter
  Selector-Vertrag in `tools/test-runner/demo/selectors.ts` würde
  Tutorial-Resilience erhöhen. Keine produktion-blocking Lücke,
  eher Wartungs-Hygiene wenn der Vollausbau läuft.

### Compiler/CLI Hunt (2026-05-10 Iter-N)

- **Wo:** `compiler/build-cli.ts`, `compiler/validator/cli.ts`,
  `compiler/cli/output.ts`
  **Was:** Drei CLI-Entries hatten je eigene Version-Reading-Logik.
  `mirror-compile` printVersion war hardcoded `'mirror-compile v2.0.0'`
  (ohne package.json-Read), die anderen zwei lasen package.json mit
  unterschiedlichen Module-Resolution-Pfaden (`__dirname`-via-tsx-shim
  vs. `import.meta.url`).
  **Status:** erledigt (`f19402b2`) — `readVersion()` in
  `cli/output.ts` (ESM-correct via `import.meta.url`), beide Wrapper-
  CLIs importieren. mirror-compile zeigt jetzt die echte Version.
  Drift-Falle für package.json-Bumps geschlossen.

- **Wo:** `compiler/runtime/mirror-runtime.ts:252` (vor Fix)
  **Was:** `const isContentPrimitive = ['Text', 'Icon', 'Button', 'Link']
.includes(type)` — Variable seit Erst-Commit (2026-03-08) zugewiesen
  aber nirgends gelesen. Argument-Parsing in `M()` dispatcht über
  `typeof arg1 === 'string'`, nicht über die Liste.
  **Status:** erledigt (`72b34aab`) — Variable gelöscht. Damit existiert
  keine hardcoded Primitive-Liste mehr im Runtime; Schema (`dsl.ts`) ist
  Single Source of Truth.

### Studio Struktur — God-Objects & Duplikation (Hunt 2026-05-10)

- **Wo:** `studio/visual/{resize,padding,margin,gap}-manager.ts`
  **Was:** 3931 LOC über vier nahezu identische Manager-Klassen (Handles,
  Drag-State, Observer, RAF-Throttling, Snap-Logik) — massive Duplikation
  im größten Subsystem.
  **Status:** Steps 1 + 2 erledigt — (1) RAF-Mouse-Throttle in
  `studio/visual/raf-mouse-throttle.ts` als `RafMouseThrottle`-Klasse
  extrahiert (in allen 4 Managern verwendet); (2) Resize-/Mutation-
  Observer + Scroll- + Window-Resize-Listener in
  `studio/visual/observer-pack.ts` als `ObserverPack`-Klasse extrahiert
  (Padding/Margin/Gap; ResizeManager hat keine Observer). 3931 → 3766
  LOC (–165 LOC, –4.2 %). 565/565 visual tests pass.
  **Notiz:** Verbleibender Schritt (3) `SpacingHandleManagerBase` für
  Padding/Margin/Gap mit gleicher Modifier-Logik / Snap / Overlay-
  Pattern. ResizeManager bleibt eigenständig (8 Handles, Multi-
  Selection, Grid, Sizing-Mode, double-click).
  Tests: nur ResizeManager hat Unit-Tests
  (`tests/studio/visual-resize-manager.test.ts`,
  `visual/resize-manager-multi.test.ts`); Padding/Margin/Gap nur durch
  Browser-Tests gedeckt — Step 3 braucht sorgfältige headed-
  Verification.

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

- **Wo:** `studio/app.ts` (heute 2456 LOC, vor Refactor 2557)
  **Was:** Bootstrap-Sprawl: 30+ globale Konstanten, 5 Extensions, 8
  Manager-Inits inline. Sieben Phasen nach `studio/init/` extrahiert:
  `init-notifications`, `init-sync`, `init-grid-overlay`,
  `init-draw-manager`, `init-inline-edit`, `file-tabs`,
  `init-editor-dispatch` (`8b92ae7a`). `compile()`-Decomposition
  läuft als pure-helper-Slices: `wrap-layout` (`e79184f5`),
  `augment-local-components` (`514807d6`), `execute-mirror-js`
  (`87237522`) — jede mit eigenen Unit-Tests. Verbleibend in
  `compile()`: Prelude-Resolution + State-Update-Block + Render-Pipe;
  daneben `updateStudio()`, `handleStudioCodeChange()`, plus File-IO
  und Ext-Wiring.
  **Status:** offen — ongoing decomposition.
  **Notiz:** Strategie: pure-helper-Slices mit Unit-Tests, Sub-Slice
  pro Commit, kein Big-Bang. Reduziert Closure-Pressure inkrementell.

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
  **Was:** Die vier Tauri-Helfer lasen `window.__TAURI_BRIDGE__`, das
  produktiv nirgends gesetzt wurde — nur Tests injizierten. Runtime hat
  `window.TauriBridge` (anderer Name, andere Form, siehe
  `studio/tauri-bridge.ts:412`). API-Shapes passen auch nicht zusammen
  (`newProject(type)` vs. `TauriProject.createProject(name, path)`).
  **Status:** teilweise erledigt — `__TAURI_BRIDGE__`-Indirektion komplett
  raus: vier Stubs sind jetzt explizit als „not implemented for Tauri
  desktop yet" markiert (loggen `log.warn`, no-op). `loadDemo` nutzt den
  bisher schon vorhandenen `getStorage().writeFile`-Pfad als Default.
  `TauriBridgeShim` aus `window-globals.d.ts` raus, sechs Tests, die
  den toten Bridge-Path stubsten, durch vier Tests ersetzt, die das
  echte Stub-Verhalten pinnen. Echte Wiring an
  `TauriBridge.project.{open,create}Project` bleibt offen — braucht
  Native-Dialog-Plumbing für Path-Auswahl.
  **Notiz:** Tracker für die Wiring-Arbeit:
  - `tauriNewProject` → `TauriDialog.open(directory: true)` +
    `TauriProject.createProject(name, path)` + `loadProject(path)`.
  - `tauriImportProject` → analog `TauriDialog.open` +
    `TauriProject.openProject`.
  - `tauriExportProject` → no-op (Tauri auto-saves) oder `TauriDialog.save`.
    Schätzung ~150 LOC + Dialog-UX. Wird vor dem ersten Tauri-Release
    gebraucht.

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
  **Status:** weitgehend erledigt — Stand 2026-05-10:
  - `compiler/`: 1 von 8 verbleibt (`animations.ts:262`,
    motion-Lib-API-Shape-Mismatch).
  - `studio/` Production-Code (ohne `test-api/`/`test-runner`):
    **0 echte Casts**. Verbleibende 5 grep-Treffer sind Kommentare /
    Doku-Strings, die das Wort "as any" erwähnen — keine echten
    Type-Escapes.
  - `studio/test-api/` + Browser-Test-Infrastruktur: ~110 Casts,
    bewusst gelassen (Test-Surface-Fakes, opaque Window-Globals).
  - `tools/`: 37 (war 44; 7 weg via `skipPrelude`-Cleanup
    `19682af2`). Probes/Diagnostik, nicht Produktionspfad.
  - `@ts-expect-error`: alle 5 in `tauri-bridge.ts` weg
    (`4606e8c6`); 1× `@ts-ignore` für EyeDropper weg (`3e206764`).
    **Notiz:** Production-Code-Ziel ist erreicht; weitere Reduktion
    betrifft Test-Infra (geringerer Wert).

---

## Erledigt

Chronologisch absteigend (neueste zuerst).

### 2026-05-10 — 6 stale Test-Files für gelöschte demo-fx/step-runner-Module entfernt

- **Wo:** `tests/studio/{demo-fx,replay-loader,replay-recorder,
headed-realism-scenarios,step-runner-compile-mode,
step-runner-selectors}.test.ts`
  **Was:** Sechs Test-Files importierten aus
  `studio/test-api/demo-fx/`, `studio/test-api/step-runner/` und
  `studio/test-api/replay-recorder.ts` — alle gelöscht im Rip-Out
  `8e81387f` (Demo-Runner + Step-Runner-Subsystem). Tests sind ohne
  Module nutzlos. Komplett entfernt; Suite-Status grün
  (15420/15420 Tests, 585/585 Files).
  **Status:** erledigt (5 in `05cce232` parallel-bundle, 1 in `e4f378ad`
  parallel-bundle; Bookkeeping in `b099a445`)

### 2026-05-10 — `studio/agent/types.ts` dead-code gelöscht

- **Wo:** `studio/agent/types.ts`, `studio/agent/index.ts`,
  `studio/index.ts`
  **Was:** 19-LOC-Datei mit `FileType` und `FileInfo` aus einem
  früheren multi-file `fix()`/`quickFix()`-Flow, der vor langem
  entfernt wurde. 0 Consumer; nur das Agent-Barrel re-exportierte
  noch. Datei + Re-Export + stale Kollisions-Kommentar in
  `studio/index.ts:120` weg.
  **Status:** erledigt (`934b58e0`)
  **Notiz:** Während ich den Befund als `aktiv` markiert hatte und
  meine eigenen lokalen Edits vorbereitete, hat die parallele Session
  exakt den gleichen Cleanup committed — gleiche 3 Files, plus Bonus
  `studio/test-api/replay-recorder.ts` als finaler Demo-Runner-Orphan.
  Lehrstück zur Parallelitäts-Regel: ohne den `aktiv`-Mark hätten wir
  doppelt gearbeitet; mit dem Mark wurde der Befund einfach von der
  schnelleren Seite abgeschlossen.

### 2026-05-10 — `compiler/runtime/test-api.ts` Wrapper inlined

- **Wo:** `compiler/runtime/test-api.ts` (9 LOC) +
  `tests/runtime/test-api.test.ts` + `tests/helpers/test-api.ts`
  **Was:** Backward-Compat-Wrapper, der alles aus `./test-api/index`
  re-exportierte, hatte nur 2 Test-Consumer und keine externen
  Konsumenten (kein NPM-bin, keine Studio-Bridge). Beide Tests auf
  den kanonischen Pfad `compiler/runtime/test-api/index` umgezogen,
  Wrapper-Datei gelöscht. 150/150 runtime tests pass.
  **Status:** erledigt (`be345e9a`)

### 2026-05-10 — 13 unused flex-reorder backwards-compat-Aliase gelöscht

- **Wo:** `studio/test-api/suites/flex-reorder/index.ts` +
  `studio/test-api/suites/drag/index.ts`
  **Was:** Migrations-Krücken aus einer früheren Reorganisation der
  Drag-Test-Suite: 13 Konstanten (`buttonReorderVerticalTests`,
  `buttonReorderHorizontalTests`, `textReorderTests`, `iconReorderTests`,
  `inputReorderTests`, `imageReorderTests`, `dividerSpacerReorderTests`,
  `linkTextareaReorderTests`, `mixedComponentReorderTests`,
  `zagComponentReorderTests`, `nestedContainerReorderTests`,
  `reorderEdgeCaseTests`, `sequentialReorderTests`) waren Aliase auf
  bestehende Test-Arrays, in `drag/index.ts`-Barrel re-exported, aber
  ohne End-Consumer. Beide Stellen aufgeräumt: `allFlexReorderTests`
  bleibt als einziger sinnvoller Re-Export. **Status:** erledigt
  (`6cb8bd12`).
  **Notiz:** Test-Suite-Validation: 4 unrelated Failures in
  `demo-fx`/`headed-realism`/`step-runner-*` waren bereits vor meiner
  Änderung im Working-Tree (parallele Refactor-Session löscht
  `studio/test-api/{demo-fx,step-runner}` und
  `tools/test-runner/demo/`); ohne meine Änderungen 4 fail / 5963 pass,
  mit meinen Änderungen identisch — Befund ist clean.

### 2026-05-10 — 6 leere Legacy-Exports aus `layout-presets.ts` gelöscht

- **Wo:** `studio/panels/components/layout-presets.ts`
  **Was:** Sechs als „Legacy exports for backwards compatibility"
  markierte Konstanten waren `: ComponentItem[] = []` mit 0 Konsumenten
  repo-weit: `FORM_COMPONENTS`, `OVERLAY_COMPONENTS`,
  `NAVIGATION_COMPONENTS`, `DATA_COMPONENTS`, `MEDIA_COMPONENTS`,
  `FEEDBACK_COMPONENTS`. Vermutlich Stubs aus einer Frühphase, in
  der die Komponenten-Sektionen anders gruppiert waren — nie befüllt,
  nie gelöscht. Die anderen 4 Geschwister-Exports (`LAYOUT_COMPONENTS`,
  `BASIC_PRIMITIVES`, `CHART_COMPONENTS`, `BASIC_COMPONENTS`) haben
  Consumer und bleiben unverändert. 6002/6002 studio tests pass.
  **Status:** erledigt (`47e30682`)

### 2026-05-10 — `SpacingToken`-Deprecation-Aliase aus Panel + Snap entfernt

- **Wo:** `studio/panels/property/{types,index,ports}.ts` +
  `studio/visual/snap/{spacing-snap,index}.ts` + 11 Consumer-Files
  **Was:** Übergangs-Aliase aus dem Naming-Collision-Fix `3f6686f3`
  vollständig zurückgebaut. Migration: 7 Panel-Files (`base/section.ts`,
  `utils/tokens.ts`, 5× `sections/*-section.ts`) + 2 Adapter
  (`mock-adapters.ts`, `production-adapters.ts`) auf
  `PanelSpacingToken` umgestellt; Snap-Consumer (`visual/index.ts`
  Re-Export, `test-api/snapping-api.ts`) auf `SnapSpacingToken`.
  Beide `@deprecated SpacingToken`-Aliase + zugehörige Re-Exports
  in 4 Files entfernt. 6002/6002 studio tests pass.
  **Status:** erledigt (`2a3dd1b6`)

### 2026-05-10 — Probe-Hygiene: 70 throwaway `probe-*.ts` gelöscht

- **Wo:** `tools/probes/probe-*.ts` (70 Files)
  **Was:** Alle 70 generic `probe-*.ts` ohne externe Referenzen und
  ohne Slice-NN-Konvention gelöscht — Throwaway-Debug-Iteration aus
  älteren Sessions, deren Cases heute über `tests/differential/*.test.ts`
  gepinnt sind. Cluster: `probe-react-edge.ts` … `probe-react-edge10.ts`,
  `probe-fw-edge.ts` … `probe-fw-edge4.ts`, plus 56 verstreute
  Einzel-Probes. Konvention bleibt: `slice-NN-*.ts` (25 Files) sind
  kuratierte Re-Run-Werkzeuge, generic `probe-*.ts` waren es nie.
  Git-History bewahrt die Files für Notfall-Restoration via
  `git show 23f2d985:<pfad>`.
  **Status:** erledigt (`3c5b2b98`)

### 2026-05-10 — `any[]` Parameter aus `instance-ops.ts:hasWidthFullInDescendants`

- **Wo:** `compiler/ir/ops/instance-ops.ts:336`
  **Was:** Letzter Production-Code-`any` in `compiler/`. Parameter
  retyped auf `(Instance | Slot | Text | ZagNode | Each | ConditionalNode)[]`
  (matching `Instance.children`), Body auf `'foo' in child`-Guards
  umgestellt damit TS Narrowing macht ohne `as any`-Casts. Einziger
  Cast: rekursiver Call (`child.children as readonly DescendantNode[]`)
  weil `Instance.children` und `Each.children` unterschiedliche
  Sub-Unions haben — strukturell aber Subset von `DescendantNode`.
  Kein Test-Pin (Type-Only); compiler/differential-Suite grün
  (7736/7736).
  **Status:** erledigt (gebündelt in `8e81387f` von Parallel-Session,
  ursprünglich von dieser Session implementiert)

### 2026-05-10 — Lane 2, Inkrement 1: Schema-driven alias resolution in `property-transformer.ts`

- **Wo:** `compiler/ir/transformers/property-transformer.ts`
  **Was:** ~14 hardcoded Alias-Disjunktionen
  (`name === 'pad' || name === 'padding' || name === 'p'`-Stil) durch
  `getCanonicalPropertyName(name) === '<canonical>'`-Lookups ersetzt.
  Betroffen: padding, margin, border, radius, width, height, color,
  background, rotate, horizontal, vertical, center, icon-size. Nicht
  angefasst: non-schema-Properties (animation, backdrop-blur, blur,
  scale, aspect, scroll-\*) — als Inkrement 3 separat aufgenommen.
  Pre-Refactor-Pin (`Properties — Alias-Equivalenz`, 9 Tests in
  `tests/differential/properties.test.ts`) deckt Drei-Alias-Output-
  Equivalenz für padding/margin/width/height ab. 15481/15481 Tests
  grün.
  **Status:** erledigt (`351a1333`)

### 2026-05-10 — Lane 1, Inkrement 2: Section-Header von WATCHLIST nach KEEP

- **Wo:** `tests/policy/dsl-features-have-examples.test.ts`,
  `examples/tokens-with-sections.tok` (neu)
  **Was:** Investigation: Lexer (`scanSection`), Parser (currentSection
  threading), AST (`TokenDefinition.section`), Studio
  (`compile/token-renderer.ts`, `preview/renderer.ts` — Token-
  Gruppierung in der Preview). Live-Code, nur kein `examples/`
  Demo-File. Real-world tokens-Datei mit 7 Sections (Brand /
  Semantic / Surface / Text / Spacing / Radii / Typography) addiert.
  Eintrag von WATCHLIST nach KEEP promoted. WATCHLIST jetzt leer
  → Placeholder-Test damit Vitest die `describe` nicht als „No
  test found" failed.
  **Status:** erledigt (`74cf45f5`)

### 2026-05-10 — Lane 1, Inkrement 1: `$icons:` von WATCHLIST nach KEEP

- **Wo:** `tests/policy/dsl-features-have-examples.test.ts`,
  `examples/custom-icons.mirror` (neu)
  **Was:** Slice 51 hatte das Feature RT-validiert, aber kein Beispiel
  in `examples/`. Demo-File mit `$icons:`-Block (3 Custom-Icons) +
  Custom/Lucide-Mix in einer Layout-Direction-UI hinzugefügt. Eintrag
  von WATCHLIST nach KEEP promoted. Smoke-Suite zieht das File
  automatisch in die 24-Test-Single-File-Corpora ein.
  **Status:** erledigt (`8b31a4fe`)

### 2026-05-10 — IR: TokenReference in border + chart-slot values

- **Wo:** `compiler/ir/transformers/style-utils-transformer.ts:formatBorderValue`,
  `compiler/ir/transformers/chart-transformer.ts` (chart-slot config build),
  `compiler/runtime/charts.ts:applySlotConfigs` (CSS-var resolver)
  **Was:** Zwei IR-Pfade riefen `String(value)` auf TokenReference-
  Objekten und produzierten den literalen String `"[object Object]"`:
  (1) Border-Direction-Path (`bor b 1 $border` → `'border-bottom':
'1px solid [object Object]'`) — CSS-Regel still ungültig, Divider
  unsichtbar; (2) Chart-Slot-Config (`Point: bg $accent.blue` auf
  Line-Chart) — Chart.js fiel auf Default-Farbe zurück, Müll in
  emittierter JSON. Fix: TokenReference in formatBorderValue →
  `var(--<name>-boc)`. Chart-Slot → `$name`-Marker, Runtime-Resolver
  via `getComputedStyle(...)` gegen CSS-Var-Registry.
  **Wirkung:** portfolio-dashboard-optimized (19× border-Object),
  hospital-dashboard (2× chart-slot-Object). Pin:
  `tests/differential/properties.test.ts`.

### 2026-05-10 — Parser/React/DOM: `$token`-led ternary

- **Wo:** `compiler/parser/inline-property-parser.ts:consumeTokenRef`,
  `compiler/backends/react.ts:rewriteIdentifiersToTokens`,
  `compiler/backends/dom/ops/resolve-templates.ts:resolveTemplateValue`
  **Was:** `Text $status == "online" ? "On" : "Off"` wurde vom Parser
  als `propset:$status` interpretiert; die Comparison-RHS, der ?-
  Operator und die Branches landeten als drei separate Properties auf
  dem Element. Trailing-Properties auf der gleichen Zeile (`, col $muted`)
  endeten beim _nächsten_ Sibling. Fix: `consumeTokenRef` routet jetzt
  ein folgendes `?`/`==`/`>`/etc. durch `parseTernaryExpression`. React's
  Identifier-Rewriter handelt zusätzlich `$ident`-Form als Defensive.
  Der DOM-Loop-Body-Resolver `resolveTemplateValue` strippt jetzt auch
  `__conditional:`-Marker (vorher nur `__loopVar:`) — sonst landete
  `__conditional:member.status == ...` bare als JS und crashte das
  Bundle.
  **Wirkung:** Tutorial-Beispiele 9-7 und 9-27 (IR-Snapshot-Drift),
  task-app/app.mirror (`Text $member.status == "online"...`),
  task-app/simple.mirror (`Text "$project.completedCount" + ...`).
  Pin: `tests/differential/conditionals.test.ts`.

### 2026-05-10 — React + Framework + DOM Backend-Hunt (24-Slice-Run)

Eine durchgehende Hunt-Session an allen drei Backends; alle Slices
mit Differential-Test-Pin.

**Validierung:** Alle 19 example `.mirror` Files durch esbuild
gefüttert — 0 Syntax-Fehler in **allen drei Backends** (React TSX,
Framework JS, DOM JS). Pre-Hunt: React 2 Errors, DOM 1 Error.
Real-Example-Probes (hotel-checkin, portfolio-advisor, address-
manager, time-tracking, hospital-dashboard, personas-informatik,
task-app, portfolio-dashboard) — 0 `[object Object]`, 0 literale
`$token`-Strings, 0 `'foo': undefined`-Noise im React-Output.

- **Wo:** `compiler/backends/react.ts` — Event-Handler wired
  **Was:** Side-effect actions (`toast`, `copy`, `openUrl`, `back`/
  `forward`, `scrollTo*`) emittieren jetzt JSX-Handler (`onClick`,
  `onMouseEnter`, `onKeyDown`, `onFocus`/`onBlur`) → reine Browser-APIs,
  kein Mirror-Runtime nötig. State-Mutation (`increment`/`set`/`toggle`)
  bleibt no-op-Comment bis zur React-State-Runtime.
  **Status:** erledigt (`6c5946f1`)

- **Wo:** `compiler/backends/react.ts` — Default Children
  **Was:** `Btn: pad 10\n  Text "Save"\n\nBtn` rendete als leeres
  `<div />` weil React-Backend Comp-Def-Children nicht las. Jetzt
  Fallback durch `compDef.children` wenn Instance keine Kinder hat.
  Skip wenn Instance positional content trägt (`Btn "Custom"`).
  **Status:** erledigt (`13d2cf5a`)

- **Wo:** `compiler/backends/react.ts` — Initial-State Inline-Style
  **Was:** `Btn "Active", on` zeigte gleich aus wie `Btn "Off"` — kein
  click-runtime, also state-block-props müssen schon im ersten Render
  drin sein. Jetzt vor generateStyles in allProps merged.
  **Status:** erledigt (`2ef8ca5e`)

- **Wo:** `compiler/backends/react.ts` — State-Variant Children
  **Was:** Figma-Variants-Semantik. State-Block kann eigene Children
  tragen (`on:\n  Text "Liked!"`); bei Initial-State müssen die statt
  Base-Children rendern. Jetzt am Compile-Time gefolded.
  **Status:** erledigt (`9f4e09ac`)

- **Wo:** `compiler/backends/react.ts` (`detectLayoutContext`)
  **Was:** `loopVars` wurden bei jedem Frame-Recurse gedroppt. Slot 4
  Levels tief in `each position in $positions` resolvte
  `$position.name` gegen (fehlende) `tokens.position` — literal
  `"$position.name"`-Strings im JSX in portfolio-advisor &
  address-manager. Jetzt durchgereicht.
  **Status:** erledigt (`62b39dab`)

- **Wo:** `compiler/backends/react.ts` (`generateStyles` final pass)
  **Was:** `boc $accent` wenn nur `accent.bg`/`accent.col` definiert ist
  → `borderColor: '$accent'` (invalid CSS) im Inline-Style. DOM dropt
  silent. Jetzt React auch — final-pass leak-guard strippt jeden
  Style-Eintrag mit `$`-prefix-String-Wert.
  **Status:** erledigt (`dbc659c1`)

- **Wo:** `compiler/backends/framework.ts` (`nodeToProps` final pass)
  **Was:** Same leak-shape wie React, aber für M-runtime prop bag.
  `selected: { boc: '$accent' }` und `ic: '$accent'` (icon-color) leakten
  durch. Jetzt nur **style-shaped** props gestrippt
  (bg/col/boc/ic/fs/gap/rad/pad/mar/...) — runtime-data bindings
  (`Line $data`, M.each collection refs, dotted text-content) bleiben
  unangetastet.
  **Status:** erledigt (`0f5bfbca`)

- **Wo:** `compiler/backends/react.ts` — Slot-Fill-Merge
  **Was:** `Card: bg #000\n  Title: col white, fs 18\n\nCard\n  Title "X"`
  → `<h2>X</h2>` ohne Slot-Def-Styles. Jetzt nutzt React den existierenden
  IR-helper `mergeSlotPropertiesIntoFiller` direkt im Children-Loop.
  Filler überschreibt Slot-Def auf Konflikt.
  **Status:** erledigt (`2e5be64e`)

- **Wo:** `compiler/backends/react.ts` (`formatIconPropValue`)
  **Was:** `Icon "check", ic done ? green : gray` → `color="[object
Object]"` weil Conditional via `JSON.stringify(String(v))` lief.
  MirrorIcon spreadet color auf SVG → React-Crash. Jetzt JSX-expression
  `color={tokens["done"] ? "green" : "gray"}`.
  **Status:** erledigt (`69bc84d7`)

- **Wo:** `compiler/backends/framework.ts` — Aspect/Backdrop-Filter
  **Was:** `Frame aspect square` und `Frame backdrop-blur 8` wurden
  silent gedropt — `cssPropToMirrorProp` hatte keine Branch für
  `aspect-ratio`, `backdrop-filter`, `filter`. IR emittiert korrekt;
  nur Reverse-Mapping fehlte. + `-webkit-backdrop-filter` Companion
  gedropt.
  **Status:** erledigt (`a23b93c1`)

- **Wo:** `compiler/backends/framework.ts` — Transforms/Borders
  **Was:** `rotate Ndeg`, `scale N`, `position: fixed/relative`,
  `border-left/right/top/bottom`, `border-width: 0 0 1px 0` (4-value
  Shorthand) und `border-style: solid` Companion alle reverse-gemappt.
  Real-Example-Round-Trip-Loss eliminiert.
  **Status:** erledigt (`73fa7dfd`)

- **Wo:** `compiler/backends/react.ts` (`generateEachJSX`)
  **Was:** Named-Index `each task,i in $tasks` — React hardcodete `_idx`
  und droppte `i`. orderBy `by <key>` wurde komplett ignoriert. Jetzt
  beide gewired: Index-Name geht in loopVars, orderBy emittiert
  `[...src].sort((a, b) => ...)` vor dem `.map()`.
  **Status:** erledigt (`ebf60742`)

- **Wo:** `compiler/backends/react.ts` (`generateEachJSX`)
  **Was:** `each x in [1, 2, 3]` (inline array) → `tokens["[1, 2, 3]"]`
  (always undefined). Jetzt detect leading `[` → array literal verbatim.
  **Status:** erledigt (`c839dae5`)

- **Wo:** `compiler/backends/react.ts` (`getTextContent`,
  neuer `expressionPartsToJS`)
  **Was:** `Text "Total: " + count` → leeres `<span />` weil
  `getTextContent` nur string/loopVar/conditional kannte. Jetzt
  Expression auch handled — Parts werden zu JS-expression mit Token-
  und Loop-Var-Resolution gewoven.
  **Status:** erledigt (`3fc8b8d7`)

- **Wo:** `compiler/backends/react.ts` (`generateHtmlAttributes`)
  **Was:** `Input placeholder "Hi " + $name`, `Link "View", href "/items/" + $id`
  → Attribute komplett gedropt weil HTML-attr-emitter nur
  string/number/boolean akzeptierte. Jetzt computed expressions in attrs
  emittieren JSX-expression. String-values mit `$name`-Interpolation
  ebenso.
  **Status:** erledigt (`e7fcb842`)

- **Wo:** `compiler/backends/react.ts` (`generateEachJSX`,
  `generateJSX` Top-Level-Wrap)
  **Was:** Two related drops:
  1. `each + Conditional`: each-loop body mit `if/else` → empty Fragment
     weil generateEachJSX nur Instance/Each handled, Conditional/Text
     nicht.
  2. Explicit `visible-when X`: parser-desugared `visibleWhen` aus
     `if/else`-blocks im Parent wurde gehandhabt, aber `Frame
visible-when X` als reguläre Property nicht. Auch: top-level Fragment
     wrap wenn visible-when-expression-only-root-item — `return
({cond ? ... : null})` ist invalid JSX.
     **Status:** erledigt (`da17ef6c`)

- **Wo:** `compiler/backends/react.ts` (`generateStyles` switch)
  **Was:** `tracking N` / `ls N` / `letter-spacing` dropped silently —
  React-switch hatte keinen Case. IR emittiert `letter-spacing: Nem`
  korrekt. Jetzt mit em-suffix in React reproduziert.
  **Status:** erledigt (`61ea5a62`)

- **Wo:** `compiler/backends/react.ts` (`HTML_ATTR_PROPS`,
  `applyFlagProperty`)
  **Was:** Drei dokumentierte Schema-Props ohne React-Branch:
  `ver-baseline` (cross-axis baseline alignment, fiel auf flex-start
  zurück), `min`/`max`/`step` (numeric input attrs, nicht in
  HTML_ATTR_PROPS), `mask "###..."` (DOM nutzt Runtime-Handler;
  React surface jetzt als `data-mask` für künftigen Runtime-Layer).
  **Status:** erledigt (`376d317d`)

- **Wo:** `compiler/backends/react.ts` (`generateStyles` align-handler)
  **Was:** `align top|bottom|center|left|right` keyword-with-value
  fiel komplett durch — Cross-axis defaultete auf flex-start
  unabhängig von Direction. DOM mappte korrekt via IR
  layout-transformer. Jetzt direction-aware Mapping in React
  reproduziert (`hor` vs `column` mirroren Achsen).
  **Status:** erledigt (`76e08045`)

- **Wo:** `compiler/backends/framework.ts` — Round-trip-Erweiterungen
  **Was:** Drei weitere reverse-mapping-Lücken: `letter-spacing: Nem`
  → `tracking: N`, `align-items: baseline` → `'ver-baseline': true`,
  und `align <value>` für single-axis flex-end (`align bottom` in row,
  `align right` in column, etc.). `align top` in row und `align left`
  in column bleiben unmapped — Default-Signature kann nicht von
  expliziter User-Intention unterschieden werden ohne IR-Provenance.
  **Status:** erledigt (`d65d2350`)

- **Wo:** `compiler/backends/react.ts` (root-item dispatcher)
  **Was:** DatePicker (einzige verbliebene Zag-Komponente in Mirror)
  emittierte nur `not supported in React backend`-Comment. Jetzt als
  natives `<input type="date">` mit allen dokumentierten Properties
  (placeholder/min/max/value/disabled/readOnly). Range-Mode bleibt
  Comment — braucht zwei Inputs + State-Tracking.
  **Status:** erledigt (`f2165eaf`)

- **Wo:** `compiler/backends/react.ts` (`interpolateStringForJSX` +
  `inlineMarkdownToJSX`)
  **Was:** Inline-Markdown (`**bold**`, `*italic*`, `\`code\``) wurde
in React als raw Text mit Markdown-Markers gerendert — DOM nutzt
`formatInlineMarkdown`Runtime, React hat keinen. Jetzt
Compile-Time-Konvertierung zu`<strong>`/`<em>`/`<code>` JSX.
**Status:** erledigt (`99a74646`)

- **Wo:** `compiler/backends/react.ts` (`expressionPartsToJS`,
  `renderTextSlot` Conditional-Branch)
  **Was:** Zwei JSX-Syntax-Fehler in real-example React-Output,
  surfaced via esbuild-TSX-Loader-Test:
  1. `Text "+" + ($count - 2)` produzierte `{"+" + "(" - count 2 ")"}`
     — Parens als Literale behandelt, Operator zwischen `count` und
     `2` fehlte. Jetzt paren-aware-weave wie IR's
     `buildExpressionString`.
  2. Prose-Mode Bullet-Text mit `?` und `:` (z.B. `**Key**: FH vs.
Uni — wie wird das gesehen?`) wurde als Conditional mit invalid-
     JS Condition gespeichert (`vs.Uni wie wird das gesehen`). React
     emittierte `{vs.Uni wie wird das gesehen ? : }` — esbuild/Vite/
     oxc rejected. Jetzt eval-test der Condition durch Function;
     bei SyntaxError fallback auf literal Text.
     **Status:** erledigt (`ce4fc73e`)

- **Wo:** `compiler/backends/dom/ops/resolve-templates.ts`
  (`parseTopLevelConditional`)
  **Was:** Same root-cause als der React-Defense-Slice, aber für DOM.
  Prose-Mode-Bullet mit `?` und `:` produzierte
  `formatInlineMarkdown(($get("vs.Uni") $get("wie") $get("wird") ... ? "" : ""))`
  — adjacent function-calls ohne Operator → unparseable JS, killte das
  ganze DOM-Bundle beim Script-Load. Gleiche eval-test-via-Function-
  Defense; bei Parse-Fehler fallback auf then-Branch-Literal.
  **Status:** erledigt (`8c17d930`)

### 2026-05-10 — Directional Padding/Margin/Border-Shortcuts in React

- **Wo:** `compiler/backends/react.ts` (`generateStyles`),
  `tests/differential/properties.test.ts`
  **Was:** **Alle** Direktion-Shortcuts wurden silent geschluckt:
  `pad-x`/`pad-y`, `pad-t/r/b/l`, `px/py/pt/pr/pb/pl`, dito für `mar-`,
  `bor-t/r/b/l` (+ `bort/borr/borb/borl`). Das sind alltägliche Props
  in jedem Mirror-Layout, ohne sie waren React-Renders unbrauchbar.
  Fix: 19 neue switch-cases. Border-Direktion setzt `border-{side}-style:
solid` mit, damit die Regel ohne globalen `border-style` rendert.
  **Status:** erledigt
  **Notiz:** 11-fach `.each`-Pin in `properties.test.ts` für die
  häufigsten Formen (alle 4 sides + xy + bor-t/b).

### 2026-05-10 — Long-Tail Props im React-Backend

- **Wo:** `compiler/backends/react.ts` (`generateStyles`, `applyFlagProperty`),
  `tests/differential/properties.test.ts`
  **Was:** ~17 häufige Properties wurden silent geschluckt. Audit-Liste:
  `italic`, `underline`, `uppercase`, `lowercase`, `truncate`,
  `aspect square|video|N/M`, `blur N`, `backdrop-blur N`,
  `shadow sm|md|lg`, `z N`, `absolute`/`fixed`/`relative`/`abs`,
  `grow`/`shrink`, `text-align center`, `scroll-hor`/`scroll-both`/`clip`,
  `visible`. Fix: neue Helper-Funktion `applyFlagProperty(name, style)` als
  Single-Source-of-Truth für Flag-Form-Props (`[]` und `[true]`-Variante
  routen beide durch den selben Pfad), plus value-bearing Cases im
  Haupt-Switch. 14-fach `.each`-Pin in `properties.test.ts`.
  **Status:** erledigt
  **Notiz:** Bisher mussten Designer-Layouts via Tokens `$truncate-class`
  oder ähnliche Workarounds gehen — jetzt cross-backend identisch.

### 2026-05-10 — `rotate` / `scale` Transforms im React-Backend

- **Wo:** `compiler/backends/react.ts` (`generateStyles`),
  `tests/differential/properties.test.ts`
  **Was:** `Frame rotate 45` und `Frame scale 1.2` droppten in React
  silent — kein `transform`-CSS. Auch `hover-scale 1.05` produzierte
  `data-h` Attribut aber leeren State-Block. Fix: switch-cases für
  `rotate`/`rot` und `scale` in generateStyles; mehrere Transforms im
  selben Element werden zu einem CSS-`transform`-Wert mit Space-
  Separator zusammengeführt (`rotate(45deg) scale(1.2)`).
  **Status:** erledigt
  **Notiz:** 2 neue Pins (rotate+scale + combined, hover-scale-rule).

### 2026-05-10 — System-State-Pseudoklassen (`hover`/`focus`/`active`/`disabled`) in React

- **Wo:** `compiler/backends/react.ts`,
  `tests/differential/states.test.ts`
  **Was:** React droppte sowohl State-Blocks
  (`Btn:\n  hover:\n    bg #555`) als auch Shorthand-Props
  (`Button hover-bg #555`) komplett. JSX-Inline-`style={{ }}` kann
  keine Pseudoklassen tragen. Fix: `ReactStateContext`-Akkumulator wird
  durch generateJSX/Each/Conditional gethreaded, sammelt CSS-Regeln
  (`[data-h="N"]:hover { background-color: #555 }`); `<style>`-Block
  als erstes Root-Item emittiert; betroffene Elemente bekommen
  `data-h="N"`. `collectStateGroups()` kombiniert beide Eingangsformen
  (State-Blocks + Shorthand-Props) zu einer einheitlichen Liste.
  `formatStyleAsCSS` macht camelCase → kebab-case (mit korrekter
  Webkit/Moz/Ms-Vendor-Prefix-Behandlung).
  **Status:** erledigt
  **Notiz:** 4 neue Pins: hover-block, hover-shorthand, focus/active/
  disabled, no-state-no-attr (Bundle-Size-Guard).

### 2026-05-10 — Gradient-Shorthand `bg grad …` im React-Backend

- **Wo:** `compiler/backends/react.ts` (`generateStyles`),
  `tests/differential/properties.test.ts`
  **Was:** `Frame bg grad #2271C1 #7c3aed` produzierte
  `backgroundColor: 'grad #2271C1 #7c3aed'` — kein gültiges CSS,
  einfacher String-Join. DOM resolved über IR-Property-Transformer zu
  `linear-gradient(...)`. Fix: Pre-Switch-Pass detektiert
  `bg`/`col`/`c` mit `grad`/`grad-N`/`grad-ver` als erstem Wert,
  baut den `linear-gradient(<angle>, <colors>)` String. Default 90deg,
  `grad-ver` → 180deg, `grad N` → `Ndeg`. Text-Gradient-Pattern (col)
  kommt mit background-clip-Workaround durch.
  **Status:** erledigt
  **Notiz:** 2 neue Pins: bg-Gradient (3 Varianten) und col-Gradient
  (text-clip).

### 2026-05-10 — `[object Object]` bei Style-Property-Ternary in React

- **Wo:** `compiler/backends/react.ts` (`generateStyles`),
  `tests/differential/conditionals.test.ts`
  **Was:** `Frame bg active ? #2271C1 : #333` produzierte
  `backgroundColor: '[object Object]'` weil der Conditional-Wert nie
  vom resolve-Pfad abgefangen wurde — `String({…})` lieferte den
  defaulten Object-toString. Fix: Pre-Switch-Pass detektiert Conditional
  in `prop.values[0]` (außer für `content`, das `renderTextSlot`
  überlässt), resolved bare-identifier-Conditions statisch über die
  tokenMap, dropt komplexere Conditions still (statt Garbage zu
  emittieren). Effective-Values lokal statt In-Place-Mutation, damit
  Text-Content-Pfad nicht kollateral betroffen ist.
  **Status:** erledigt
  **Notiz:** 3 neue Pins: truthy-branch, falsy-branch, complex-condition-drop.

### 2026-05-10 — Text-Content-Interpolation in React-Backend

- **Wo:** `compiler/backends/react.ts`,
  `tests/differential/variables.test.ts`
  **Was:** `Text "$name"`, `Text "Hi $name"`, `Text "$user.name"`
  blieben in React als literale Strings im JSX (nur DOM resolved sie
  via `$get(...)`). Fix: `interpolateStringForJSX(content, tokens)`
  parsed `$id`/`$id.id.id` Patterns, baut Segments und emittiert je
  nach Form: pure-literal → `{"…"}`, single-ref → `{tokens["name"]}`,
  mixed → ``{`Hi ${tokens["name"]}`}``, dotted → `tokens["user"]?.name`.
  Unbekannte Identifier (kein Token) bleiben literal — bessere
  Fehler-Sichtbarkeit als `undefined`.
  **Status:** erledigt
  **Notiz:** Pin von "React keeps literal" auf "DOM + React resolve;
  Framework keeps literal" umgestellt + 4 Form-Pins (bare/mixed/dotted/
  unknown) im Variables-Differential.

### 2026-05-10 — Animations in React-Backend + Shared Animation-Modul

- **Wo:** `compiler/backends/animations.ts` (neu),
  `compiler/backends/dom/style-emitter.ts`,
  `compiler/ir/transformers/property-transformer.ts`,
  `compiler/backends/react.ts`,
  `tests/differential/cleanup.test.ts`
  **Was:** Animation-Keyframes (`@keyframes mirror-spin` …) lebten in
  `dom/style-emitter.ts`, der Anim-Shorthand-Map in
  `property-transformer.ts` — beide DOM-only. React droppte `anim`
  silent. Fix: gemeinsames Modul `compiler/backends/animations.ts` mit
  `ANIMATION_KEYFRAMES_CSS` + `ANIMATION_SHORTHAND` + `animationShorthand()`.
  DOM und IR-Transformer importieren daraus, React: `containsAnimUsage`
  pre-scant den Tree, bei Treffer wird ein `<style>`-Block (alle
  Keyframes als ein einzelner String) als erstes Root-Item gepusht;
  `generateStyles` mappt `anim` auf `style.animation`. Icon-Pfad
  (MirrorIcon) bekam `style`-Prop, das mit `wrapStyle` gemerged wird
  → `Icon "loader", anim spin` rendert tatsächlich.
  **Status:** erledigt
  **Notiz:** Pin von "React + Framework drop" auf "DOM und React wire,
  Framework dropt" umgestellt. Bundle-Size-Guard: `<style>`-Block wird
  nur emittiert wenn `anim` benutzt wird.

### 2026-05-10 — Multi-Level `as`-Inheritance in React-Backend

- **Wo:** `compiler/backends/react.ts`,
  `tests/differential/components.test.ts`
  **Was:** `LoudBtn as PrimaryBtn as Btn as Button` droppte alle
  Properties oberhalb der innersten Definition. DOM walkt die Kette
  schon lange via `ComponentResolver.resolveComponent`. React rief nur
  `componentMap.get(...)` direkt auf. Fix: gleicher Resolver-Aufruf, der
  auch das `primitive`-Feld auf den HTML-Tag der Wurzel resolved
  (`button` statt `div`).
  **Status:** erledigt
  **Notiz:** Pin von "React drops parent props" auf "alle 3 Backends
  mergen die Kette + resolven zum primitiven Tag" umgestellt.

### 2026-05-10 — Block-If/Else in React-Backend

- **Wo:** `compiler/backends/react.ts`,
  `tests/differential/conditionals.test.ts`
  **Was:** Block-Conditionals waren React-only-Skip
  (`{/* Conditional not supported */}`). Jetzt: Top-Level
  `Conditional`-Knoten werden zu `{cond ? (<>then</>) : (<>else</>)}`
  bzw. `: null` ohne Else. **Nested if/else** desugart der Parser in
  per-Instanz-`visibleWhen`-Strings (Else-Branch = `!(cond)`); diese
  werden in `generateJSX` über `wrapWithVisibility` zu
  `{cond ? jsx : null}`. `rewriteIdentifiersToTokens` greift in beiden
  Pfaden, damit `done` → `tokens["done"]` und `!(done)` →
  `!(tokens["done"])` wird.
  **Status:** erledigt
  **Notiz:** DOM hat eigenen Runtime-Pfad (`_conditionalConfig`),
  Framework verwendet `visible-when`-Props — alle drei Backends jetzt
  per-Pin abgedeckt.

### 2026-05-10 — Inline-Ternary in React-Text-Content

- **Wo:** `compiler/backends/react.ts`, `tests/differential/conditionals.test.ts`
  **Was:** `Text done ? "Ja" : "Nein"` droppte beide Branches im React-
  Backend (Pin gepinnt). Jetzt: `getTextContent` gibt Conditional auch
  zurück, `renderTextSlot` emittiert `{cond ? "Ja" : "Nein"}` mit
  Token-Identifier-Rewrite (`done` → `tokens["done"]`). Rewriter
  überspringt Identifier in String-Literals (state-machine, kein
  Regex), sodass `"Items: $count"` heil bleibt. Nested-Ternaries
  (`a ? "X" : b ? "Y" : "Z"`) bekommen Rewriter auf der Branch-
  String-Ebene → Inner-Identifier werden ebenfalls rewritten.
  **Status:** erledigt
  **Notiz:** Pin von "React drops it" auf "alle 3 Backends keep both
  branches" + nested-ternary-Regression-Pin umgestellt.

### 2026-05-10 — Top-Level `each` in React-Backend

- **Wo:** `compiler/backends/react.ts`, `tests/differential/each.test.ts`
  **Was:** Top-Level `each task in $tasks` produzierte naked
  `{...}.map()`-Expression im `return (…)` — ungültiges JSX. Fix:
  Root-Items werden klassifiziert (`jsx` / `expr` / `comment`) und bei
  Bedarf in `<>...</>` gewickelt (Fragment). Single-Element-Root bleibt
  unverpackt. Pin im each-Differential von "documented limitation" auf
  konkrete `.map()`+`Object.values`+Fragment-Assertion umgestellt.
  **Status:** erledigt
  **Notiz:** Fragment-Wrap deckt auch Multi-Root-Programme ab, die
  vorher implizit auf einen Root angewiesen waren.

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
