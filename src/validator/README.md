# Mirror DSL Validator

Ein umfassender Code-Validator für die Mirror DSL, der **100% Synchronisation** zwischen Parser und Validierung garantiert.

## Architektur

```
Source Code
     ↓
┌─────────────────────────────────────────────────────┐
│  LEXER (tokenize)                                   │
│  - Erkennt UNKNOWN_EVENT, UNKNOWN_PROPERTY,         │
│    UNKNOWN_ANIMATION durch Heuristiken              │
│  - Sammelt parseIssues mit Suggestions              │
└─────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────┐
│  PARSER (parse)                                     │
│  - Baut AST aus gültigen Tokens                     │
│  - Leitet parseIssues an ParseResult weiter         │
└─────────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────────┐
│  VALIDATOR (validateCode)                           │
│  - Property-Validierung (Typen, Werte, Konflikte)   │
│  - Library-Validierung (Slots, Required)            │
│  - Reference-Validierung ($tokens, Components)      │
│  - Event/Action/Animation/State/Type-Validierung    │
└─────────────────────────────────────────────────────┘
     ↓
ValidationResult { valid, errors[], warnings[], info[] }
```

## Verwendung

### Einfache Validierung

```typescript
import { parse } from './parser'
import { validateCode } from './validator'

const result = parse(code)
const validation = validateCode(result, code)

if (!validation.valid) {
  validation.errors.forEach(e => console.error(e.message))
}
```

### Parser mit integrierter Validierung

```typescript
const result = parse(code, { validate: true })

// result.diagnostics enthält alle Fehler
// result.parseIssues enthält Lexer-Level Issues
```

### Strict Mode (Warnings werden zu Errors)

```typescript
const result = parse(code, {
  validate: true,
  strictValidation: true
})
```

## Error-Tolerantes Parsing

Der Lexer erkennt ungültige Tokens durch Heuristiken und sammelt sie als `ParseIssue`:

```typescript
const result = parse('Box paddin 16 onclck toggle slideup')

console.log(result.parseIssues)
// [
//   { type: 'unknown_property', value: 'paddin', suggestion: 'Did you mean "pad"?' },
//   { type: 'unknown_event', value: 'onclck', suggestion: 'Did you mean "onclick"?' },
//   { type: 'unknown_animation', value: 'slideup', suggestion: 'Did you mean "slide-up"?' }
// ]
```

### Erkannte Fehlertypen

| Typ | Beispiel | Suggestion |
|-----|----------|------------|
| `unknown_event` | `onclck` | `onclick` |
| `unknown_property` | `paddin`, `colr` | `pad`, `col` |
| `unknown_animation` | `slideup`, `fde` | `slide-up`, `fade` |

## Validierungskategorien

| Kategorie | Error Codes | Prüft |
|-----------|-------------|-------|
| `property` | V001-V009 | Property-Namen, Typen, Werte, Konflikte |
| `library` | V010-V019 | Slots, Required, Multiplicity |
| `reference` | V020-V029 | Token-Referenzen, Component-Referenzen |
| `event` | V030-V039 | Event-Namen |
| `action` | V040-V049 | Action-Syntax, Targets, Animationen |
| `type` | V050-V059 | Operator-Typen, Vergleiche |
| `state` | V060-V069 | State-Referenzen |
| `animation` | V070-V079 | Animation-Namen, Kombinationen |

### Kategorien überspringen

```typescript
const validation = validateCode(result, code, {
  skip: ['type', 'reference']  // Diese Kategorien nicht prüfen
})
```

## ValidationDiagnostic

```typescript
interface ValidationDiagnostic {
  severity: 'error' | 'warning' | 'info'
  code: string              // z.B. 'V001'
  category: string          // z.B. 'property'
  message: string           // Fehlerbeschreibung
  location: {
    line: number            // 0-indexed
    column: number
  }
  source?: string           // Betroffene Quellzeile
  suggestions?: {
    replacement: string
    description: string
  }[]
}
```

## Beispiele

### Property-Fehler

```
Box paddin 16
    ^^^^^^
V001: Unknown property "paddin". Did you mean "pad"?
```

### Event-Fehler

```
Button onclck toggle
       ^^^^^^
V030: Unknown event "onclck". Did you mean "onclick"?
```

### Animation-Fehler

```
Panel show slideup 300
           ^^^^^^^
V043: Unknown animation "slideup". Did you mean "slide-up"?
```

### Konflikte

```
Box hor ver
    ^^^ ^^^
V009: Conflicting properties: "hor" and "ver" cannot be used together.
```

## API

### Hauptfunktionen

```typescript
// Vollständige Validierung
validateCode(result: ParseResult, source?: string, options?: ValidatorOptions): ValidationResult

// Schnelle Gültigkeitsprüfung
isValid(result: ParseResult, source?: string): boolean

// Als ParseErrors für Parser-Integration
getParseErrors(result: ParseResult, source?: string): ParseError[]
```

### Schema-Funktionen

```typescript
// Properties
isValidProperty(name: string): boolean
isValidColor(value: string): boolean

// Events & Actions
isValidEvent(name: string): boolean
isValidAction(name: string): boolean
isValidAnimation(name: string): boolean
isValidPosition(name: string): boolean

// Library Components
isLibraryComponent(name: string): boolean
isValidSlot(component: string, slot: string): boolean
getRequiredSlots(component: string): string[]
```

### Suggestion Engine

```typescript
import { findSimilar, getBestMatch } from './validator'

// Finde ähnliche Strings
const suggestions = findSimilar('paddin', ['pad', 'mar', 'col'])
// [{ value: 'pad', score: 0.83 }]

// Beste Übereinstimmung
const best = getBestMatch('onclck', ['onclick', 'onchange', 'onhover'])
// 'onclick'
```

## Debounced Validation (Editor)

Der `useCodeParsing` Hook validiert automatisch mit Debouncing:

```typescript
const { diagnostics, isValid } = useCodeParsing(
  tokensCode,
  componentsCode,
  layoutCode,
  150  // 150ms debounce
)

// diagnostics enthält alle Fehler und Warnings
diagnostics.forEach(d => {
  console.log(`${d.type}: Line ${d.line}: ${d.message}`)
})
```

## Dateien

```
src/validator/
├── index.ts                    # Entry Point
├── types.ts                    # TypeScript Types
├── error-codes.ts              # V001-V079 Definitionen
├── schemas/
│   ├── property-schema.ts      # Property-Definitionen
│   ├── library-schema.ts       # Library-Component-Slots
│   └── event-schema.ts         # Events, Actions, Animations
├── validators/
│   ├── property-validator.ts   # Property-Validierung
│   ├── reference-validator.ts  # Token/Component-Referenzen
│   ├── event-validator.ts      # Event-Namen
│   ├── action-validator.ts     # Action-Syntax
│   ├── library-validator.ts    # Library-Slots
│   ├── state-validator.ts      # State-Referenzen
│   ├── animation-validator.ts  # Animationen
│   └── type-validator.ts       # Typ-Kompatibilität
└── utils/
    ├── diagnostic-builder.ts   # Fluent API für Diagnostics
    └── suggestion-engine.ts    # Fuzzy-Match Algorithmen
```
