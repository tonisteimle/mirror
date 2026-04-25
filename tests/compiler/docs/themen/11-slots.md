# Thema 11: Slots / Kind-Komponenten

**Status:** abgeschlossen (2026-04-25, in einem Pass).

**Ergebnis:** 5 zusätzliche Verhaltens-Tests + 1 `it.todo`. Die Basis-
Aspekte (Slot-Definition, Layout-Komposition, Multi-Element-Slots) waren
schon in `tutorial-02-components-behavior.test.ts` (12 Tests) abgedeckt.

## Scope

Slots in Mirror = "Kind-Komponenten" — verschachtelte Komponenten-
Definitionen (`Title:` / `Desc:` / `Footer:`) innerhalb einer Eltern-
Komponenten-Definition. Bei Verwendung der Eltern-Komponente werden die
Slots durch den Inhalt bei der Instanz befüllt.

Slot-Aspekte aus dem Tutorial sind nicht auf eine Seite konzentriert,
sondern verteilt:

- **`02-komponenten.html`** ist der Kern (Definition, Slot-Begriff, Praxis)
- **`04-layout.html`** zeigt Slots indirekt über Layout-Komposition
- **`13-overlays.html`** nutzt Slots in `Dialog`/`Tooltip`-Komponenten

## Tutorial-Aspekt-Coverage

### Aus `02-komponenten.html` — Kern-Tutorial

| Aspekt                                                       | Test                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------- |
| Komponente ohne Body, Children bei Instanz                   | `tutorial-02-components-behavior` Definition w/o body |
| Komplexe Komponente: nested Frame + Texts in Definition      | Komplexe Komponenten                                  |
| Slot-Definition + -Verwendung (`Title:` / `Body:`)           | Slots / Slot-Definition und -Verwendung               |
| Slot mit mehreren Elementen (`Content:` als Multi-Slot)      | Slots with multiple elements                          |
| Praxis-Card mit Title + Desc + Footer + nested Status/Action | `tutorial-11-slots-aspects` Praxis-Card               |
| Slot-Property-Override bei Instanz (`Title "X", col red`)    | Property-Override bei Instanz                         |
| Layout-Komposition `AppShell: hor / Sidebar: / Main:`        | AppShell-Pattern                                      |
| Slot-Reihenfolge: Slots erscheinen in Usage-Order            | Slot-Reihenfolge                                      |
| Slot mit `as` (von Primitive erben — `Action as Button:`)    | Slot als Component-Variation                          |

**Coverage:** 9/9 Aspekte abgedeckt (zusammen mit Tutorial 02 Tests).

## Tutorial-Limitations (entdeckt 2026-04-25)

- **`data-slot`-Attribut inkonsistent gesetzt:** Bei einer Card mit
  `Title:` / `Desc:` / `Footer:` bekommen nur `Title` und `Footer` das
  `data-slot="<name>"`-Attribut, `Desc` nicht. Sub-Slots (`Status:`,
  `Action:` innerhalb von `Footer:`) bekommen es ebenfalls nicht.
  Das `data-mirror-name`-Attribut wird konsistent gesetzt — Tests sollten
  daher dieses verwenden, bis das Slot-Marker-Attribut konsistent gemacht ist.

## Status

- [x] Schritt 1-3: Tutorial-Audit + Aspekt-Tabelle
- [x] Schritt 4: 5 Verhaltens-Tests + 1 todo
- [x] Schritt 5: Coverage abgedeckt
- [x] Schritt 6: 1 echte Tutorial-Limitation als `it.todo` markiert
