# Quality-Pass-Prozess

**Wofür:** Systematische Qualitätsprüfung pro Feature aus
`Featureliste.txt`. Vier Dimensionen, vier Phasen, harte
Mutation-Validierung. Jeder abgeschlossene Pass landet als ein Commit
mit klar benanntem Phasen-Inhalt.

## Vier Dimensionen

Pro Feature wird ein Mini-Review entlang dieser vier Achsen gemacht —
alles andere ist Filler:

1. **Architektur** — Wie ist der Datenfluss? Wo liegt die Single Source
   of Truth? Welche Ports/Adapter/Events koppeln das Feature an den
   Rest? Gibt es Race-Conditions oder versteckte Reihenfolgeabhängig-
   keiten?
2. **Code** — Duplizierte Logik, irreführende Kommentare,
   `log.warn`/TODO/FIXME als Risiko-Signale, tote Pfade,
   Defensive-Programming für unmögliche Zustände.
3. **Testqualität** — Sind die Assertions scharf genug, dass eine echte
   Regression sie reisst? Häufige Anti-Patterns: `codeContains` statt
   `codeEquals`, `panel !== undefined`, `dom.expect` wo Panel-Read
   gefragt war, RegExp ohne Anker, Tests die nur den Happy-Path
   abdecken.
4. **Testabdeckung** — Welche Pfade fehlen? Edge-Cases (leerer State,
   gelöschter Knoten, Mehrfachauswahl, Race zwischen Compile und
   Selection)? Inverse Richtungen (READ vs WRITE)?

## Vier Phasen (P0–P3)

Pro Feature: alle vier Phasen, in dieser Reihenfolge, **keine**
ausgelassen. „Defer auf später" gibt es nicht — wenn eine Phase
unerwartet gross wird, eigene Featurelist-Items spalten, aber der
aktuelle Pass läuft durch.

| Phase  | Inhalt                                                                                                  | Typischer Aufwand |
| ------ | ------------------------------------------------------------------------------------------------------- | ----------------- |
| **P0** | Tests schärfen (lax → exact, Read- vs Write-Side, neuer Test wenn die existierende Datei trivia ist)    | 30–90 min         |
| **P1** | Code-Quality-Refactor (Helper extrahieren, Duplikation eliminieren, irreführende Logs/Kommentare fixen) | 30–60 min         |
| **P2** | Coverage hinzufügen (Edge-Cases, fehlende Richtung, fehlende Primitive-Variante)                        | 30–90 min         |
| **P3** | Mutation-Test als Validierung (siehe unten)                                                             | 15–30 min         |

## Mutation-Test als P3

Die Methode, die einen Test-Suite-Audit von Glaube in Wissen
verwandelt:

1. **Mutation einbauen** — minimaler, gezielter Eingriff der das Feature
   bricht. Beispiele: in `controller.handleSelect` `nodeId: 'node-1'`
   hardcoden; in der HitDetector-Escape-Zone den Schwellwert auf 0
   setzen; in `addChildBlock` das Indent-Char verschlucken.
2. **Suite laufen lassen** — die Anzahl Failures dokumentieren. Faust-
   regel: **mindestens 3** Tests müssen brechen. Bricht nur 1, sind die
   Tests noch zu lax oder zu nah am gleichen Code-Pfad.
3. **Mutation revertieren** — exakt zurücksetzen, Suite muss komplett
   grün sein.
4. **Befund im Commit-Body festhalten** — z. B. _„Mutation: hardcoding
   nodeId='node-1' in controller.handleSelect breaks 9/10 tests."_

Wenn die Suite nach Mutation grün bleibt: die Tests prüfen nicht das,
was sie behaupten zu prüfen. Zurück zu P0.

## Discovery-Test-Pattern

Wenn der erwartete Output eines Tests unbekannt ist (z. B. „was
schreibt H-Taste auf `Frame gap 8, pad 16`?"):

1. Test mit `assert.ok(actual === expected, ...)` und einer **Best-
   Guess-Erwartung** schreiben.
2. Laufen lassen — die Failure-Message zeigt den echten Output.
3. Erwartung mit dem geernteten String aktualisieren, Test wird grün.

Vorteil gegenüber RegExp- oder `codeContains`-Assertions: der Test ist
ab Tag 1 byte-genau, jede Output-Drift fällt sofort auf.

## Operative Disziplin

- **Studio-Bundle rebuilden:** `npm run studio` serviert das pre-built
  Bundle aus `studio/dist/`. Source-Edits sind unsichtbar bis
  `npm run build:studio` lief. Nach jedem Source-Edit, vor jedem Test-
  Run rebuild — sonst frisst man stundenlang Stale-Cache-Failures.
- **Studio-Server läuft auf 5173:** wenn der Test-Runner
  _„Test API not found"_ meldet, ist meist der Server nicht gestartet
  (oder gerade neu gestartet — kurz warten und retry).
- **Test-Filter:** `--filter="..."` matcht als Substring, ist aber
  **case-sensitive** und reagiert auf Sonderzeichen (`+`, `→`, `(`,
  `)`). Bei Unicode-Pfeilen oder regex-relevanten Zeichen lieber
  einen Substring aus der Mitte des Test-Namens nehmen.
- **Test-Namen-Kollisionen:** wenn Filter doppelt matcht, prüfen — oft
  hat man einen Test-Namen aus einer existierenden Suite kopiert.
  Renamen, sonst läuft beides und Resultate werden verwirrend.
- **Selektive `git add`:** auf `main` mit vielen offenen Änderungen
  (z. B. lokale Untracked Tools / Examples) **immer** mit Pfaden
  stagen, nie `git add -A`. Pre-commit-Hooks können sonst auf un-
  beteiligte Files springen.

## Was NICHT zur Quality Pass gehört

- **Backwards-Compatibility-Shims** für entfernte APIs — wenn etwas
  weg-refactored wird, weg, nicht via Re-Export erhalten.
- **Comments die WAS erklären** — nur WHY (Hidden Constraint, Past
  Incident, Workaround). Funktionsnamen erklären sich selbst.
- **Mehrere Features gleichzeitig** — pro Pass ein Feature aus der
  Liste. Wenn man in P1 einen Bug in einem anderen Feature findet:
  notieren, _nicht_ mitfixen.
- **Phasenüberspringen** — wenn P2 trivial wirkt, trotzdem die
  Edge-Case-Liste durchgehen. Meistens findet sich eine echte Lücke.

## Featurelist-Status (laufender Stand)

Siehe `Featureliste.txt`. Ein Feature gilt als **Done** wenn:

- Alle 4 Phasen P0–P3 durchgelaufen sind
- Die Mutation-Probe in P3 mind. 3 Failures produziert hat
- Der zugehörige Commit auf `main` liegt mit klarem Phasen-Inhalt
  im Body
