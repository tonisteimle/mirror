# Multi-File Roadmap

**Stand 2026-05-07 · diskutierter Zielzustand, noch nicht umgesetzt**

## Vision in einem Satz

Mirror-Projekte bestehen aus beliebig vielen `.mir`-Files in einem Ordner. Der Compiler erkennt am Inhalt, was jedes File ist, lädt sie in der richtigen Reihenfolge, und das UI zeigt sie wie in einem normalen Editor (Datei-Explorer + Tabs). Keine Datei-Typen, keine Imports.

## Status quo (das, was wir heute haben)

- Vier feste Files: `data.data` / `tokens.tok` / `components.com` / `app.mir`
- Vier feste Tabs im Editor-Header, 1:1 gemappt
- Compiler lädt in fixer Reihenfolge: data → tokens → components → layouts
- AI-Pipeline kennt nur tokens + components als "Project Context", `.data` ist blind
- Keine Möglichkeit, mehr Files anzufügen oder zu löschen

Das Modell war richtig für die MVP-Phase und ist gut für Tutorials. Es bricht in dem Moment, wo ein Projekt wächst (mehrere Screens, Tokens nach Themen aufgeteilt, Component-Bibliothek, Daten pro Feature).

## Zielzustand

### 1. Eine Extension, Inhalt entscheidet

Alle Projekt-Files heißen `.mir`. Der Compiler scannt jedes File einmal und klassifiziert nach dominantem Inhalt:

| Inhalt                                                                 | Rolle          |
| ---------------------------------------------------------------------- | -------------- |
| `name.bg:`, `name.col:`, `name.rad:` etc. (Suffixe = Property-Hints)   | **tokens**     |
| `Name:` (Großbuchstabe + Doppelpunkt + Property-Liste oder Kind-Slots) | **components** |
| `name:` mit indented Sub-Keys / Listen                                 | **data**       |
| `Frame …`, `Button …`, `canvas …` (Element-Instanzen)                  | **layout**     |

**Hybrid-Files sind explizit erlaubt und gewollt.** Klassifikation läuft pro Definition, nicht pro File. Ein `dashboard.mir` darf gleichzeitig 2 Tokens + 3 Components + ein Layout enthalten — der Compiler ordnet jede Definition individuell der richtigen Phase zu. Der User entscheidet wie er strukturiert; das Tool hält sich raus.

### 2. Auto-detected Load Order

Beim Compile sortiert der Compiler:

```
1. Alle data-Definitionen (aus allen Files)
2. Alle token-Definitionen
3. Alle component-Definitionen
4. Layouts — alphabetisch, mit dem File das `canvas` enthält (oder `app.mir` als Fallback) zuletzt
```

User braucht weder `.data`-Suffix noch `import`-Statement. Wenn du `tokens-color.mir` neben `tokens-spacing.mir` neben `auth-components.mir` neben `dashboard.mir` neben `app.mir` hast, "macht es einfach das Richtige".

Forward-References zwischen gleichartigen Definitionen sind erlaubt (Compiler resolved nach dem vollen Scan, nicht streaming).

### Dependency-Awareness und Fehlermeldungen

Der Compiler baut nach dem Scan einen Definition-Graphen über alle Files: welcher Token nutzt welchen Token, welche Component nutzt welche Tokens / andere Components, welches Layout nutzt was. Daraus folgt eine Klasse von präzisen Fehlern, die heute fehlen oder schwammig sind:

| Fehler                                                           | Meldung                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Layout nutzt `$primary`, kein File definiert es                  | `dashboard.mir:14 — Token "primary" nicht definiert. Suche in: tokens.mir, app.mir.`                     |
| Component referenziert Token aus File, das nach ihm geladen wird | nicht möglich — Phasen-Sortierung garantiert, dass Tokens vor Components da sind                         |
| Zwei Files definieren denselben Token unterschiedlich            | `tokens-color.mir:3 und tokens-legacy.mir:8 definieren beide "primary.bg" mit unterschiedlichen Werten.` |
| Component nutzt Component, die nirgends definiert ist            | `dashboard.mir:22 — Component "Card" nicht definiert. Suchst du diese? Btn (components-base.mir:5)`      |
| Cycle zwischen Components                                        | `Cycle: Card → Header → Card. Eine der Referenzen muss raus.`                                            |
| Data-Key wird referenziert (`$users`) aber nirgends definiert    | `app.mir:30 — Daten-Key "users" nicht gefunden. Vorhandene Keys: features, articles.`                    |

Idee: jeder Fehler nennt File + Zeile + plausible Alternativen (Levenshtein-Vorschläge). Das ist die "smarte" Komponente — sie macht Multi-File ohne explizite Imports erst angenehm.

### 3. UI — Explorer + dynamische Tabs

```
┌──┬──────────────┬─────────────────────────────┬─────────┐
│⌘ │ EXPLORER     │ [tokens] [comp] [app•] [auth ✕] │       │
│⊞ │ ⌂ my-app/    │                             │         │
│⊕ │   app.mir •  │  CodeMirror                 │ PREVIEW │
│  │   tokens.mir │                             │         │
│  │   compo...mir│                             │         │
│  │   auth.mir   │                             │         │
│  │ + new file   │                             │         │
│  │ ⤓ open folder│                             │         │
└──┴──────────────┴─────────────────────────────┴─────────┘
```

**Activity-Bar (links)** — existiert: Icon-Spalte für Explorer / Properties / Tokens-Übersicht / Settings.

**Explorer-Panel** — flache Liste aller `.mir`-Files im Projekt-Root. Pro File:

- Klick → öffnet/fokussiert Tab
- Right-Click → Rename / Delete / Duplicate
- Visual-Indikator (•) am File mit `canvas` (= Preview-Entry)
- Buttons unten: `+ new file` (Modal: Name) und `⤓ open folder` (Tauri / FS-Access)

**Tab-Strip oben** — dynamisch aus den geöffneten Files:

- Klick im Explorer → öffnet Tab (oder fokussiert wenn schon offen)
- `✕` schließt Tab (File bleibt im Projekt)
- Mittelklick / Cmd+W = Tab schließen
- Tab des Preview-Entrys hat einen subtilen Indikator
- Reorderbar via Drag

**Kein Pinning kanonischer Files mehr.** In einem 4-File-Projekt sind die ersten 4 Tabs eh die "kanonischen" — visuell identisch zum heutigen Modell, aber jetzt natürlich gewachsen statt hardcoded.

**Subfolder-Support** ist optional und Phase 2 — fürs Erste flat im Root reicht.

### 4. AI sieht alle Files gleichberechtigt

Heute: Edit-Flow gibt `tokens` + `components` separat als "Project Context", `.data` ist blind.

Zielzustand: Edit-Flow gibt **alle Geschwister-Files** im Projekt-Root als simple Map `{ filename → content }` mit. Die LLM erkennt am Inhalt was Token / Component / Data / Layout ist (gleiche Heuristik wie der Compiler). Folge:

- "Zeig die Features aus den Daten" funktioniert — die LLM sieht `data.mir`
- "Erstell eine neue Sekundärfarbe" — die LLM sieht alle Token-Files und kann konsistent benennen
- AI kann perspektivisch datei-übergreifend patchen (heute nur aktuelle Datei)

## Migration — heutige Projekte ohne Breaking-Change

1. **Compiler akzeptiert `.mir` UND die alten Suffixe** (`.tok`, `.com`, `.data`) — Übergang.
2. **Loader erkennt beide**: alte Files bleiben funktional, neue Files heißen `.mir`.
3. **DEFAULT_PROJECT** schaltet auf vier `.mir`-Files (`tokens.mir`, `components.mir`, `data.mir`, `app.mir`) — Tutorial schreibt das ab.
4. **Storage-Migration** beim Boot: `data.data` → `data.mir`, `tokens.tok` → `tokens.mir` etc., einmalig pro localStorage. Tauri-User passiert nichts (lokale Files behalten ihre Namen, der Compiler frisst beides).
5. **Nach 1-2 Releases**: alte Suffixe deprecaten mit Warnung, dann entfernen.

## Tutorial-Impact

Klein. Die meisten Playgrounds zeigen Single-File-Code, da ändert sich nichts. Multi-File-Beispiele:

- 03-tokens.html, 02-komponenten.html: zeigt `tokens.mir` + `app.mir` statt `tokens.tok` + `app.mir` — eine Ersetzung pro File
- Neuer Abschnitt: "Das Projekt — alle .mir, Compiler sortiert"
- Erklärung der Auto-Detect-Heuristik in einem Absatz mit Beispiel

## Phase-1-Constraints (entschieden)

- **Hybrid-Files erlaubt** — Token + Component + Layout in einem File ist OK.
- **Pro Projekt genau ein `canvas`** (= ein Preview-Entry). Mehrere `canvas`-Files = Fehler mit klarer Meldung.
- **Flache Struktur** — alle Files im Projekt-Root, keine Unterordner.
- **Nur `.mir`** — Compiler liest die alten Suffixe für Migration, aber neue Files heißen `.mir`.

## Phase 2 (später, klar markiert für die Zukunft)

- **Subfolder + recursive scan** — `screens/`, `features/auth/` etc. mit tree view im Explorer.
- **Mehrere `canvas`-Files** — mehrere Apps in einem Projekt mit "Set as preview entry" UI.
- **Optional `use "..."`** — falls per-Screen-Scoping oder mehrere Sub-Projekte im selben Repo nötig werden.

## Reihenfolge der Umsetzung

1. **Compiler**: Content-Type-Detector implementieren, Load-Order-Sortierung darauf basieren. Tests für Klassifikations-Heuristik.
2. **Storage**: `.mir`-Files akzeptieren, Migration für localStorage.
3. **DEFAULT_PROJECT** auf `.mir`-Quartett umstellen.
4. **Editor-UI**: Explorer-Panel sichtbar, Tab-Strip dynamisch.
5. **Add/Delete/Rename** im Explorer.
6. **Open Folder** (Tauri zuerst, Browser FS-Access-API danach).
7. **AI-Pipeline**: ProjectFiles aufbohren, alle Files mitschicken.
8. **Tutorial** updaten.
9. **Deprecation der alten Suffixe** announcen.

Phase 1-4 reicht, um die heutige UX zu replizieren ohne Breaking-Change. Phase 5-9 ist die echte Mehrwerts-Schicht.
