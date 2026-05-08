# Multi-File — Implementation Concept

**Stand 2026-05-07 · Diskussionsgrundlage, vor Implementierung**

Begleitdokument zu `docs/multifile-roadmap.md`. Die Roadmap beschreibt das **Was**; dieses Dokument das **Wie** — und für jede signifikante Entscheidung das **Warum** (mit Alternativen, die ich verworfen habe).

## Übersicht

Die Umsetzung zerfällt in 8 Komponenten. Reihenfolge weiter unten begründet.

| #   | Komponente                                                 | Layer    | Sichtbar für User?   |
| --- | ---------------------------------------------------------- | -------- | -------------------- |
| 1   | Content-Type-Detector                                      | Compiler | nein                 |
| 2   | Project-Loader (klassifiziert + sortiert)                  | Compiler | nein                 |
| 3   | Cross-File-Validator (smarte Fehler)                       | Compiler | ja (Fehlermeldungen) |
| 4   | Storage-Migration `.tok/.com/.data` → `.mir`               | Studio   | unauffällig          |
| 5   | DEFAULT_PROJECT auf `.mir`-Quartett                        | Studio   | nein bis User reset  |
| 6   | AI-Integration (alle Files an LLM)                         | Studio   | indirekt             |
| 7   | Editor-UI dynamische Tabs                                  | Studio   | ja                   |
| 8   | Editor-UI Explorer-Panel + add/delete/rename + open folder | Studio   | ja                   |

---

## 1. Content-Type-Detector

**Wo**: Neues Modul `compiler/loader/classify.ts`. Eine reine Funktion `classify(ast: AST): ClassifiedDefinitions`.

**Was tut sie**: Geht durch alle Top-Level-AST-Knoten eines Files und teilt sie auf in vier Buckets:

```
data:       Knoten mit lowercase-Name + indented sub-keys
tokens:     Knoten mit `name.suffix:` (suffix = bg/col/rad/...)
components: Knoten mit Großbuchstabe + `:` (`Btn:`, `Card:`, `PrimaryBtn as Btn:`)
layouts:    Element-Instanzen (`Frame ...`, `canvas ...`, `Btn "Klick"`)
```

### Entscheidung: Voller Parse vs leichter Scan

**Wahl: voller Parse über die existierende `parse()`-Funktion.**

Alternative wäre ein Tokenizer-only-Scan, der ohne AST-Bau klassifiziert. Vorteil: schneller. Nachteil: Wir parsen die Files eh — der Compiler braucht den AST für die echte Kompilierung. Doppelte Arbeit ist unnötig, und der Mirror-Parser ist heute schon fast genug, um auf jeden Tastendruck zu laufen. Ein zweiter Tokenizer wäre redundanter Code.

### Entscheidung: Klassifikation pro Definition vs pro File

**Wahl: pro Definition.**

Pro File wäre einfacher zu implementieren ("dieses File ist Tokens"), aber das verbietet Hybrid-Files. Da wir explizit Hybrid-Files unterstützen wollen (Roadmap-Entscheidung), muss jede einzelne Top-Level-Definition individuell ihre Phase bekommen. Der `classify()`-Output ist also keine `Type`-Markierung am File, sondern vier Listen von AST-Knoten.

---

## 2. Project-Loader

**Wo**: Erweiterung von `compiler/cli.ts` (Project-Mode existiert schon) und `studio/modules/compiler/` (Studio-Compile-Pfad).

**Was tut er**: Nimmt eine Map `{ filename → content }` aller `.mir`-Files im Projekt und produziert eine kombinierte Source in der kanonischen Reihenfolge: data → tokens → components → layouts. Layout mit `canvas` zuletzt; sonst alphabetisch.

### Entscheidung: Kombinierte Single-Source vs separate ASTs

**Wahl: kombinierte Single-Source mit Source-Map-Offsets.**

Das aktuelle Prelude-System macht genau das schon für `tokens.tok + components.com → app.mir`. Es konkateniert Source-Strings mit Separator-Kommentaren (`// === filename ===`) und der Source-Map weiß über Line-Offsets, welche Zeile zu welchem File gehört. Das funktioniert heute zuverlässig.

Alternative wäre, separate ASTs pro File zu halten und im IR-Builder zu mergen. Das wäre architektonisch sauberer (keine Synthetic-Comments im Source-Stream), kostet aber massive Umbauten am IR-Builder, der heute eine flache Source erwartet. Für den Mehrwert nicht wert.

### Entscheidung: Sortierungs-Granularität

**Wahl: pro Definition, nicht pro File.**

Die Klassifikation ist pro Definition, also auch die Sortierung. Ein Hybrid-File `dashboard.mir` mit zwei Tokens + drei Components + einem Layout liefert seine Tokens in Phase 2, seine Components in Phase 3 und sein Layout in Phase 4. Source-Lines des Original-Files werden auseinandergerissen — das ist OK, weil die Source-Map die Original-Position trotzdem behält und der Editor sie als zusammenhängendes File anzeigt.

---

## 3. Cross-File-Validator

**Wo**: Neues Modul `compiler/validator/cross-file.ts`, separater Pass.

**Was tut er**: Nach Classify + Sort baut er einen Reference-Graphen über alle Files:

- **Token-Refs**: `$primary`, `$primary.bg` in Layouts und Components
- **Component-Refs**: Großbuchstaben-Identifier in Layouts und Components, die kein eingebautes Primitive sind (`Frame`, `Text` etc.)
- **Data-Refs**: `$dataKey`, `each x in $list`, `if $cond`

Für jede unaufgelöste Reference: Fehler mit File + Zeile + Levenshtein-Vorschlag.

### Entscheidung: Separater Pass vs Webung in IR-Builder

**Wahl: separater Pass.**

Mirror Studio rekompiliert auf jede Tasten-Bewegung. Der Validator soll inkrementell billig sein, idealerweise auf einem unvollständigen File laufen können (für IDE-Warnungen ohne vollen Compile). Verwoben in den IR-Builder bekäme man Fehler einmalig am Ende — schlechter für die Editor-Experience und für die AI-Loop, die den Validator gezielt aufruft (Retry-on-error).

### Entscheidung: Was wenn ein Token in mehreren Files definiert ist?

**Wahl: Fehler mit Liste der Definitions-Stellen, kein "letzter gewinnt".**

```
tokens-color.mir:3 und tokens-legacy.mir:8 definieren beide "primary.bg"
mit unterschiedlichen Werten (#2271C1 vs #1E5BA8). Bitte konsolidieren.
```

Alternative wäre "letzter gewinnt" wie in CSS. Verwerfe ich, weil die Reihenfolge im Auto-Loader vom User schwer vorhersagbar ist (alphabetische Sortierung, Hybrid-Files können sich verstreut verhalten). Stille Override würden zu "warum ist meine Farbe falsch?"-Bugs führen, die schwer zu finden sind. Expliziter Fehler ist im Sinne der Spec.

### Entscheidung: Levenshtein für Suggestions

**Wahl: ja, mit Threshold edit-distance ≤ 2.**

Tippfehler (`$primry` statt `$primary`) sollten geholfen werden. Threshold 2 fängt typische Vertipper, ohne komplett unverwandte Token vorzuschlagen. Der Vorschlag erscheint als zweite Zeile der Fehlermeldung: `Meinst du "primary"?`.

---

## 4. Storage-Migration

**Wo**: `studio/storage/index.ts` Boot-Pfad.

**Was tut sie**: Beim ersten Boot nach dem Update prüft Studio die localStorage-Files. Wenn `data.data` / `tokens.tok` / `components.com` da sind: rename auf `.mir`-Endung, Inhalt unverändert. Einmalig pro localStorage. Tauri-Pfad: keine Änderung, der Compiler liest beide Endungen.

### Entscheidung: Migration vs ewige Akzeptanz beider Endungen

**Wahl: Migration im localStorage, Compiler liest aber dauerhaft beide.**

LocalStorage ist unter unserer Kontrolle, sauber zu migrieren. Tauri-User haben Files auf der Disk, die wir nicht anfassen — wir akzeptieren also beides im Compiler dauerhaft. UI emittiert nur noch `.mir` für neue Files. Nach 1-2 Releases mit Deprecation-Warnung könnten wir die alten Endungen aus dem Compiler entfernen, aber das ist nicht notwendig.

---

## 5. DEFAULT_PROJECT

**Wo**: `studio/storage/project-actions.ts`.

**Was**: 4 Files mit `.mir`-Endung statt der heutigen 4 Endungen. EMPTY_PROJECT: 1 File `app.mir`.

### Entscheidung: 4 Files im Default vs 1

**Wahl: 4 Files für Demo, 1 File für Empty.**

Demo-Content nutzt heute schon Tokens und Components — die in einem File zu zeigen, würde die Stärke der Modularität verstecken. Beim Reset-to-Demo bekommt der User ein gut strukturiertes Beispiel mit Klar-getrennten Concerns. Empty: 1 File reduziert die Initial-Komplexität für jemand der bei null anfängt.

---

## 6. AI-Integration

**Wo**: `studio/app.ts` `editHandler.getProjectFiles`, `studio/agent/edit-prompts.ts`, `studio/agent/generation-prompts.ts`.

**Was**: Statt `{ tokens, components }` als getrennte Buckets wird ein flacher Map `{ siblings: { filename → content } }` an die LLM geschickt. Der Edit-Prompt bekommt einen Hinweis: "Jedes Sibling-File kann Tokens, Components, Data oder Layout enthalten — lies frei."

### Entscheidung: Semantische Aufteilung im Prompt vs flacher Sibling-Map

**Wahl: flach.**

Heute füttert der Prompt die LLM mit "## Tokens" und "## Components" als getrennten Sections. Das war richtig, als Files typisiert waren. In der neuen Welt sind Files generisch — und die LLM ist (vor allem Sonnet 4 und neuer) gut genug, am Inhalt zu erkennen, was Tokens vs Components vs Layouts vs Data sind. Die LLM sieht Mirror-Code wie ein Code-Reviewer: rauszufinden, ob `primary.bg: #2271C1` ein Token ist, ist trivial.

Trade-off: ich riskiere, dass die LLM in Edge-Cases schlechter performt als mit der semantischen Vorstrukturierung. Mitigation: wir behalten die Möglichkeit, in den Prompt eine Klassifikations-Annotation pro File einzubauen ("auto-detected: contains 3 tokens + 2 components"). Das wäre ein billiger Fallback wenn die Eval-Suite Regression zeigt.

### Entscheidung: AI darf datei-übergreifend patchen

**Wahl: ja, in dieser Phase.**

Heute generiert die LLM Search/Replace-Patches nur für die aktive Datei. Datei-übergreifend bedeutet: wenn die LLM auf `app.mir` einen neuen blauen Button bauen will, kann sie GLEICHZEITIG einen Token `accent.bg: #...` in `tokens.mir` anlegen — ohne dass der User die Datei wechseln und neu prompten muss. Das ist die natürliche Konsequenz der typenfreien Multi-File-Welt: wenn die LLM alle Files lesen darf, sollte sie auch alle schreiben dürfen.

#### Begrenzung: nur existierende Files

LLM darf **keine neuen Files anlegen**. `@@FILE` referenziert immer einen Filenamen, der bereits im Projekt existiert. Wenn die LLM einen neuen Token braucht, kommt er in eine bestehende Token-Datei (oder ins aktive File falls keine Token-Datei existiert). Wenn sie eine neue Component braucht, dito.

**Begründung**: AI-erzeugte Files würden die Projekt-Struktur verschleiern — der User hat dann plötzlich `auto-generated-tokens.mir` neben seiner sauberen `tokens.mir`. File-Anlage bleibt explizite User-Aktion (im Explorer-Panel über `+ new file`). Der Validator ist hier auch der natürliche Backstop: wenn die LLM einen `@@FILE foo.mir`-Header schreibt für ein nicht-existentes File, schlägt die Validierung fehl und der ganze Patch wird verworfen.

#### Patch-Format

Heutiges Format ist file-implizit:

```
@@FIND
<exakter Snippet>
@@REPLACE
<neuer Code>
@@END
```

Erweiterung: optionaler `@@FILE`-Header pro Block. Fehlt er, ist die aktive Datei gemeint (rückwärtskompatibel).

```
@@FILE tokens.mir
@@FIND
primary.bg: #2271C1
@@REPLACE
primary.bg: #2271C1
accent.bg: #f59e0b
@@END

@@FILE app.mir
@@FIND
Button "Speichern"
@@REPLACE
Button "Speichern", bg $accent
@@END
```

**Begründung der Format-Wahl**: Implizit-current bleibt für Single-File-Patches identisch; das entlastet die LLM in 80% der Fälle (sie schreibt nur in die Datei, in der sie aufgerufen wurde). `@@FILE` ist nur Pflicht, wenn die LLM tatsächlich woanders hin will. Eine explizite "alle Blöcke brauchen @@FILE"-Variante hätte den Vorteil der Konsistenz, aber zwingt die LLM auch im häufigen Fall zu Boilerplate, was sich erfahrungsgemäß in Halluzinationen rächt (vergessenes Header, falscher Filename).

#### Apply-Logik

All-or-Nothing-Transaction:

1. Parser zerlegt den Antwort-String in Blöcke mit ihren Target-Files.
2. Validiert: jeder benannte File existiert im Projekt; jeder `@@FIND`-Snippet matcht im Target-File exakt einmal.
3. Wenn alle Blöcke valid: in Reihenfolge auf Working-Copy anwenden. Wenn irgendein Block scheitert: nichts wird geschrieben, Fehlermeldung mit dem fehlerhaften Block.
4. Bei Erfolg: alle betroffenen Files in `window.files` updaten; Compile triggern; UI auf das aktive File zurückspringen (es sei denn der User hat während dem AI-Call gewechselt).

**Begründung All-or-Nothing**: Partielle Anwendung wäre für den User unverständlich — "tokens.mir wurde geändert, app.mir nicht, ich sehe aber nicht, was wo geschah". Ein gescheiterter Block bricht die Transaktion sauber ab und die LLM kann mit dem Fehler erneut probieren.

#### UI: Multi-File-Diff-Review

Heute: Ghost-Diff im CodeMirror der aktiven Datei (rot/grün-Overlay), `Tab` zum Akzeptieren, `Esc` zum Verwerfen.

Multi-File-Erweiterung:

- Im CodeMirror der aktiven Datei: Ghost-Diff wie heute (für Patches, die das aktive File berühren).
- Zusätzlich: kleine Summary-Bar oberhalb des Editors:
  ```
  AI will 2 weitere Files ändern: tokens.mir (+1 Zeile) · components.mir (-3, +5)
  [in tokens.mir öffnen] [in components.mir öffnen]
  ```
- Klick auf "öffnen" → Tab-Switch, dort sieht User dasselbe Ghost-Diff für jenes File.
- `Tab` (Accept) und `Esc` (Discard) wirken transaktional — alle Files auf einmal.

**Begründung der UI-Wahl**: Inline-Ghost im aktiven File bleibt der primäre Visualisierung (kein UX-Bruch für den 80%-Fall). Die Summary-Bar ist nur sichtbar, wenn AI Multi-File patchen will, und macht das transparent ohne den User aus seinem Flow zu reißen. Alternative wäre ein separater Review-Pane à la GitHub PR — hat aber den Nachteil, dass der Editor in den Hintergrund tritt, was den schnellen Inline-Edit-Workflow stört.

#### Undo

Multi-File-Patches müssen als EINE Undo-Transaktion gruppiert sein. Wenn der User Cmd+Z drückt, sollen ALLE Datei-Änderungen aus dem letzten AI-Patch zurück.

Implementation: Studio-CommandExecutor bekommt einen neuen Command-Typ `MultiFilePatchCommand`, der eine Liste von `{ file, fromContent, toContent }`-Tuples hält. Undo wendet `fromContent` auf jeden File an; Redo wendet `toContent` an. CodeMirrors eigene Undo-History wird per `addToHistory: false` umgangen (wie heute schon bei `switchFile`).

**Begründung**: pro-File-Undo wäre für den User unintuitiv — er weiß nicht, wie viele Cmd+Z er drücken muss, um den AI-Edit zurückzunehmen, und welche Files in welcher Reihenfolge. Eine Transaction = ein Undo-Step ist der Standard, den jedes IDE-User-Mental-Model erwartet.

#### Validator-Loop

Heutige AI-Loop: Patch anwenden → kompilieren → wenn Fehler, Retry mit den Fehlern als Kontext.

Multi-File-Variante: gleiche Logik, aber der "compile result" umfasst jetzt potenziell auch die neuen Cross-File-Validator-Errors (siehe Komponente 3). Wenn die LLM einen `$accent`-Token in app.mir referenziert hat, aber den Token-Eintrag in tokens.mir vergessen hat, kommt der Cross-File-Validator-Error zurück und die LLM kann nachpatchen. Das ist ein direktes Symbiose-Pattern zwischen Komponente 3 und Komponente 6.

---

## 7. Editor-UI: Dynamische Tabs

**Wo**: `studio/index.html` (Tab-Strip), `studio/app.ts` (Tab-Wiring), `studio/core/state.ts` (`openTabs`-State).

**Was**: Tab-Strip wird aus `state.openTabs: string[]` gerendert, statt hardcoded HTML mit vier `<button>`s zu sein. Active-Class folgt `state.currentFile`. Click → `switchFile`. `✕`-Button schließt Tab.

### Entscheidung: 4 Tabs hardcoded vs voll dynamisch

**Wahl: voll dynamisch, kein Pinning.**

Die Roadmap-Vision ist VS-Code-style ohne Pinning — die Roadmap-Diskussion hat sich davon verabschiedet, weil das ursprüngliche Pinning-Argument ("die vier Konzepte sind das Vokabular") in einer typenfreien Welt schwächer ist. Wenn Tokens und Components in irgendeinem File leben können, gibt es nicht mehr den "Tokens-Tab" als feste Position — sondern den `tokens.mir`-Tab, weil der User die Datei so genannt hat. Pinning wäre eine Asymmetrie, die der typenfreie Compiler eh nicht widerspiegelt.

### Entscheidung: Welche Tabs sind initial offen?

**Wahl: nur das File mit `canvas` (= Preview-Entry), Default `app.mir`.**

Heute sind alle 4 Tabs immer "offen" weil sie in der Tab-Bar erscheinen. In der dynamischen Welt heißt "offen" = "hat einen Tab". Default beim Boot: nur `app.mir` offen, andere Files sind im Explorer aber nicht im Tab-Strip. User klickt einen File, kriegt einen Tab. Das spiegelt VS Codes Verhalten und entlastet den Tab-Strip bei Projekten mit vielen Files.

Trade-off: für jemanden, der heute aus Gewohnheit erwartet, dass alle 4 Tabs sichtbar sind, ist das eine kleine Umstellung. Mitigation: beim Boot zeigen wir den Explorer-Panel offen.

### Entscheidung: Wie löst Tab-State Drag-Reorder?

**Wahl: erst nicht implementieren.**

VS Code lässt Tabs verschieben. Schick, aber nicht kritisch. Phase 1 ohne; wenn User danach fragen, später.

---

## 8. Editor-UI: Explorer-Panel + Add/Delete/Rename + Open Folder

**Wo**: `studio/panels/explorer/` + `studio/file-tree/` (existiert beides), `studio/index.html` für Sidebar-Slot.

**Was**:

- Sidebar-Panel links zeigt flache Liste aller `.mir`-Files im Projekt.
- File mit `canvas` hat einen `•`-Indikator ("Preview-Entry").
- Click → öffnet/fokussiert Tab.
- Right-Click → Context-Menu mit Rename / Delete / Duplicate.
- Buttons unten: `+ new file` (öffnet Modal mit Namen-Eingabe), `⤓ open folder` (Tauri-Bridge bzw. File-System-Access-API).

### Entscheidung: Flat list vs Tree

**Wahl: flach für Phase 1.**

Subfolder sind explizit Phase 2 (Roadmap). Ein flacher Tree ist trivialer zu rendern und zu warten. Wenn Phase 2 kommt, muss der Renderer erweitert werden — aber das ist überschaubar.

### Entscheidung: Modal für `+ new file` vs inline

**Wahl: kleines Inline-Input, kein Modal.**

VS Code löst das mit einem Input-Field, das direkt im Tree erscheint (Eingabe + Enter). Das ist weniger schwergewichtig als ein Modal-Dialog und passt zur restlichen Studio-UX. Validierung: Name darf nicht leer sein, muss eindeutig sein, wird automatisch um `.mir` ergänzt wenn fehlt.

### Entscheidung: Open Folder erst Tauri oder erst Browser

**Wahl: Tauri zuerst, Browser danach.**

Tauri-Bridge existiert schon (`desktopFiles.openFolder()`). Browser-Variante braucht File-System-Access-API-Wiring, und FSA hat Quirks (Permissions, async Handles, kein Chrome-Mobile-Support). Tauri-only deckt den Power-User-Case ab; Browser ist Phase 2 oder nach Bedarf.

---

## Reihenfolge der Umsetzung — und warum genau diese

```
1. Content-Type-Detector + Tests
2. Project-Loader nutzt Detector
3. Cross-File-Validator
4. Storage akzeptiert .mir + Migration
5. DEFAULT_PROJECT auf .mir
6a. AI-Integration: alle Files lesen (flacher Sibling-Map)
6b. AI-Integration: cross-file patchen (@@FILE-Header, MultiFilePatchCommand,
    Multi-File-Diff-Summary, Validator-Loop)
7. Editor-UI: Dynamische Tabs
8. Editor-UI: Explorer + Add/Delete/Rename + Open Folder
```

Ich splitte AI in 6a und 6b: 6a (Read) ist klein und unkritisch, 6b (Write) hat
neue Patch-Format-, UI- und Undo-Komplexität. So kann 6a sofort hinter dem
Backend ausrollen, während 6b separat reviewt + getestet werden kann.

### Begründung der Reihenfolge

**Schritte 1–5 sind reine Backend-Änderungen, die für den User unsichtbar bleiben.** Jeder einzeln kann gemerged und getestet werden, ohne dass irgendeine UI bricht. Ich kann das eine Backend-Komponente nach der anderen ausrollen, mit der Sicherheit dass die heutige UX exakt gleich aussieht.

**Schritt 5 (DEFAULT_PROJECT) ist der erste sichtbare Punkt** — neu erstellte Projekte sehen anders aus, alte sind durch die Migration mit umgestellt.

**Schritt 6 (AI) braucht die Backend-Klassifikation als Input.** Sobald der Detector sagt "diese drei Definitionen sind Tokens", kann der AI-Prompt informierter werden (oder explizit unstrukturiert bleiben — siehe Entscheidung in #6).

**Schritte 7–8 sind die UI-Überholung — und sie sind riskant.** Tab-Strip dynamisch zu machen brüht hardcoded HTML; Explorer-Panel zu aktivieren bringt Activity-Bar-Logik wieder ins Spiel. Bevor wir das anfassen, sollte der Backend-Teil bombenfest sein, sonst kollabieren UI-Bugs mit Compiler-Bugs und werden unmöglich auseinanderzuhalten.

### Warum nicht UI-first?

UI-first wäre, die Tabs/Explorer zuerst dynamisch zu machen und dann "irgendwie" mit dem alten Compiler zu verheiraten. Versuchung dabei: visueller Fortschritt schnell sichtbar.

Verworfen, weil:

1. UI ohne Backend = Tabs für `.mir`-Files, die der Compiler nicht versteht. Bug-Show garantiert.
2. UI-Änderungen sind teuer — ich will nicht zwei Mal ran (einmal für Provisorium, einmal für Final).
3. Der Wert von "User kann mehr Files anlegen" entsteht ERST, wenn der Compiler sie auch verarbeiten kann.

---

## Was sich an existierenden Tests ändert

**Compiler-Tests**: Neue Suite `tests/compiler/multifile/` für Detector + Validator. Existierende Project-Mode-Tests in `tests/cli/` weiter grün, weil Project-Mode-Reihenfolge gleich bleibt.

**Studio Browser-Tests**:

- `editor/file-tabs.test.ts` (heutige Suite) — bleibt grün, weil DEFAULT_PROJECT wieder 4 Files anlegt; Tabs sind nun dynamisch aber initial-Zustand identisch (4 Tabs sichtbar).
- `sync/cursor-selection-sync.test.ts` — multi-file Tests sollten ohne Änderung passen (sie testen das `editorTracksCompileSource`-Verhalten, das unverändert bleibt).
- Neue Suite `editor/explorer.test.ts` für Add/Delete/Rename/Open-Folder.
- Neue Suite `agent/multifile-patch.test.ts` für `@@FILE`-Header-Parsing, Multi-File-Apply-Transaktion (incl. Failure → kein partielles Schreiben), MultiFilePatchCommand-Undo/Redo, Validator-Loop mit Cross-File-Errors.

**Demo-Tests** (`demo-tabs.test.ts`): muss neu denken, weil die DEMO-Konstante 4 Files in einer flachen String-Konkatenation verwendet. Mit dem neuen Loader wäre das immer noch die Sortierung "data → tokens → components → app", also weiterhin korrekt — die Test-Konstante kriegt nur neue Filenames.

---

## Was bleibt offen (und ob das blockiert)

| Punkt                                                                        | Blockiert?                                | Diskutieren wann                                                                                                |
| ---------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Wie sieht das Modal/Inline-Input zum `+ new file` genau aus?                 | nein                                      | bei Schritt 8                                                                                                   |
| Soll `delete file` Confirmation-Dialog haben?                                | nein                                      | bei Schritt 8                                                                                                   |
| Soll der Preview-Entry-Indikator klickbar sein zum Wechseln?                 | nein, in Phase 1 ohnehin nur ein `canvas` | später                                                                                                          |
| Soll AI-Edit-Flow rückwärtskompatibel mit alten `.tok`/`.com`-Files bleiben? | ja, Phase 1                               | bei Schritt 6 — wir lesen, was da ist, egal welche Endung                                                       |
| Limit für Anzahl Files in einem AI-Patch?                                    | nein, kein hartes Limit                   | bei Schritt 6b — UI-Summary skaliert visuell mit Anzahl, ab ~5 Files würde ein scrollbarer Pane sinnvoll werden |
| Werden bestehende Tutorial-Playgrounds gebrochen?                            | nein, sind Single-File                    | bei Schritt 5 / Tutorial-Update                                                                                 |

Keiner blockiert den Start.
