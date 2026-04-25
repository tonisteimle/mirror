# Tutorial-Coverage-Prozess

Jeder Aspekt im offiziellen Tutorial (`docs/tutorial/NN-*.html`) muss durch
mindestens einen **Verhaltens-Test** abgedeckt sein. „Compile passes" zählt
nicht — Tests müssen das Verhalten belegen, das der Tutorial-Text dem User
verspricht.

Dieser Prozess wird **pro Thema** (siehe `themen/uebersicht.md`) durchgeführt
— nicht in einem großen Wurf für das ganze Tutorial. Granularität: ein
Tutorial-Kapitel passt in der Regel in ein bis zwei Themen.

## Schritte pro Thema

### 1. Tutorial-Seite(n) zuordnen

In `themen/uebersicht.md` ist jedes Thema mit der zugehörigen Tutorial-Seite
verknüpft (Spalte „Tutorial"). Wenn unklar: Tutorial-Inhaltsverzeichnis
(`docs/tutorial/index.html`) prüfen.

### 2. Aspekte sammeln

Tutorial-HTML im Browser oder mit `cat docs/tutorial/NN-*.html` durchgehen
und alle erklärten Aspekte auflisten. Quellen:

- **Konzept-Erklärungen** in `<h2>`/`<h3>`-Sections und den begleitenden
  `<p>`-Texten
- **Code-Beispiele** in `<pre>`-Blöcken (statisch) und `<textarea>`-Blöcken
  (Playground)
- **Hinweise**: „so funktioniert das …", „Mirror unterstützt …",
  „Achtung: …" → das sind Aspekte, die getestet werden müssen.

Granularität: ein Aspekt = eine Verhaltens-Aussage, die der User aus dem
Tutorial mitnimmt. Mehrere ähnliche Beispiele für dasselbe Konzept = ein
Aspekt.

### 3. Aspekt → Test mappen

Tabelle ins Themen-Doc (`themen/NN-*.md`):

```markdown
## Tutorial-Aspekt-Coverage

Tutorial: `docs/tutorial/09-daten.html`

| Tutorial-Abschnitt   | Aspekt                        | Test                            |
| -------------------- | ----------------------------- | ------------------------------- |
| Variablen definieren | `name: "Max"` definiert Var   | tutorial-11-data-behavior Bsp 1 |
| Aggregation .count   | `$tasks.count` zählt Einträge | **fehlt**                       |
```

Drei mögliche Status-Werte:

- **konkrete Test-Referenz** — Aspekt ist abgedeckt
- **fehlt** — Aspekt ist nicht getestet, Lücke wird in Schritt 5 geschlossen
- **gehört zu Thema X** — Aspekt liegt scope-mäßig in einem anderen Thema
  (auch dort dokumentieren)

### 4. Lücken schließen

Pro Lücke einen Verhaltens-Test schreiben. Wenn der Test fehlschlägt:
entweder Bug fixen (Test-Driven) oder als Known-Limitation dokumentieren.
Compile-Tests sind kein Ersatz.

### 5. Coverage-Audit erweitern

Im Themen-Coverage-Audit (Schritt 6 des Themen-Prozesses) **zwei**
Coverage-Werte angeben:

- **Code-Coverage** (V8): Lines/Branches/Functions
- **Tutorial-Coverage**: % der Aspekte aus Schritt 2 mit konkretem Test

Beide müssen ≥ 90% sein, sonst Status „in Arbeit".

## Mapping Themen ↔ Tutorial-Seiten

| Thema | Tutorial-Seite(n)                                                                |
| ----- | -------------------------------------------------------------------------------- |
| 1     | (Internals — kein Tutorial-Mapping)                                              |
| 2     | (Internals)                                                                      |
| 3     | `05-styling.html` (teilweise — was nicht zu Layout/Tokens gehört)                |
| 4     | `04-layout.html`, `06-states.html`-Subset (Layout in States)                     |
| 5     | `02-komponenten.html`                                                            |
| 6     | `03-tokens.html`                                                                 |
| 7     | `06-states.html`                                                                 |
| 8     | `08-functions.html`                                                              |
| 9     | `09-daten.html` (Variablen / Listen / each / Aggregationen / Relationen / .data) |
| 10    | `09-daten.html`-Conditionals-Subset (if/else, Logik, Inline-Ternary)             |
| 11    | (Slots — verteilt über mehrere Tutorial-Seiten)                                  |
| 12    | (DatePicker — nicht als eigene Tutorial-Seite, in `11-eingabe.html` erwähnt)     |
| 13    | `07-animationen.html`                                                            |
| 14    | `11-eingabe.html` (Input Mask / two-way Bind)                                    |
| 15    | `14-tabellen.html`, `15-charts.html`                                             |
| 16    | `01-elemente.html` (Canvas / Device Presets)                                     |
| 17    | (SourceMap — Internals)                                                          |
| 18    | (Validator — Internals)                                                          |
| 19    | (Robustheit — Internals)                                                         |
| 20    | (Performance — Internals)                                                        |
| 21    | (React-Backend — Internals)                                                      |
| 22    | (DOM-Backend — Internals)                                                        |

`10-seiten.html`, `12-navigation.html`, `13-overlays.html` werden zu Themen
zugeordnet wenn diese Themen drankommen (vermutlich Slots/Components/eigene
Themen je nach Tutorial-Inhalt).

## Beispiel-Tabelle: bereits etablierte Themen

Für die Themen 1–8 + 12 + 13 wird die Tutorial-Aspekt-Tabelle **rückwirkend**
beim nächsten Anfassen ergänzt — nicht jetzt in einem großen Aufwasch. Beim
nächsten Iter-Audit eines abgeschlossenen Themas: Tabelle prüfen, fehlende
Aspekte identifizieren, Status auf „Iter X nötig" wenn Lücken da sind.
