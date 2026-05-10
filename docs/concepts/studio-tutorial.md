# Konzept: Vollständiges Mirror Studio Tutorial

> Status: Konzept · 2026-05-10 · Diskussionsgrundlage, noch nicht implementiert

## Ziel

Ein Tutorial, das jemandem ohne Mirror-Vorerfahrung in **<60 Minuten** beibringt, Studio bedien-sicher zu benutzen — von der ersten Zeile Code bis zum Multi-File-Projekt mit States, Tokens und AI-Edits. Kein Kurs, keine Vortragsreihe — eine Reihe von **kurzen, fokussierten Lerneinheiten**, die je einen Workflow vollständig zeigen.

## Zielgruppen (in Reihenfolge der Wichtigkeit)

1. **Designer**, die mit AI generierten Mirror-Code selbst tweaken wollen — größte Audience, geringste Vorbildung. Brauchen viele Pausenpunkte, viel Visual.
2. **Reviewer von AI-Output**, die schnell prüfen wollen ob das Generierte sinnvoll ist — wollen nicht das Tool lernen, sondern wissen wo welche Information ist.
3. **Entwickler**, die Mirror-Output in Frameworks weiterverwenden — brauchen das Tool seltener, aber präzise (Edge-Cases, Export, Validierung).

→ Tutorial ist primär für (1), Sekundärnutzen für (2) und (3) durch klar gegliederte Querverweise statt eigener Versionen.

## Was bisher existiert

| Kapitel | Inhalt | Format | Status |
| --- | --- | --- | --- |
| 01-16 | DSL (Sprache) | Prosa + Playgrounds | ✓ |
| 17 | AI-bauen (Sketches, Trailing) | Prosa + 2 Loop-Videos | ✓ |
| 18 | Studio bedienen (Drop, Inline-Edit, Resize, Padding/Margin, Property-Panel, Reorder, Code→Preview, Multi-File) | Prosa + 8 Loop-Videos | ✓ |

10 Loop-Videos insgesamt, alle aufgenommen via `tools/test-runner/demo/scripts/tut-*.ts`, validiert per `expectCode`-Snapshots. Reproduzierbar.

## Was im aktuellen Stand fehlt

### Studio-Features ohne Tutorial-Coverage

Aus `studio/`-Modulen abgeleitet:

| Bereich | Fehlt heute | Wieviele Loops/Sektionen geschätzt |
| --- | --- | --- |
| **Pickers** (`studio/pickers/`) | Color-Hex+Token-Tab, Token-Picker mit Kontext, Icon-Picker (Lucide+Custom), Animation-Picker, Action-Picker | 4-5 |
| **Visuelle Operationen** (`studio/visual/`) | Smart-Guides + Snap, Grid-Layout draw-mode, Layout-Inference (Drop multiple → auto `hor`), Position-Controls (absolute/grid), Stack-Selection | 4-6 |
| **Komponenten-Workflow** (`studio/panels/components/`) | Komponente extrahieren (`::`-Trigger), Slot-Editing, Komponenten-Bibliothek-Panel, Komponente in `.com`-File auslagern | 3-4 |
| **Tokens-Workflow** (`studio/pickers/token/`) | Token-Extraktion (Wert → Token + alle Vorkommen ersetzen), Token rename, Token referenzieren in `.tok` | 2-3 |
| **States im Studio** (`studio/panels/property/`) | State-Editor im Property-Panel, hover/focus/active-Tabs, Custom-State-Definition | 2-3 |
| **Refactoring** (`studio/rename/`) | F2-Rename cross-file, Move-Across-Files, Sync-Coordinator-Verhalten | 2 |
| **Code-Editor** (`studio/editor/`, `studio/autocomplete/`) | Autocomplete für Properties, Token-Completion, Component-Slot-Completion, Cmd+P, Cmd+F | 2-3 |
| **Tree-Panel** (`studio/panels/tree/`) | AST-Navigation, Element selektieren, Drag-im-Tree | 1-2 |
| **Settings & Theme** (`studio/panels/settings/`) | User-Settings, Default-Werte, Theme-Switch | 1 |
| **Run/Play-Mode** (`studio/preview/`) | Interaktives Preview, States triggern, Form-Inputs testen | 1-2 |
| **Validierung & Errors** (`compiler/validator/`) | Lint-Hinweise im Editor, Fehlerquick-Fix, Schema-Mismatches | 1 |
| **Export** (`tools/export.ts`) | Mirror → Spec-Bundle, AI-Bridge, Run-Claude-Knopf | 1-2 |
| **Tastatur** | Globale Shortcuts (Esc/Tab/Cmd+Z/Cmd+P/F2/…) | 1 Reference-Tabelle |

→ Vollständige Coverage: **25-35 weitere Loop-Videos** + **3-5 längere geführte Videos** (für komplexere Workflows) + **1-2 Reference-Tabellen** verteilt auf **6-8 neue Kapitel**.

## Format-Mix

Nicht jede Studio-Bedienung verträgt das gleiche Format. Vorschlag:

### Loop-Video (25-45s, autoplay/loop, ohne Audio) — *bevorzugte Form*

**Wann:** ein Workflow mit klarem Anfang und Ende, der sich in 30s zeigen lässt.
**Stärke:** kein Audio nötig (international), Loop schließt sich naturgemäß, im Browser-Tab unauffällig.
**Schwäche:** keine Erklärung von "warum" — nur "wie sieht es aus".

→ Trägt 80% der Inhalte. Die heutigen 10 Loops sind Beispiele.

### Geführtes Video (1-3 min, mit On-Screen-Captions, ohne Audio)

**Wann:** ein Workflow, der mehrere Schritte hat, die nicht offensichtlich zusammenhängen — z.B. "Komponente extrahieren": selektieren, `::`-Syntax tippen, Trigger-Pop-up, Name vergeben, Auto-Replace bestätigen.
**Stärke:** Captions führen ohne Audio durch die Schritte.
**Schwäche:** länger, nicht loop-bar, braucht Play/Pause.

→ 3-5 Stück für die komplexen Workflows.

### Interaktiver Playground (in-browser, editierbar)

**Wann:** wenn die DSL-Syntax verstanden werden muss und nur das Ergebnis zählt — wie heute schon in Kapiteln 1-16.
**Stärke:** User experimentiert selbst, lernt durch Versuch.
**Schwäche:** zeigt das Studio-Tool nicht, nur den DSL-Output.

→ Sparsam in Studio-Tutorials einsetzen — ein Playground in Kapitel 22 zur Übung des Property-Panel-Outputs (User selbst tippt, vergleicht Effekt).

### Prosa + Inline-Code

**Wann:** Konzepte, die zuerst verstanden werden müssen — Studio-Architektur (drei Sichten, SourceMap), die fünf Mirror-Prinzipien aus CLAUDE.md, das State-Modell.
**Stärke:** Dichte > Video-Speed.
**Schwäche:** muss gelesen werden.

→ Jedes Kapitel hat 1-2 Prosa-Sektionen vor den Videos.

### Reference-Tabelle (Tastatur, Properties, Picker-Wertebereiche)

**Wann:** zum Nachschlagen.
**Stärke:** durchsuchbar, kompakt.
**Schwäche:** lehrt nicht, nur erinnert.

→ Zwei: globale Tastatur-Shortcuts + Property-Panel-Quick-Reference.

## Vorgeschlagene Kapitel-Struktur (vollständig)

Aufbauend auf dem heutigen Kapitel 18:

```
17: AI-unterstütztes Bauen          ✓ (heute, ~2 Loops)
18: Studio bedienen — Bidirektional ✓ (heute, 8 Loops)
19: Pickers — Farbe, Token, Icon, Animation, Action  [neu, 4-5 Loops]
20: Komponenten-Workflow — extrahieren, Slots, .com-Files  [neu, 1 Geführt + 2 Loops]
21: Tokens-Workflow — definieren, extrahieren, rename  [neu, 3 Loops]
22: Visuelles Editieren — Smart-Guides, Snap, Grid, Layout-Inference  [neu, 4 Loops]
23: States im Studio — Hover/Focus/Custom + State-Editor  [neu, 1 Geführt + 2 Loops]
24: Code-Editor — Autocomplete, Cmd+P, Cmd+F, F2-Rename  [neu, 3 Loops]
25: Multi-File-Projekt — File-Explorer, Cross-File-Refactor, Sync  [neu, 2 Loops; teilw. heute]
26: Run-Mode + Debugging — Play, Validation, Errors  [neu, 2 Loops]
27: Export & Deploy — Mirror → React/Vue/Svelte/HTML, AI-Bridge  [neu, 1 Geführt + 1 Loop]
28: Reference — Tastatur, Property-Panel-Cheatsheet  [neu, Tabellen]
```

11 Kapitel insgesamt für Studio-Bedienung. Realistische Schätzung: **35-45 Loop-Videos + 4-6 geführte + 2 Reference-Tabellen**.

## Pro-Kapitel-Detail (skizziert)

### Kapitel 19 — Pickers

Studio hat 5 Pickers. Jeder ist im Property-Panel verlinkt aber öffnet als Floating-UI.

- **Loop 1: Color-Picker — Hex-Tab.** Klick auf Color-Trigger, Hex-Tab, Hex eintippen, Schwatch klicken. Zeigt: Picker-Anatomie, Eyedropper, Recent-Colors.
- **Loop 2: Color-Picker — Token-Tab.** Wechsel auf Token-Tab, Token wählen → `bg $name` im Code. Zeigt: Tab-Switch, Token-Liste mit Visualisierung.
- **Loop 3: Token-Picker.** Direkt aus Property-Panel → Token-Liste mit Kontext-Filter (welche Tokens passen zu dieser Property?). Zeigt: Suffix-Matching, Empty-State.
- **Loop 4: Icon-Picker.** Icon-Property öffnen → Lucide-Suche + Custom-Icons-Tab → Klick. Zeigt: Search, Visual-Grid, Custom-Icons aus `$icons:`-Section.
- **Loop 5: Animation-Picker.** Anim-Property → Preset-Liste mit Live-Preview-Hover. Zeigt: 20+ Presets, Preview im Hover, Custom-Duration-Eingabe.

→ Je 25-40s Loops, Tutorial-Mode (nur Property-Panel + Picker + Preview).

### Kapitel 20 — Komponenten-Workflow

Dies ist die komplexeste Studio-Funktion und braucht ein **geführtes Video**.

- **Geführt 1 (~2 min): Komponente extrahieren.** User hat dreimal denselben Frame-Aufbau. Klickt eine Instanz an, tippt `Card::` → Trigger-Popup → Name vergeben → Auto-Replace-Bestätigung → Definition oben + 3× Instanzen unten. Captions: "Doppelpunkt-Doppelpunkt triggert die Extraction", "Studio findet die Wiederholungen", "Properties wandern in die Definition".
- **Loop 1: Slot-Editing.** Komponente mit Title-/Desc-/Footer-Slots, jeder Slot bekommt Default-Properties via Inline-Edit am Definition-Punkt. Zeigt: Slot-Properties wirken auf alle Instanzen.
- **Loop 2: Komponenten-Bibliothek-Panel.** Components-Panel öffnen, Definition draggen → neue Instanz. Zeigt: Palette als 2-stufiger Container (Primitives + projekt-eigene Komponenten).

### Kapitel 21 — Tokens

- **Loop 1: Token definieren in `.tok`-File.** Heute schon teilweise in tut-08; hier voll mit Suffix-Erklärung.
- **Loop 2: Token-Extract — Wert auswählen, "Als Token speichern", alle Vorkommen ersetzen.** Sehr starke Demo des "Refactor durch Convention".
- **Loop 3: Token rename.** Token in `.tok` umbenennen → Studio aktualisiert alle Referenzen.

### Kapitel 22 — Visuelles Editieren (advanced)

- **Loop 1: Smart-Guides + Snap.** Drag eines Frames neben ein anderes — Guidelines erscheinen, Snap an der Kante. Zeigt: blue-line Guides, Snap-Threshold, Bypass mit Cmd-Hold.
- **Loop 2: Layout-Inference.** Mehrere Elemente droppen in einen vertical-Container → Studio fragt "Auto-horizontal?". Zeigt: Inferenz-Heuristik, Dialog, Auto-Edit.
- **Loop 3: Grid-Mode + Draw-Tool.** Container mit `grid 12` aktivieren → Draw-Modus → Rect aufziehen → `x/y/w/h`-Properties geschrieben. Zeigt: Grid-Overlay, Cell-Snap, Draw-Phase.
- **Loop 4: Position-Controls.** Element auf `absolute` setzen, dann freie Position via Drag. Zeigt: Toggle-Position-Mode, x/y-Properties.

### Kapitel 23 — States im Studio

- **Geführt 1 (~90s): Hover-State editieren.** Element selektieren, State-Tab im Property-Panel auf "Hover" → Properties ändern → Code zeigt `hover:`-Block. Hover über das Element im Preview → State sichtbar. Captions: "Property-Panel hat einen State-Reiter", "Werte hier landen im hover-Block".
- **Loop 1: Custom-State.** `myState` definieren, `toggle()` an Button → Klick im Preview triggert State.
- **Loop 2: Multi-State.** Drei State-Tabs (todo/doing/done), `toggle()` cyclet. Zeigt: state-Reihen im Panel, Cycle-Verhalten.

### Kapitel 24 — Code-Editor

- **Loop 1: Autocomplete — Property-Namen.** Tippen `bg`, Suggestion-Liste, Tab. Zeigt: Property-Vorschläge, Snippet-Insert.
- **Loop 2: Autocomplete — Token + Component-Slots.** `$tok…` → Token-Liste; `Card\n  Tit…` → Slot-Liste. Zeigt: Context-Aware-Completion.
- **Loop 3: Cmd+P + Cmd+F.** Cmd+P → File-Switch (Multi-File-Projekt), Cmd+F → Find/Replace im Editor.
- **Loop 4: F2-Rename.** Symbol selektieren, F2, neuer Name, Tab → cross-file refactored. Zeigt: Rename-Surface, Preview-Diff, Bestätigen.

### Kapitel 25 — Multi-File (vertieft)

Aufbauend auf tut-08:
- **Loop 1: File-Operations.** Erstellen/Umbenennen/Löschen via Explorer, Drag-Reorder.
- **Loop 2: Cross-File-Effekte.** Token in `.tok` ändern → Layouts updaten live. Component in `.com` ändern → Instanzen updaten.

### Kapitel 26 — Run-Mode

- **Loop 1: Play-Mode toggle.** Editor-Mode → Play-Mode → Buttons sind klickbar, States cyclen, Form-Inputs editierbar. Zeigt: Mode-Toggle, Live-Behavior.
- **Loop 2: Validation-Errors.** Tippe ungültiges Property → Lint-Markierung im Editor. Zeigt: rote Wellenlinie, Quick-Fix-Vorschlag.

### Kapitel 27 — Export

- **Geführt 1 (~2 min): Spec-Bundle erzeugen.** Toolbar-Export-Knopf → Target wählen (React/Vue/Svelte/HTML) → Snapshot-Toggle → "Run Claude". Captions erklären die Pipeline.
- **Loop 1: Self-contained HTML deployen.** `mirror-build app.mir` im Terminal — Output-Datei. Tutorial zeigt CLI-Aufruf + Result-File.

### Kapitel 28 — Reference

Zwei Tabellen (Tabellen-Layout aus Kapitel 18-Summary):

- **Tastatur-Shortcuts.** Cmd+Enter, Esc, Tab, Cmd+Z, Cmd+P, Cmd+F, F2, Esc/Cmd-Hold beim Drag.
- **Property-Panel-Cheatsheet.** Welche Properties sind wo? Sizing → width/height/min/max. Layout → gap/hor/ver/center/spread. Spacing → pad/mar mit Handles. Color → bg/col/boc/ic mit Picker. Border → bor/boc/rad. Typo → fs/weight/font/line. Effects → shadow/opacity/blur. Animation → anim mit Picker.

## Produktions-Workflow

Standardisiert pro Loop-Video:

```
1. tools/test-runner/demo/scripts/tut-NN-name.ts schreiben
   (modeled nach existierenden tut-*.ts)
2. npx tsx tools/test.ts --demo=… --pacing=instant
   → smoke-pass, ggf. Selektoren tunen
3. expectCode learn-mode → strict-mode
   → assertion gegen tatsächlichen Output
4. npx tsx tools/test.ts --demo=… --pacing=video --headed --record=…
   → docs/tutorial/videos/tut-NN-name.webm
5. <video src> in dem entsprechenden Kapitel-HTML einbetten + Caption
6. git commit
```

Geführte Videos benötigen zusätzlich:

- **On-Screen-Captions** als HTML-Overlay auf dem Video (kein eingebrannter Text — User-Browser rendert separate Text-Layer mit fade-in-out)
- Caption-Timing als JSON-Sidecar zum Video
- Studio-Modus: Panels die für die Demo nötig sind sichtbar lassen

→ Caption-Renderer: kleine JS-Komponente (`tutorial/captions.js`) die `<video>` + `<json src>` matcht und Captions overlay'd. ~50 Zeilen Code.

## Qualitätskriterien

Verbindlich für jeden neuen Inhalt:

1. **Zwei-Sicht-Regel.** Jedes Studio-Video zeigt simultan die Geste (Preview/Panel/Picker) UND ihren Code-Effekt. Keine Geste ohne sichtbaren Diff.
2. **Echte UI-Interaktion.** Test-Runner darf nicht auf programmatischen Fallback fallen wenn der UI-Pfad demonstriert werden soll. Konkret: `setProperty` darf den `data-prop`-Input finden müssen, nicht via `panel.changeProperty()` Fallback.
3. **Strict-expectCode-Validierung.** Jede mutierende Aktion hat ein `expectCode` mit dem konkret erwarteten Editor-Stand. Compiler-Drift schlägt sofort fehl.
4. **Loop-tauglich.** Loops enden mit demselben visuellen Zustand wie Anfang oder mit deutlicher End-Pause (~1.5s). Kein abruptes Cut zurück zum Anfang.
5. **Bestand-frei.** Jedes Tutorial setzt Studio nach `?demo=blank` zurück oder nutzt `resetCanvas`/`resetMultiFileProject`. Keine Abhängigkeit von vorherigem Test.
6. **Mirror-Konvention.** Code in den Videos folgt den 5 Mirror-Prinzipien (Tokens statt Hex, Layouts ohne Formatierung, sprechende Komponentennamen). Tutorial-Code ist Vorbild.

## Wartung

### Was bricht und wann?

| Trigger | Was bricht | Wie schnell entdeckt? |
| --- | --- | --- |
| Compiler-Backend ändert Default-Werte (z.B. neue dropFromPalette-Default-Properties) | `expectCode`-Asserts | Sofort (CI / nächster instant-Run) |
| Studio-UI ändert sich (Panel-Layout, Selektoren, Picker-Aufbau) | Selektoren in Demo-Scripts | Beim nächsten headed-Re-Run |
| Property-Panel ändert `data-prop`-Attribute | `setProperty`-Inputs nicht mehr findbar | instant-Run zeigt Fallback-Warnung |
| Tutorial-Mode (panel-hide) ändert sich | Tutorial-Mode-Fragment muss aktualisiert werden | Headed-Run zeigt unerwünschte Panels |
| Mirror-DSL ändert Property-Aliase | Code-Snapshots stimmen nicht mehr | `expectCode`-MISMATCH |

### Wartungs-Routine

- **Pro Sprint:** Spot-Check der Tutorial-Seiten im Browser (autoplay funktioniert, Loop sauber).
- **Bei Studio-UI-Touch:** Demo-Scripts re-run + ggf. neu aufnehmen.
- **Vor Release:** Vollständiger headed-Re-Run aller Demos via `npm run test:demos:headed`.
- **CI:** instant-Run aller Demos in CI als Smoke-Test (kein Recording, nur Validation).

### Wer wartet das?

Die Demos sind als E2E-Tests konzipiert (das war der Punkt der `expectCode`-Refactoring-Runde). Ändert jemand Studio-Internals und ein Demo failt, gehört das zur Implementierungs-Aufgabe — wie ein normaler Test-Failure. Nicht als "Tutorial-Pflege" rotated.

## Offene Trade-offs

Klärung nötig bevor Implementierung beginnt:

### A. Audio-Narration ja/nein?

**Pro Audio:** klarere Erklärung komplexer Workflows, weniger Caption-Lese-Last.
**Contra Audio:** internationaler Reichweite-Verlust (Sprache + Akzent), Wartung (Re-Sprechen bei Änderung), höhere Bandwidth.

→ **Empfehlung:** kein Audio, weiter wie heute. Geführte Videos nutzen On-Screen-Captions. Wenn später nötig, per i18n-Caption-Tracks nachgerüstet.

### B. Sprache: Deutsch only oder zweisprachig?

Aktuelle DSL- und Studio-Tutorials sind Deutsch. Mirror's Zielmarkt ist primär CH/DE/AT.

**Pro nur Deutsch:** klares Branding, niedriger Wartungsaufwand.
**Contra:** internationaler Vertrieb erschwert.

→ **Empfehlung:** vorerst nur Deutsch (MVP). Englische Spur später als zweiter HTML-Pfad mit denselben Videos (Captions-i18n).

### C. Bandwidth & Hosting

**Bei 50 Videos × ~250-500KB:** ~15-25MB statisch.
**Hosting:** heute `dist/`-Build → CDN. Skaliert.

→ Kein Problem.

### D. Ist ein vollständiges Tutorial der richtige Ansatz?

**Alternative:** kontextuelle Hilfe im Studio selbst (Tooltips, "Show me how"-Knöpfe pro Feature).

**Pro Tutorial:** lineares Lerninvestment möglich, gemeinsame Sprache "siehe Kapitel 22", abrufbar offline.
**Contra Tutorial:** veraltet schneller als kontextuelle Hilfe, User muss zur Tutorial-URL.

→ **Empfehlung:** Tutorial als primäres Lernen-Format, kontextuelle Hilfe als Verweis ("Mehr → Kapitel 22"). Beide stützen sich.

### E. Ein-Konzept-pro-Video oder Workflow-orientiert?

Heutige tut-NN-Scripts sind ein-Konzept-pro-Video (atomar). Alternative: **Workflow-Bündel** wie "Eine Card bauen von Anfang bis Ende" (~3 min).

**Pro Atomar:** wiederverwendbar als Referenz, kürzer, leichter zu warten.
**Contra:** zusammenhängende User-Story fehlt.

→ **Empfehlung:** **atomar bleiben**, dazu **2-3 Workflow-Bündel** als geführte Videos (Kap. 20, 23, 27 wie oben skizziert).

## MVP vs Vollständig

### MVP (das Tutorial das **jetzt** sinnvoll wäre)

Nur die wirklich häufigen Workflows:

- Kapitel 17-18 (heute) ✓
- **Kapitel 19** Pickers (4-5 Loops)
- **Kapitel 21** Tokens (2 Loops; weniger als Vollausbau)
- **Kapitel 24** Code-Editor — **nur Autocomplete + Cmd+P + F2** (3 Loops)
- **Kapitel 28** Reference (1 Tabelle: Tastatur)

→ ~12-15 zusätzliche Loops, **~1-2 Arbeitstage Produktion**.

### Vollausbau (alles oben aufgelistet)

→ ~35-45 zusätzliche Loops + 4-6 geführte + 2 Reference, **~5-7 Arbeitstage Produktion**.

### Empfehlung

**MVP zuerst** — die häufigen Workflows decken 80% der Studio-Nutzung. Vollausbau iterativ über mehrere Sprints, getrieben durch User-Feedback ("was war unklar?").

## Nächste Schritte

1. Diese Konzept-Datei reviewen + Trade-offs A-E entscheiden.
2. MVP-Scope final freigeben (Kapitel 19 / 21 / 24 / 28).
3. Pro Kapitel: Demo-Scripts schreiben → smoke → record → embed → commit. Pro Kapitel ein eigener Commit.
4. Nach MVP: User-Feedback einsammeln — Tutorial 1× durchgehen mit drei Personen aus den Zielgruppen, beobachten wo sie stocken. Daraus Vollausbau-Reihenfolge.
5. Vollausbau iterativ umsetzen.

## Wichtige Dateien (zur Orientierung)

| Datei | Zweck |
| --- | --- |
| `docs/tutorial/index.html` | DSL-Tutorial-Übersicht (Kap. 01-16) |
| `docs/tutorial/17-ai-bauen.html` | AI-Workflows (heute) |
| `docs/tutorial/18-studio.html` | Studio-Bedienung Basis (heute) |
| `docs/tutorial/videos/tut-*.webm` | 10 Loop-Videos (heute) |
| `tools/test-runner/demo/scripts/tut-*.ts` | Reproduzierbare Demo-Scripts |
| `tools/test-runner/demo/types.ts` | Demo-Action-Vokabular (was im Runner unterstützt ist) |
| `tools/test-runner/demo/fragments/setup.ts` | `resetCanvas`, `validateStudioReady` |
| `tools/test-runner/demo/fragments/tutorial-mode.ts` | Panels für Tutorial-Aufnahme verstecken |
| `tools/test-runner/demo/fragments/multi-file.ts` | `resetMultiFileProject` |

## Anhang — Demo-Action-Repertoire (was geht heute)

Aus `tools/test-runner/demo/types.ts`:

- `dropFromPalette`, `moveElement`, `drawInGrid`
- `dragResize`, `dragPadding`, `dragMargin`
- `inlineEdit`
- `selectInPreview`, `setProperty`, `pickColor`
- `aiPrompt` (mit Mock-Fixtures)
- `type`, `pressKey`, `setEditorCursor`
- `createFile`, `switchFile`
- `expectCode`, `expectCodeMatches`, `expectDom`
- `validate` (DOM-Selectors)

**Nicht abgedeckt** (für vollständige Coverage müssten hinzukommen):

- Trigger-Pop-up-Interaktion (für `Card::`-Extract) → bräuchte `extractComponent`-Action im Runner-Layer (heute nur in Test-API-Step-Runner)
- Smart-Guides-Visualisierung als Validation (heute nur Pixel-Diff via Snapshot)
- F2-Rename-Flow (Rename-Surface öffnen, neuer Name, Confirm)
- Cmd+P-Quick-Switch (Tastatur-Shortcut + Fuzzy-Search-UI)
- Picker-Tab-Switch (Hex ↔ Token im Color-Picker)

→ Vor Vollausbau: 3-5 neue Demo-Actions im Runner ergänzen. Pro Action ~50-100 Zeilen TS, modeled nach existierenden Handlers.
