# Self-Healing Konzept: Validator-First Approach

## Grundprinzip

```
reference.json  ─────┐
                     ├──►  VALIDATOR  ──►  FEHLER  ──►  KORREKTOREN
mirror-docu.json ────┘     (Source of Truth)
```

**Nicht raten, sondern WISSEN.**

---

## Phase 1: Wasserdichter Validator

### Datenquellen

Aus `docs/reference.json` extrahieren wir ALLE gültigen:

```typescript
interface DSLSchema {
  // Properties mit Kurzformen
  properties: {
    layout: string[]        // horizontal, hor, vertical, ver, gap, between, wrap, grow, fill, shrink, stacked, grid
    alignment: string[]     // hor-l, hor-cen, hor-r, ver-t, ver-cen, ver-b, cen, center
    sizing: string[]        // w, width, h, height, minw, min-width, maxw, max-width, minh, min-height, maxh, max-height, full
    spacing: string[]       // padding, p, pad, margin, m, mar, gap, g
    colors: string[]        // background, bg, color, c, col, border-color, boc
    border: string[]        // border, bor, radius, rad
    typography: string[]    // size, weight, font, line, align, italic, underline, uppercase, lowercase, truncate
    visual: string[]        // opacity, o, opa, shadow, cursor, z, hidden, visible, disabled, rotate, translate, shortcut
    scroll: string[]        // scroll, scroll-ver, scroll-hor, scroll-both, snap, clip
    hover: string[]         // hover-background, hover-bg, hover-color, hover-col, ...
    icon: string[]          // icon
  }

  // Directions für padding/margin/border
  directions: string[]      // l, r, t, u, b, d, left, right, top, bottom
  directionCombos: string[] // l-r, u-d, t-b, left-right, top-bottom

  // Events
  events: string[]          // onclick, onhover, onchange, oninput, onfocus, onblur, onkeydown, onkeyup, onload, onclick-outside
  segmentEvents: string[]   // onfill, oncomplete, onempty

  // Key Modifiers (für onkeydown/onkeyup)
  keyModifiers: string[]    // escape, enter, tab, space, arrow-up, arrow-down, arrow-left, arrow-right, backspace, delete, home, end

  // Timing Modifiers
  timingModifiers: string[] // debounce, delay

  // Actions
  actions: {
    visibility: string[]    // show, hide, toggle, open, close
    state: string[]         // change, toggle-state, activate, deactivate, deactivate-siblings
    selection: string[]     // highlight, select, deselect, clear-selection, filter
    other: string[]         // page, assign, alert, focus, validate, reset
  }

  // Action Targets
  targets: string[]         // self, next, prev, first, last, first-empty, highlighted, selected, self-and-before, all, none

  // Animations
  animations: string[]      // fade, scale, slide-up, slide-down, slide-left, slide-right, none

  // Positions (für open)
  positions: string[]       // below, above, left, right, center

  // Keywords
  keywords: string[]        // from, as, named, state, events, if, then, else, each, in, where, and, or, not, to

  // Primitives
  primitives: string[]      // Input, Textarea, Image, Link, Button, Segment

  // Primitive-spezifische Properties
  primitiveProperties: {
    segment: string[]       // segments, length, pattern, mask
    input: string[]         // type, placeholder
    image: string[]         // src, fit, alt
    // ...
  }

  // Wert-Constraints
  valueConstraints: {
    opacity: { min: 0, max: 1 }           // NICHT 0-100!
    shadow: ['sm', 'md', 'lg', 'xl']
    cursor: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing']  // KEINE Bindestriche!
    fit: ['cover', 'contain', 'fill', 'scale-down']
    pattern: ['digits', 'alpha', 'alphanumeric']
    align: ['left', 'center', 'right', 'justify']
    inputType: ['email', 'password', 'text', 'number', 'tel', 'url', 'search', 'date', 'time']
  }
}
```

### Validator-Klasse

```typescript
// src/validation/schema-validator.ts

import schemaData from '../../docs/reference.json'

export class SchemaValidator {
  private schema: DSLSchema

  constructor() {
    this.schema = this.extractSchema(schemaData)
  }

  // Extrahiert Schema aus reference.json
  private extractSchema(data: any): DSLSchema {
    // Parse die Tabellen und Code-Beispiele
    // Baue ein vollständiges Schema auf
  }

  // Validiert ein Property
  validateProperty(name: string): ValidationResult {
    const allProperties = [
      ...this.schema.properties.layout,
      ...this.schema.properties.alignment,
      // ... alle anderen
    ]

    if (allProperties.includes(name)) {
      return { valid: true }
    }

    return {
      valid: false,
      error: `Unknown property: ${name}`,
      suggestions: this.findSimilar(name, allProperties)
    }
  }

  // Validiert einen Property-Wert
  validatePropertyValue(property: string, value: any): ValidationResult {
    // Opacity: 0-1
    if (['opacity', 'opa', 'o'].includes(property)) {
      if (typeof value === 'number' && (value < 0 || value > 1)) {
        return {
          valid: false,
          error: `Opacity must be 0-1, got ${value}`,
          suggestion: value > 1 ? value / 100 : value
        }
      }
    }

    // Cursor: keine Bindestriche
    if (property === 'cursor') {
      if (!this.schema.valueConstraints.cursor.includes(value)) {
        return {
          valid: false,
          error: `Invalid cursor value: ${value}`,
          suggestions: this.schema.valueConstraints.cursor
        }
      }
    }

    // ... weitere Constraints
  }

  // Validiert ein Event
  validateEvent(name: string): ValidationResult { }

  // Validiert eine Action
  validateAction(name: string): ValidationResult { }

  // Validiert ein Target
  validateTarget(name: string): ValidationResult { }

  // Findet ähnliche Strings (für Suggestions)
  private findSimilar(input: string, valid: string[]): string[] {
    // Levenshtein-Distanz oder ähnlich
  }
}
```

---

## Phase 2: Fehler-Kategorisierung

### Fehler-Typen

```typescript
type ErrorCategory =
  // Syntax
  | 'UNKNOWN_PROPERTY'          // padd, backgrnd, etc.
  | 'UNKNOWN_EVENT'             // onclck, onhver
  | 'UNKNOWN_ACTION'            // toogle, shwo
  | 'UNKNOWN_TARGET'            // selff, nextt
  | 'UNKNOWN_ANIMATION'         // fadeIn, slideUp (ohne Bindestrich)
  | 'UNKNOWN_POSITION'          // middle, bottom

  // Wert-Fehler
  | 'INVALID_VALUE_RANGE'       // opacity 50 (sollte 0.5 sein)
  | 'INVALID_VALUE_TYPE'        // padding "16" (sollte 16 sein)
  | 'INVALID_VALUE_FORMAT'      // cursor not-allowed (Bindestrich!)
  | 'PX_SUFFIX'                 // width 200px (sollte 200 sein)
  | 'COLON_AFTER_PROPERTY'      // padding: 16 (CSS-Syntax)

  // Struktur-Fehler
  | 'TEXT_ON_SEPARATE_LINE'     // Button\n  "Click" (sollte inline)
  | 'SEMICOLON_CHAINING'        // onclick show A; hide B
  | 'EVENTS_AFTER_CHILDREN'     // Children vor onclick
  | 'MISSING_TOKEN_PREFIX'      // bg primary (sollte $primary)
  | 'TOKEN_AS_PROPERTY'         // $background statt background

  // Semantik-Fehler
  | 'COLOR_PROPERTY_CONFUSION'  // bg → col war FALSCH
  | 'MISSING_COLOR_PROPERTY'    // #FF0000 ohne bg/col
  | 'DUPLICATE_ELEMENT_NAMES'   // mehrere Item ohne -
```

### Fehler-Statistik

```typescript
interface ErrorStats {
  category: ErrorCategory
  count: number
  examples: string[]
  autoFixable: boolean
  fixComplexity: 'trivial' | 'simple' | 'complex' | 'manual'
}

// Sammle Statistiken aus LLM-Outputs
function collectErrorStats(outputs: string[]): ErrorStats[] {
  const validator = new SchemaValidator()
  const stats: Map<ErrorCategory, ErrorStats> = new Map()

  for (const output of outputs) {
    const errors = validator.validateFull(output)
    for (const error of errors) {
      // Zähle und kategorisiere
    }
  }

  return Array.from(stats.values())
    .sort((a, b) => b.count - a.count)  // Häufigste zuerst
}
```

---

## Phase 3: Priorisierte Korrektoren

### Priorisierung nach Häufigkeit

```
┌─────────────────────────────────────────────────────────────┐
│  PRIORITÄT  │  FEHLER                │  FIX-KOMPLEXITÄT    │
├─────────────┼────────────────────────┼─────────────────────┤
│  P0 (hoch)  │  UNKNOWN_PROPERTY      │  Fuzzy Match + Map  │
│             │  PX_SUFFIX             │  Regex              │
│             │  COLON_AFTER_PROPERTY  │  Regex              │
│             │  INVALID_VALUE_RANGE   │  Normalisierung     │
├─────────────┼────────────────────────┼─────────────────────┤
│  P1         │  TEXT_ON_SEPARATE_LINE │  Zeilen-Merge       │
│             │  MISSING_TOKEN_PREFIX  │  Token-Analyse      │
│             │  UNKNOWN_EVENT         │  Fuzzy Match        │
├─────────────┼────────────────────────┼─────────────────────┤
│  P2         │  DUPLICATE_ELEMENTS    │  Struktur-Analyse   │
│             │  EVENTS_AFTER_CHILDREN │  AST-Reordering     │
├─────────────┼────────────────────────┼─────────────────────┤
│  P3 (low)   │  SEMICOLON_CHAINING    │  Events-Block Gen   │
│             │  Manual/Complex        │  LLM Re-prompt      │
└─────────────────────────────────────────────────────────────┘
```

### Korrektor-Interface

```typescript
interface Corrector {
  category: ErrorCategory
  priority: number

  // Erkennt den Fehler
  detect(code: string, context?: ParseContext): CorrectionCandidate[]

  // Korrigiert den Fehler
  fix(candidate: CorrectionCandidate): string

  // Confidence (0-1)
  confidence(candidate: CorrectionCandidate): number
}

interface CorrectionCandidate {
  line: number
  column: number
  original: string
  suggested: string
  reason: string
}
```

---

## Phase 4: Integration

### Unified Pipeline

```typescript
// src/validation/unified-pipeline.ts

export class UnifiedValidationPipeline {
  private schemaValidator: SchemaValidator
  private correctors: Corrector[]

  constructor() {
    this.schemaValidator = new SchemaValidator()
    this.correctors = [
      new PropertyCorrector(),
      new PxSuffixCorrector(),
      new OpacityRangeCorrector(),
      new ColonRemover(),
      // ... alle anderen, sortiert nach Priorität
    ]
  }

  // Validiert und korrigiert
  process(code: string): ProcessResult {
    // 1. Schema-Validierung
    const errors = this.schemaValidator.validateFull(code)

    // 2. Automatische Korrekturen (nach Priorität)
    let correctedCode = code
    const corrections: Correction[] = []

    for (const corrector of this.correctors) {
      const candidates = corrector.detect(correctedCode)
      for (const candidate of candidates) {
        if (corrector.confidence(candidate) > 0.8) {
          correctedCode = corrector.fix(candidate)
          corrections.push({
            ...candidate,
            corrector: corrector.category
          })
        }
      }
    }

    // 3. Re-Validierung
    const remainingErrors = this.schemaValidator.validateFull(correctedCode)

    return {
      originalCode: code,
      correctedCode,
      corrections,
      remainingErrors,
      valid: remainingErrors.length === 0
    }
  }
}
```

---

## Nächste Schritte

1. **Schema-Extraktor bauen**
   - `reference.json` parsen
   - Alle Properties, Events, Actions, etc. extrahieren
   - TypeScript-Interface generieren

2. **Schema-Validator implementieren**
   - Vollständige Validierung gegen Schema
   - Fehler-Kategorisierung
   - Suggestions-Generierung

3. **LLM-Outputs sammeln**
   - E2E Tests laufen lassen
   - Fehler loggen und kategorisieren
   - Statistiken erstellen

4. **Korrektoren nach Priorität**
   - Häufigste Fehler zuerst
   - Mit höchster Confidence
   - Einfachste Fixes zuerst

---

## Dateien

| Datei | Zweck |
|-------|-------|
| `docs/reference.json` | Source of Truth |
| `src/validation/schema.ts` | Extrahiertes Schema |
| `src/validation/schema-validator.ts` | Validator gegen Schema |
| `src/validation/correctors/*.ts` | Einzelne Korrektoren |
| `src/validation/pipeline.ts` | Unified Pipeline |
| `src/__tests__/validation/schema.test.ts` | Schema-Tests |
