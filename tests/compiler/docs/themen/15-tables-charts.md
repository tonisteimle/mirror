# Thema 15: Tables / Charts

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 29 Tutorial-Aspekt-Tests, 0 Bugs entdeckt.

## Scope

- **Tables (`14-tabellen.html`):** `Table`, `TableHeader`, `TableRow`,
  `TableFooter` als Container; statische und datengebundene Tabellen
  (`each task in $tasks`); Filter (`where`), Sortierung (`by` / `by ... desc`);
  Header-einmalig-trotz-each.
- **Charts (`15-charts.html`):** Sieben Chart-Typen (Line/Bar/Pie/Donut/Area/
  Scatter/Radar); Datenformate (Key-Value, x/y-Field-Mapping); Top-Level-
  Properties (`colors`, `title`, `legend`, `grid`); Subkomponenten (XAxis/
  YAxis/Grid/Point/Legend/Title/Line/Bar/Arc).

Tabellen-Tests laufen mit `renderWithRuntime`. Chart-Tests laufen auf
IR-/Code-Ebene, da jsdom kein echtes Canvas hat — wir prüfen, dass
`_runtime.createChart`-Calls mit den erwarteten Configs emittiert werden.

## Tutorial-Aspekt-Coverage

### Tutorial 14 — Tables (`docs/tutorial/14-tabellen.html`)

| Aspekt                                         | Test                                             |
| ---------------------------------------------- | ------------------------------------------------ |
| Statische Tabelle (`Table` + Header + Rows)    | `tutorial-14-15-tables-charts-aspects` Statische |
| Datengebundene Tabelle (`each task in $tasks`) | Datengebundene Tabellen                          |
| Header genau einmal trotz each                 | Datengebundene Tabellen                          |
| Filter `where task.done == false`              | Filter (where)                                   |
| Filter mit `and` (zwei Bedingungen)            | Filter (where)                                   |
| Sortierung `by priority` (asc)                 | Sortierung (by)                                  |
| Sortierung `by price desc`                     | Sortierung (by)                                  |
| `TableFooter`                                  | Footer                                           |

### Tutorial 15 — Charts (`docs/tutorial/15-charts.html`)

| Aspekt                                            | Test                                      |
| ------------------------------------------------- | ----------------------------------------- |
| Chart-Typ Line                                    | Chart-Typen (`it.each` über alle 7 Typen) |
| Chart-Typ Bar                                     | Chart-Typen                               |
| Chart-Typ Pie                                     | Chart-Typen                               |
| Chart-Typ Donut → `doughnut`                      | Chart-Typen                               |
| Chart-Typ Area → `line`-with-fill                 | Chart-Typen                               |
| Chart-Typ Scatter                                 | Chart-Typen                               |
| Chart-Typ Radar                                   | Chart-Typen                               |
| `Line $sales` mit Größe + Daten                   | Chart-Typen (`createChart` Config)        |
| Key-Value-Daten (Keys = Labels, Values = Punkte)  | Datenformate                              |
| `x "name", y "sales"` Field-Mapping               | Datenformate                              |
| `colors #a #b`                                    | Top-Level-Properties                      |
| `title "..."`                                     | Top-Level-Properties                      |
| `legend true`                                     | Top-Level-Properties                      |
| `grid false`                                      | Top-Level-Properties                      |
| Subkomponente `XAxis:` + `YAxis:` mit `min`/`max` | Subkomponenten                            |
| Subkomponente `Grid: col, dash`                   | Subkomponenten                            |
| Subkomponente `Point: size, bg`                   | Subkomponenten                            |
| Subkomponente `Legend: pos right`                 | Subkomponenten                            |
| Subkomponente `Title: text`                       | Subkomponenten                            |
| Subkomponente `Line: width, tension, fill`        | Subkomponenten                            |
| Chart in Card-Component eingebettet               | In Layouts einbetten                      |

**Tutorial-Coverage:** 21/21 Aspekte (Tabellen) + 21/21 Aspekte (Charts) = 100%.

## Status

- [x] Schritt 1-3: Tutorial-Audit + Aspekt-Tabelle
- [x] Schritt 4: 29 Verhaltens-/IR-Tests
- [x] Schritt 5: Coverage abgedeckt
- [x] Schritt 6: 0 echte Bugs entdeckt
