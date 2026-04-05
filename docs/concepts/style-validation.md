# Style Validation Infrastructure

Automatisierte Validierung, dass UI-Elemente exakt so gerendert werden wie erwartet.

## Motivation

Mirror kompiliert Code zu DOM. Aber woher wissen wir, dass `Frame hor, gap 12` tatsächlich `flex-direction: row` und `gap: 12px` im Browser erzeugt?

Die Style Validation Infrastructure löst dieses Problem:

```
Mirror Code → IR (erwartete Styles) → DOM (tatsächliche Styles)
                    ↓                         ↓
              Was SOLL sein            Was IST
                    ↓                         ↓
                    └────── Vergleich ────────┘
```

## Schnellstart

```typescript
import { renderMirror, validateAll } from '../compiler/testing'

test('Frame hor hat korrekte Flex-Styles', () => {
  // 1. Mirror-Code rendern
  const ctx = renderMirror('Frame hor, gap 12')

  // 2. Validieren
  const result = validateAll(ctx)
  expect(result.passed).toBe(true)

  // 3. Aufräumen
  ctx.cleanup()
})
```

## API Reference

### Render-Funktionen

#### `renderMirror(code, container?)`

Rendert Mirror-Code zu DOM und gibt einen `RenderContext` zurück.

```typescript
const ctx = renderMirror('Frame bg #2563eb, pad 12')

// ctx enthält:
ctx.root        // HTMLElement - das Root-Element
ctx.elements    // Map<string, HTMLElement> - alle Elemente nach Node-ID
ctx.ir          // IR - die Intermediate Representation
ctx.sourceMap   // SourceMap - Mapping zu Source-Positionen
ctx.cleanup()   // Funktion zum Aufräumen
```

**Wichtig:** Immer `ctx.cleanup()` aufrufen nach dem Test!

### Validierungs-Funktionen

#### `validateAll(ctx, options?)`

Validiert alle Elemente im RenderContext.

```typescript
const result = validateAll(ctx)

// result enthält:
result.passed           // boolean - alle Tests bestanden?
result.totalElements    // number - Anzahl validierter Elemente
result.passedElements   // number - Anzahl bestandener Elemente
result.failedElements   // number - Anzahl fehlgeschlagener Elemente
result.totalProperties  // number - Anzahl geprüfter Properties
result.matchedProperties // number - Anzahl übereinstimmender Properties
result.elements         // ElementValidation[] - Details pro Element
result.failures         // ElementValidation[] - nur fehlgeschlagene
```

#### `validateById(ctx, nodeId, options?)`

Validiert ein einzelnes Element.

```typescript
const result = validateById(ctx, 'box-1')

if (result && !result.passed) {
  console.log('Mismatches:', result.mismatches)
}
```

#### `assertValid(ctx, options?)`

Wirft einen Fehler wenn Validierung fehlschlägt. Praktisch für Tests.

```typescript
// Wirft Error mit Details wenn nicht valide
assertValid(ctx)
```

#### `assertStyle(ctx, nodeId, property, expectedValue)`

Prüft einen einzelnen Style-Wert.

```typescript
assertStyle(ctx, 'box-1', 'flex-direction', 'row')
```

### Style-Zugriff

#### `getElementBaseStyles(element)`

Gibt die Base-Styles eines Elements zurück.

```typescript
const element = ctx.elements.get('box-1')!
const styles = getElementBaseStyles(element)

console.log(styles['flex-direction'])  // 'row'
console.log(styles['gap'])             // '12px'
```

#### `getElementStateStyles(element, state)`

Gibt die Styles für einen bestimmten State zurück.

```typescript
const hoverStyles = getElementStateStyles(element, 'hover')
console.log(hoverStyles['background'])  // '#444'
```

#### `getInlineStyles(element)`

Gibt die aktuellen Inline-Styles zurück.

```typescript
const styles = getInlineStyles(element)
```

### Reporting

#### `formatReport(result)`

Erzeugt einen lesbaren Report.

```typescript
const result = validateAll(ctx)
console.log(formatReport(result))
```

Ausgabe:
```
═══════════════════════════════════════════════════════════════
                    STYLE VALIDATION REPORT
═══════════════════════════════════════════════════════════════

Status: ✗ FAILED
Elements: 2/3 passed
Properties: 15/18 matched

───────────────────────────────────────────────────────────────
                         FAILURES
───────────────────────────────────────────────────────────────

► box-2 (Card)
  Location: line 5, col 2
  Mismatches:
    • background
      Expected: #2563eb
      Actual:   #333333

═══════════════════════════════════════════════════════════════
```

## Validation Options

```typescript
interface ValidationOptions {
  // Properties die ignoriert werden sollen
  ignoreProperties?: string[]

  // Computed Styles statt Inline Styles prüfen
  useComputedStyles?: boolean

  // State-Styles validieren (default: true)
  validateStates?: boolean

  // Nur bestimmte States validieren
  states?: string[]

  // Toleranz für numerische Werte
  numericTolerance?: number

  // Farben normalisieren (default: true)
  normalizeColors?: boolean
}
```

### Beispiel: Properties ignorieren

```typescript
const result = validateAll(ctx, {
  ignoreProperties: ['line-height', 'font-family']
})
```

### Beispiel: Nur Base-Styles validieren

```typescript
const result = validateAll(ctx, {
  validateStates: false
})
```

## Vitest Helpers

Für häufige Test-Patterns gibt es Komfort-Funktionen:

### `withMirror(code, testFn)`

Automatisches Cleanup.

```typescript
import { withMirror, expectValid } from '../compiler/testing/vitest-helpers'

test('Frame hor', () => {
  withMirror('Frame hor', (ctx) => {
    expectValid(ctx)
  })
})
```

### `quickValidate(code)`

Einzeiler für einfache Tests.

```typescript
import { quickValidate } from '../compiler/testing/vitest-helpers'

test('Frame hor ist valide', () => {
  quickValidate('Frame hor, gap 12')
})
```

### `quickExpectStyle(code, property, value)`

Einzeiler für einzelne Property-Tests.

```typescript
import { quickExpectStyle } from '../compiler/testing/vitest-helpers'

test('Frame hor hat flex-direction row', () => {
  quickExpectStyle('Frame hor', 'flex-direction', 'row')
})
```

### `quickExpectStyles(code, styles)`

Einzeiler für mehrere Properties.

```typescript
import { quickExpectStyles } from '../compiler/testing/vitest-helpers'

test('Frame hor, center hat korrekte Styles', () => {
  quickExpectStyles('Frame hor, center', {
    'display': 'flex',
    'flex-direction': 'row',
    'justify-content': 'center',
    'align-items': 'center',
  })
})
```

## Praktische Beispiele

### Layout-Defaults testen

```typescript
describe('Layout Defaults', () => {
  it('Frame hor sollte align-items: flex-start haben (NICHT center)', () => {
    const ctx = renderMirror('Frame hor')
    const styles = getElementBaseStyles(ctx.elements.get(ctx.ir.nodes[0].id)!)

    expect(styles['align-items']).toBe('flex-start')

    ctx.cleanup()
  })

  it('Frame hor und Frame ver sollten symmetrisch sein', () => {
    const ctxHor = renderMirror('Frame hor')
    const ctxVer = renderMirror('Frame ver')

    const stylesHor = getElementBaseStyles(ctxHor.elements.values().next().value)
    const stylesVer = getElementBaseStyles(ctxVer.elements.values().next().value)

    // Beide sollten flex-start haben
    expect(stylesHor['align-items']).toBe(stylesVer['align-items'])

    ctxHor.cleanup()
    ctxVer.cleanup()
  })
})
```

### Komponenten-Styles testen

```typescript
describe('Button Komponente', () => {
  it('PrimaryBtn hat korrekte Styles', () => {
    const ctx = renderMirror(`
PrimaryBtn: bg #2563eb, col white, pad 12 24, rad 6

PrimaryBtn "Speichern"
`)

    const result = validateAll(ctx)
    expect(result.passed).toBe(true)

    ctx.cleanup()
  })
})
```

### State-Styles testen

```typescript
describe('Hover States', () => {
  it('Button hover ändert Hintergrund', () => {
    const ctx = renderMirror(`
Btn: bg #333, pad 12
  hover:
    bg #444

Btn "Test"
`)

    const element = ctx.elements.values().next().value
    const hoverStyles = getElementStateStyles(element, 'hover')

    expect(hoverStyles['background']).toMatch(/(#444|rgb\(68,\s*68,\s*68\))/)

    ctx.cleanup()
  })
})
```

### Verschachtelte Strukturen testen

```typescript
describe('Nested Layouts', () => {
  it('Kinder erben keine Layout-Properties', () => {
    const ctx = renderMirror(`
Frame hor, gap 16
  Frame bg #111
  Frame bg #222
`)

    const result = validateAll(ctx)

    // Alle Elemente sollten ihre korrekten Styles haben
    expect(result.passed).toBe(true)
    expect(result.totalElements).toBe(3)

    ctx.cleanup()
  })
})
```

## Architektur

```
compiler/testing/
├── index.ts           # Haupt-Exports
├── types.ts           # TypeScript Interfaces
├── render.ts          # Mirror → DOM Rendering
├── style-validator.ts # IR ↔ DOM Vergleich
└── vitest-helpers.ts  # Test-Komfortfunktionen

tests/compiler/validation/
└── style-validation.test.ts  # Beispiel-Tests
```

### Datenfluss

1. **Parse**: `parse(code)` → AST
2. **Transform**: `toIR(ast, true)` → IR + SourceMap
3. **Generate**: `generateDOM(ast)` → JavaScript Code
4. **Execute**: `new Function(code)()` → DOM Elemente
5. **Extract**: `getElementBaseStyles(el)` → Actual Styles
6. **Compare**: IR Styles vs. DOM Styles
7. **Report**: Mismatches mit Source-Positionen

### Farbnormalisierung

JSDOM konvertiert Hex-Farben zu RGB. Der Validator normalisiert beide Formate:

```typescript
// Diese Werte werden als gleich betrachtet:
'#2563eb'           → 'rgb(37, 99, 235)'
'rgb(37, 99, 235)'  → 'rgb(37, 99, 235)'
'rgb(37,99,235)'    → 'rgb(37, 99, 235)'
```

## Best Practices

1. **Immer cleanup() aufrufen** - Verhindert Memory Leaks in Tests
2. **Spezifische Tests** - Teste einzelne Properties statt alles auf einmal
3. **Farben mit Regex** - `toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)` für Robustheit
4. **ValidationOptions nutzen** - Ignoriere irrelevante Properties
5. **formatReport() für Debugging** - Bei komplexen Fehlern

## Troubleshooting

### "Element not found"

Das Element wurde nicht gerendert oder hat keine `data-mirror-id`.

```typescript
// Debug: Alle verfügbaren IDs ausgeben
console.log(Array.from(ctx.elements.keys()))
```

### Farb-Mismatches

JSDOM konvertiert Farben. Nutze `normalizeColors: true` (default) oder Regex:

```typescript
expect(styles['background']).toMatch(/(#2563eb|rgb\(37,\s*99,\s*235\))/)
```

### State-Styles sind leer

State-Styles werden möglicherweise anders gespeichert. Prüfe `_stateStyles`:

```typescript
const element = ctx.elements.get('box-1') as any
console.log(element._stateStyles)
```
