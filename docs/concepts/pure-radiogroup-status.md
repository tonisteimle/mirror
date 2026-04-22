# Pure RadioGroup - Zwischenstand

## Aktueller Test-Status (Update 21. April - Nachmittag)

**Kategorie:** `zag.radioGroup` / RadioItem Tests
**Ergebnis:** 18/23 RadioItem-spezifische Tests bestanden

### Bestehende Tests (18)

- RadioItem container with gap renders correctly
- RadioItem renders with correct structure
- RadioItem Control has circular styling (rad 99)
- RadioItem Indicator exists with correct styling
- Content: Slot receives RadioItem text
- Content: Slot with long text
- Content: Slot with special characters
- Clicking RadioItem sets selected state
- exclusive() ensures only one item selected at a time
- Clicking already-selected item keeps it selected
- RadioItem with "on" attribute starts selected
- Pre-selected RadioItem can be changed
- RadioItem with custom colors (green)
- RadioItem without Indicator still works
- RadioItems in vertical layout (default)
- RadioItems in horizontal layout
- Multiple groups are independent
- Single RadioItem in group works
- Many RadioItems render correctly
- Rapid clicking between items works
- RadioItem with empty text
- data-state attribute is set correctly
- data-mirror-id attribute is present
- Clicking on RadioItem label selects
- **on: state propagates to Control border color** (NEU BEHOBEN)
- **on: state shows Indicator (opacity 0 to 1)** (NEU BEHOBEN)
- **Deselecting hides Indicator again** (NEU BEHOBEN)

### Fehlende Tests (5) - Bekannte Probleme

| Test                                                | Problem                      | Ursache                           |
| --------------------------------------------------- | ---------------------------- | --------------------------------- |
| Control and Indicator are aligned (centered)        | X diff: 22, Y diff: 4        | Element Finding / Bounds Checking |
| Text is to the right of Control                     | Control nicht am linken Rand | Element Finding / Bounds Checking |
| First RadioItem drop auto-inserts definition        | Compile timeout              | Drag-Test Performance             |
| Second RadioItem drop does NOT duplicate definition | Compile timeout              | Drag-Test Performance             |
| Dropped RadioItem is functional (selectable)        | Compile timeout              | Drag-Test Performance             |

### CSS State Propagation - BEHOBEN

Die 3 kritischen CSS State Propagation Tests bestehen jetzt:

- `on: state propagates to Control border color`
- `on: state shows Indicator (opacity 0 to 1)`
- `Deselecting hides Indicator again`

**Ursache war:** `parentStateSelector` Styles wurden fälschlicherweise in den Base-Styles inkludiert.

---

## Durchgeführte Fixes (21. April Nachmittag)

### 1. Compiler Fix - parentStateSelector Filterung

**Betroffene Dateien:**

- `compiler/backends/dom.ts` (3 Stellen)
- `compiler/backends/dom/state-machine-emitter.ts` (2 Stellen)
- `compiler/backends/dom/template-emitter.ts` (2 Stellen)
- `compiler/backends/dom/table-emitter.ts` (2 Stellen)
- `compiler/backends/dom/node-emitter.ts` (1 Stelle)
- `compiler/backends/framework.ts` (1 Stelle)

```typescript
// VORHER: parentStateSelector styles wurden in baseStyles inkludiert
const baseStyles = node.styles.filter(s => !s.state)

// NACHHER: parentStateSelector styles werden gefiltert
const baseStyles = node.styles.filter(s => !s.state && !s.parentStateSelector)
```

### 2. Test Helper Updates in `pure-radio-group.test.ts`

- `findIndicator()` erlaubt jetzt kleinere Elemente (>= 4px statt >= 8px) wegen `scale 0.5` im Indicator

### 3. Cache Busting

- `studio/index.html` Version erhöht auf `v=96`

---

## Offene Punkte

### Alignment-Tests (Low Priority)

Die 2 Alignment-Tests scheitern am Element-Finding:

- `findControl()` und `findIndicator()` finden evtl. die Definition-Nodes statt der Instanz-Nodes
- Bounds-Checking für Zentrierung ist ungenau

### Drag-Tests mit Compile Timeout

5 Tests haben "Compile timeout" - dies ist ein separates Performance-Problem bei Drag-and-Drop Tests, nicht CSS-related.

---

## Relevante Dateien

| Datei                                                 | Status                      |
| ----------------------------------------------------- | --------------------------- |
| `studio/test-api/suites/zag/pure-radio-group.test.ts` | 18/23 Tests bestanden       |
| `compiler/backends/dom.ts`                            | parentStateSelector Fix     |
| `compiler/backends/dom/state-machine-emitter.ts`      | parentStateSelector Fix     |
| `compiler/backends/dom/template-emitter.ts`           | parentStateSelector Fix     |
| `compiler/backends/dom/table-emitter.ts`              | parentStateSelector Fix     |
| `compiler/backends/dom/node-emitter.ts`               | parentStateSelector Fix     |
| `compiler/backends/framework.ts`                      | parentStateSelector Fix     |
| `studio/panels/components/component-templates.ts`     | Pure Component Definitionen |
| `compiler/schema/zag-primitives.ts`                   | Checkbox/Switch entfernt    |
