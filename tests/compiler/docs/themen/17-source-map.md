# Thema 17: SourceMap (bidirektional)

**Status:** abgeschlossen (2026-04-25, Schritt 4 erweitert).

**Ergebnis:** 37 zusätzliche Tests in `ir-source-map-coverage.test.ts` zur
bestehenden `ir-source-map.test.ts` (44 Tests).

## Scope

`compiler/ir/source-map.ts` — Source-Position-Tracking für bidirektionales
Editing (Click im Preview → Code-Position; Property-Change → exakter
Source-Bereich).

Zentrale APIs:

- **NodeMapping** — Position + Property-Map + Hierarchy-Info pro IR-Node
- **SourceMap** — Lookup nach ID, Component-Name, Instance-Name, Line
- **Hierarchy-Navigation** — Parent, Children, Siblings (Next/Prev),
  isDescendantOf
- **Definition vs. Instance** — `getDefinitionAtLine` (für `.com`-Files),
  `getNodeAtLine` (für Layouts)
- **Roots** — `getRootNodes`, `getMainRoot` (mit App-Präferenz)
- **Builder** — `SourceMapBuilder` für IR-Construction
- **Position-Helpers** — `calculateSourcePosition` (multi-line content),
  `calculatePropertyPosition` (Inline-Property-Match)

## Was war abgedeckt (vorher)

`tests/compiler/ir-source-map.test.ts` (44 Tests) testete:

- `addNode` / `getNodeById` (inkl. Template-Instance-IDs)
- `getTemplateId` / `isTemplateInstance`
- `getPropertyPosition`
- `getAllNodeIds`, `getNodesByComponent`, `getNodeByInstanceName`
- `isTemplate` (each + conditional)
- `getChildren`
- `getNodeAtLine` (most-specific match, skip definitions)
- `getNodesStartingAtLine`
- `clear` / `size`
- `SourceMapBuilder` `addNode` / `addPropertyPosition` / `build` / `getMap`
- `calculateSourcePosition` (single-line + multi-line)

## Was war nicht abgedeckt — geschlossen in dieser Iteration

`tests/compiler/ir-source-map-coverage.test.ts` (37 Tests):

| Bereich                                       | Tests |
| --------------------------------------------- | ----- |
| `getSiblings` (parent + root cases)           | 3     |
| `getNextSibling` (mit Edge-Cases)             | 3     |
| `getPreviousSibling` (mit Edge-Cases)         | 3     |
| `getParent`                                   | 3     |
| `isDescendantOf` (transitive + Cycle-Schutz)  | 6     |
| `getDefinitionAtLine` (specificity, fallback) | 4     |
| `getRootNodes` (Definition-Filter)            | 1     |
| `getMainRoot` (App-Präferenz × 3 Varianten)   | 4     |
| `calculatePropertyPosition` (4 Szenarien)     | 4     |
| `SourceMapBuilder` Edge-Case (no-op-Fall)     | 1     |
| Integration: parse → IR → SourceMap           | 5     |

**Integration-Tests** prüfen die echte Pipeline:

- Basic Frame + Children → non-empty SourceMap
- Parent-Child-Hierarchie korrekt
- Component-Definitionen werden als `isDefinition` markiert
- `each`-Loops erzeugen `isEachTemplate`-Templates
- `getNodeAtLine` findet das spezifischste Node bei Click

## Status

- [x] Schritt 1-3: Audit + Lücken-Liste
- [x] Schritt 4: 37 zusätzliche Verhaltens-Tests
- [x] Schritt 5: Coverage-Lücken geschlossen
- [x] Schritt 6: Cycle-Schutz und Edge-Cases verifiziert
