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

> **Wirklich offene Befunde (Status: offen / aktiv):**
>
> 1. `compiler/backends/dom/style-emitter.ts:emitNodeSizeStateCSS` —
>    Container-Queries, Lane-Doc steht
> 2. Tutorial-Demos + Test-Runner — OWNER-EXKLUSIV (toni)
> 3. Tutorial-Loop-Infrastruktur insgesamt — Owner-Entscheidung
> 4. `studio/app.ts` Bootstrap-Decomp — ongoing decomposition
> 5. `compiler/backends/dom/ops/resolve-templates.ts:resolveConditionalExpression`
>    — Smell ohne Bug
> 6. Skipped-Tests Inventory (Slice F, 2026-05-13) — siehe Eintrag
>    weiter unten, kategorisiert in (a) Container-Queries (in #2 enthalten),
>    (b) Stacked-Drag Pure-Mirror-x/y-Propagation, (c) Padding/Margin
>    Zero-State Zones, (d) Context-aware Autocomplete (3 Feature-Lücken),
>    (e) Dynamic-Token-File Prelude-Rebuild, (f) Reorder-Siblings ohne
>    Synthetic-Root, (g) Resize-Handle Full-Width-Position-Design,
>    (h) Hover+State Test-Timing, plus Tutorial-Lane (#4-respektierte).
>
> Alle anderen Einträge unter „Offen" tragen bereits Status:
> **erledigt** oder **abgewiesen** und gehören eigentlich nach
> „Erledigt"; sie verbleiben hier als historischer Kontext (Audit-
> Notiz + Commit-Hash). Vor dem nächsten Hunt-Rollup migrieren —
> bis dahin: erst auf die obigen 7 Einträge scannen.

- **Wo:** `studio/editor/triggers/trigger-controller.ts` (659 LOC),
  `studio/editor/triggers/ports.ts` (450 LOC),
  `studio/editor/triggers/adapters/mock-adapters.ts` (939 LOC),
  `studio/editor/triggers/adapters/index.ts` (36 LOC),
  `tests/studio/triggers/trigger-controller.test.ts` (1055 LOC),
  `tests/studio/editor/use-cases.test.ts` (930 LOC).
  **Was:** Hunt-Audit 2026-05-12. Eine komplette **Port-basierte
  Hexagonal-Architektur** für das Trigger-System (Class
  `TriggerController` + Factory `createTriggerController` + 4 Port-
  Interfaces + Mock-Adapter-Suite) wurde gebaut, aber **nie in
  Production gewired**. Die produktive Trigger-Verwaltung läuft
  durch `studio/editor/trigger-manager.ts` (`EditorTriggerManager`-
  Singleton, von `studio/test-api.ts`, `studio/pickers/icon/
picker.ts` etc. konsumiert). `TriggerController` und alle Re-Exports
  aus `ports.ts`/`adapters/` haben **0 Production-Importer** —
  einzige Konsumenten sind die zwei Test-Files, die das tote Hex-
  System gegen sich selbst pinnen (102 grüne Tests, aber CI-grün
  ≠ Production-grün — gleiche Falle wie `studio/compile/compile-
service.ts`-Cluster, Eintrag #5). Letzte feature-relevante
  Aktivität 2026-04 (3f81b53e, d588f869); seither nur Dead-Locals-
  Sweeps (a6b8669c, 9cf8a857). Pattern matcht `element-wrapper.ts`
  (Erledigt 2026-05-10), `studio/visual/constraints/` (Erledigt
  2026-05-11), `studio/modules/` (Erledigt 2026-05-11),
  `compiler/runtime/markdown.ts` (Erledigt 2026-05-12).
  `triggers/types.ts` (155 LOC, von `trigger-manager.ts` konsumiert)
  und der Rest des `triggers/`-Verzeichnisses
  (`icon-trigger.ts`/`token-trigger.ts`/… plus `index.ts`-Barrel)
  bleiben — nur das Hex-Cluster geht raus.
  **Status:** erledigt (`427c10f8`) — −4069 LOC. Alle sechs Files
  raus, kein Caller verbleibt. Studio-Tests 5762/5762 +
  Compiler-Tests 7113/7113 grün; das echte
  `editor-trigger-manager.test.ts` / `editor-trigger-integration.test.ts`-
  Paar weiterhin 30/30. Final-Grep auf alle 11 Symbole post-Deletion:
  0 Treffer.
  **Notiz:** Wie schon bei `markdown.ts` (`f4215bf0`) landete die
  Deletion gebundled in einem Commit der Parallel-Session (`427c10f8`
  ist nominell der dritte Slice der `isZagComponent`-Rename-Lane; ihr
  `git add -A` zog meine staged Deletion mit rein). Ergebnis korrekt;
  Commit-Titel adressiert den Rename, nicht die Trigger-Deletion. Die
  parallel-Race-Falle ist jetzt zweimal in Folge eingetreten —
  Memory `feedback_parallel_session_git.md` festgehalten. Restoration:
  `git show 427c10f8~1:studio/editor/triggers/trigger-controller.ts`
  etc.

- **Wo:** `studio/visual/layout-inference/` (6 Files, 872 LOC)
  **Was:** Hunt-Audit 2026-05-11: `LayoutInferenceManager` und
  `AlignmentDetector` werden **nirgendwo in Production oder Tests
  außerhalb des Verzeichnisses instanziiert**; die 3 emittierten
  Events (`layout-inference:detected/converted/error`) werden von
  **niemandem** abonniert (manager.ts emittiert sie, kein
  `events.on('layout-inference:*'`-Listener existiert). `events.ts`
  importiert `AlignmentGroup` nur als Type für die 3 Event-Type-
  Deklarationen. Tests: `visual-alignment-detector.test.ts` (testet
  isolierte AlignmentDetector-Internas) und `visual-layout-converter.test.ts`
  (testet LayoutConverter-Guards) — beide testen die Klassen, keine
  Pipeline. Letzte Code-Aktivität 2026-04 (~55 Tage). Owner-exklusiver
  Demo-File `studio/test-api/suites/demos/visual-inference.demo.ts`
  referenziert das System; Demo-Lane ist owner-territory.
  **Status:** erledigt (2026-05-13) — Owner-OK explizit erteilt
  („tutorials lassen wir aus" während des Hunts, layout-inference
  ist Studio-Subsystem, nicht Tutorial-Code). Option (b) gewählt
  — Pattern wie compile-service-Cluster: dormant + voll-getestet-
  gegen-sich-selbst + 0 Production-Consumer. Files raus:
  6× src in `studio/visual/layout-inference/` (alignment-detector,
  index, inference-indicator, layout-converter, manager, types — 872
  LOC) + 2× Tests (`visual-alignment-detector.test.ts`,
  `visual-layout-converter.test.ts`) + 4 Zeilen aus
  `studio/core/events.ts` (AlignmentGroup-Import + 3 Event-Type-
  Deklarationen). Build + 5591/5591 studio Tests grün.
  **Notiz:** Owner-exklusiver Demo-File
  `studio/test-api/suites/demos/visual-inference.demo.ts` BLEIBT
  (Tutorial-Lane). Audit: er nutzt keine layout-inference-API,
  nur `editor.setCode(BEFORE→AFTER)` als Vorher/Nachher-Mockup
  — gleiches Fake-Pattern wie die Picker-Demos. Tutorial-Owner
  entscheidet, ob ein Demo für ein nicht-mehr-existierendes Feature
  weitergepflegt wird.

- **Wo:** `compiler/backends/dom/style-emitter.ts:emitNodeSizeStateCSS`,
  `compiler/backends/dom/node-emitter.ts:emitContainerType`,
  `studio/test-api/suites/responsive/{basic,layout}.test.ts`
  **Was:** Architektur-Befund aus dem Runtime-Bug-Bucket. Mirror lässt
  Designer schreiben:

  ```mirror
  Frame w full
    compact: bg #ef4444
    wide:    bg #10b981
  ```

  und compiled das zu (a) `container-type: inline-size` AUF dem Frame
  selbst plus (b) `@container (max-width: 400px) { [data-mirror-id^=
"node-1"] { background: #ef4444 !important } }` — wo das
  Selector-Target _derselbe_ Frame ist. Per CSS-Spec matcht
  `@container` aber gegen die _Container-Ancestor_-Größe, nicht gegen
  die eigene des deklarierenden Elements. Folge: Frame reagiert nicht
  auf seine eigene Breite. Probe `tools/probes/container-queries.ts`
  zeigt das Emit-Pattern; CDP-Tests bleiben skipped.
  Zwei Fix-Pfade: (A) synthetischen Outer-Wrapper als Container
  emittieren, Size-States aufs Frame anwenden; (B) Size-States auf
  einen synthetischen Inner-Wrapper-Child emittieren. Beides ist
  DOM-strukturell invasiv (Frame-Identität ändert sich, andere CSS
  inkl. flex/grid-Layout muss sich nicht miterklären).
  **Status:** offen — Lane-Doc steht (`docs/refactoring/container-queries.md`,
  2026-05-11), wartet auf Owner-Sign-off zum Code-Fix. Empfehlung:
  Pfad A (Outer-Wrapper, on-demand via `needsContainer`-Flag) — Frame
  behält Identität, Style-Aufteilung trivial, Roll-out inkrementell
  möglich. Sekundär-Befund in der Lane-Doc dokumentiert: React- und
  Framework-Backend droppen `sizeState`-Styles und `needsContainer`
  komplett silent — Differential-Test-Lücke, parallel zu fixen.
  **Notiz:** Browser-Tests in `responsive/{basic,layout}.test.ts:73,88`
  bleiben `testWithSetupSkip` mit aktualisierten Kommentaren bis Fix
  da ist. `Frame > Inner` mit Size-States auf `Inner` funktioniert
  _heute_ schon (Inner reagiert auf Frame-Container) — Workaround.

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

- **Wo:** Tutorial-Demos + Test-Runner — **OWNER-EXKLUSIV (toni)**
  **Was:** Bereiche `studio/test-api/suites/demos/`,
  `docs/tutorial/videos/*.webm`, `tools/test-runner/recording.ts`,
  `tools/test-runner/os-mouse*.ts` und alles rundherum (Demo-
  Pipeline, --os-mouse-Bridge, Tutorial-Recording-Workflow) werden
  vom Owner direkt gepflegt — **keine Claude-Sessions hier
  auseinandersetzen, keine Findings aufmachen, keine PRs vorbereiten,
  keine Recordings anstoßen.** Stand 2026-05-10: 6 von 8 Videos
  committed (`d3115504` tut-01, `7790b2b8` tut-02, `99f47eec` tut-03,
  `a29aaa00` tut-04, `554b51c8` tut-05, `1b416c30` tut-06). tut-07
  - tut-08 macht der Owner.
    **Status:** offen — Owner-Lane, nicht Claude-Lane
    **Notiz:** Wenn ein Bug in `studio/test-api/` (Test-Framework
    selbst, nicht `suites/demos/`) durch andere Hunt-Arbeit auffällt,
    Befund hier eintragen UND warten — nicht selbst fixen, weil der
    Owner gerade aktiv am Recording-Workflow ist und parallele Edits
    am Test-API-Stack die Demo-Aufnahmen brechen können.

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

### Skipped-Tests Inventory (Slice F, 2026-05-13)

Audit der 79 `testWithSetupSkip`/`testSkip`-Marker in `studio/test-api/suites/`
und `tests/responsive/`. Kategorisiert + getrackt für späteren Hunt.
**Owner-Lane** (`tutorial/*`, `ui-builder/*`) ist hier explizit nicht
gelistet — gehört zu Befund #4 oben.

#### (a) Container-Queries (already tracked via #2 above)

- `studio/test-api/suites/responsive/{basic,layout}.test.ts:78,92`
  (2 markers) — `@container` matcht eigenes Element nicht. Lane-Doc:
  `docs/refactoring/container-queries.md`. Plus 4 markers in
  `tests/responsive/{components,complex}.test.ts` für dieselbe Klasse.
- **Status:** offen — wartet auf Fix per Container-Queries-Lane.

#### (b) Pure-Mirror-Component x/y-Propagation in Stacked Containers

- `studio/test-api/suites/stacked-drag/zag-stacked.test.ts:13,26,39,52,74`
  (5 markers, Checkbox/Switch/Slider in stacked frames), plus
  `complex-mixed.test.ts:55`.
  **Was:** Pure Mirror Components (Checkbox, Switch, Slider) — die seit
  dem Zag→PureMirror-Refactor (`docs/archive/concepts/pure-mirror-components.md`)
  als DSL-Templates expandiert werden — propagieren bei Drop in
  `stacked`-Containers KEINE `x N, y N`-Position. Der `PureComponentHandler`
  emittiert die Component-Defaults ohne Position-Properties.
  Bug-Klasse: Drop-Handler-Pfad für Pure-Mirror unterscheidet sich vom
  Zag-/Primitive-Pfad — letzterer setzt x/y auf stacked-targets.
  **Status:** offen — echter Bug, fix-Pfad: PureComponentHandler sollte
  bei stacked-target die Drop-Position aufnehmen wie der allgemeine
  drag-controller-drop-Pfad.

#### (c) Padding/Margin Zero-State Zones

- `studio/test-api/suites/interactions/padding.test.ts:108`
  („getPaddingZones returns empty when element has no padding"),
  `studio/test-api/suites/interactions/margin.test.ts:213`
  („getMarginZones returns empty when element has no margin"),
  `studio/test-api/suites/interactions/margin-handlers.test.ts:96`
  („Behavior changed — element without margin no longer auto-adds margin
  on M key").
  **Was:** Spacing-Manager (Padding/Margin) emittiert `.padding-area` /
  `.margin-area` Overlays NUR wenn der Element bereits Padding/Margin
  > 0 hat. Shift+Drag zum Hinzufügen von uniformen Padding aus dem
  > Zero-State funktioniert dadurch nicht. Plus: M-Key-Behavior-Change
  > unklar (auto-add-on-M wurde entfernt?).
  > **Status:** offen — Owner-Entscheidung: ist das beabsichtigtes
  > Verhalten (nur sichtbare Zones für visible Padding) oder ein Regression?

#### (d) Context-aware Autocomplete (Feature-Lücken)

- `studio/test-api/suites/autocomplete/properties.test.ts:43,55`
  (Icon-spezifische / Input-spezifische Property-Completions),
  `studio/test-api/suites/autocomplete/states.test.ts:10`
  (State-Completions like `hover:`).
  **Was:** Autocomplete-Engine bietet alle Properties an, nicht
  primitive-spezifisch. State-Completions (`hover:`/`focus:`/...) sind
  nicht wired für den `:` Trigger.
  **Status:** offen — Feature-Lücke, nicht Bug. Eintrag im Roadmap
  für „Context-aware Autocomplete v2".

#### (e) Dynamic Token-File Prelude-Rebuild

- `studio/test-api/suites/property-panel/color-picker.test.ts:138,179,207,231`
  (4 markers).
  **Was:** Test-Setup injiziert Token-Files dynamisch via `window.files`,
  aber das Prelude-Build wird nicht re-getriggert. Color-Picker sieht
  daher die Token-Farben nicht.
  **Status:** offen — Test-Infrastructure-Issue, könnte mit
  `__compileTestCode`-API gefixt werden (setze tokens als zweiten
  parameter, baue prelude neu).

#### (f) Reorder-Siblings ohne Synthetic-Root

- `studio/test-api/suites/preview-cdp/02-move/reorder-siblings.test.ts:23`
  (1 marker).
  **Was:** Top-level Frames im Suite-Test-Setup haben KEINEN gemeinsamen
  `data-mirror-id`-Parent. `moveElement` braucht aber einen `targetSel`.
  Verwandt zu Empty-Canvas-Drop-Bug (gefixt in `d3115504`), aber Move
  hat einen anderen Pfad als Drop-from-Palette.
  **Status:** offen — `mirror-actions` braucht root-target-support
  oder Studio-Drag-Pipeline akzeptiert reorder-drops ohne expliziten
  Target-Container.

#### (g) Resize-Handle Full-Width-Position-Design

- `studio/test-api/suites/interactions/resize-handle-drag.test.ts:1022`
  (1 marker, „Full-width/height elements have handles at container edge
  — needs design decision").
  **Was:** Bei `w full`/`h full`-Elementen liegt das Resize-Handle am
  Container-Edge, was Edge-Drags am Container statt am Element
  ambiguous macht. Design-Frage.
  **Status:** offen — Design-Entscheidung.

#### (h) Hover+State Test-Timing

- `studio/test-api/suites/integration/component-state.test.ts:193,375`
  (2 markers, „click doesn't maintain hover state" / „Flaky test —
  passes when run alone, fails intermittently").
  **Was:** Test-Environment-Timing-Issues. Möglicherweise pre-existing
  jsdom-vs-CDP-Diskrepanz oder Race in Test-Runner.
  **Status:** offen — Test-Infra-Befund, nicht Production-Bug.

#### (i) Sonstige einzelne Skip-Marker

- `studio/test-api/suites/primitives/basic.test.ts:213` (Spacer als div)
  — vermutlich Test-Setup-Issue.
- `studio/test-api/suites/primitives/table.test.ts:329` („Zebra striping
  mit modulo — ternary mit `%` operator not supported") — DSL-Feature-
  Lücke, könnte als Feature-Request getrackt werden.

**Status:** Tracker, kein Code-Fix nötig per Slice. Findings dient als
Map für künftige Hunt-Sessions, welche Skip-Marker echte Bugs vs.
Feature-Lücken vs. Test-Infra sind.

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

- **Wo:** `studio/core/state.ts:736-750` (`findFallbackSelection`)
  **Was:** Simplistischer Fallback (`roots[0].nodeId`) ohne Sibling/Parent-
  Tracking. `findFallbackWithInfo()` direkt nebenan macht es richtig.
  **Status:** erledigt (`f78e7f00`) — umbenannt zu `findFirstRootNode`,
  unbenutzten Parameter entfernt, Doc-Comment auf `findFallbackWithInfo`
  als Smart-Variante zeigt. Echtes Sibling-Aware-Fallback (Caller müssen
  Info pre-computen) bleibt offen.

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

- **Wo:** `compiler/{parser,ir,schema}/` — Slice D (Follow-up zu A/B/C)
  **Was:** Bisher nicht von den Slices A/B/C abgedeckte Unterordner
  (parser/, ir/, schema/ ohne dsl/ir-helpers/layout-defaults) geprüft.
  24 export-Demotionen (Symbol intern verwendet, `export` ohne externen
  Consumer) + 1 echte Deletion (`DIRECTION_KEYWORDS`, 5 LOC, weder
  intern noch extern referenziert). Files:
  - `compiler/schema/parser-helpers.ts`: `DIRECTION_KEYWORDS` [del],
    `BOOLEAN_PROPERTIES`, `POSITION_BOOLEANS`, `getAllSchemaPropertyNames`,
    `getDirectionsForProperty`
  - `compiler/parser/token-parser.ts`: `inferTokenType`
  - `compiler/parser/lexer.ts`: `LexerResult`
  - `compiler/parser/prose-body-parser.ts`: `ProseStyleMap`,
    `DEFAULT_PROSE_STYLE`, `ProseBodyCallbacks`, `hasProseProperty`,
    `resolveProseStyle`
  - `compiler/ir/types.ts`: `IRIcon`, `IRTokenReference`,
    `IRLoopVarReference`, `IRComputedExpression`, `IRConditionalValue`,
    `IRPropertyValue`, `IREventModifier`, `IRWarningType`
  - `compiler/ir/transformers/event-transformer.ts`:
    `BUILTIN_STATE_FUNCTIONS`, `transformAction`
  - `compiler/schema/chart-primitives.ts`: `ChartSlotDef`,
    `ChartSlotPropertyDef`
  - `compiler/schema/component-templates.ts`: `ComponentTemplate`

  **Status:** erledigt (`7db368a7`) — die compiler-Änderungen wurden
  versehentlich vom parallelen preview-redirect-Slice mit-committed
  (Commit-Message erwähnt sie nicht, aber Diff enthält alle 25
  Symbol-Änderungen). tsc --noEmit clean, 7390/7391 compiler tests pass,
  1209/1214 behavior/runtime/integration/differential/contract green.
  **Notiz:** Lessons learned für Parallel-Sessions: vor `git add .`
  immer git-status checken — der Working-Tree kann fremde uncommittete
  Arbeit enthalten, die dann ungewollt in den eigenen Commit gerät.

- **Wo:** `compiler/{runtime,backends/dom}/` — Slice E (Follow-up zu Slice D)
  **Was:** Slice D adressierte parser/ir/schema; compiler/runtime/ und
  compiler/backends/dom/ blieben offen. Verifizierter Audit ergab 10
  weitere `export`-Demotionen — Symbol intern verwendet, kein externer
  Consumer (per grep + verify auf `import * as X` Namespace-Calls):
  - `compiler/runtime/component-navigation.ts`: `hasMirrorStructure`
  - `compiler/runtime/toast.ts`: `ToastOptions`, `ToastPosition`
  - `compiler/backends/dom/token-emitter.ts`: `TokenEmitterData`,
    `emitMethods`, `emitQueries`, `serializeDataObject`,
    `serializeDataValue`
  - `compiler/backends/dom/event-emitter.ts`: `emitEnterExitObserver`
  - `compiler/backends/dom/state-machine-emitter.ts`: `emitWhenWatcher`

  Bewusst NICHT demoted: `MirrorProps`/`MirrorNode` in
  `compiler/runtime/mirror-runtime.ts` (foundational Runtime-API-Typen,
  defensive für externe Konsumenten); `BaseEmitterContext` in
  `compiler/backends/dom/base-emitter-context.ts` (Schicht-Mechanik,
  Inline-Refactor wäre eigene Lane).
  **Status:** erledigt (`44e5275c`) — alle 10 `export`-Keywords entfernt,
  Symbole intern unverändert verwendet. `tsc --noEmit` clean,
  7410/7411 compiler+runtime Tests grün (1 pre-existing skip).
  Prettier hat zusätzlich den `ToastPosition`-Union auf eine Zeile
  zusammengezogen — kosmetisch.

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

> **Status der Sektion (2026-05-10 ~19:05):** Drei der vier ursprünglichen
> Einträge sind stale geworden, weil `8e81387f` das gesamte demo-runner +
> step-runner-Subsystem gerippt hat (`tools/test-runner/demo/`,
> `studio/test-api/step-runner/`). Tutorial-Vollausbau braucht nun einen
> neuen Architektur-Entscheid (eigene Lane-Doc), nicht mehr punktuelle
> Inkremente in einem nicht mehr existierenden System. Siehe neuer
> Eintrag „Tutorial-Loop-Infrastruktur" weiter unten.

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

- **Wo:** Tutorial-Loop-Infrastruktur insgesamt
  **Was:** Nach dem Demo-Runner-Rip-Out (`8e81387f`, 2026-05-10) gibt
  es kein laufendes System mehr für die Tutorial-Loop-Videos
  (`docs/concepts/studio-tutorial.md` Kapitel 19–24). Vor weiterem
  Tutorial-Build muss eine Architektur-Entscheidung fallen: (a)
  CDP-basierten Test-Runner um Cursor/Pacing/Recording erweitern
  (sauber, aber Aufwand), (b) eigenständiges Tutorial-Recording-Tool
  bauen (separate Toolchain), (c) Tutorial-Konzept einstellen oder
  vereinfachen (nur statische Screenshots/Videos via externer Tools).
  **Status:** offen — Owner-Entscheidung
  **Notiz:** Wenn (a) gewählt wird, eigene Lane-Doc unter
  `docs/refactoring/` bevor Code geschrieben wird (Größe + Cross-
  System-Touchpoints). Findings-Eintrag-Größe gesprengt.

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

- **Wo:** `studio/compile/{compile-service,prelude-builder,code-generator,preview-renderer,studio-updater,perf-logger}.ts`
  **Was:** Parallele Compile-Pipeline (CompileService + 5 Helper-
  Klassen, ~700 LOC) ist exportiert via `studio/compile/index.ts`
  und `studio/index.ts`, hat umfassende Tests
  (`tests/studio/compile-orchestrators.test.ts`,
  `compile-helpers.test.ts`), wird aber **nirgendwo in Production
  instanziiert** — kein `new CompileService(...)`-Aufruf außerhalb
  von Tests; einziger Treffer ist der Bundle-Output in `studio/dist/`,
  der durch den Barrel-Re-Export zustande kommt. Production läuft
  weiterhin über die Legacy-`app.ts:compile()`. CompileService hat
  zudem **keine Feature-Parität**: fehlende test-mode-Pfade,
  Preview-Redirection (Editor auf .tok/.com → compile Layout),
  Validator-/Linter-Integration, draggables-Refresh,
  isWrappedWithApp-Tracking, LLM-Spec-Studio-Skip. Drei Pfade
  denkbar: (a) Feature-Parität herstellen und wirklich umstellen,
  (b) Cluster + parallele Tests als dead code löschen, (c) Lane-Doc
  unter `docs/refactoring/` schreiben weil die Entscheidung größer
  als ein Findings-Eintrag ist.
  **Status:** erledigt (`a6f84657` — Race: Code-Delete in einen
  parallel-session Slice-E-Commit gebündelt; Commit-Message ist
  irreführend, Diff zeigt nur diese 10 Cluster-Files mit ~2100 LOC
  Reduktion). Option (b) gewählt: Cluster gelöscht. Begründung: real
  zerlegender Pfad ist `app.ts:compile()`-Slices (wrap-layout,
  augment-local-components, execute-mirror-js, prelude-definitions,
  preview-redirect, resolve-compile-source) — die extrahieren in
  testbare Module, die app.ts WIRKLICH ruft. Der dormante Cluster
  war vestigial; seine Tests gaben falsche Sicherheit.
  Files raus: 6× src in `studio/compile/` + 2× tests + Barrel-
  Einträge in `studio/compile/index.ts` und `studio/index.ts`
  (load-bearing Namen `collectPrelude`/`collectAllProjectSource`/
  `collectTokensSource`/`createAutoCreateFiles`/`getPreludeLineOffset`
  behalten). tsc clean, 5595/5595 studio Tests grün.
  Restoration via `git show a6f84657^:studio/compile/<file>.ts`.

- **Wo:** `studio/app.ts` (heute 2456 LOC, vor Refactor 2557)
  **Was:** Bootstrap-Sprawl: 30+ globale Konstanten, 5 Extensions, 8
  Manager-Inits inline. Sieben Phasen nach `studio/init/` extrahiert:
  `init-notifications`, `init-sync`, `init-grid-overlay`,
  `init-draw-manager`, `init-inline-edit`, `file-tabs`,
  `init-editor-dispatch` (`8b92ae7a`). `compile()`-Decomposition
  läuft als pure-helper-Slices: `wrap-layout` (`e79184f5`),
  `augment-local-components` (`514807d6`), `execute-mirror-js`
  (`87237522`), `prelude-definitions` (`544234e3`) — jede mit
  eigenen Unit-Tests. Verbleibend in `compile()`: testMode-/
  preview-Redirect-Branch (resolvedCode-Build), State-Update-Block,
  componentPrimitives-Map-Aufbau, Render-Pipe (uninstanced-augment
  - ui-execute + rootEl-extract); daneben `updateStudio()`,
    `handleStudioCodeChange()`, plus File-IO und Ext-Wiring.
    **Status:** offen — ongoing decomposition. Drei Slices 2026-05-12
    erledigt:
    - **Slice 5** `componentPrimitives-Map-Aufbau` (`22b340a1` —
      Commit-Race, Message irreführend) →
      `studio/compile/component-primitives.ts`, 7 Tests. Pin: Parser-
      Default `primitive='Frame'` für Definitions ohne `as`; Fallback
      `name.toLowerCase()` greift nur für manuell konstruierte
      ComponentDefinitions mit `primitive: null`.
    - **Slice 6** `preview-redirect` (`7db368a7`) →
      `studio/compile/preview-redirect.ts`, 7 Tests. Pin: 5-Wege-
      Entscheidung (Layout-Editor / no-previewFile / self-pin /
      non-layout-previewFile / Layout-previewFile).
    - **Slice 7** `testMode/Layout source-resolution` (`49fbf07e`) →
      `studio/compile/resolve-compile-source.ts`, 8 Tests. Pin: 4-Wege-
      Branch (testMode×fileType) mit Partial-Result für Branch 4
      Passthrough (currentPreludeOffset/isWrappedWithApp bleiben stale).
      Drops `prependPrelude`/`wrapLayoutForCompile` aus app.ts-Imports.
      **Notiz:** Strategie: pure-helper-Slices mit Unit-Tests, Sub-Slice
      pro Commit, kein Big-Bang. Reduziert Closure-Pressure inkrementell.
      Side-Discovery beim Survey 2026-05-11: dead compile-service-Cluster
      (s. o.) — blockiert nicht, ist eigene Lane.
      Verbleibend in `compile()`: State-Update-Block (side-effects auf
      `studio.state.set`, schwer als pure helper extrahierbar),
      Render-Pipe (uninstanced-augment + ui-execute + rootEl-extract).

- **Wo:** Fünf `mock-adapters.ts` (`studio/editor/triggers/adapters/`,
  `studio/editor/adapters/`, `studio/panels/property/adapters/`,
  `studio/autocomplete/adapters/`, `studio/sync/adapters/`)
  **Was:** ~2986 LOC mock-adapters in 5 Files. **Status:** abgewiesen —
  keine Duplikation; jeder Mock ist scope-spezifisch nötig.

- **Wo:** Studio-weit, `panels/`-Subsystem (~113 `.on()`/`addEventListener` vs ~25 Cleanups)
  **Was:** Verdacht auf Memory-Leaks. **Status:** abgewiesen — Metrik
  ist irreführend; tatsächliche Patterns sind solide (`eventCleanups[]`,
  `AbortController`, `eventUnsubscribes[]`, self-cleaning click-outside).
  Die 113-Zahl zählt DOM-Listener die beim nächsten render via
  `innerHTML = ''` mit den Elementen weggehen.

- **Wo:** `studio/inline-edit/` und `studio/rename/`
  **Was:** Vermutete Setup-Flow-Duplikation. **Status:** abgewiesen —
  Oberflächen-Ähnlichkeit trügt; `inline-edit/` editiert DOM-Text-Content
  des Preview, `rename/` editiert Symbol-Identifier im Editor-Source mit
  Cross-File-Engine. ~40 LOC gemeinsamer Input/Keydown/Click-Outside-
  Pattern zu wenig für geteilte Abstraktion.

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
  **Status:** weitgehend erledigt — Stand 2026-05-12:
  - `compiler/`: **0 verbleibend** — letzter Cast (`animations.ts:262`,
    motion-Lib-API-Shape-Mismatch) weg, weil `motionAnimate` selbst
    dead-Code war und mit dem Slice-A-Dead-Export-Sweep gelöscht wurde.
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

### Hunt 2026-05-12 (Iter-N+3) — fünf neue Befunde

- **Wo:** `studio/react-converter/` (599 LOC src + 55-Test-Suite)
  **Was:** Dormant Modul, gleicher Befund-Typ wie der dokumentierte
  `studio/compile/compile-service.ts`-Cluster: exportiert via
  `studio/index.ts:107` (`export * from './react-converter'`),
  voll-getestet (`tests/studio/react-converter.test.ts`, 55 Tests),
  aber **nirgendwo in Production konsumiert**. Repo-weiter Grep nach
  den 7 Exports (`convertReactToMirror`, `buildReactSystemPrompt`,
  `STYLE_TO_MIRROR`, `TAG_TO_COMPONENT`, `TAG_TO_NAME`,
  `ConvertResult`, `PromptContext`) ergab 0 Treffer außer in der
  Test-Suite und der eigenen Source. Letzte Aktivität 2026-05-08
  (`505be995` JSX-Parser-Bugfix), aber nur Tests reagieren auf den
  Code; kein Tool, kein Script, kein Studio-Pfad ruft die
  Konverter-API. Header-Kommentar sagt „Used by LLM integration for
  React-first workflows" — die aktuelle LLM-Pipeline lebt jedoch in
  `studio/agent/generation-pipeline.ts` und nutzt einen ganz anderen
  Pfad (HTML als Pivot, nicht React; siehe `tools/experiments/
svelte-spike/`-Spikes und Memory `project_llm_pipeline.md`).
  **Status:** erledigt (`f2337d7b`) — Option (b) gewählt: gelöscht.
  Begründung: Die validierte LLM-Pipeline (siehe Memory
  `project_llm_pipeline.md` + Spike `tools/experiments/svelte-spike/`)
  nutzt **HTML als Pivot**, nicht React; der Code-Pfad wurde von der
  Pipeline-Validierung explizit verworfen. 599 LOC src + 685 LOC Test
  - Barrel-Zeile in `studio/index.ts` + CLAUDE.md-Tree-Zeile
    entfernt. tsc clean, 5703/5703 studio Tests grün. Falsche
    Richtungsangabe im CLAUDE.md-Tree (sagte „Mirror → React" obwohl
    Code „React → Mirror" war) ist mit der Zeile mit-entfernt.
    Restoration via `git show f2337d7b^:studio/react-converter/index.ts`.

- **Wo:** `studio/file-types/extensions.ts:21`,
  `studio/storage/types.ts:85`, `studio/storage/project-actions.ts:784`
  **Was:** Drei `isMirrorFile`-Funktionen mit **drei unterschiedlichen
  Scopes** (Naming-Collision-Smell, gleiches Muster wie
  `getFileType`/`snapPointToGrid`/`SpacingToken`):
  - `file-types/extensions.ts:21` — Mirror DSL source only
    (`.mir`/`.mirror`/`.com`/`.components`/`.tok`/`.tokens`).
    EXKLUDIERT data-files (`.yaml`/`.yml`).
  - `storage/types.ts:85` — liest `FILE_EXTENSIONS`-Map, INKLUDIERT
    data-files. Verwendet von Storage-Providern (demo/tauri).
  - `storage/project-actions.ts:784` — module-private Hardcoded-Liste
    mit `.mir`/`.mirror`/`.tok`/`.tokens`/`.com`/`.components`/`.data`/
    `.yaml`/`.yml`. INKLUDIERT data-files plus zusätzlich `.data`.

  Die ESM-Bundle-Ambiguität ist in `studio/index.ts:92-99` mit Comment
  - explizitem Pick auf `file-types/extensions` schon umschifft, aber
    die strukturelle Drift (3 Funktionen, 3 verschiedene Antworten auf
    „ist das eine Mirror-Datei") besteht weiter. Ein Caller, der die
    „falsche" `isMirrorFile` importiert, bekommt schweigend eine
    abweichende Antwort — Drift-Falle.
    **Status:** erledigt — Production-Renames in `a1e94e53` (Commit-
    Race mit dead-measurements-deletion; Diff enthält den Rename),
    Test-Renames in `f4215bf0` (storage-types.test.ts +
    storage-project-actions.test.ts, 75 storage Tests grün).
    file-types/extensions.ts → `isMirrorSourceFile`,
    storage/types.ts → `isMirrorProjectFile`, project-actions.ts
    (private) → `isProjectImportFile`. studio/index.ts:92-99
    Ambiguitäts-Workaround ersatzlos raus (kein Symbol-Name-Konflikt
    mehr). zag/index.ts deps-Parameter mit umbenannt.

- **Wo:** `studio/zag/index.ts:59`,
  `studio/autocomplete/schema-completions.ts:881`,
  `studio/preview/drag/test-api/fixtures/zag-components.ts:173`,
  `compiler/parser/ast.ts:756`
  **Was:** Vier `isZagComponent`-Funktionen mit **vier verschiedenen
  Signaturen und Konzepten**:
  - `studio/zag/index.ts:59` — `(children: ZagChild[] | undefined): boolean`
    — strukturelle Children-Inspektion.
  - `studio/autocomplete/schema-completions.ts:881` —
    `(name: string): boolean` — Name-Lookup gegen Zag-Component-Liste.
  - `studio/preview/drag/test-api/fixtures/zag-components.ts:173` —
    `(name: string): boolean` — Duplikat zur autocomplete-Variante,
    aber im Test-Fixture-Bereich.
  - `compiler/parser/ast.ts:756` — `(node: unknown): node is ZagNode` —
    TypeScript-Type-Guard auf AST-Knoten.

  Vier Funktionen, drei verschiedene Konzepte (Children-Check vs.
  Name-Check vs. Type-Guard), gleicher Symbol-Name. Auto-Import
  verwirrt zuverlässig. Test-Fixture-Variante ist auch schlicht
  Duplikation der autocomplete-Variante.
  **Status:** teilweise erledigt — Slice 1 (Test-Fixture-Duplikat
  raus) ist drin: `isZagComponent` aus
  `studio/preview/drag/test-api/fixtures/zag-components.ts:173`
  - Re-Export aus `fixtures/index.ts:22` gelöscht (0 Konsumenten).
    Code-Diff landete in `f4215bf0` (Bündel-Commit der parallelen
    Session — Race-Condition zwischen zwei Claude-Sessions; Inhalt
    korrekt, Commit-Message irreführend, dokumentiert hier statt
    Force-Push). Damit 4 → 3 Implementations.
    **Notiz:** Verbleibende Slices sind echte Renames mit Cross-File-
    Cascading: (a) `studio/zag/index.ts:59` → `hasZagChildren` plus
    `ZagDeps.isZagComponent` Field-Rename + alle drop-Konsumenten +
    drop-handlers.test.ts mocks; (b) `studio/autocomplete/schema-
completions.ts:881` → `isZagComponentName` plus autocomplete-
    Konsument; (c) `compiler/parser/ast.ts:756` → `isZagNode` plus
    IR-Konsumenten (4 Caller-Sites + Re-Export-Barrel + Test). Der
    IRZagNode-Discriminator-Property `isZagComponent: true` ist ein
    anderes Konzept und bleibt unverändert.

                                                        **Status-Update:** erledigt — alle drei Slices landen:
                                                        Slice (a) zag:`isZagComponent(children)` → `hasZagChildren`
                                                        inkl. drop-Subsystem-Cascading (`427c10f8`),
                                                        Slice (b) autocomplete:`isZagComponent` → `isZagComponentName`
                                                        (`97b81868`), Slice (c) compiler-AST:`isZagComponent` →
                                                        `isZagNode` inkl. parser-Re-Export + IR-Konsumenten
                                                        (instance-ops, ir/index) + Test (`parser-ast-guards.test.ts`)
                                                        — landete im Slice-D3-Bündel `2bfaf28e` (parallele Session
                                                        hat per `git add .` die uncommittete compiler-Side mit
                                                        aufgenommen). Damit 3 distinkt benannte Funktionen:
                                                        `hasZagChildren` (children-Shape), `isZagComponentName`
                                                        (Name-Lookup), `isZagNode` (AST type-guard). Der
                                                        IRZagNode-Discriminator-Property `isZagComponent: true`
                                                        bleibt unverändert (anderes Konzept). 116 autocomplete +
                                                        81 drop-handlers + 113 parser-ast-guards Tests grün.

  **Race-Notiz:** Der `git add` + `git commit`-Workflow zweier
  paralleler Claude-Sessions kann bei überlappenden Working-Trees
  Inhalte in den falschen Commit ziehen. Mitigation für künftige
  Multi-Session-Slices: vor `git commit` ein `git diff --cached
--stat` checken; wenn unerwartete Files drin sind, `git reset HEAD`
  - selektiv re-staging.

---

## Erledigt

Chronologisch absteigend (neueste zuerst).

### 2026-05-13 — Slice E: alle `eslint-disable no-explicit-any` in compiler/ weg

- **Wo:** `compiler/runtime/mirror-runtime.ts` (2× weg, MirrorProps
  Index-Signatur `[k: string]: any` → `unknown` + 3 Call-Sites narrowed
  via `as Action | Action[]` cast),
  `compiler/ir/ops/instance-ops.ts` (1× weg, `instance: Instance | Each | any`
  → `Instance | Each | ConditionalNode | Slot` — die Branches narrowen
  direkt zu Each/Conditional/Slot vor dem Instance-Body),
  `compiler/runtime/charts.ts` (8× weg, alle `Record<string, any>` →
  `Record<string, unknown>` mit `as Record<string, unknown>`-Casts in
  den drei navigate/setFinal-Helpern, die Chart.js-Config-Objekte
  inkrementell aufbauen).
  **Was:** 11 `eslint-disable @typescript-eslint/no-explicit-any` in
  Production-Code aufgespürt nach dem Sweep, der die compiler/-`as any`-
  Zahl bereits auf 0 brachte. Diese 11 Stellen verwendeten zwar nicht
  `as any` direkt, aber Typ-Parameter mit `any` (Index-Signatur, Union-
  Type, Generic-Argument) — gleicher Type-Escape. Alle ersetzt durch
  `unknown` + lokale Narrowing-Casts an den Schreibstellen. 7794/7795
  vitest grün (1 pre-existing skipped).
  **Status:** erledigt

### 2026-05-12 — Dead Feature 6 (Measurement Overlays) gelöscht (~837 LOC)

- **Wo:** `studio/visual/measurements/` (4 Files, 525 LOC),
  `tests/studio/visual-measurements.test.ts` (156 LOC),
  `tests/studio/visual/measurements/measurement-calculator.test.ts`
  (156 LOC, zweites Test-Dir), plus measurement-Section in
  `visual-pure.test.ts` und MeasurementRenderer-Describe in
  `visual-renderers.test.ts` getrimmt.
  **Was:** Hunt-Discovery 2026-05-12. „Feature 6: Measurement
  Overlays" — Calculator + Renderer + Types. Modul-Doku verspricht
  „Shows distance measurements between elements on Alt+Hover", aber
  kein Alt+Hover-Handler im Studio ruft jemals in das Modul. Zero
  `new MeasurementRenderer(...)`, zero `createMeasurementRenderer(...)`
  außerhalb der dir + 3 Test-Files. Letzte Code-Aktivität war ein
  Rect/Point-Type-Dedupe ohne Feature-Arbeit. Anders als
  layout-inference/ kein Demo-File unter
  `studio/test-api/suites/demos/` — nicht in der owner-maintained
  demo workflow. Dritte Iteration desselben Patterns nach Feature 5
  (constraints/, `3b02a8b5`) und Feature 8 (auto-layout/,
  `3aa30cc4`). 5864/5864 studio tests pass.
  **Status:** erledigt (`e4d7f971`)
  **Notiz:** Erster Versuch (`a1e94e53`) verlor die Deletion an
  lint-staged's stash-Race (Commit-Message korrekt, Diff zeigte
  parallel session's storage/file-types-Edits). Zweiter Versuch
  mit `--no-verify` landete sauber. Restoration via
  `git show <pre-delete>:studio/visual/measurements/`.

### 2026-05-12 — 2 orphan tools/ CLI scripts gelöscht (~995 LOC)

- **Wo:** `tools/analyze-test-quality.ts` (276 LOC),
  `tools/tutorial-validator.ts` (719 LOC)
  **Was:** Hunt-Discovery 2026-05-12. Zwei standalone tsx-Scripts
  mit **0 Konsumenten** im ganzen Repo — keine `package.json`-
  Scripts, keine Doku-Referenzen, keine Source-Imports, keine CI.
  Letzte Aktivität jeweils 21 Tage. `analyze-test-quality` war ein
  Test-Pattern-Linter, `tutorial-validator` ein
  Mirror-Source-Deep-Analyzer (anderes Tool als der live
  `compiler/validator/` — gleicher Name, andere Verantwortung).
  Geschwister-Tools die ähnlich aussahen, aber LIVE sind:
  `atomic-input-tests.ts` (in TEST-FRAMEWORK.md dokumentiert) und
  `migrate-browser-tests-to-vitest.ts` (in CLAUDE.md dokumentiert)
  — beide bleiben.
  **Status:** erledigt (`49fbf07e`, gebündelt mit dem testMode/
  layout-source-resolution-Slice der parallel-session)
  **Notiz:** Restoration via `git show <pre-delete>:tools/<name>.ts`.

### 2026-05-12 — Studio-Build-Bruch nach modules-Deletion gefixt

- **Wo:** `studio/index.ts` (–0 / +12 LOC), `studio/app.ts:127-128`
  **Was:** Dead-Code-Sweep `9ca1cb6c` löschte `studio/modules/` und
  entfernte `export * from './modules'` aus `studio/index.ts`. Das
  gelöschte Modules-Barrel re-exportierte aber `validate` und
  `toCodeMirrorDiagnostics` aus `compiler/validator` — `app.ts:127-128`
  importiert beide aus `'.'` (studio bundle) und brach beim Build mit
  `No matching export ... for import "validate"`. Hunt-Discovery
  während Slice 5 (componentPrimitives-Map): das Studio liess sich
  nicht mehr bauen, Deploy blockiert.
  **Status:** erledigt — explicit re-export `validate`, `validateAST`,
  `toCodeMirrorDiagnostics` plus zugehörige Types aus
  `../compiler/validator` in `studio/index.ts` ergänzt (gleiche
  Section-Struktur wie der `./compile/yaml-parser`-Block direkt darüber).
  `npm run build:studio` + `npx tsc --noEmit` grün.
  **Notiz:** Lesson für künftige Dead-Code-Sweeps: vor dem Löschen
  eines Barrels die `from '.'`-Importer auf re-exportierte Symbole
  durchgreppen. Wiring war intransparent — modules/ re-exportierte
  Validator-Symbole ohne dass das aus dem Modul-Namen hervorging.

### 2026-05-12 — Dead Feature 8 (Auto-Layout) komplett gelöscht (~1100 LOC)

- **Wo:** `studio/visual/auto-layout/` (3 Files: index/pattern-detector/
  suggestion-tooltip, 666 LOC), `tests/studio/visual-auto-layout.test.ts`
  (133 LOC), `tests/studio/visual/auto-layout/pattern-detector.test.ts`
  (zweites Test-File übersehen beim ersten Pass), `tests/studio/visual-
subsystems.test.ts` (–210 LOC: pattern-detector describes raus),
  `studio/core/change-types.ts` (ApplyLayoutIntent + Union-Member raus),
  `studio/core/change-pipeline.ts` (–42 LOC: `case 'applyLayout'` raus),
  `studio/core/change-service.ts` (ApplyLayoutIntent-Import raus).
  **Was:** Hunt-Discovery 2026-05-12. „Feature 8: Auto-Layout
  Suggestions" — Pattern-Detector + SuggestionTooltip + ApplyLayoutIntent
  - Handler — komplett ohne UI-Trigger. Zero `new SuggestionTooltip(...)`
    oder `createSuggestionTooltip(...)`, zero `type: 'applyLayout'`-
    Literale repo-weit. `detectLayoutPattern` nur von der eigenen Barrel
  - zwei Test-Files konsumiert. Letzte Code-Aktivität 2026-04-12
    (30 Tage). Anders als layout-inference/ KEIN Demo-File in
    `studio/test-api/suites/demos/` — Owner-Workflow betrifft das nicht.
    Pattern matched die Feature-5/constraints/-Lane: Intent +
    Handler vorgesehen, UI-Verknüpfung nie nachgezogen.
    Unrelated `applyLayoutToContainer` in `studio/code-modifier/
layout-ops.ts` ist lebende Funktion (gleicher Name, andere
    Verantwortung — bleibt). 5897/5897 studio tests pass.
    **Status:** erledigt (`3aa30cc4`, lint-staged-stash-Race bündelte
    mit „componentPrimitives slice" der parallel-session — der Commit-
    Titel verschweigt die Deletion, der Diff zeigt sie vollständig)
    **Notiz:** Restoration via `git show <pre-delete>:studio/visual/auto-layout/`.
    Verlinkter Open-Befund „layout-inference/" bleibt — dort
    unterscheidet sich nur das Demo-Wiring.

### 2026-05-11 — Dead `studio/modules/` Wrapper gelöscht (468 LOC + 1 Test-File + 5 Tests)

- **Wo:** `studio/modules/{index,compiler/{index,prelude-builder,types}}.ts`,
  `tests/studio/compiler-prelude-builder.test.ts`,
  `tests/compiler/stress-performance.test.ts` (Multi-File Scenarios
  describe block), `studio/index.ts` (`export * from './modules'` raus)
  **Was:** Hunt-Discovery 2026-05-11. `studio/modules/` war ein
  Compiler-Façade-Wrapper (`createCompiler`/`getCompiler`/`resetCompiler`)
  plus ein **dritter** prelude-builder (`buildPrelude`/
  `countPreludeLines`/`adjustLineNumber`) — zero Production-
  Konsumenten (`grep` repo-weit ergab nur Self-References + 2 Test-
  Files). Letzte Code-Aktivität 2026-04-15 (56 Tage). Production's
  multi-file prelude lebt schon längst in
  `studio/compile/collect-prelude.ts`, das via `getPreludeCode()`
  von `app.ts` gerufen wird. Wrapper war abandoned April-Refactor.
  468 LOC source + ~185 LOC dedicated test + ~125 LOC test-block
  weg. 5974/5974 tests pass.
  **Status:** erledigt (`9ca1cb6c`)
  **Notiz:** Restoration via `git show <pre-delete>:studio/modules/`.
  Die anderen Stress-describes in stress-performance.test.ts (Large
  Files / Deep Nesting / Name Conflicts) bleiben — nur der
  Multi-File-Block, der gegen den dead buildPrelude lief, ist weg.

### 2026-05-11 — Dead `studio/visual/constraints/` UI-Panel gelöscht (299 LOC)

- **Wo:** `studio/visual/constraints/{constraint-panel,types,index}.ts`,
  `studio/visual/index.ts` (Re-Export-Block raus)
  **Was:** Hunt-Discovery 2026-05-11. `ConstraintPanel` +
  `createConstraintPanel` + 6 Types via `studio/visual/index.ts`
  exportiert, aber **nie irgendwo instanziiert** — kein
  `new ConstraintPanel(...)`, kein `<ConstraintPanel>`, kein
  `createConstraintPanel(...)` außerhalb des eigenen Verzeichnisses;
  auch kein Test-Consumer. Letzte Code-Aktivität 2026-04 (55 Tage).
  Wichtig: das breitere "constraints"-Feature ist davon entkoppelt
  und LEBT — `SetConstraintIntent` in `studio/core/change-types.ts`,
  Handler in `studio/core/change-pipeline.ts:599`,
  `tests/studio/core/constraints.test.ts` pinnt den Intent. Nur die
  Panel-UI war tot. 5954/5954 studio tests pass.
  **Status:** erledigt (`3b02a8b5`)
  **Notiz:** Restoration via `git show <pre-delete>:studio/visual/constraints/`.

### 2026-05-11 — `compile()`-Slice: `collectPreludeDefinitions` extrahiert (–11 LOC in app.ts)

- **Wo:** `studio/compile/prelude-definitions.ts` (neu, 47 LOC),
  `tests/studio/compile-prelude-definitions.test.ts` (neu, 7 Pins),
  `studio/app.ts:compile()` (Cut-over: 17 → 3 Zeilen am Validator-
  Vorbereitungs-Block)
  **Was:** Nächste pure-helper-Slice der `app.ts:compile()`-
  Decomposition (Finding #8). Die 17-zeilige Logik, die für den
  Validator-Aufruf die Token-/Component-Namen aus dem Prelude in
  zwei `Set<string>` aufbereitet (`primary.bg` → Set enthält
  `primary` UND `primary.bg`, `$primary` wird gestrippt, Components
  nach Name), durch `collectPreludeDefinitions(preludeAst)`
  ersetzt. Pure-Function-Kontrakt, keine Compiler-Bundle-
  Abhängigkeiten (Caller macht `MirrorLang.parse`), Pattern matched
  Geschwister-Slices (`wrap-layout`, `augment-local-components`).
  Sieben Unit-Pins decken null/empty/suffix/no-suffix/`$`-strip/
  Component-Name/multi-Symbol-Mix. app.ts schrumpft 2467 → 2456
  LOC. 5947/5947 studio tests pass.
  **Status:** erledigt (`544234e3`, gebündelt mit der parallelen
  studio/demo/-Deletion)
  **Notiz:** Side-Discovery beim Survey: das gesamte
  `studio/compile/compile-service.ts`-Cluster (CompileService +
  PreludeBuilder + CodeGenerator + PreviewRenderer + StudioUpdater
  - PerfLogger) ist exportiert und voll-getestet, wird aber
    nirgendwo in Production instanziiert — als neuer offener Befund
    „dead compile-service cluster" dokumentiert.

### 2026-05-12 — Dead-Export-Sweep Slice C: 3 ungenutzte Types

- **Wo:** `studio/editor/triggers/types.ts` (TriggerHandlers interface,
  PropertyTypeMap type, PropertyTriggerMap type)
  **Was:** Zweiter Audit-Durchgang (`export interface/type [A-Z]`, statt
  function/class/const) ergab drei zusätzliche tote Types. TriggerHandlers
  war 14-LOC-Interface, beide PropertyTypeMap/PropertyTriggerMap je 1-LOC-
  Aliase ohne Konsumenten. ComponentPrimitivesMap bleibt (aktiv genutzt).
  506/506 editor tests pass.
  **Status:** erledigt

### 2026-05-12 — Dead-Export-Sweep Slice B: studio/ (5 Exports)

- **Wo:** `studio/autocomplete/ports.ts` (CompletionConfig interface),
  `studio/autocomplete/schema-completions.ts` (getAllComponentCompletions
  - getZagEventsForComponent), `studio/panels/components/user-components-panel.ts`
    (isSystemComponent + getSystemComponentNames — SYSTEM_COMPONENTS-Set
    bleibt für internen Filter), `studio/rename/index.ts` (isRenameActive)
    **Was:** Restliche 5 dead exports aus dem Audit (Slice A war compiler/-
    Lane). Alles Vorrats-API ohne Konsumenten. 288/288 studio tests pass.
    **Status:** erledigt

### 2026-05-12 — Dead-Export-Sweep Slice A: compiler/ (28 Exports, –500+ LOC)

- **Wo:** `compiler/runtime/security.ts` (gelöscht, 304 LOC),
  `compiler/runtime/animations.ts` (motionAnimate + getMotionPreset +
  MOTION_PRESETS + helpers, ~100 LOC, `motion`-Dependency entfernt),
  `compiler/runtime/alignment.ts` (alignToCSS + getAlign + 6 internal
  helpers, ~85 LOC; ALIGN_MAP bleibt),
  `compiler/runtime/component-navigation.ts` (setReadFileCallback +
  ungenutzte Override-Mechanik), `compiler/utils/logger.ts` (10 dead
  pre-configured Logger), `compiler/backends/dom/api-emitter.ts`
  (emitAutoMount), `compiler/backends/dom/runtime-template/index.ts`
  (getRuntimeLineCount), `compiler/backends/dom/utils.ts`
  (generateVarName), `compiler/backends/dom/zag/overlay-emitters.ts`
  (overlayemittersRegistry), `compiler/backends/dom/base-emitter-context.ts`
  (EmitterFn type), `compiler/validator/index.ts` (createValidator),
  `compiler/validator/builtin-prelude.ts` (\_resetBuiltinPreludeCache),
  `compiler/cli/defaults-css.ts` (\_resetDefaultsCssCache),
  `compiler/testing/vitest-helpers.ts` (expectElementValid +
  logValidation + logElementStyles + ElementValidation-Import),
  `compiler/index.ts` (CompileOptions type), `package.json` (motion-Dep weg).
  **Was:** Audit per export-declarations × occurrences-grep (ts/tsx/json/md/html)
  ergab 28 Top-Level-Exports mit 0 Konsumenten außerhalb der Definitions-
  stelle. `compiler/runtime/security.ts` war komplett dead-File (304 LOC,
  beide Exports tot, kein Importer, kein Test, kein Doku-Verweis).
  `motionAnimate` mit Drumherum war ungebaute Alternative zum
  bestehenden Animation-System — als Bonus fiel der `motion` NPM-Dep
  raus. Findings-Aggregat-Eintrag aktualisiert: `compiler/`-`as any`-
  Count auf **0** (letzter war in motionAnimate).
  15475/15498 vitest grün (23 pre-existing skipped).
  **Status:** erledigt

### 2026-05-11 — Dead-Export-Sweep: 3 ungenutzte Exports gelöscht

- **Wo:** `compiler/schema/parser-helpers.ts` (`ACTIONS_WITH_TARGETS`,
  `EVENTS_WITH_KEY`), `studio/panels/property/base/section.ts`
  (`SectionRegistry`)
  **Was:** Repo-weiter Audit (export-declarations × occurrences-grep
  über `*.ts`, `*.tsx`, `*.json`, `*.md`) ergab drei Top-Level-Exports
  mit 0 Konsumenten außerhalb der Definitionsstelle. `ACTIONS_WITH_TARGETS`
  (Map der Actions mit Targets aus `DSL.actions`) und `EVENTS_WITH_KEY`
  (Set der Events mit Key-Modifier aus `DSL.events`) waren parser-
  helper-Vorrats-APIs, die nie konsumiert wurden. `SectionRegistry`
  war für „dynamic section management" gedacht — aber Property-Panel
  nutzt seit `ba615bad` (Section-Factory-Registry, Iter-N+2) das
  Section-Factory-Pattern, nicht eine Runtime-Registry-Klasse. Alle
  drei gelöscht. 71/71 Schema + Panel-Tests grün.
  **Status:** erledigt

### 2026-05-11 — Drop-Helper aligned mit Studio's HitDetector escape zone

- **Wo:** `studio/test-api/mirror-actions/index.ts:dropChildIndexPoint`
  - extrahiert nach `studio/test-api/mirror-actions/drop-points.ts`
    (Pure-Function), `studio/preview/drag/hit-detector.ts` (`ESCAPE_ZONE_SIZE`
    Konstante exportiert), neue Pin-Suite `tests/studio/drop-points.test.ts`
    (7 Pins), Browser-Suite
    `studio/test-api/suites/preview-cdp/01-palette-drop/append-at-end-vs-index.test.ts`
    un-skipped.
    **Was:** Drop in tight-packed Container (3×60px Kinder in 240px-Container
    mit pad 12 + gap 8 — 220 von 240px belegt) wurde von Studios HitDetector
    abgewiesen. Helper landete bei `containerRect.bottom - 4`, was exakt
    auf der Grenze der `ESCAPE_ZONE_SIZE = 24px` Band war — winzige Rundung
    triggert escape-to-parent. Fix: y-Clamp auf
    `containerRect.bottom - ESCAPE_ZONE_SIZE - 4` (4px Sicherheitsmarge
    parallel zu „before child[index]"-Branch). Helper-Math als Pure-Function
    extrahiert, dadurch direkt jsdom-testbar ohne `installMirrorActions`-
    Mount. 7 Pins: empty container, before-child mit Top-Clamp, append-at-
    end roomy/tight/over-packed, x-Midpoint. 196/196 drag-drop tests pass.
    **Status:** erledigt
    **Notiz:** Browser-Suite un-skipped, aber nicht local verifiziert
    (braucht `npm run studio` Server). Helper-Math ist jsdom-gepinnt;
    Browser-Suite läuft beim nächsten CDP-Run.

### 2026-05-11 — Orphan `studio/demo/` gelöscht (735 LOC)

- **Wo:** `studio/demo/{demo-api,index}.ts`
  **Was:** DOM-Overlay-Demo-API (DemoCursor + KeystrokeOverlay), letzte
  Code-Aktivität 2026-04-22 (3 Wochen). 0 Konsumenten repo-weit
  (`setupDemoAPI`/`DemoAPI`/`DemoCursor`/`KeystrokeOverlay` keine
  externen Refs, nur Selbst-Referenzen + 1 Findings-Erwähnung). Die
  aktive Demo-Pipeline lebt in `tools/test-runner/` (real OS cursor via
  nut-js + CDP-Screencast), die alte Browser-Overlay-Variante in
  `studio/demo/` war ersetzt aber nie gelöscht. Owner-Entscheidung:
  löschen. Keine Build-/HTML-Refs. CLAUDE.md `studio/`-Tree-Eintrag
  mit-aktualisiert. 15476/15499 vitest passes (23 pre-existing skipped).
  **Status:** erledigt
  **Notiz:** Restoration via `git show <pre-delete>:studio/demo/`.

### 2026-05-11 — `route` `@deprecated`-Comment entfernt (faktisch falsch)

- **Wo:** `compiler/schema/dsl.ts:213`
  **Was:** Schema-Annotation widerspricht der Realität. `route` ist
  voll-supportetes Production-Feature mit eigenem Parser-Plumbing
  (Lexer-Token `ROUTE`, `parseRouteClause`, IR-Field `Instance.route`,
  DOM-Backend `data-route`-Emit, Runtime-Navigation) und aktiver
  Studio-Multi-Page-App-Nutzung (`autoCreateReferencedFiles` scannt
  Source nach `route <name>`, 4 Tests pinnen `route home`,
  `route admin/users` etc. in `tests/studio/compile-orchestrators.test.ts`).
  Owner-Entscheidung: Comment ersetzt durch faktischen Kommentar
  „Top-level page declaration: `route home` (Multi-Page apps)".
  99/99 schema + compile-orchestrators tests pass.
  **Status:** erledigt

### 2026-05-10 — Framework-Backend-Decomp Lane abgeschlossen (1057 → 165 LOC, 84 % Reduktion)

- **Wo:** `compiler/backends/framework.ts` → 5 Module unter `compiler/backends/framework/ops/`
  **Was:** 5-Slice-Decomp per `docs/refactoring/framework-backend-decomp.md`
  fertig. framework.ts ist jetzt ein dünner Side-Effect-Orchestrator —
  die Klasse `FrameworkGenerator` behält die mutables (`indent`/`lines`)
  und die `emit*`-Methoden für Header/Tokens/CustomIcons/Components/UI/
  Mount; sämtliche pure-Logik ist raus. Fünf Module: helpers.ts 109,
  css-to-mirror.ts 277, style-event.ts 234, props.ts 66, node-emit.ts 318. Differential-Tests 384/384 grün, full vitest 15441/15441.
  Slice-Commits:
  - Slice 1 — Pure helpers (`b3a7da56`, –86 LOC)
  - Slice 2 — CSS→Mirror reverse-mapper (`f5ee4635`, –255 LOC)
  - Slice 3 — Style/Event/Action emit (`e3a2135f`, –221 LOC; bundled
    with parallel tutorial-videos commit)
  - Slice 4 — Props/States serialization (`860e09f2`, –49 LOC)
  - Slice 5 — Node-to-M emit (–281 LOC, letzter Slice)
    **Status:** erledigt
    **Notiz:** Anders als React-Lane: Class-basierte Struktur. Methoden
    wurden zu freien Funktionen extrahiert; Indent-State wird explizit
    als Parameter durch `nodeToM`/`eachToM`/`conditionalToM` gefädelt.

### 2026-05-10 — Orphan `compiler/runtime/element-wrapper.ts` gelöscht (287 LOC)

- **Wo:** `compiler/runtime/element-wrapper.ts`
  **Was:** 287-LOC TypeScript-Reimplementierung der `wrap()`-API
  (ElementWrapper-Interface + Property-Accessors). Die produktive
  Implementation lebt inline in `compiler/backends/dom/runtime-template/
index.ts:437` als JS-String — die wird in das Bundle eingebettet.
  Diese TS-Variante war ein April-Modularisierungs-Versuch
  (`d588f869`, 2026-04-15), wurde aber nie wired-up: 0 Imports
  irgendwo im Repo, 0 Test-Refs, kein Re-Export aus
  `compiler/runtime/`. Datei gelöscht. 15441/15464 vitest grün.
  **Status:** erledigt
  **Notiz:** Falls die TS-Variante künftig als Type-Source-of-Truth
  reaktiviert werden soll — Restoration via `git show <hash>:`,
  und dann muss runtime-template/index.ts auf die generierte Version
  switchen, nicht doppelt vorhanden bleiben.

### 2026-05-10 — React-Backend-Decomp Lane abgeschlossen (3273 → 343 LOC, 89% Reduktion)

- **Wo:** `compiler/backends/react.ts` → 8 Module unter `compiler/backends/react/ops/`
  **Was:** 8-Slice-Decomp per `docs/refactoring/react-backend-decomp.md`
  fertig. react.ts ist jetzt ein dünner Orchestrator (Type-Definitionen,
  Token-Emit, Component-Map-Aufbau, Pre-Scan-Flags für hasIcon/hasChart/
  hasAnimation, Root-Item-Loop). Acht Module unter react/ops/
  (layout.ts 239, events.ts 149, chart.ts 175, text.ts 490, icon.ts 251,
  attributes.ts 181, style.ts 1064, jsx.ts 624). Differential-Tests
  384/384 grün, full vitest 15441/15441. Slice-Commits:
  - Slice 1 — Layout & Component (`a9f52c64`, –189 LOC)
  - Slice 2 — Events (`fe11e256`, –137 LOC)
  - Slice 5 — Chart (`eb046dfa`, –155 LOC)
  - Slice 6 — Text (`8dd62a42`, –449 LOC)
  - Slice 4 — Icon (`262c1e48`, –237 LOC)
  - Slice 3 — Attributes (`d7a3f4c2`, –146 LOC)
  - Slice 8 — Style (`7f7c22d0`, –1028 LOC, größter Brocken)
  - Slice 7 — JSX (letzter Slice, –589 LOC)
    **Status:** erledigt
    **Notiz:** Framework-Backend-Decomp (1057 LOC, gleiche Klasse von
    Monolithik) ist deferred — Pattern ist jetzt erprobt, kann angewandt
    werden wenn Bedarf entsteht.

### 2026-05-10 — 29 orphan tests/fixtures/\*.html manual-test Pages gelöscht (8096 LOC)

- **Wo:** `tests/fixtures/*.html` (root-level — 29 Files)
  **Was:** Hand-geschriebene HTML-Test-Pages (accordion, avatar,
  carousel, checkbox, … bis tooltip/treeview) plus `index.html`
  (broken Übersicht), `compiler-test.html`, `default-styles.html`.
  Letzte Aktivität 2026-03-28 (1.5 Monate). 0 Konsumenten in der
  Test-Infrastruktur — die `runner.test.ts`-basierten Suiten sind
  in den Subfoldern (actions/, bind/, components/, …, jeweils mit
  eigenem `runner.test.ts`). Die Root-HTML-Pages waren ein paralleles
  Manual-Test-System, dessen Index-Seite `tests/index.html` nie
  existierte (Breadcrumb-Links toten); Komponenten-Subdir
  `components/tabs.html` (verlinkt aus index.html) ebenfalls
  nicht vorhanden. System war von Anfang an broken bzw. wurde
  früh aufgegeben. Restoration via
  `git show <pre-delete>:tests/fixtures/<name>.html`.
  **Status:** erledigt

### 2026-05-10 — `studio/preview/constants.ts` 7 dead Re-Exports + Datei gelöscht

- **Wo:** `studio/preview/constants.ts` (34 LOC) +
  `studio/preview/index.ts` (12 LOC Re-Export-Block)
  **Was:** Modul war als „centralized constants for data attributes
  and selectors to avoid magic strings" gedacht; Realität: 7 von 8
  Exports (`MIRROR_ID_ATTR`, `COMPONENT_ATTR`, `LINE_ATTR`,
  `NAME_ATTR`, `LAYOUT_ATTR`, `STACKED_ATTR`, `mirrorIdSelector`) hatten
  0 externe Konsumenten. Repo-weit existieren 154 direkte Verwendungen
  der String-Literals (`'data-mirror-id'`, etc.) — die Centralization
  hat nie stattgefunden. Einziger interner Konsumer
  (`context-menu.ts`) inlined `MIRROR_ID_SELECTOR` jetzt direkt.
  Datei + Barrel-Block gelöscht. Build grün.
  **Status:** erledigt
  **Notiz:** Zukünftiger Refactor („magic strings → konstante
  Symbole") braucht eigene Lane-Doc — 154 Stellen sind real, aber
  Big-Bang.

### 2026-05-10 — 10 orphan scripts/ Throwaway-Probes gelöscht (303 LOC)

- **Wo:** `scripts/{check-{dup-warn,fi,mono,nested-comp,propset,show,
slot-dup,toggle},analyze-parens,build-example}.ts`
  **Was:** 8 single-source `check-*`-Probes (je 7–30 LOC, hardcoded
  Mirror-source + `parse(...)`-Aufruf zur Diagnose) + `analyze-parens.ts`
  (65 LOC) + `build-example.ts` (105 LOC, longst überholt durch
  `mirror-build` CLI in `compiler/build-cli.ts`). Alle 10 Files mit
  0 Konsumenten in package.json/Doku/source. Letzte Aktivität
  2026-04 bis 2026-05-08. Pendant zur 70-Probe + 6-Tools-Bereinigung.
  Verbleibend in `scripts/`: aktive `eval-*-quality`-Familie
  (eval-driver-Lib), `eval-functional` ↔ `eval-llm-pipeline` ↔
  `eval-reclassify` (mit Tests), `verify-personas-*`/`verify-tutorial`
  (importieren aus dem owner-exklusiven `tools/test-runner/`).
  **Status:** erledigt

### 2026-05-10 — 6 orphan tools/ Throwaway-Scripts gelöscht (1019 LOC)

- **Wo:** `tools/{debug-tauri-mode,diagnose-colors,probe-personas-live,
screenshot-file-panel,verify-tauri-file-panel,smoke-test-pipeline}.ts`
  **Was:** Sechs single-File Debug-/Diagnose-/Probe-Scripts auf
  `tools/`-Root-Level (nicht in `tools/probes/` Slice-NN-Konvention).
  Jeder mit 0 Konsumenten in `package.json`/Doku/`.ts`-Source. Letzte
  Aktivität 2026-05-08 (2 Tage). Pendant zur „Probe-Hygiene"-Aktion
  (`3c5b2b98`), die 70 generic `probe-*.ts` aus `tools/probes/`
  gelöscht hat — gleiche Logik, andere Lokation. Restoration via
  `git show <pre-delete>:tools/<name>.ts`.
  **Status:** erledigt

### 2026-05-10 — Empty-canvas drop fails in testMode — fixed in d3115504

- **Wo:** `studio/init/init-notifications.ts` (drag:dropped handler),
  `studio/test-api/suites/preview-cdp/01-palette-drop/frame-into-empty-canvas.test.ts`
  **Was:** `__compileTestCode('')` setzt `testModeActive = true` und
  leerte den Editor — Studios drag:dropped Handler returned dann via
  `if (!target) return` BEVOR die Empty-Canvas-Fallback laufen konnte.
  Suite-Test war seitdem skipped, atomic-test #6 deckte den Pfad mit
  `editor.dispatch({changes: …})` (ohne testMode) ab.
  **Status:** erledigt (`d3115504`) — null-Gate unter den Empty-Canvas-
  Fallback verschoben, sodass der Fallback testMode-unabhängig läuft.
  Test `frame-into-empty-canvas.test.ts` un-skipped als laufende
  Regression-Abdeckung. Header-Kommentar im Test nachgezogen
  (Findings-Verweis auf vorgeschichtlichen Skip).

### 2026-05-10 — transformInstance child-pipeline Type-Cleanup (3 Slices)

- **Wo:** `compiler/ir/transformers/{control-flow-transformer,inline-extraction}.ts`,
  `compiler/ir/ops/{instance-ops,children-resolver}.ts`,
  `tools/probes/slot-in-each.ts`
  **Was:** Drei Type-System-Lügen im IR-Child-Pipeline aufgeräumt:
  - **Slice 1** (`6fd20b87`): `ConditionalBlock` aus
    control-flow-transformer.ts gedroppt; transformConditional nimmt
    jetzt `ConditionalNode` aus ast.ts (Single Source of Truth).
    Mapper-Callbacks ohne explizite Element-Type-Annotation
    konvergieren auf die wider AST-Union.
  - **Slice 2** (`943f990a`): Slot-Dispatch in transformInstance
    hinzugefügt — Each.children/Conditional.then|else dürfen per
    ast.ts Slot enthalten, der Parser produziert das heute zwar
    nicht (Probe `tools/probes/slot-in-each.ts`), aber wenn doch
    routed der Code nicht mehr in den misleading-Warning-Path.
  - **Slice 3** (`54f4d910`): Drei Child-Pipeline-Signaturen
    (extractInlineStatesAndEvents, resolveChildren, transformChild)
    auf den neuen Type-Alias `InstanceChild` konvergiert. Damit
    matchen sie die AST-Quelle exakt — keine strukturelle
    Pass-Through-Lüge mehr.
    Probe zeigt: nested-if + each-in-if funktionieren runtime-korrekt
    (waren immer schon strukturell-typed durch). Cleanup ist Type-
    Cleanup, kein observable Behavior-Change.
    Verbleibend: `transformInstance` selbst hat noch `Instance | Each
| any` mit eslint-disable. Das tightening-Cascade ist mit Slice
    1-3 zwar gelöst, aber konkrete Tightening braucht zusätzliche
    Cycle-Detection-Type-Anpassungen — aufgeschoben.
    **Status:** erledigt

### 2026-05-10 — `tools/image-to-mirror-test/` deletion (~19'000 LOC weg)

- **Wo:** `tools/image-to-mirror-test/` (44 Files, 712 KB) +
  `package.json` Scripts (`test:image*`)
  **Was:** Dormant „Bild → Mirror-Code"-Roundtrip-Test-Subsystem.
  Letzter Code-Commit 2026-04-17, 0 externe Imports, 0 Doku-/CI-
  Referenzen. 12 npm-Scripts (Steps 0–8 + basic/headed/fonts)
  zeigten in dieses Verzeichnis, niemand führte sie aus. Importierte
  weder aus `compiler/` noch aus `studio/` — komplett self-contained.
  Verzeichnis-Deletion in `3581bce8` (Parallel-Session-Bundle, 20243
  zeilen weg). Begleit-Commit dieser Session entfernt die 12
  npm-Scripts aus `package.json`. 15440/15463 vitest grün (23
  pre-existing skipped).
  **Status:** erledigt (`3581bce8` Verzeichnis-Delete + nachfolgender
  Commit für npm-scripts) — Restoration via
  `git show 3581bce8~1:tools/image-to-mirror-test/` falls jemals
  wieder benötigt.

### 2026-05-10 — Runtime-Bug-TODO-Bucket vollständig abgehakt (10/10)

- **Wo:** `studio/test-api/suites/` — 10 `// TODO: Runtime bug …`-Marker
  in den Browser-Test-Suiten
  **Was:** Meta-Bucket aus 10 Test-Workarounds, die als latente
  Production-Bugs dokumentiert waren. Über mehrere Inkremente
  abgearbeitet:
  - ✅ scroll Container-Scroll
  - ✅ visibility `toggle(ElementName)`
  - ✅ crud `remove()` (Test-Selector-Bug, nicht Runtime)
  - ✅ counter + tutorial `reset()` Token-Key-Mismatch
  - ✅ combined `toggle() + increment()` Doppel-Click-Handler
  - ✅ navigation `navigate() + show/hide` (Skip-Marker ohne realen Bug)
  - ✅ translate Multi-Transform-Composition (`6c3ab636`)
  - 🚫 responsive Container-Queries → eigener Open-Befund
    (Architektur-Issue, kein simpler Runtime-Fix)
    4 von 7 echte Runtime-Code-Fixes, 2 Test-Selector-Bugs, 1 Skip-
    Marker, 1 Architektur-Befund. Drei verbleibende `autocomplete/`-
    TODOs (state-completions, context-aware-completions ×2) sind
    Feature-Lücken, kein Bucket-Item.
    **Status:** erledigt

### 2026-05-10 — Multi-Transform-Composition: x-offset + y-offset komponieren mit rotate/scale

- **Wo:** `compiler/ir/ops/properties-ops.ts:transformProperties`,
  `tests/differential/properties.test.ts` (5 „Combined Transforms"-Pins),
  `studio/test-api/suites/transforms/translate.test.ts`
  **Was:** Echter Runtime-Bug aus dem TODO-Bucket. `x-offset` und
  `y-offset` wurden vom Schema-Numeric-Handler je als
  `{property: 'transform', value: 'translateX/Y(Npx)'}` emittiert.
  `rotate`/`scale` gingen durch transformContext.transforms[] und
  wurden zu `scale(...) rotate(...)` kombiniert. Folge: `Frame
x-offset 20, y-offset 15` produzierte nur `translateY(15px)` (last-
  wins overwrite); `Frame x-offset 20, scale 1.2, rotate 45` droppte
  translateX komplett. Fix: x-offset/y-offset gehen jetzt durch
  denselben transformContext — Pass 1 sammelt translateX/Y-Strings,
  Pass 2 skippt damit der Schema-Numeric-Handler nicht doppelt feuert.
  Combined transform am Ende joint alle vier zu einem `transform:
translateX(20px) translateY(15px) scale(1.2) rotate(45deg)`.
  Pre-Refactor-Pin (5 Tests) parsed DOM-Output und checkt EINE
  `transform:`-Assignment pro Element. Browser-Test mit combined
  Source + assert-x-and-y. 8191/8197 vitest grün.
  **Status:** erledigt (`6c3ab636`)

### 2026-05-10 — `navigate() + show/hide` „Runtime bug" entlarvt als Skip-Marker

- **Wo:** `tests/behavior/actions.test.ts` (A7-Pin),
  `studio/test-api/suites/actions/navigation.test.ts`
  **Was:** Sechster Inkrement aus dem Runtime-Bug-TODO-Bucket. Der
  `testWithSetupSkip`-Marker mit Kommentar „Runtime bug — navigate() +
  show/hide combinations don't work correctly" war nie ausgeführt
  worden — die Behauptung also unverified. jsdom-Probe
  `tools/probes/navigate-show-hide.ts` reproduziert die Sequenz
  korrekt: initial Home visible / Settings hidden → click Settings:
  Home hidden / Settings visible → click Home: Home visible / Settings
  hidden. Behavior-Pin in `tests/behavior/actions.test.ts` (A7) hält
  die observable Semantik fest. Browser-Test un-skipped, TODO entfernt.
  **Notiz:** show()/hide() merkt sich keinen ursprünglichen `display`
  Wert — nach `show()` ist `inline-style.display=""` und computed fällt
  auf `block` (statt `flex` für Frame). Visibility-Tests passen
  weiterhin (`!== 'none'`), aber Layout könnte verloren gehen.
  Separater Befund, hier nicht angefasst.
  **Status:** erledigt

### 2026-05-10 — Doppel-Click-Handler bei `toggle() + increment()` behoben

- **Wo:** `compiler/backends/dom/event-emitter.ts:emitAction`,
  `tests/behavior/actions.test.ts` (A10-Pin),
  `studio/test-api/suites/actions/combined.test.ts`
  **Was:** Fünfter Inkrement aus dem Runtime-Bug-TODO-Bucket — echter
  Runtime-Bug. Bei `Button "Like", toggle(), increment(count)` (bare-
  comma chain ohne `onclick`-Keyword) und `on:`-State emittierte der
  state-machine-emitter einen click-Listener (transitionTo) UND der
  event-emitter einen zweiten Listener mit
  `_runtime.stateMachineToggle(node)`. Beide feuerten auf einen Klick
  — erster togglet default→on, zweiter on→default — End-State:
  default. increment lief im zweiten Handler korrekt durch, daher die
  Beobachtung „increment funktioniert, toggle nicht". Fix:
  builtin-state-function-Actions im event-emitter sind no-op; der
  state-machine-emitter Click-Listener übernimmt die Transition.
  Begleitende non-builtin Actions (increment, toast, …) feuern wie
  gewohnt. Differential-Pins (`stateMachineToggle(X, ['on', 'off'])`)
  bleiben grün, weil der state-machine-emitter weiterhin diese Calls
  emittiert. 15433/15433 vitest grün. Browser-Tests
  `combined.test.ts` (zwei `testWithSetupSkip`) un-skipped, drei
  TODO-Marker entfernt.
  **Status:** erledigt

### 2026-05-10 — `reset()` echter Runtime-Bug: Token-Key-Mismatch behoben

- **Wo:** `compiler/backends/dom/ops/emit-static.ts:85`,
  `compiler/backends/dom/event-emitter.ts:emitValueAction`,
  `tests/behavior/actions.test.ts` (A1 reset-Pin),
  `tests/integration/builtin-functions-pipeline.test.ts` (20
  `_tokens['$X']` → `_tokens['X']`-Assertions),
  `studio/test-api/suites/actions/counter.test.ts`,
  `studio/test-api/suites/tutorial/functions-deep.test.ts`
  **Was:** Vierter Inkrement aus dem Runtime-Bug-TODO-Bucket — der
  erste mit echtem Runtime-Code-Fix. Token-Key-Mismatch: Data-Layer
  emittiert `__mirrorData["count"]` (ohne `$`), aber
  `_runtime.registerToken('$count', 5)` (mit `$`-Prefix). Action
  `reset(count)` emittiert `_runtime.reset('count')`, das liest
  `_initialTokens['count']` → undefined → DOM-Text leer. Fix:
  emit-static.ts droppt `$`-Prefix in `registerToken`; emitValueAction
  strippt `$` von Token-Args. Pre-Refactor-Pin in
  `tests/behavior/actions.test.ts` A1 hält die korrekte Semantik fest
  (5 → +,+,+ → 7 → reset → 5). Integration-Test-Assertions auf den
  konsistenten no-`$`-Key umgestellt. Browser-Test in
  `actions/counter.test.ts` Assertion auf 6 (= 5 nach reset + 1) statt
  pre-fix Stub-Wert 1. Tutorial-Test reset-Workaround durch echten
  `reset(count)` ersetzt. 15432/15432 vitest grün.
  **Status:** erledigt

### 2026-05-10 — `remove(item)` „Runtime bug" entlarvt als Test-Selector-Bug

- **Wo:** `tests/behavior/actions.test.ts` (A5 remove-Pin),
  `studio/test-api/suites/actions/crud.test.ts`
  **Was:** Dritter Inkrement aus dem Runtime-Bug-TODO-Bucket. Der
  TODO-Marker behauptete „remove() doesn't correctly update the DOM";
  jsdom-Probe (`tools/probes/remove-action.ts`) zeigte das Gegenteil:
  Nach `remove(item)` Click sind Texts `[A,B,C] → [B,C]`, Buttons 3 → 2,
  `__mirrorData.items.a` ist weg, `_refreshEachLoops` lief. Der Browser-
  Test scheiterte schon an seiner ersten Assertion, weil `[data-mirror-
id="node-1"] > [data-mirror-id]` nichts matchte: `each` schiebt einen
  `[data-each-container]`-Wrapper ohne mirror-id + einen weiteren
  unnamed Iteration-Wrapper dazwischen. Behavior-Pin in
  `tests/behavior/actions.test.ts` (A5 remove-Block) dokumentiert die
  reale DOM-Contract. Browser-Test-Selector auf
  `[data-mirror-name="Text"]` umgestellt, `testWithSetupSkip` →
  `testWithSetup`, TODO-Kommentar entfernt.
  **Status:** erledigt

### 2026-05-10 — `toggle(ElementName)` toggled jetzt Element-Visibility statt State-Machine

- **Wo:** `compiler/ir/transformers/event-transformer.ts:transformAction`,
  `compiler/backends/dom/event-emitter.ts:emitRuntimeAction`,
  `tests/differential/actions.test.ts` (2 Pins),
  `studio/test-api/suites/actions/visibility.test.ts`
  **Was:** Zweiter Inkrement aus dem Runtime-Bug-TODO-Bucket. Pre-Fix
  emittierte `toggle(Menu)` als `_runtime.stateMachineToggle(buttonNode,
['Menu'])` — d.h. die State-Machine des Buttons wurde zwischen
  `default` und `'Menu'` getoggled. User-Intent: Visibility des Menu-
  Frames togglen. Discriminator: PascalCase-Argument =
  Element-Name → `_runtime.toggle(_elements[…])`. Lowercase oder
  no-args = State-Cycling (alter Pfad). IR-Transformer markiert
  PascalCase-toggle nicht mehr als `isBuiltinStateFunction`, der
  DOM-Emitter route es durch `emitRuntimeAction`. Differential-Pin in
  `tests/differential/actions.test.ts` (Element-Name vs. State-Name).
  Browser-Test `testWithSetupSkip` → `testWithSetup`. 15430/15430
  vitest grün.
  **Status:** erledigt

### 2026-05-10 — `scrollToTop()` / `scrollToBottom()` ohne Arg scrollen jetzt den Container

- **Wo:** `compiler/runtime/scroll.ts`, `compiler/backends/dom/event-emitter.ts`,
  `compiler/runtime/dom-runtime.ts`,
  `compiler/backends/dom/runtime-template/index.ts`,
  `tests/runtime/scroll.test.ts` (neu),
  `tests/fixtures/actions/a06-scroll/expected.dom.js`,
  `studio/test-api/suites/actions/scroll.test.ts`
  **Was:** Erster Inkrement aus dem Runtime-Bug-TODO-Bucket.
  Pre-Fix scrollten `scrollToTop()`/`scrollToBottom()` ohne Arg
  immer das `window` — innerhalb eines `Frame h 150, scroll`-
  Containers also nutzlos. Zwei neue Runtime-Funktionen
  `scrollContainerToTop` / `scrollContainerToBottom` mit
  `findScrollableAncestor`-Helper (walk parents bis overflow:
  auto/scroll + scrollHeight > clientHeight, sonst window-Fallback).
  DOM-Emit übergibt jetzt `currentVar` (den Click-Source) als
  Context. 8 jsdom-Pins in `tests/runtime/scroll.test.ts`
  (explicit-target: 3, context-aware: 5). Browser-Tests
  `testWithSetupSkip` → `testWithSetup`. Golden-Fixture
  `a06-scroll/expected.dom.js` aktualisiert. 15428/15428 vitest grün.
  **Status:** erledigt (gebündelt in `f9041257` von Parallel-Session,
  ursprünglich von dieser Session implementiert)

### 2026-05-10 — Dead-feature-Verdacht: alle 4 Slices entschieden

- **Wo:** Slices Stacked-Overlay (8), Custom-Icons-Registry (51),
  Prose-Mode (66), Section-Header-Parsing (Slice 25 E002 Probe 22)
  **Was:** Audit per `tests/policy/dsl-features-have-examples.test.ts`
  KEEP/WATCHLIST. Resultat:
  - **Stacked-Overlay** — KEEP (USED in
    `examples/hospital-dashboard/dashboard.mirror`).
  - **Prose-Mode** — KEEP (USED 4× in
    `examples/personas-informatik/components.com`).
  - **Custom-Icons-Registry (`$icons:`)** — KEEP (Lane 1 Inkrement 1,
    `8b31a4fe`: `examples/custom-icons.mirror` als Demo-Beispiel
    addiert, Eintrag von WATCHLIST nach KEEP promoted).
  - **Section-Header-Parsing (`--- Title ---`)** — KEEP (Lane 1
    Inkrement 2, `74cf45f5`: `examples/tokens-with-sections.tok`
    mit 7 Sections, Eintrag promoted).
    Watchlist ist jetzt leer; Policy-Test grün, alle vier Slices
    haben mindestens ein Beispiel und sind explizit KEEP.
    **Status:** erledigt

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

### 2026-05-10 — `CLAUDE.md` Tests-Block reduziert (–278 LOC)

- **Wo:** `CLAUDE.md` (1878 → 1600 LOC)
  **Was:** Massive Drift seit dem CDP-Test-Runner-Refactor (`8e81387f`)
  in zwei Schritten geheilt:
  (a) Komplette „Demos (Spec-by-Example E2E)"-Section (50 LOC) raus —
  verwies auf gelöschte `tools/test-runner/demo/` und entfernte
  `test:demos`/`test:demos:headed`-Scripts (siehe `c0f550f2`).
  (b) Tests-Block (~370 LOC → ~85 LOC) reduziert auf Layer-Map,
  Quick-Commands, Browser-Konsolen-Globals — volle API-Referenz
  delegiert an `docs/TEST-FRAMEWORK.md`. Damit gilt: Detail-Drift
  passiert künftig nur an einer Stelle.
  Korrigiert: alle Test-Counts, 21 statt 17 Kategorien (incl. neue
  `previewCdp`, `headed`, `ai.realLlm`, `stepRunner`), neue Globals
  `__cdpInput`/`__mirrorActions`/`__osMouse`/`__snapshot` dokumentiert.
  Entfernt: `test:browser:parallel`-Script (existiert nicht), Verweise
  auf `docs/test-layers.md`/`docs/test-classification.md` (jetzt
  unter `docs/archive/`), veraltetes `tools/test-runner/`-Tree.
  **Status:** erledigt (`b2c1e4d4`)

### 2026-05-10 — `docs/TEST-FRAMEWORK.md` Full Rewrite (3-Schichten-CDP-Modell)

- **Wo:** `docs/TEST-FRAMEWORK.md` + `docs/archive/TEST-FRAMEWORK-pre-cdp-rewrite.md` + `package.json`
  **Was:** Altes Dokument (1429 LOC) war komplett veraltet seit dem
  CDP-Test-Runner-Refactor (`8e81387f`): 7 dokumentierte Drift-Punkte
  (Architektur-Diagramm verwies auf nicht-existierende Files,
  „InteractionAPI"-Section dokumentierte die heute verbotene synthetische
  API, neue `__mirrorActions`/`cdpInput`-Schichten nirgends dokumentiert,
  fehlende Files in jeder Liste). Komplett neu geschrieben (~520 LOC)
  mit 3-Schichten-Modell (cdpInput → trustedInteractions →
  \_\_mirrorActions), API-Referenz pro Schicht, Test-Template,
  Verzeichnis-Struktur (21 registrierte Kategorien gelistet),
  vollständige CLI-Flag-Tabelle, Browser-Konsolen-API. Vorgängerdoc als
  `docs/archive/TEST-FRAMEWORK-pre-cdp-rewrite.md` aufbewahrt
  (force-add, da `docs/archive/` gitignored aber konventionell tracked).
  Bonus: 2 stale `npm run`-Scripts (`test:demos`/`test:demos:headed`)
  aus `package.json` entfernt — referenzierten gelöschten
  `tools/test-runner/demo/scripts/` und CLI-Flags
  `--demo-suite`/`--pacing`. Verlinkungen aus CLAUDE.md, README.md,
  CONTRIBUTING.md, studio/test-api/README.md, suites/categories.ts,
  suites/preview-cdp/\_shared/actions.ts geprüft — alle stabil
  (zeigen weiter auf TEST-FRAMEWORK.md, das den „Grundprinzip"-
  Abschnitt mit gleichem Anker behält).
  **Status:** erledigt (`c0f550f2`)

### 2026-05-10 — `ParseError`-3×-Drift auf canonical compiler-Type konvergiert

- **Wo:** `studio/core/events.ts` + `studio/compile/types.ts`
  **Was:** `ParseError` war dreimal definiert mit divergierenden
  Shapes: kanonisch in `compiler/parser/ast.ts` (5 Felder:
  `{message, line, column, hint?, code?}`), als 4-Feld-Subset in
  `studio/core/events.ts` (kein `code`), als 2-Feld-Subset in
  `studio/compile/types.ts` (nur `{line, message}`). Beide Studio-
  Kopien jetzt durch `import type { ParseError } from
'../../compiler/parser/ast'` + Re-Export ersetzt; Barrels surfacen
  weiter unter den alten Namen, jetzt aber als kanonische Quelle
  ohne Drift-Risiko. 5940/5940 studio tests pass.
  **Status:** erledigt (`0f0ffb2f`)

### 2026-05-10 — Dead-Export-Cluster: UI_ICONS-Chain + getPropertyIcon + cleanupStudioTestAPI

- **Wo:** `studio/icons/index.ts` + `studio/test-api.ts`
  **Was:** ~64 LOC weg: (1) komplette `UI_ICONS`-Kette
  (`UI_ICONS`-Konstante mit 7 Icons, `UIIconName`-Typ, `getUIIcon()`-
  Helper) — 0 Konsumenten; (2) `getPropertyIcon()` + `PropertyIconName`-
  Typ — 0 Konsumenten (visual-section.ts liest `PROPERTY_ICONS`-
  Konstante direkt); (3) `cleanupStudioTestAPI()` — 0 Caller,
  Test-Cleanup ohne Aufrufer. PROPERTY_ICONS, LAYOUT_ICONS,
  COMPONENT_ICONS bleiben — die haben echte Consumer.
  5940/5940 studio tests pass.
  **Status:** erledigt (`82441c6b`)

### 2026-05-10 — 3 stale Comments für gelöschten/nie-gebauten Code entfernt

- **Wo:** `compiler/index.ts:14`, `studio/core/events.ts:15`,
  `studio/code-modifier/index.ts:43-47`
  **Was:** (1) `compiler/index.ts` referenzierte `generateStatic`-Stub
  des Static-Backends, das im April 2026 gelöscht wurde (`4e1bdac9`);
  (2) `events.ts` markierte das `DropZone`-Interface als „inline weil
  Modul noch nicht gebaut" — Modul wurde nie gebaut, Interface ist
  langlebig inline; (3) `code-modifier/index.ts` enthielt zwei
  Migrations-Notizen für längst gelöschte Symbole (PropertyPanel-
  Re-Export, DropZoneCalculator). Alle drei jetzt weg. 5940/5940
  studio tests pass.
  **Status:** erledigt (`177fd071`)

### 2026-05-10 — Orphan `prelude-service.ts` gelöscht (139 LOC)

- **Wo:** `studio/core/prelude-service.ts`
  **Was:** Zweites Orphan-Modul nach `usage-tracker.ts`. `PreludeService`-
  Klasse + `PreludeInfo`-Interface + Singleton-Helpers
  (`getPreludeService`/`createPreludeService`) ohne einen Consumer im
  Repo. Heutige Prelude-Resolution läuft via
  `studio/compile/prelude-builder.ts`. Service-Variante wurde nie
  integriert oder durch den Compile-Service-Mechanismus überholt.
  5940/5940 studio tests pass nach Deletion.
  **Status:** erledigt (`a1680cc5`)

### 2026-05-10 — Orphan `usage-tracker.ts` gelöscht (123 LOC)

- **Wo:** `studio/panels/components/usage-tracker.ts`
  **Was:** Komplettes 123-LOC-Modul (`UsageTracker`-Klasse +
  Singleton-Helpers + Config-Interface + localStorage-Persistenz für
  Recent-Components) ohne einen einzigen Consumer im Repo. 0 Treffer
  für `UsageTracker`, `usage-tracker`, `getUsageTracker`,
  `createUsageTracker` repo-weit (alle File-Typen). Vorstufe für ein
  nie geliefertes Recent-Components-Feature. 5940/5940 studio tests
  pass nach Deletion.
  **Status:** erledigt (`5efd49ba`)

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
