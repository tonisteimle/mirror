# LLM-Edit-Flow — Konzept

> **Status**: Konzept (noch nicht implementiert). **Anforderungen**.
> Umsetzungsplan in [`llm-edit-flow-plan.md`](./llm-edit-flow-plan.md)
> (IST-Analyse, Gap, Zielarchitektur, Tasks).
>
> Beschreibt den primären AI-Interaktions-Modus des Mirror Studios: der
> User schreibt frei (Prosa, unsauberes Mirror, präzises Mirror), das LLM
> schweigt — bis der User _explizit_ mit `Cmd+Enter` darum bittet, den
> Code zu überarbeiten. Antworten kommen als **Search/Replace-Patches**
> und werden dem User als **Diff-Ghost** zur Bestätigung vorgelegt.
>
> Ersetzt langfristig die Idee eines "ambient" Auto-Suggest-Modus, der
> während des Tippens Vorschläge einblendet (verworfen nach Workshop-
> Diskussion 2026-04-29 — Begründung: Bevormundung, User verliert
> Kontrolle, Trigger-Heuristiken kollidieren mit Schreibfluss).
>
> **Ablöst:** den existierenden `??`-Draft-Mode
> (`docs/concepts/ai-assisted-card-demo.md`). Der `??`-Mode wird in
> Phase 3 der Implementation **vollständig entfernt** (siehe
> [`llm-edit-flow-plan.md`](./llm-edit-flow-plan.md) §3.5, §4.4).
> Es gibt keine Coexistenz-Periode.

## Motivation

Mirror ist eine DSL, die Menschen lesen können — nicht nur Maschinen.
Damit wird sie zum natürlichen Kommunikationsmedium zwischen User und
LLM: **der User schreibt, was er meint** (Prosa, unvollständiges Mirror,
präzises Mirror), **das LLM übersetzt das in saubere Mirror-Spec**.

Die zentrale UX-Frage ist: _wann und wie greift das LLM ein?_ Nach
Workshop-Diskussion und Iteration ist die Antwort:

> Das LLM schweigt, bis der User explizit ruft. Der User bleibt jederzeit
> in voller Kontrolle.

Damit ist dieser Flow **die primäre AI-Interaktion** im Studio — nicht
ein "Feature" neben anderen, sondern der Hauptweg, wie ein Designer mit
AI-Hilfe Mirror schreibt: er denkt frei, schreibt frei, und holt sich
Korrektur/Ergänzung/Refactoring punktgenau dort, wo er es will.

## Prinzipien

1. **Stille als Default.** Das LLM tut nichts, bis es gerufen wird. Kein
   Auto-Trigger, kein Idle-Polling, kein "ambient" Verhalten. Während der
   User schreibt, ist das LLM nicht im Weg.
2. **User-Kontrolle ist heilig.** Jede LLM-Änderung ist sichtbar (Diff),
   reversibel (Esc), und idealerweise editierbar (Ghost-Edit) bevor sie
   wirksam wird.
3. **Mirror IST die Spec.** Wir bauen keine zweite Spec-Schicht. Prosa-
   Zeilen (`-- text`) sind valide Mirror und stehen als Intent-Header
   neben dem generierten Code.
4. **LLM löst Code-Probleme, nicht Format-Probleme.** Das Patch-Format
   ist für das LLM trivial (Mirror-Snippets als Anker, Mirror-Snippets
   als Replace). Die mechanische Arbeit (Suchen, Anwenden, Diffen) macht
   der Client.
5. **Ein Mechanismus, drei Modi.** `Cmd+Enter` (Doc), `Cmd+Enter` mit
   Selection (Doc + Focus), `Cmd+Shift+Enter` (Doc + Focus + Instruction).
   Mehr Modi schaffen Verwirrung.

## Anforderungen

### Funktional

- **F1 — Freies Schreiben.** Der User kann frei schreiben (Prosa,
  unsauberes Mirror, korrektes Mirror) ohne dass das LLM unaufgefordert
  eingreift. Es gibt keine Trigger-Heuristik die "lossendet, wenn die
  Eingabe unvollständig aussieht" o.ä.
- **F2 — Cmd+Enter (basic).** Drückt der User `Cmd+Enter` ohne Selection,
  wird der gesamte aktuelle File-Source ans LLM übergeben mit der
  Aufgabe, ihn zu überarbeiten/ergänzen/korrigieren.
- **F3 — Cmd+Enter mit Selection.** Hat der User Text markiert, geht das
  LLM von "fokussiere auf diese Selection" aus. Es darf trotzdem
  ausserhalb der Selection ändern, wenn nötig (z.B. um einen referenzierten
  Token nachzuziehen) — selten, aber legitim.
- **F4 — Cmd+Shift+Enter.** Öffnet ein **Inline-Prompt-Feld** neben dem
  Cursor, in das der User eine textuelle Anweisung eingibt
  ("extrahiere als Komponente", "mach das responsive"). Diese Anweisung
  wird zusätzlich zu Source/Selection ans LLM gesendet. Funktioniert mit
  oder ohne Selection.
- **F5 — Kontext-Bündel ans LLM.** Bei jedem Aufruf erhält das LLM:
  - den vollständigen aktuellen File-Source,
  - die Cursor-Position (Zeile + Spalte),
  - die Selection-Range (falls vorhanden),
  - den **Diff seit dem letzten LLM-Call** (gecappt, siehe NF3),
  - die User-Instruction (nur F4),
  - Token- und Komponenten-Kontext aus anderen Projekt-Files (analog zu
    bestehendem `studio/agent/draft-prompts.ts`).
- **F6 — Search/Replace-Patches als Antwort.** Das LLM antwortet mit
  einem oder mehreren Search/Replace-Blöcken (Format siehe
  [Patch-Format](#patch-format)). Kein JSON, keine Zeilennummern.
- **F7 — Anker-Validierung mit Retry.** Patches werden client-seitig auf
  **Anker-Uniqueness** geprüft (das FIND-Snippet muss exakt einmal im
  Source vorkommen). Bei Mehrdeutigkeit oder Nicht-Match: **automatischer
  Retry** mit Hinweis ans LLM ("dein Anker matched 0/3 Stellen, gib mir
  mehr Kontext-Zeilen drumherum"). Maximal _N_ Retries (Default: 2),
  dann Fehler.
- **F8 — Diff-Ghost als Visualisierung.** Erfolgreich applizierte Patches
  erzeugen einen vollständigen Doc-Diff (Original vs. Working-Copy), der
  als **Ghost-Overlay** im Editor dargestellt wird (rot/strikethrough für
  entfernte Zeilen, grün für neue). Der echte Doc-Inhalt bleibt
  unverändert bis User akzeptiert.
- **F9 — Akzept-/Verwerfen-/Edit-Gesten.**
  - `Tab` → akzeptieren (Diff wird zum echten Source).
  - `Esc` → verwerfen (Source bleibt wie vor dem Aufruf).
  - **MVP-V2**: Tippen im Ghost → Ghost wird editierbar bevor akzeptiert.
- **F10 — Cancel.** Während eines laufenden LLM-Calls kann der User
  jederzeit canceln (Esc, oder neuer Aufruf macht Re-Capture).

### Nicht-funktional

- **NF1 — Reuse existierender Infrastruktur.** Bridge zum LLM bleibt der
  `scripts/ai-bridge-server.ts` (HTTP) bzw. `window.TauriBridge.agent`
  (Desktop). Kein neuer Transport.
- **NF2 — Minimaler Studio-State-Footprint.** Keine zusätzliche Kopplung
  zum Studio-Core-State, der nicht schon für `??`-Draft-Mode existiert.
- **NF3 — Latenz-Toleranz mit Cap.** User wartet bewusst, daher sind
  3–5 s Antwortzeit akzeptabel solange transparent kommuniziert
  ("denkt…"-Indicator). Diff-since-last-Call ist hart auf z.B. 200 Zeilen
  Änderungen gecappt, um Prompt-Bloat zu vermeiden.
- **NF4 — Keine destruktiven Änderungen ohne explizite Bestätigung.**
  Der Source ändert sich erst nach `Tab`-Akzept. Bei Cancel/Esc bleibt
  alles wie zuvor — auch im Studio-State (kein temporärer Save).
- **NF5 — Provenance.** Akzeptierte LLM-Änderungen sind als ein einzelner
  Undo-Step im History sichtbar (ein `Cmd+Z` macht den ganzen Patch-
  Apply rückgängig). Optional later: Provenance-Marker im Source-Map
  ("diese Zeilen kamen aus LLM-Call vom Zeitpunkt X").

## User Flow

### Modus 1 — `Cmd+Enter` ohne Selection

```
[Editor: User hat geschrieben, Cursor irgendwo]
        │
        ▼  Cmd+Enter
[Status: "denkt…"] ────────────────────┐
        │                              │
        ▼                              │
[Capture: source + cursor + diff]      │
        │                              │
        ▼                              │
[Bridge → claude → patches]            │
        │                              │ (Esc cancels)
        ▼                              │
[Anchor-check + apply auf Working-Copy]│
        │                              │
        ▼                              │
[Doc-Diff berechnen]                   │
        │                              │
        ▼                              │
[Ghost-Overlay rendert]  ◀─────────────┘
        │
        ▼  Tab        Esc        Tippen (V2)
        │   │          │          │
        │   ▼          ▼          ▼
        │  Apply    Discard    Edit-im-Ghost
        ▼
   Echter Source aktualisiert
```

### Modus 2 — `Cmd+Enter` mit Selection

Identisch zu Modus 1, ausser:

- Capture inkludiert Selection-Range.
- Prompt enthält den Hinweis "der User hat folgenden Bereich markiert,
  fokussiere dort: …".
- Anker-Validierung läuft trotzdem über den ganzen Source (LLM darf
  ausserhalb Selection ändern wenn nötig).

### Modus 3 — `Cmd+Shift+Enter`

```
[Editor: User hat geschrieben, evtl. markiert]
        │
        ▼  Cmd+Shift+Enter
[Inline-Prompt-Feld erscheint neben Cursor]
        │
        │  User tippt: "extrahiere als Card-Komponente"
        │
        ▼  Enter im Prompt-Feld
[Capture inkl. Instruction]
        │
        ▼
... (ab hier identisch zu Modus 1) ...
```

`Esc` im Prompt-Feld → Feld schliesst, kein LLM-Aufruf.

## Patch-Format

Das LLM antwortet mit einem oder mehreren Search/Replace-Blöcken:

```
@@FIND
Button "Speichern", bg #2271C1
@@REPLACE
Button "Speichern", bg #2271C1, col white, rad 6
@@END
```

### Regeln

- **Anker exakt.** Der `FIND`-Block muss **byte-genau** im Source
  vorkommen (case-sensitive, whitespace-sensitive — auch Einrückung).
- **Anker unique.** Wenn das `FIND`-Snippet 0 oder ≥2× im Source
  vorkommt, wird der Patch nicht angewendet — stattdessen Retry-Loop
  (siehe F7).
- **Mehrere Blöcke.** Pro Antwort beliebig viele Blöcke. Sie werden
  sequentiell auf eine **gemeinsame Working-Copy** angewendet (jeder
  Block sieht die Mutation des vorherigen).
- **Replace darf leer sein.** `@@FIND ... @@REPLACE @@END` mit leerem
  Replace-Block = Löschung der Anker-Stelle.
- **Komplette Datei-Ersetzung.** Soll das LLM die Datei strukturell
  umwerfen, gibt es einen einzigen Block, dessen `FIND` der gesamte
  Source ist. Vom Prompt diskouragiert (zu grob), aber technisch erlaubt.
- **Position der Blöcke im Output ist irrelevant.** Wir matchen
  anker-basiert, nicht position-basiert.

### Format-Disziplin durchsetzen

Im System-Prompt:

- **Beispiele** (1× einfacher Patch, 1× zwei Patches, 1× leerer Replace).
- **Regel "Anker MUSS unique sein"** mit Beispiel was passiert wenn
  nicht (Retry-Loop wird beschrieben).
- Hinweis: bei Unsicherheit lieber **mehr Kontext-Zeilen** im Anker als
  zu wenige.

### Retry-Loop bei Anchor-Fail

Wenn ein `FIND` nicht eindeutig matched:

1. Client baut Hint zusammen: `"Anker '<snippet>' matched 0× im Source"`
   bzw. `"...matched 3× — gib mir mehr Kontext-Zeilen drumherum"`.
2. Client schickt erneut an LLM mit Original-Prompt _plus_ Hint.
3. LLM liefert revidierte Patches.
4. Maximal `MAX_RETRIES` (Default 2). Danach: Fehler-Banner mit Option
   "manuell reparieren / verwerfen".

## Architektur

### Neue Module

```
studio/agent/
├── edit-flow.ts          # Orchestrator: capture → bridge → patches → diff
├── patch-format.ts       # Parser für @@FIND/@@REPLACE/@@END-Blöcke
├── patch-applier.ts      # Anker-Suche + Uniqueness-Check + Apply
├── edit-prompts.ts       # Prompt-Templates (Modi 1/2/3)
└── change-tracker.ts     # Diff seit letztem LLM-Call

studio/editor/
├── llm-keymap.ts         # Cmd+Enter / Cmd+Shift+Enter Bindings
├── ghost-diff.ts         # CodeMirror-Decoration für Diff-Overlay
└── prompt-field.ts       # Inline-Prompt-Widget (floating)
```

### Reuse aus existierender Infrastruktur

| Bestehend                          | Verwendung                                    |
| ---------------------------------- | --------------------------------------------- |
| `studio/agent/fixer.ts`            | Bridge-Call-Path (Tauri / HTTP) bleibt gleich |
| `studio/agent/draft-prompts.ts`    | `formatProjectFileSection()` für Token/Comp-  |
|                                    | Kontext wiederverwenden                       |
| `scripts/ai-bridge-server.ts`      | Unverändert                                   |
| `compiler/parser/`                 | Optional zur Anchor-Validierung (Anker muss   |
|                                    | parsable sein) — V2                           |
| Existierende CodeMirror-Extensions | History, Keymap-Layering, Decoration-API      |

### Datenfluss

```
[CodeMirror keymap]
  Cmd+Enter ─────► [edit-flow.ts: handleEdit()]
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  [editor.state]    [project files]   [change-tracker]
  source/cursor/    tokens + comps    diff since last call
  selection
        │                 │                  │
        └────────┬────────┴──────────────────┘
                 ▼
          [edit-prompts.ts]
          buildEditPrompt({ source, selection, cursor,
                            diff, instruction?, projectCtx })
                 │
                 ▼
          [fixer.ts → bridge → claude]
                 │
                 ▼
          [patch-format.ts] parse @@FIND/@@REPLACE/@@END blocks
                 │
                 ▼
          [patch-applier.ts]
            for each patch:
              if (uniqueMatch(find, source)) apply
              else accumulate retry-hints
            if any retries: re-call bridge with hints
                 │
                 ▼
          [diff(source_orig, source_workingCopy)]
                 │
                 ▼
          [ghost-diff.ts] render as CodeMirror Decorations
                 │
                 ▼
          [User: Tab / Esc / Edit]
```

## Integration mit existierender Codebase

### Verhältnis zum `??`-Draft-Mode (Ablösung)

Der bestehende `??`-Marker-Mechanismus (Zeilen-basiert, ein Block) ist
ein **altes Konzept** und wird durch diesen Flow vollständig **abgelöst**.
Er hat sich in der Praxis als zu eng (nur ein Block, nur an `??`-Marker
gebunden, kein Diff-Visualisierung) und konzeptuell verwirrend (zwei
parallele AI-Pfade) erwiesen.

Konkret:

- Nach Phase 3 der Implementation ist `??` **kein Code-Pfad mehr** im
  Studio — die Marker-Erkennung, der Keymap-Handler und alle
  zugehörigen Module sind gelöscht (Detail-Schritte: siehe
  [`llm-edit-flow-plan.md`](./llm-edit-flow-plan.md) §4.4).
- `Cmd+Enter` wird ab Phase 3 **unconditional** auf den neuen Flow
  gebunden, ohne Wrapping/Delegation.
- Falls in alten User-Files noch `??`-Marker stehen: sie werden vom
  neuen Flow als ganz normaler Text behandelt — das LLM sieht sie im
  Source-Kontext und kann sie mit-bearbeiten oder ignorieren.

Es gibt **keine** Coexistenz-Periode, **kein** Telemetrie-Gate, **keine**
Deprecation-Warning. Der Cut ist atomar und sauber.

### Verhältnis zum Property-Panel / Direct-Editing

Komplementär:

- User editiert direkt (Drag, Property-Panel, inline) → kein LLM
  involviert.
- Will der User AI-Hilfe → `Cmd+Enter`.
- Beide Pfade ändern denselben Source. Es gibt _keinen_ separaten
  "AI-Mode" der sich vom Direct-Edit-Mode unterscheidet.

### State-Konflikte vermeiden

Während eines laufenden LLM-Calls:

- Editor bleibt sichtbar; das LLM-Response-Ergebnis wird auf den
  **Source-Stand zum Zeitpunkt des `Cmd+Enter`** appliziert (Snapshot).
- Wenn der User währenddessen weiter tippt: Cancel des laufenden Calls
  (neuer `Cmd+Enter` macht Re-Capture).
- Während Diff-Ghost sichtbar: Direct-Edits sind blockiert (oder lösen
  Auto-Verwerfen aus — Entscheidung offen, siehe [Offene Fragen](#offene-fragen-entscheidungen)).
- Property-Panel-Aktionen während Ghost: ebenfalls blockiert / Ghost
  wird auto-verworfen.

## Bauphasen

### Phase 1 — Foundation _(eigenständig testbar)_

- `patch-format.ts`: Parser + Tests (vitest).
- `patch-applier.ts`: Anker-Suche, Uniqueness-Check, Apply, Tests.
- `change-tracker.ts`: Diff-Tracking (line-based, einfache `diff`-Lib).
- **Ergebnis:** Patches lassen sich isoliert testen, ohne UI/Bridge.

### Phase 2 — Prompt + Bridge

- `edit-prompts.ts`: Drei Prompt-Templates (Modi 1/2/3) + Format-Beispiele.
- `edit-flow.ts`: Skeleton-Orchestrator (ohne UI, command-line testbar
  via Eval-Driver).
- Erweiterung von `fixer.ts` um eine zweite Methode `runEdit(prompt)`,
  parallel zu `generateDraftCode()`.
- Eval-Set: 5–10 realistische Anfragen pro Modus, Bewertung Anker-Hit-Rate.

### Phase 3 — Editor-UI

- `ghost-diff.ts`: CodeMirror Decorations für red-strike-through und
  green-add-block. Kein echter Source-Change während Ghost aktiv.
- `llm-keymap.ts`: `Cmd+Enter` und `Cmd+Shift+Enter` als High-Priority-
  Bindings (gewinnen über Default-Tab-Indent etc).
- `prompt-field.ts`: Floating Inline-Prompt-Widget (Tom-Select-frei,
  einfache `<input>` mit Position-Tracking).
- Status-Indicator: "denkt…", "ready", "error" — sichtbar im Editor-
  Header.

### Phase 4 — Verfeinerung

- Anker-Retry-Loop (max 2 Retries mit Hints).
- Cancel-Handling (Esc cancelt In-Flight-Call sauber).
- Edge-Cases: leerer Source, sehr lange Files (Token-Budget), kein Bridge
  verfügbar (Fallback-Banner), Network-Timeouts.

### Phase 5 — Eval & Tuning

- Eval-Set ausbauen auf ~30 Beispiele über alle drei Modi.
- Prompt-Tuning bis Anker-Hit-Rate ≥ 95%.
- Latenz-Messungen, Entscheidung Streaming ja/nein (siehe Offene Fragen).

### Phase 6 — Edit-im-Ghost (V2)

Technisch nicht-trivial: Ghost ist eine Decoration, nicht echter Doc-
Inhalt. Optionen:

- (a) Ghost-Region wird beim ersten Tastendruck **commited als echter
  Source**, dann normal weitereditierbar — verliert die "Diff-Sicht"
  aber ist einfach.
- (b) Eigener Mini-Editor im Ghost-Overlay, der separat editierbar ist
  und beim `Tab`-Akzept gemerged wird — komplexer, aber bewahrt den
  Diff-Charakter.

Entscheidung in Phase 6 nach User-Test der Phase 1–5.

## Offene Fragen / Entscheidungen

1. **Streaming.** `claude` CLI streamt nicht direkt; Anthropic-SDK
   schon. Sollen wir für Phase 1 auf SDK wechseln (~500 ms-1 s Antwort
   mit Cache) oder beim CLI bleiben (~3–5 s Antwort, alles auf einmal)?
   Empfehlung: **CLI für Phase 1–4** (Konsistenz mit Studio), **SDK-
   Pfad evaluieren** wenn Latenz das UX-Problem #1 wird.

2. **Multi-Patch-Akzeptanz.** Soll der User einzelne Patches separat
   akzeptieren/verwerfen können, oder nur als Gesamt-Diff? Empfehlung:
   **Gesamt-Diff für MVP**, per-Patch-Akzept als V2-Option.

3. **Cross-File-Edits.** Ein `Cmd+Enter`, das mehrere Files ändert
   (z.B. Token in `tokens.tok` hinzufügen + im Layout verwenden).
   Phase 2 oder später? Empfehlung: **später** — MVP nur aktuelles File.

4. **Response-Cache.** Identische `Cmd+Enter`-Aufrufe mit identischem
   Kontext → cachen oder immer fresh? Empfehlung: **immer fresh** für
   MVP. User würde ein gecachtes Ergebnis erwarten dass das LLM
   "nochmal hingeguckt hat".

5. **`??`-Mode-Konsolidierung.** ~~Orthogonal lassen oder auf `Cmd+Enter`
   konsolidieren?~~ **Entschieden:** Ablösung in Phase 3 der Implementation,
   keine Coexistenz (siehe [`llm-edit-flow-plan.md`](./llm-edit-flow-plan.md) §3.5).

6. **Direct-Edit während Ghost.** Auto-Verwerfen oder blockieren?
   Empfehlung: **Auto-Verwerfen mit subtilem Toast** ("Vorschlag
   verworfen — du editierst direkt"). Blockieren fühlt sich frustrierend
   an.

7. **Diff-Library.** Eigene line-Diff-Implementierung schreiben oder
   `diff`/`fast-diff`/`diff-match-patch` verwenden? Empfehlung:
   **kleine Lib** (z.B. `diff` von npm) — line-Diff reicht, wir
   brauchen kein word-level Highlighting für Phase 1.

8. **Edit-im-Ghost — Phase oder Cut?** Wenn (a) reicht (Tippen committed
   den Ghost als echten Source und macht ihn editierbar): kann in Phase
   3 mitkommen. Wenn (b): Phase 6.

## Erfolgskriterien

Der Flow gilt als **erfolgreich**, wenn:

- Auf einem realistischen Eval-Set von ≥30 User-Anfragen (Mix aus
  Prosa, sloppy Mirror, valide Mirror) erreicht das LLM eine
  **Anker-Hit-Rate ≥ 95 %** (mit max 2 Retries).
- Die End-to-End-Latenz (Cmd+Enter → Ghost sichtbar) liegt **median
  < 4 s** mit dem CLI-Backend, bzw. **< 1.5 s** mit SDK.
- In einem User-Test mit 3–5 Designern äussern alle, dass sie sich
  **"in Kontrolle"** fühlen — kein "die AI macht andauernd Sachen die ich
  nicht wollte".
- Die `??`-Draft-Mode-Nutzung sinkt um ≥ 50 % nach Einführung
  (Indikator dass `Cmd+Enter` den allgemeineren Pfad abdeckt).

## Glossar

- **Anker** — Das `FIND`-Snippet in einem Patch. Muss eindeutig im
  Source sein.
- **Diff-Ghost** — Visuelle Darstellung eines vorgeschlagenen Diffs als
  CodeMirror-Decoration über dem unveränderten Source.
- **Working-Copy** — Source + applizierte Patches, noch nicht im
  echten Editor-State.
- **Snapshot** — Source-Stand zum Zeitpunkt des `Cmd+Enter`. LLM-
  Antworten werden gegen den Snapshot appliziert, nicht gegen den
  aktuellen Stand.
