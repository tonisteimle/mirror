# Aggressiver Table Test Plan

## Reality Check Ergebnisse (2026-04-02)

### Parser Reality (table-parser-reality.test.ts)

```
Table $tasks
→ type: Instance (nicht TableNode!)
→ $tasks wird als content Property gespeichert
→ isCompound: true ✓

Table $tasks where done == false
→ where wird NICHT erkannt
→ done wird als initialState interpretiert
→ false wird als leere Property interpretiert

Table $tasks by priority desc
→ by wird NICHT erkannt
→ priority wird als initialState interpretiert
→ desc verschwindet

Column titel, w 250
→ titel wird als initialState interpretiert (sollte field sein)
→ w, suffix, sortable werden erkannt ✓
```

### IR Reality (table-ir-reality.test.ts)

```
Table $tasks
→ primitive: "compound", name: "Table"
→ isTableComponent: undefined ✗
→ dataSource: undefined ✗
→ columns: undefined ✗

Column children:
→ primitive: "compound-slot"
→ w 250 → width: 250px ✓
→ Aber: kein field, kein suffix, kein inferredType
```

### DOM Reality (table-dom-reality.test.ts)

```
=== Missing Features ===
- mirror-table class ✗
- Data iteration (forEach) ✗
- Selection handling ✗
- Sorting ✗
- Filtering ✗
```

### Zusammenfassung

| Ebene | Status | Details |
|-------|--------|---------|
| **Unit Tests** | ✓ 42 pass | Isolierte Funktionen OK |
| **Parser** | ✗ GAP | Keine Table-spezifische Syntax |
| **IR Transform** | ✗ GAP | IRTable wird NIE erstellt |
| **DOM Backend** | ✗ GAP | emitTable() existiert aber nie aufgerufen |

**Die Implementierung ist zu ~20% fertig:**
- ✓ DataTypeRegistry (existiert, funktioniert)
- ✓ Type Renderers (existiert, funktioniert)
- ✓ IR Types (IRTable definiert)
- ✓ Compound Primitive (Table definiert)
- ✓ CSS (mirror-defaults.css)
- ✗ Parser (keine Table-Syntax)
- ✗ IR Transform (keine IRTable-Erstellung)
- ✗ Backend (emitTable nie verbunden)

## Test-Kategorien

### 1. Parser Reality Check (KRITISCH)

Was passiert WIRKLICH wenn wir `Table $tasks` parsen?

```typescript
// tests/compiler/table-parser.test.ts

describe('Table - Parser Reality Check', () => {
  it('parses Table as Zag component (current behavior)', () => {
    const ast = parse(`Table $tasks`)
    // Frage: Was ist ast? Instance? ZagNode? Error?
    console.log(JSON.stringify(ast, null, 2))
  })

  it('parses Table with where clause', () => {
    const ast = parse(`Table $tasks where done == false`)
    // Wird "where" als Property interpretiert?
  })

  it('parses Table with by clause', () => {
    const ast = parse(`Table $tasks by priority desc`)
    // Wird "by" als Property interpretiert?
  })

  it('parses Column slot', () => {
    const ast = parse(`
Table $tasks
  Column titel, w 250
`)
    // Wird Column als Child erkannt?
  })
})
```

### 2. IR Transformation Tests

```typescript
// tests/compiler/table-ir-transform.test.ts

describe('Table - IR Transformation', () => {
  it('transforms Table instance to IRTable', () => {
    const ast = parse(`Table $tasks`)
    const ir = compile(ast)
    // Hat ir.nodes ein Element mit isTableComponent: true?
  })

  it('infers columns from data schema', () => {
    const ast = parse(`
$tasks: [
  { titel: "Test", effort: 8 }
]
Table $tasks
`)
    const ir = compile(ast)
    // Werden columns automatisch erstellt?
  })

  it('applies column overrides', () => {
    const ast = parse(`
Table $tasks
  Column titel, w 250
  Column effort, suffix "h"
`)
    const ir = compile(ast)
    // Werden overrides angewendet?
  })
})
```

### 3. DOM Backend Tests

```typescript
// tests/compiler/table-dom-output.test.ts

describe('Table - DOM Output', () => {
  it('generates table container code', () => {
    const code = compileToDOM(`Table $tasks`)
    expect(code).toContain('mirror-table')
  })

  it('generates header row', () => {
    const code = compileToDOM(`Table $tasks`)
    expect(code).toContain('mirror-table-header')
  })

  it('generates data iteration', () => {
    const code = compileToDOM(`Table $tasks`)
    expect(code).toContain('forEach')
    expect(code).toContain('$tasks')
  })

  it('generates filter code for where clause', () => {
    const code = compileToDOM(`Table $tasks where done == false`)
    expect(code).toContain('.filter')
    expect(code).toContain('done == false')
  })

  it('generates sort code for by clause', () => {
    const code = compileToDOM(`Table $tasks by priority desc`)
    expect(code).toContain('.sort')
    expect(code).toContain('priority')
  })

  it('generates selection code', () => {
    const code = compileToDOM(`Table $tasks, select()`)
    expect(code).toContain('$selected')
    expect(code).toContain('addEventListener')
  })
})
```

### 4. Integration Tests

```typescript
// tests/compiler/table-integration.test.ts

describe('Table - Full Pipeline', () => {
  it('compiles simple table end-to-end', () => {
    const source = `
$tasks: [
  { titel: "Review", effort: 8, done: false },
  { titel: "Deploy", effort: 2, done: true }
]

Table $tasks
`
    const result = compile(source)
    expect(result.errors).toHaveLength(0)
    expect(result.html).toContain('Review')
    expect(result.html).toContain('Deploy')
  })

  it('compiles table with query', () => {
    const source = `
$tasks: [
  { titel: "Review", priority: 1 },
  { titel: "Deploy", priority: 2 }
]

Table $tasks where priority > 0 by priority desc
`
    const result = compile(source)
    // Reihenfolge sollte: Deploy, Review sein
  })
})
```

### 5. Edge Cases & Error Handling

```typescript
// tests/compiler/table-edge-cases.test.ts

describe('Table - Edge Cases', () => {
  // Leere Daten
  it('handles empty data gracefully', () => {
    const code = compileToDOM(`
$tasks: []
Table $tasks
`)
    expect(code).toContain('empty-state') // oder graceful handling
  })

  // Fehlende Collection
  it('handles missing collection', () => {
    const result = compile(`Table $nonexistent`)
    // Erwartung: Warning oder Error?
  })

  // Ungültige Column-Referenz
  it('handles invalid column reference', () => {
    const result = compile(`
$tasks: [{ titel: "Test" }]
Table $tasks
  Column nonexistent
`)
    // Erwartung: Warning?
  })

  // Typ-Inkonsistenz in Daten
  it('handles type inconsistency', () => {
    const result = compile(`
$tasks: [
  { value: 42 },
  { value: "text" }
]
Table $tasks
`)
    // Welcher Typ wird inferiert?
  })

  // Große Datenmenge
  it('handles large data sets', () => {
    const items = Array.from({ length: 1000 }, (_, i) =>
      `{ id: ${i}, name: "Item ${i}" }`
    ).join(',\n')

    const source = `
$items: [${items}]
Table $items
`
    const start = performance.now()
    compile(source)
    const duration = performance.now() - start
    expect(duration).toBeLessThan(5000) // < 5 Sekunden
  })
})
```

### 6. E2E Browser Tests

```typescript
// tests/e2e/table.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Table Component', () => {
  test('renders table with data', async ({ page }) => {
    await page.goto('/test-table.html')

    // Header sichtbar
    await expect(page.locator('.mirror-table-header')).toBeVisible()

    // Rows vorhanden
    const rows = page.locator('.mirror-table-row')
    await expect(rows).toHaveCount(3) // oder expected count
  })

  test('selection sets $selected', async ({ page }) => {
    await page.goto('/test-table-select.html')

    // Klick auf erste Zeile
    await page.click('.mirror-table-row:first-child')

    // Prüfe dass $selected gesetzt wurde
    const selected = await page.evaluate(() => window.$selected)
    expect(selected).toBeDefined()
    expect(selected.titel).toBe('First Item')
  })

  test('header click sorts table', async ({ page }) => {
    await page.goto('/test-table-sort.html')

    // Erste Zeile vor Sort
    const firstBefore = await page.textContent('.mirror-table-row:first-child')

    // Klick auf sortierbare Spalte
    await page.click('.mirror-table-header-cell[data-sortable]')

    // Erste Zeile nach Sort
    const firstAfter = await page.textContent('.mirror-table-row:first-child')

    expect(firstAfter).not.toBe(firstBefore)
  })
})
```

## Implementierungs-Gaps (aus Tests abgeleitet)

| Gap | Wo | Lösung |
|-----|-----|--------|
| Parser kennt `Table $data` Syntax nicht | parser.ts | parseTable() implementieren |
| `where`/`by`/`grouped by` nicht geparst | parser.ts | Query-Syntax parsen |
| IR Transformer ruft IRTable nie | ir/index.ts | Table-Transformation |
| DOM Backend emitTable() nicht verbunden | backends/dom.ts | isIRTable check |
| DataTypeRegistry nicht befüllt | ir/index.ts | beim Kompilieren befüllen |

## Priorisierte Reihenfolge

1. **Parser Reality Check** - Was passiert JETZT?
2. **Gap-Analyse** - Wo bricht die Pipeline?
3. **Parser implementieren** - Falls nötig
4. **IR Transform verbinden** - Falls nötig
5. **Backend verbinden** - Falls nötig
6. **Integration Tests** - Volle Pipeline
7. **E2E Tests** - Browser-Verhalten

## Nächster Schritt

Zuerst den "Reality Check" Test schreiben um zu sehen, was der Parser aktuell tut:

```bash
npm test -- --run tests/compiler/table-parser-reality.test.ts
```
