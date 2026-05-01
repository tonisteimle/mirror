# Compiler — Architektur-Review (Phase 1)

**Status:** Phase-1-Bericht, 2026-05-01. Iterative Ausführung läuft, Stand siehe „Erledigungs-Bilanz" am Ende.
**Methodik:** 7 parallele Read-only-Subagents pro Schicht (schema, parser/eingang, ir, backends, runtime, validator+studio, infrastruktur), konsolidiert.

> **Wie diesen Bericht lesen:** Jeder Befund hat eine ID (`A-01`, `A-02`, …), eine Schwere und Datei:Zeile-Referenzen. Hoch = bevor wir Detail-Review starten zu klären. Mittel = sollte vor Detail-Review der betroffenen Schicht geklärt sein. Niedrig = im Detail-Review erledigen.
>
> Erledigte Befunde sind unten **markiert** und in der **Bilanz** im letzten Abschnitt aufgeführt.

---

## 1. Datenfluss

```
.mirror Quelltext
   ↓
preprocessor.ts            (Multi-File-Combine: data → tokens → components → layouts)
   ↓
positional-resolver.ts     (Pre-Pass: Shorthand → expliziter Syntax)
   ↓
parser/lexer.ts            (Tokenisierung, Indent-sensitiv)
   ↓
parser/parser.ts           (Tokens → AST)
   ↓
ir/index.ts                (AST → IR + SourceMap, 10+ Transformer)
   ↓                ↓
backends/dom       backends/react ← arbeitet direkt am AST, NICHT am IR (Befund A-06)
backends/framework
   ↓
generierter JS-Code  +  inline-eingebettete Runtime aus runtime/dom-runtime-string.ts
   ↓
Browser → runtime/* (State, Events, Bindings, Animations, …)
```

**Quersystem:**

- `schema/` — soll Single Source of Truth sein (siehe A-01, A-02)
- `validator/` — schema-basierte Validierung, parallel zur Compile-Pipeline
- `studio/` (im Compiler) — bidirektionales Editieren (Code-Modifier, Property-Extractor)

---

## 2. Schicht-Verantwortungen — Stand & Lecks

| Schicht                 | Was sie tun soll                                                | Problem                                                                               |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `schema/`               | Eine Wahrheit über DSL (Primitives, Properties, States, Events) | Mehrere parallele Wahrheiten (A-01, A-02)                                             |
| `parser/`               | Source → AST, keine semantische Logik                           | Monolith mit 4168 Zeilen, weiterhin viel Logik (A-04)                                 |
| `ir/`                   | AST normalisieren, semantisch anreichern                        | Pipeline implizit, IR trägt noch AST-Details (A-05, A-08)                             |
| `backends/`             | IR → Output                                                     | React umgeht IR komplett (A-06); HTML-Mapping 3-fach dupliziert (A-07)                |
| `runtime/`              | DOM-Verhalten zur Laufzeit                                      | Monolith (5037 Z.) **plus** Submodule, Duplikate (A-09); globaler Window-State (A-10) |
| `validator/`            | Korrektheit prüfen                                              | Boundary sauber, aber Cleanup-Status nicht vollständig verifiziert (siehe Note unten) |
| `studio/` (im Compiler) | Bidir.-Editing für IDE                                          | CodeModifier mit 2881 Z. ist großes monolithisches Modul (A-13)                       |
| `llm/`                  | LLM-Prompts                                                     | Tote Exporte, Duplikat zu `studio/agent/prompts/` (A-11)                              |
| `prelude/`              | Standard-Library                                                | Nicht konsumiert — Dead File (A-12)                                                   |

> **Note zur validator/-Bewertung:** Der Subagent hat hier viel auf bestehende `INVENTORY.md`/`CLEANUP.md` verlassen (die als „Phase X ✅ abgeschlossen" markieren). Das ist Hörensagen, nicht Code-Verifikation. Im Detail-Review der Schicht prüfen wir das selbst nach.

---

## 3. Kernkonzepte — Datenmodelle

### AST (`parser/ast.ts`, 840 Z.)

- ~25 Knotentypen: Program, Canvas, Token, Component, Instance, Property, State, Event, Action, Each, Conditional, Slot, Text, JavaScript, Animation, ZagComponent, Table\*
- Konsistente Type-Guards (`isComponent`, `isInstance`, …)
- **Auswuchs:** Table\*-Knoten (TableNode, TableColumnNode, TableStaticRow, TableStaticCell) sind nicht orthogonal zu ZagComponent — beide sind Container, aber unterschiedliche Hierarchie-Modelle. Verdacht: historisch gewachsen.

### IR (`ir/types.ts`, 562 Z.)

- IRNode (mit `primitive`, `name`, `instanceName`, `properties`, `styles`, `tag`)
- IRZagNode, IRSlot, IRItem
- IRCanvas, IREach, IRConditional
- IRStateMachine, IRStateDefinition, IRStateTransition
- IRToken
- **Problem:** IRNode trägt zu viele Rollen — `primitive` ist redundant zu `tag`; `properties` ist noch String-basiert (nicht typisiert). Backend muss raten, welche Felder zu beachten sind. → A-05.
- **Frage:** Brauchen wir AST UND IR? Die Unterschiede sind teilweise dünn (Property → IRProperty mit minimaler Anreicherung). Der React-Backend umgeht IR, was zeigt, dass die Schicht nicht zwingend ist. → siehe offene Fragen.

### SourceMap (`ir/source-map.ts`, 433 Z.)

- NodeId → ComponentName + InstanceName + Position + Properties-Map
- Template-Instance-IDs im Format `node-5[2]` — **fragil** bei ID-Renummerierung. → A-15.
- Tote Exporte: `calculatePropertyPosition()`, `SourceMapBuilder.getMap()` (Duplikat zu `.build()`), `isTemplateInstance()` — nie importiert.

### Schema (`schema/dsl.ts`, 2848 Z. + Begleiter)

- Soll Wahrheit für Primitives, Properties, Events, Actions, States, Zag-Komponenten sein
- **Reality:** parallele Strukturen (siehe A-01, A-02)

---

## 4. Architektur-Befunde

### A-01 [hoch] Zwei parallele Primitive-Systeme im Schema

**Beobachtung:**

- `compiler/schema/dsl.ts:231` definiert `DSL.primitives` (PascalCase: `Frame`, `Text`, `Button`, …) als Master-Registry mit `html`, `aliases`.
- `compiler/schema/primitives.ts:51` definiert ein **zweites** Set `PRIMITIVES` (lowercase: `frame`, `text`, `button`) mit anderer Struktur (`tag`, `defaults`).
- `compiler/schema/primitives.ts:256` Kommentar: _"Use schema as source of truth, but also check local PRIMITIVES for defaults"_ — Notfall-Fallback statt klares Design.

**Problem:** Wenn ein Primitive geändert wird, müssen Defaults an zwei Stellen synchron gehalten werden. Backends (React `primitiveTagMap`, Framework `TAG_TO_TYPE`) duplizieren das Mapping ein **drittes** und **viertes** Mal. Vier Wahrheiten für eine Tatsache.

**Empfehlung:** `primitives.ts` entweder eliminieren (wenn `dsl.ts` ausreicht) oder zur dünnen Adapter-Schicht reduzieren, die rein aus `DSL.primitives` ableitet. Backends sollen Mapping aus Schema lesen, nicht selbst kodieren.

---

### A-02 [neu bewertet — Schatten-Konflikt erledigt; Modell-Trennung ist legitim]

**Stand 2026-05-01 (nach Schema-Sprint Schritt 1):** Beim Eintauchen festgestellt: `properties.ts` (82 Einträge, `PropertyDefinition`-Typ mit `type`/`min`/`max`/`options`/`unit`) und `dsl.ts:SCHEMA` (127 Einträge, `PropertyDef`-Typ mit `keywords`/`numeric`/`color.css(...)`) sind **keine Duplikate**, sondern **zwei legitime Modelle** mit unterschiedlichen Zwecken:

- `dsl.ts:SCHEMA` — Compile-Zeit-Schema, treibt CSS-Generierung
- `properties.ts:properties[]` — UI-Panel-Metadaten, treibt Property-Panel-Anzeige

Die Strukturen lassen sich nicht ohne Verlust mergen — die Felder sind verschiedenartig, nicht überlappend.

Das **echte** Problem war die Schatten-Hierarchie: `compiler/schema/index.ts` hatte `export * from './properties'` zusätzlich zum expliziten Re-Export aus `dsl.ts`, was bei `findProperty`/`getPropertiesByCategory`/`PropertyCategory` zu stillen TypeScript-Konflikten führte (explicit export gewinnt — ungeklärt für Leser, latentes Bruch-Risiko).

**Erledigt:** `export * from './properties'` aus `schema/index.ts` entfernt. Konsumenten importieren `properties` jetzt klar direkt von `'./schema/properties'`. Schatten-Konflikt weg. Beide Modelle bleiben mit klar getrennten Pfaden.

**Empfehlung:** Befund geschlossen. Echte Modell-Konsolidierung wäre nicht sinnvoll.

**Hinweis:** Die ursprüngliche Beobachtung (Synchronitätsanforderung über mehrere Files) bleibt teilweise gültig für **andere** parallele Wahrheiten:

- `compiler/schema/ir-helpers.ts:118` `PROPERTY_TO_CSS` hardcoded.
- `compiler/schema/ir-helpers.ts:429` `HOVER_PROPERTIES` hardcoded.
- `compiler/schema/layout-defaults.ts:21` `NON_CONTAINER_PRIMITIVES` hardcoded `Set`.

Diese sind Schema-Wissen, das nicht aus dem Schema selbst kommt — siehe A-04/A-07 (eigene Mikro-Schritte). Aber kein Eigenständiger-Sprint-Kandidat mehr.

---

### A-03 [hoch] Parser-Monolith — `parser.ts` mit 4168 Zeilen

**Beobachtung:**

- `compiler/parser/parser.ts:126–4168` — trotz Phase-5-Cleanup (TokenParser, StateDetector, TernaryParser, DataObjectParser, PropertyParser, InlinePropertyParser, AnimationParser, ZagParser extrahiert) bleibt der Hauptparser monolithisch.
- ComponentDefinition-Parsing, InstanceBody-Parsing, Event-Handling, Conditional-Chains liegen alle in derselben Klasse.

**Problem:** Detail-Review wird hier sehr teuer. Tests treffen die ganze Parser-Klasse. Isolierte Bugfixes sind schwer.

**Empfehlung:** Bevor Phase 2 (Detail-Review) Parser angeht, eine weitere Extraktionswelle erwägen — mindestens `BodyParser` als Modul. Alternativ: Phase 2 stückelt den Parser in inhaltlich abgegrenzte Reviewsessions (z. B. „Component-Body-Parsing", „Conditional-Parsing", „Event-Parsing").

---

### A-04 [hoch] `positional-resolver.ts` — vier Konzepte in einer Datei (565 Z.)

**Beobachtung:**

- `compiler/positional-resolver.ts` enthält vier eigenständige Sub-Module:
  1. `PRIMITIVE_ROLES` (~67 Z.) — gehört semantisch ins Schema (Rollen pro Primitive: Farbe, Größe, …)
  2. `TokenSuffixMap` + `SourceScan` (~150 Z.) — eigene Abstraktionen
  3. `classifyBare()` + `pickSuffixForRole()` (~85 Z.) — Token-Klassifikation
  4. `resolvePositionalArgs()` + `transformSegment()` + `transformPropertyList()` (~180 Z.) — Quelltext-Transformation

**Problem:** Datei tut zu viel, lebt im Compiler-Root statt in einer Schicht. `PRIMITIVE_ROLES` ist Schema-Wissen am falschen Ort.

**Empfehlung:** `PRIMITIVE_ROLES` nach `schema/` verschieben (oder als Feld in `DSL.primitives[name].roles` einbauen). Datei in 3–4 Files in einem `compiler/positional/` Subordner aufteilen.

---

### A-05 [hoch] AST-Konzepte lecken in IR-Knoten

**Beobachtung:**

- `compiler/ir/types.ts:78–111` — `IRNode` enthält gleichzeitig `primitive`, `name`, `instanceName`, `properties`, `styles`, `tag`.
- `properties` ist noch `Array<{name, value}>` mit String-Values, nicht typisiert wie der Rest des IR (vgl. `IRProperty`-Typen für andere Felder).
- `IRAction.args` bleibt `string[]` — inkonsistent zu typisierten `IREvent`.

**Problem:** Backends müssen aus dem IR raten, was sie verwenden sollen. Das IR macht seinen Job (Normalisierung) nur halb. Der Verdacht „braucht es AST und IR überhaupt?" entsteht hier — die Schicht zahlt Komplexität, ohne die Hebel-Wirkung voll auszuspielen.

**Empfehlung:** Vor Detail-Review IR neu denken. Zwei Optionen:

- **Option A:** IR ehrlich machen — alle Properties typisiert, klare Trennung von Display-Feldern (`tag`, `styles`, `children`) und Metadaten (`primitive`, `instanceName`).
- **Option B:** IR weglassen und Backends gegen AST + Schema-Lookups arbeiten (was React de facto schon tut).

Phase-2-Detail-Review der IR ergibt sonst wenig Sinn, solange diese Frage offen ist.

---

### A-06 [hoch] React-Backend umgeht das IR komplett

**Beobachtung:**

- `compiler/backends/react.ts:29` — `generateReact(ast)` traversiert AST direkt, **ruft `toIR()` nicht auf**.
- `react.ts:66–76` — `Each`, `Conditional`, `ZagComponent`, `Table` werden mit `{/* … not supported */}`-Kommentar still übergangen.

**Problem:** (1) Bricht die Schicht-Architektur — Backend kennt das AST. (2) Stille Datenlöcher: Generierter React-Code enthält keinen sichtbaren Fehler, sondern fehlt einfach Funktionalität. (3) Jede IR-Verbesserung kommt React nicht zugute.

**Empfehlung:** Entweder React-Backend auf IR umstellen (konsistent), **oder** explizit als „statischer Layout-Export" markieren und harte Errors werfen (kein leiser Skip), wenn dynamische Features im AST sind. Status quo ist die schlechteste Variante.

---

### A-07 [hoch] Primitive→HTML-Mapping in jedem Backend dupliziert

**Beobachtung:**

- `compiler/backends/react.ts:150–177` — `primitiveTagMap` (21 Einträge) + Heuristiken (`name.includes('button')`).
- `compiler/backends/framework.ts:17–25` — `TAG_TO_TYPE` (7 Einträge, inverse Richtung).
- DOM-Backend hat kein explizites Mapping — verlässt sich auf bereits normalisierte IR. Das ist ein **viertes** implizites Mapping in `node-emitter.ts`.

**Problem:** Vier Wahrheiten für eine Tatsache. Hängt direkt mit A-01 und A-02 zusammen.

**Empfehlung:** Mapping zentral im Schema (`DSL.primitives[name].html`), Backends lesen daraus.

---

### A-08 [hoch] Transformer-Pipeline im IR ist implizit + undokumentiert

**Beobachtung:**

- `compiler/ir/index.ts:914–1116` führt 10+ Transformationen sequenziell aus (Property-Merge, Property→CSS, Root-Level-Fix, States, Events, State-Machine-Build, Inline-Extraction, Child-Overrides, Children-Resolution, Absolute-Positioning, Grid-Context).
- Reihenfolge ist nur durch Code-Position implizit. Keine Tests prüfen Pipeline-Invarianten.
- `hasWidthFullInDescendants()` (`ir/index.ts:859–911`) ist eine 55-Zeilen-Heuristik mit mehreren Scan-Durchläufen — **kein Kommentar, warum sie nötig ist**.
- `ir/index.ts:927–952` — Root-Element bekommt 100% statt fit-content. Magie ohne Begründung.
- `ir/index.ts:1063–1075` — „Figma Variants" — State-Children automatisch hinzufügen, unklar wann.

**Problem:** Wer den IR-Code ändert, weiß nicht, welche Reihenfolge-Invarianten er bricht. Versteckte Annahmen.

**Empfehlung:** Pipeline mit Header-Kommentar dokumentieren (Reihenfolge + Invariant pro Schritt). Magische Heuristiken ent-magisieren — entweder klar kommentieren oder als bewusster Layout-Schritt extrahieren.

---

### A-09 [hoch] Runtime: 5037-Zeilen-Monolith **und** Submodule, mit Duplikaten

**Beobachtung:**

- `compiler/runtime/dom-runtime.ts` — 5037 Zeilen, importiert **nichts** aus den anderen runtime/-Modulen. Stattdessen: Duplikation.
- `MirrorElement`-Interface dreifach definiert: `runtime/types.ts`, `runtime/dom-runtime.ts:56`, `runtime/mirror-runtime.ts`.
- `_elementsWithDocListeners` WeakSet in `cleanup.ts` **und** `dom-runtime.ts`.
- `parts/test-api-runtime.ts` (383 Z.) ist Duplikat zu `test-api/`-Modulen.

**Problem:** Mit hoher Wahrscheinlichkeit gibt es bereits stille Bugs durch Drift zwischen Monolith und Submodulen. Wartungs-Albtraum.

**Empfehlung:** Vor Detail-Review der Runtime klären: Welcher Pfad ist Master? Monolith ablösen (Submodule sind die Zukunft) oder Submodule streichen? Kompromisslos eine der beiden Welten.

---

### A-10 [hoch] Runtime: Globaler State auf `window.*` ohne Namespace

**Beobachtung:**

- `window.__mirrorData`, `window._mirrorState`, `window.__MIRROR_DEBUG__`, `window.__MIRROR_TEST__` — alle global.
- Magische CSS-Property-Klassennamen ohne zentrale Definition: `_stateStyles`, `_visibleWhen`, `_loopItem`, `_selectionBinding`.

**Problem:** Multi-App-Szenarien (iframes, mehrere Mirror-Instanzen pro Page) kollidieren. Test-Isolation gestört. Der Studio (lädt Preview in iframe) muss damit leben.

**Empfehlung:** Single-Object-Namespace: `window.__mirror = { data, state, debug, test }`. Magische Strings als Konstanten zentralisieren.

---

### A-11 [hoch] `compiler/llm/` — totes Duplikat zu `studio/agent/prompts/`

**Beobachtung:**

- `compiler/llm/mirror-system-prompt.ts:1` — Kommentar selbst sagt: _"This file currently has no consumers in the repo. The actual production system prompt for Mirror agents lives in `studio/agent/prompts/system.ts`."_
- `compiler/llm/mirror-tutorial.generated.ts` — 4856 Zeilen generierter Code, nirgends importiert.
- Generator-Script existiert als iCloud-Duplikat: `scripts/generate-claude-tutorial 2.ts`.

**Problem:** ~5151 Zeilen toter Code im Compiler-Kern. Plus konzeptionell falsche Schicht — LLM-Prompts gehören nicht in den Compiler.

**Empfehlung:** Komplettes `compiler/llm/` löschen. Wenn in Studio benötigt: dort lokal halten. Generator-Script entrümpeln.

---

### A-12 [mittel] `compiler/prelude/` — nicht konsumiert

**Beobachtung:**

- `compiler/prelude/table.com` (22 Z.) wird nirgends importiert.
- `validator/validator.ts` erwähnt „Tokens and components from prelude" als Konzept, aber kein Code-Pfad lädt etwas.

**Problem:** Entweder geplante Funktion, die nie fertig wurde, oder altes Stub. Unklar.

**Empfehlung:** Toni: war das mal als Standard-Lib gedacht? Wenn ja → Loader implementieren oder als Plan dokumentieren. Wenn nein → löschen.

---

### A-13 [mittel] `compiler/studio/code-modifier.ts` — 2881 Zeilen, viele Mutationstypen

**Beobachtung:**

- `compiler/studio/code-modifier.ts` mischt updateProperty, addProperty, removeProperty, addChild, extractToComponent in einer Datei.
- Begleiter: `robust-modifier.ts` (490 Z., Wrapper), `property-extractor.ts` (1202 Z., mischt AST-Rekursion mit Schema-Lookups), `line-property-parser.ts` (468 Z., baut Alias-Map jedes Mal neu beim Parse).

**Problem:** Detail-Review wird teuer. LinePropertyParser-Performance unklar (potentielles Bottleneck bei Echtzeit-IDE-Updates).

**Empfehlung:** Vor Detail-Review der Studio-Schicht prüfen: lohnt sich Aufteilung pro Mutationstyp? LinePropertyParser-Alias-Map cachen?

---

### A-14 [mittel] Backends — `emitter-context.ts` + `zag-emitter-context.ts` sind reine Re-Exports

**Beobachtung:**

- `compiler/backends/dom/emitter-context.ts` (15 Z.) und `compiler/backends/dom/zag-emitter-context.ts` (13 Z.) machen nur `export * from 'base-emitter-context'`.

**Problem:** Sinnlose Indirektion, vermutlich Refactor-Restmüll.

**Empfehlung:** Löschen, Importeure auf `base-emitter-context.ts` umlenken. Trivial.

---

### A-15 [VERWORFEN] SourceMap — Template-Instance-IDs `node-5[2]` sind fragil

**Status:** Bei Detail-Prüfung 2026-05-01 widerlegt. SourceMap ist nur pro Compilation gültig — bei Code-Änderungen wird neu generiert (nodeId via sequenziellem Counter `generateId()`). Das Format `node-5[2]` ist in `compiler/ir/source-map.ts:60–72` mit `getTemplateId()` und `isTemplateInstance()` sauber behandelt: bei Lookup-Miss Fallback auf Template-ID per Regex `^(.+)\[\d+\]$`. „Renummerierung bricht Mapping" gilt nicht — es gibt keine stabile Mapping-Erwartung über Compilation-Runs hinweg.

**Empfehlung:** Kein Refactor nötig.

---

### A-16 [mittel] React-Backend — `separateComponents`-Option ist Dead Parameter

**Beobachtung:**

- `compiler/backends/react.ts:23` — Option `separateComponents` ist im Interface, wird im Code ignoriert.

**Problem:** Lügt die API an. Aufrufer denkt, die Option wirkt.

**Empfehlung:** Entweder implementieren oder aus dem Interface entfernen.

---

### A-17 [mittel] Runtime: `examples.ts` (349 Z.) und `llm-context.ts` (664 Z.) — vermutlich tot in Production

**Beobachtung:**

- `compiler/runtime/examples.ts` — hardcoded Components (MyCard, MyModal, …).
- `compiler/runtime/llm-context.ts` — Prompt-Context-Extraction.

**Problem:** Ca. 1000 Zeilen Code in der Runtime, deren Zweck unklar ist. Macht jeden generierten Bundle größer (wenn nicht tree-shakeable).

**Empfehlung:** Toni klären: wird das wirklich gebraucht? Wenn ja: bessere Doku + Tree-shake-fähig machen. Wenn nein: löschen.

---

### A-18 [mittel] CLI-Logik dupliziert mit Library-API

**Beobachtung:**

- `compiler/cli.ts:298–399` (`compileFiles`) und `cli.ts:401–513` (`compileProject`) enthalten Compilation-Orchestrierung, die teilweise auch in `compiler/index.ts` lebt.

**Problem:** Aufrufer der Library kann nicht gleich verfahren wie die CLI. Unterschiedliche Fehlerpfade.

**Empfehlung:** `compileFiles(filePaths[], options)` als Library-Export einführen, CLI delegiert dorthin.

---

### A-19 [niedrig] iCloud-Duplikate

**Beobachtung:**

- `compiler/backends/dom 2/` — leerer iCloud-Konflikt-Ordner.
- `docs/concepts/positional-args 2.md`, `docs/concepts/positional-args-backend-support 2.md` — 1:1-Kopien.
- `scripts/generate-claude-tutorial 2.ts` — iCloud-Duplikat.
- Plus zahlreiche `* 2.md`/`* 2.ts` außerhalb `compiler/` (siehe `git status` zu Beginn).

**Problem:** Verwirrt grep-Ergebnisse, bläht das Repo auf.

**Empfehlung:** Sauberer Sweep `find . -name "* 2.*"` — pro Datei prüfen, ob 1:1-Duplikat → löschen. Schon vor Phase 2 erledigen.

---

### A-20 [erledigt 2026-05-01] Lexer + Parser — String-Match auf Error-Messages

**Beobachtung (Original):**

- `compiler/parser/lexer.ts` — `LexerError`.
- `compiler/parser/parser.ts` — `ParseError`.
- Beide landen in AST als `errors: ParseError[]` — Konversion irgendwo.

**Problem (Original):** Verantwortungs-Unklarheit: was fängt der Lexer ab, was der Parser? Validator hat sogar `getLexerErrorCode()`/`getParserErrorCode()` mit String-Match auf Messages — fragil.

**Erledigt:** `LexerError` und `ParseError` haben jetzt ein optionales `code: LexerErrorCode | ParseErrorCode`-Feld (stabile Kategorie wie `'unclosed-string'`, `'invalid-hex'`, `'missing-colon'`). Lexer/Parser taggen jeden Error mit der passenden Kategorie. Validator (`compiler/validator/index.ts`) ersetzt `getLexerErrorCode`/`getParserErrorCode` durch zwei Lookup-Maps `LEXER_CODE_MAP`/`PARSER_CODE_MAP` und `LEXER_WARNING_CODES`-Set. Kein String-Match mehr. Tests grün (11034 passed). Befund geschlossen.

---

### A-21 [VERWORFEN] Token-Parser — `parseLegacyTokenDefinition` ist nicht legacy

**Status:** Bei Detail-Prüfung 2026-05-01 widerlegt. `compiler/parser/token-parser.ts:179–184` hat einen klaren Kommentar _"Legacy assign-style syntax (kept for backwards compatibility)"_. Der Name ist akkurat: parst die alte Form `primary: color = #2271C1`, die nur noch zur Rückwärtskompatibilität existiert. Drei Parser für drei Syntax-Formen ist legitim.

**Empfehlung:** Kein Refactor nötig.

---

### A-22 [erledigt 2026-05-01] Canvas-Geräte-Presets in AST hardcoded

**Beobachtung (Original):** `compiler/parser/ast.ts:88` hatte `'mobile' | 'tablet' | 'desktop'` als Type-Union; AST + Parser + IR (an drei Stellen!) kannten die Presets jeweils selbst.

**Problem (Original):** Schema kennt die Presets als `SCHEMA['device'].keywords`, IR aber duplizierte sie in `IRTransformer.DEVICE_PRESETS` (canvas) **und** in `transformProperties` (Frame). Vier Wahrheiten für drei Zahlen.

**Erledigt:** Drei neue Schema-Helfer in `compiler/schema/dsl.ts`: `getDevicePreset(name)`, `getDevicePresetNames()`, `isDevicePreset(name)` — leiten alle aus `SCHEMA['device'].keywords` ab. Konsumenten:

- `compiler/parser/parser.ts` — nutzt `isDevicePreset()` statt String-Vergleich.
- `compiler/parser/ast.ts` — `CanvasDefinition.device` ist jetzt `string` (validiert via Schema), nicht Type-Union.
- `compiler/ir/index.ts` — `transformCanvas()` und `transformProperties()` rufen `getDevicePreset()`. Beide lokalen `DEVICE_PRESETS`-Maps gelöscht.

Neues Preset = nur Schema-Änderung, keine Parser-/IR-/AST-Änderung mehr. Tests grün (11034 passed). Befund geschlossen.

---

## 5. Offene Fragen an Toni

Diese sind nicht aus dem Code allein zu beantworten. Bitte vor Phase 2 klären:

1. **AST + IR — beide oder eins?** (siehe A-05, A-06) — Entscheidet, ob wir IR säubern oder eliminieren. Größte Architektur-Frage.

2. **React-Backend — was soll es können?** (siehe A-06) — Vollständig (mit IR + dynamischen Features) oder bewusst „statischer Export"? Status quo ist undefiniert.

3. **Runtime-Konsolidierung** (A-09) — `dom-runtime.ts`-Monolith oder Submodule als Master? Beides ist nicht haltbar.

4. **`compiler/llm/`** (A-11) — löschen, oder gibt es einen externen Konsumenten, den ich nicht sehe?

5. **`compiler/prelude/`** (A-12) — geplante Standard-Library oder altes Stub?

6. **`compiler/runtime/examples.ts` + `llm-context.ts`** (A-17) — zu welchem Zweck? Production oder Demo/Debug?

7. **Phase-2-Reihenfolge:** Mein Plan war Schema → Parser → IR → Validator → Backends → Runtime → Studio. Mit den Befunden würde ich anpassen: erst die offenen Fragen oben klären, dann **Schema zuerst** (wegen A-01/A-02 — Single-Source-of-Truth-Refactor blockt vieles), dann **IR** (wegen A-05 — wenn IR weg/anders, ändert sich auch Backend-Review). Einverstanden?

---

## 6. Erledigungs-Bilanz (Stand 2026-05-01)

Iterative Ausführung im Compiler-Scope:

| Befund      | Status                     | Schritt | Substanz                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | -------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-01 (teil) | tote Funktionen weg        | 13      | `getPrimitive`, `isPrimitive`, `getPrimitiveTag` in `primitives.ts` raus (~25 Z.); volle Schema-Konsolidierung als eigener Sprint offen                                                                                                                                                                                                                                                                                                                |
| A-02        | erledigt                   | 14, 15  | Schritt 14: Schatten-Konflikt erkannt (`findProperty` zweifach via `schema/index.ts`). Schritt 15 (Schema-Sprint): `export * from './properties'` aus `schema/index.ts` entfernt, dazu tote `findProperty`/`getPropertiesByCategory`/`getGroupedProperties` aus `properties.ts` raus. Erkenntnis: `properties.ts` (UI-Panel-Metadaten) und `dsl.ts:SCHEMA` (Compile-Zeit) sind keine Duplikate, sondern legitim getrennte Modelle. Befund geschlossen. |
| A-08        | erledigt                   | 12      | `transformInstance` in `compiler/ir/index.ts:772` mit ~70-Zeilen Pipeline-Header dokumentiert (19 Schritte, Reihenfolge-Begründung)                                                                                                                                                                                                                                                                                                                    |
| A-11        | erledigt                   | 5       | `compiler/llm/` (~5151 Z. tot) gelöscht, `scripts/generate-claude-tutorial.ts` angepasst (TS-Output raus, Markdown bleibt)                                                                                                                                                                                                                                                                                                                             |
| A-12        | erledigt                   | 6       | `compiler/prelude/` (22 Z., nicht konsumiert) gelöscht                                                                                                                                                                                                                                                                                                                                                                                                 |
| A-14        | erledigt                   | 4       | `compiler/backends/dom/emitter-context.ts` + `zag-emitter-context.ts` gelöscht; 4 Importeure auf `base-emitter-context.ts` umgelenkt                                                                                                                                                                                                                                                                                                                   |
| A-17        | erledigt                   | 8       | `compiler/runtime/examples.ts` (349 Z.) + `runtime/llm-context.ts` (664 Z.) — keine Konsumenten — gelöscht                                                                                                                                                                                                                                                                                                                                             |
| A-19        | erledigt                   | 1, 2, 7 | iCloud-Duplikate Repo-weit (außer build/test-results): 355 Files + 39 Ordner weg                                                                                                                                                                                                                                                                                                                                                                       |
| A-15        | verworfen                  | 18      | Bei Detail-Prüfung: SourceMap ist pro Compilation, nodeId sequenziell neu — keine stabile Mapping-Erwartung über Runs                                                                                                                                                                                                                                                                                                                                  |
| A-20        | erledigt                   | 16      | `LexerError` + `ParseError` haben jetzt `code`-Feld (stabile Kategorie). Validator nutzt zwei Lookup-Maps statt String-Match. 13 Lexer-Sites + 3 Parser-Sites getaggt.                                                                                                                                                                                                                                                                                 |
| A-22        | erledigt                   | 17      | `getDevicePreset`/`isDevicePreset`/`getDevicePresetNames` aus Schema. AST-Type-Union → string. IR-Duplikate (2x) durch Schema-Helper ersetzt.                                                                                                                                                                                                                                                                                                          |
| A-04 (teil) | PRIMITIVE_ROLES verschoben | 18      | `compiler/positional-resolver.ts` → `compiler/schema/primitive-roles.ts` (PRIMITIVE_ROLES + PrimitiveRole + getPrimitiveRole). Schema-Wissen ist jetzt im Schema-Ordner. Datei-Split der restlichen 4 Sub-Module bleibt offen.                                                                                                                                                                                                                         |
| A-21        | verworfen                  | 11      | Bei Detail-Prüfung: Code-Kommentar dokumentiert „kept for backwards compatibility", Name akkurat                                                                                                                                                                                                                                                                                                                                                       |

**Test-Framework-Befunde (nebenbei aus Phase-1b angegangen):**
| T-08 | erledigt | 10 | `tests/e2e/`-Aufräumung: 89 Playwright-Files + 6 in `editor-experience/` + 57 Snapshot-Folder + `utils/` weg (von 2.7 MB auf 136 KB). CLAUDE.md-Aussage „kein Playwright" stimmt jetzt mit Realität überein. |
| T-14 | erledigt | 9 | `tests/probes/` (3 Files ohne Asserts, schreibend zu /tmp) gelöscht |

**Nebenbei aufgedeckt + gefixt:**

- `tests/compiler/tutorial/__snapshots__/tutorial-snapshots.test.ts.snap` hatte ~49.297 obsolete Snapshot-Zeilen (Phantom-Einträge `... 2`-Kapitel von gelöschten iCloud-Tutorial-Files). Schritt 3.

**Zwischenstand Tests:** vor Sprint 369 Test-Files / 10876 Tests grün → nach Sprint 373 Test-Files / 10953 Tests grün. 0 Regressions durch die Aufräumarbeiten. Eine Flakiness in `tests/integration/builtin-functions-pipeline.test.ts` (`scrollIntoView is not a function` in JSDOM) einmal beobachtet, war beim nächsten Lauf weg — passt zu T-04/T-02.

**Offene Hoch-Befunde (Compiler-Scope):**

- A-01 (Schema-Konsolidierung primitives.ts ↔ dsl.ts) — teilweise, eigener Sprint
- A-03 (Parser-Monolith) — separater Refactor; Phase-2-Detailreview hat parser.ts auf 4084 Z. gebracht (3 tote private Methoden + 9 tote Imports raus). Kein toter Code mehr drin, aber Datei bleibt groß.
- A-04 (positional-resolver.ts vermischt 4 Konzepte) — PRIMITIVE_ROLES weg, Datei-Split der 3 verbleibenden Sub-Module noch offen
- A-05 (AST-Konzepte lecken in IR)
- A-06 (React-Backend) — entschieden eliminieren, aber Studio-Konsumenten machen das aus aktuellem Compiler-only-Scope unmöglich
- A-07 (Primitive→HTML-Mapping in jedem Backend) — hängt an A-06 + Schema-Konsolidierung
- A-09 (Runtime-Monolith + Submodule) — durch Phase 2 als **D-051** konkretisiert: dom-runtime.ts hat eigene Implementierungen von scroll/timer/batching/form-navigation, während die extrahierten Files Schatten-Code sind. Variante (a) aufdröseln vs. (b) konsolidieren — Entscheidung nötig vor Sprint
- A-10 (Window-State ohne Namespace) — verbunden mit A-09

**Offene Mittel/Niedrig (Compiler-Scope):**

- A-13 (CodeModifier 2881 Z.) — Studio-Bereich, out of scope
- A-15 (SourceMap-IDs) — IR
- A-16 (separateComponents Dead Parameter) — hängt an A-06
- A-18 (CLI vs Library Duplikation) — hängt an A-06

## 6.5 Phase-2-Bilanz (Stand 2026-05-01, mehrere Detail-Sessions)

**Detail-Review Datei-für-Datei:** Komplett für `compiler/schema/` (15 Files), `compiler/parser/` (14 Files), `compiler/ir/` (24 Files), `compiler/validator/` (8 Files), `compiler/backends/` (20 Files), `compiler/*.ts` (4 Files top-level). Triage + leichter Cleanup für `compiler/runtime/` (32 Files); Detail-Review der 3 großen Files steht aus.

**Inline-Fixes total:** 35+ in 23 Dateien.
**~530 Zeilen toter/duplizierter Code entfernt.**
**Memoization-Fixes:** 5 (Hot-Paths in schema-Helpers: `isPrimitive`, `findProperty`, `getDevicePreset`/`isDevicePreset`, plus 2 weitere in parser-helpers/ir-helpers).

**Detail-Befunde dokumentiert:** D-001…D-055 (siehe `docs/compiler-review-log.md`).

**Wichtigster neuer Befund: D-051 — Runtime-Schatten-Code:** `compiler/runtime/` ist partiell extrahiert. dom-runtime.ts (5037 Z.) hat eigene lokale Implementationen von `batchInFrame`, `scrollTo`/`scrollBy`/`scrollToTop`/`scrollToBottom`, `delay`/`cancelDelay`/`debounce`, `setupAutoSelect`, `OverlayPosition`/`PositionOptions` Types — die parallel zu den extrahierten Files (`scroll.ts`, `timer.ts`, `batching.ts`, `form-navigation.ts`) existieren. Die externen Konsumenten holen sich die Funktionen aus dom-runtime.ts; die extrahierten Files werden nur von 2-3 anderen Runtime-Files konsumiert. Das ist die konkrete Form von A-09 — vor weiterem Cleanup muss entschieden werden: (a) dom-runtime.ts auf extrahierte Files umbauen, oder (b) extrahierte Files in dom-runtime.ts konsolidieren.

**Pattern beobachtet:** Tote API-Surface variiert stark zwischen Modulen:

- `compiler/schema/`: 30-50 % tot (viele Helfer aus alten Architektur-Phasen)
- `compiler/parser/`: 10-15 % tot (Phase-5-Extraktion hinterließ tote Imports/Methoden)
- `compiler/ir/`: <5 % tot (Phase-2/3-Refactor war gründlich)
- `compiler/validator/`: 0 % tot
- `compiler/backends/`: 1 % tot (ein toter Barrel)

**Tests:** 10958 grün durchgängig. Einziger Flake: `tests/studio/edit-handler.test.ts:340` (Timing-Test mit Promise.reject + `await flush()` × 2; Test-Author kommentiert „minimizes microtask wrapping … even under heavy parallelization (full vitest suite)" → bekanntes Phänomen, in Re-Run grün). Unrelated zu Reviewarbeit.

## 7. Zusammenfassung

**Was funktioniert (bestätigt durch Phase 2):**

- Validator-Schicht hat klaren Boundary, importiert nicht zirkulär. **Phase-2-Detail bestätigt: 0 % tote API-Surface.**
- AST hat saubere Type-Guards und konsistente Benennung. **Phase-2-Detail: ein totes Subsystem (`TableStaticRow*`) entfernt.**
- `compiler/testing/` ist gut strukturiert.
- **NEU: IR-Modul ist sehr clean** — Phase 2 fand <5 % tote API-Surface.
- **NEU: Backends-Modul ist clean** — 1 % toter Barrel-File entfernt.

**Hauptproblem-Cluster (aktualisiert nach Phase 2):**

1. **Schema-Helpers hatten viel toten Code** (war A-01, A-02, A-04, A-07) — Phase 2 hat ~290 Z. dead code aus 15 Schema-Files entfernt; die Architektur-Trennung (UI-Panel-Metadaten vs. Compile-Zeit-Schema) ist legitim und richtig. **Bleibt offen:** A-04 (positional-resolver Sub-Module-Split), A-07 (Primitive→HTML-Mapping in Backends).
2. **AST/IR/Backend-Trennung leckt** (A-05, A-06, A-08) — IR trägt AST-Details, React umgeht IR, Pipeline implizit. **Status:** unverändert offen, war bewusst out-of-scope für Phase 2.
3. **Runtime-Schatten-Code (D-051)** — Phase 2 hat A-09/A-10 als konkretes Problem identifiziert: dom-runtime.ts hat eigene Implementationen von extrahierten Funktionen. **Wichtigster offener Punkt.**
4. ~~**Tote Schichten**~~ — alle eliminiert (A-11, A-12, A-17 erledigt).

**Status:** Phase 2 ist weitgehend durch (113 von 117 Files reviewt). Die 4 verbleibenden Files sind in `compiler/runtime/` und alle hängen am Sprint-Refactor D-051. Detail-Review macht erst Sinn nach (a) vs. (b)-Entscheidung.

**Empfohlener nächster Sprint:** Runtime D-051 (a vs. b entscheiden, dann durchführen). Danach: React-Eliminierung, dann AST/IR-Konsolidierung.

- Phase-2-Reihenfolge entscheiden.
