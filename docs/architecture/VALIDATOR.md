# Mirror Validator

Schema-basierter Code-Validator für die Mirror DSL.

## Architektur

```
src/validator/
├── index.ts              # Public API
├── types.ts              # Types & Error Codes
├── generator.ts          # Generiert Regeln aus Schema
├── validator.ts          # Validator-Klasse
├── cli.ts                # CLI Tool
├── studio-integration.ts # Studio/Editor Integration
└── __tests__/            # 347 Tests
```

## Verwendung

### API

```typescript
import { validate, formatErrors } from 'mirror-lang/validator'

const result = validate('Box w 100 bg #333')

if (!result.valid) {
  console.log(formatErrors(result, source))
}
```

### CLI

```bash
# Einzelne Datei
npm run validate app.mirror

# Mehrere Dateien
npm run validate "src/*.mirror"

# Mit Optionen
npm run validate app.mirror --verbose --json
```

### Studio Integration

```typescript
import {
  DebouncedValidator,
  toCodeMirrorDiagnostics,
  toStatusBarInfo,
} from 'mirror-lang/validator'

// Debounced Validierung für Echtzeit-Feedback
const validator = new DebouncedValidator({
  delay: 300,
  onValidation: (result) => {
    // Update CodeMirror Diagnostics
    const diagnostics = toCodeMirrorDiagnostics(result, source)

    // Update Status Bar
    const status = toStatusBarInfo(result)
  },
})

// Bei Editor-Änderungen
editor.on('change', () => {
  validator.validate(editor.getValue())
})
```

## Was wird validiert?

| Kategorie | Prüfung | Error Code |
|-----------|---------|------------|
| **Primitives** | Gültiger Komponenten-Name | E001, E002 |
| **Properties** | Name + Wert korrekt | E100-E106 |
| **Events** | Event-Name + Key | E200-E203 |
| **Actions** | Action-Name + Target | E300-E302 |
| **States** | State-Name | E400-E401 |
| **Tokens** | Token definiert? | W500-W502 |
| **Struktur** | Doppelte Definitionen | E600-E603 |

## Error Codes

### Errors (E)

- `E001` - Unknown component
- `E002` - Undefined component
- `E003` - Recursive component
- `E100` - Unknown property
- `E101` - Invalid value
- `E102` - Missing value
- `E103` - Invalid direction
- `E104` - Invalid color
- `E105` - Value out of range
- `E106` - Invalid keyword
- `E200` - Unknown event
- `E201` - Unknown key
- `E202` - Unexpected key modifier
- `E203` - Missing action
- `E300` - Unknown action
- `E301` - Invalid target
- `E302` - Missing target
- `E400` - Unknown state
- `E401` - Duplicate state
- `E600` - Invalid nesting
- `E601` - Definition after use
- `E602` - Circular reference
- `E603` - Duplicate definition

### Warnings (W)

- `W500` - Undefined token
- `W501` - Unused token
- `W502` - Invalid token type

## Schema-Driven

Alle Validierungsregeln werden automatisch aus `src/schema/dsl.ts` generiert:

```typescript
// generator.ts
import { DSL, SCHEMA } from '../schema/dsl'

export function generateValidationRules(): ValidationRules {
  return {
    validPrimitives: new Set(Object.keys(DSL.primitives)),
    validProperties: buildPropertyMap(SCHEMA),
    validEvents: new Set(Object.keys(DSL.events)),
    validActions: new Set(Object.keys(DSL.actions)),
    validStates: new Set(Object.keys(DSL.states)),
    validKeys: new Set(DSL.keys),
    // ...
  }
}
```

Das bedeutet:
- Neue Properties im Schema → automatisch validiert
- Neue Events/Actions → automatisch erkannt
- Single Source of Truth bleibt erhalten

## Quick Fixes

Der Validator generiert "Did you mean...?" Vorschläge basierend auf Levenshtein-Distanz:

```typescript
import { getQuickFixes } from 'mirror-lang/validator'

if (result.errors.length > 0) {
  const fixes = getQuickFixes(result.errors[0], source)
  // [{ title: 'Replace with "background"', replacement: 'background', from: 4, to: 13 }]
}
```

## Performance

- Regeln werden einmalig generiert und gecached
- `DebouncedValidator` für Echtzeit-Validierung
- Inkrementelle Validierung via AST möglich
