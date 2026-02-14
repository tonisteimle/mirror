# Intent-System Roadmap

> Ziel: LLM arbeitet mit strukturiertem JSON statt Mirror-Syntax. Garantiert sauberen, konsistenten Code.

## Status: Proof-of-Concept ✅

Was existiert:
- `src/intent/schema.ts` - Basis-Schema
- `src/intent/mirror-to-intent.ts` - Mirror → JSON
- `src/intent/intent-to-mirror.ts` - JSON → Mirror
- `src/intent/llm-prompt.ts` - System Prompt
- `src/intent/generate.ts` - Orchestrierung
- Integration mit OpenRouter in `src/lib/ai.ts`

---

## Phase 1: Schema Vollständigkeit

### 1.1 Layout Properties (fehlt)
```typescript
// Aktuell
style: {
  direction, gap, padding, width, height,
  background, color, radius, border, shadow,
  fontSize, fontWeight, opacity, cursor
}

// Fehlt
style: {
  // Alignment
  alignHorizontal: 'left' | 'center' | 'right',
  alignVertical: 'top' | 'center' | 'bottom',

  // Flex
  grow: boolean | number,
  shrink: number,
  wrap: boolean,
  between: boolean,  // space-between

  // Sizing
  minWidth, maxWidth, minHeight, maxHeight,
  full: boolean,  // 100% w+h

  // Margin
  margin: number | number[],

  // Border details
  borderStyle: 'solid' | 'dashed' | 'dotted',
  borderWidth: number | { top, right, bottom, left },

  // Typography
  fontFamily: string,
  lineHeight: number,
  textAlign: 'left' | 'center' | 'right',
  italic: boolean,
  underline: boolean,
  uppercase: boolean,
  truncate: boolean,

  // Scroll
  scroll: 'vertical' | 'horizontal' | 'both',
  clip: boolean,

  // Position
  position: 'relative' | 'absolute' | 'fixed',
  top, right, bottom, left: number,
  zIndex: number,

  // Grid
  grid: number | string[],  // columns
  gridGap: number,

  // Stacking
  stacked: boolean,

  // Visibility
  hidden: boolean,
  disabled: boolean,
}
```

### 1.2 Conditions (fehlt komplett)
```typescript
interface LayoutNode {
  // ... existing

  // Conditional rendering
  condition?: {
    variable: string,      // "$isLoggedIn"
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=',
    value: string | number | boolean,
  },

  // Conditional properties
  conditionalStyle?: {
    condition: Condition,
    then: ComponentStyle,
    else?: ComponentStyle,
  }[],
}
```

### 1.3 Iterators (fehlt komplett)
```typescript
interface LayoutNode {
  // ... existing

  // Iterator
  each?: {
    variable: string,      // "$item"
    source: string,        // "$items"
    template: LayoutNode,  // Was für jedes Item gerendert wird
  },
}
```

### 1.4 Animations (fehlt)
```typescript
interface ComponentDefinition {
  // ... existing

  // Show/Hide animations
  showAnimation?: {
    type: 'fade' | 'scale' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right',
    duration: number,
  },
  hideAnimation?: {
    type: 'fade' | 'scale' | 'slide-up' | 'slide-down',
    duration: number,
  },

  // Continuous animations
  animation?: {
    type: 'spin' | 'pulse' | 'bounce',
    duration: number,
  },
}
```

### 1.5 Events erweitern
```typescript
interface EventAction {
  action:
    // Existing
    | 'navigate' | 'toggle' | 'show' | 'hide' | 'open' | 'close' | 'assign'
    // Fehlt
    | 'highlight' | 'select' | 'deselect' | 'clear-selection'
    | 'activate' | 'deactivate' | 'deactivate-siblings' | 'toggle-state'
    | 'filter' | 'focus' | 'validate' | 'reset',

  target?: string,
  value?: string,

  // Für open/show
  position?: 'below' | 'above' | 'left' | 'right' | 'center',
  animation?: string,
  duration?: number,
}

interface LayoutNode {
  events?: {
    // Existing
    onclick?: EventAction[],
    // Fehlt
    'onclick-outside'?: EventAction[],
    onhover?: EventAction[],
    onchange?: EventAction[],
    oninput?: EventAction[],
    onfocus?: EventAction[],
    onblur?: EventAction[],
    onload?: EventAction[],
    // Keyboard mit Modifier
    'onkeydown:escape'?: EventAction[],
    'onkeydown:enter'?: EventAction[],
    'onkeydown:arrow-up'?: EventAction[],
    'onkeydown:arrow-down'?: EventAction[],
  },

  // Event timing
  eventModifiers?: {
    debounce?: number,
    delay?: number,
  },
}
```

### 1.6 Slots richtig abbilden
```typescript
interface ComponentDefinition {
  // ... existing

  // Slot definitions
  slots?: {
    name: string,
    style?: ComponentStyle,
    required?: boolean,
  }[],
}

interface LayoutNode {
  // ... existing

  // Slot content (statt nur children)
  slots?: Record<string, LayoutNode | LayoutNode[] | string>,
}
```

### 1.7 Primitives (Input, Image, etc.)
```typescript
interface LayoutNode {
  // ... existing

  // Primitive-specific
  primitiveType?: 'input' | 'textarea' | 'image' | 'link' | 'button' | 'checkbox',

  // Input
  inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url',
  placeholder?: string,

  // Image
  src?: string,
  alt?: string,
  fit?: 'cover' | 'contain' | 'fill',

  // Link
  href?: string,

  // Textarea
  rows?: number,
}
```

### 1.8 Data Binding (für Data-Tab)
```typescript
interface LayoutNode {
  // ... existing

  // Data binding
  dataSource?: string,        // Schema name: "User"
  dataField?: string,         // Field: "name"
  dataBinding?: {
    source: string,
    field: string,
    transform?: string,       // Optional transformation
  },
}
```

---

## Phase 2: Robustheit

### 2.1 Intent-Validation
```typescript
// Neues File: src/intent/validate.ts

interface ValidationResult {
  valid: boolean,
  errors: ValidationError[],
  warnings: ValidationWarning[],
}

function validateIntent(intent: Intent): ValidationResult {
  // - Alle Token-Referenzen existieren
  // - Alle Component-Referenzen existieren
  // - Keine zirkulären Abhängigkeiten
  // - Event-Targets existieren
  // - Pflichtfelder vorhanden
}
```

### 2.2 Schema-Validierung für LLM-Output
```typescript
// Mit zod oder ähnlich
import { z } from 'zod'

const IntentSchema = z.object({
  tokens: TokensSchema,
  components: z.array(ComponentSchema),
  layout: z.array(LayoutNodeSchema),
})

function parseAndValidate(json: string): Intent | ValidationError[] {
  const parsed = JSON.parse(json)
  const result = IntentSchema.safeParse(parsed)
  // ...
}
```

### 2.3 Error Recovery
```typescript
// Wenn LLM ungültiges JSON liefert:
// 1. Versuche JSON zu reparieren (fehlende Klammern, etc.)
// 2. Extrahiere gültige Teile
// 3. Re-prompt mit Fehlerbeschreibung
```

---

## Phase 3: Intelligentes Merging

### 3.1 Diff-basiertes Update
```typescript
// Statt alles zu ersetzen: nur Änderungen anwenden

interface IntentDiff {
  tokens: {
    added: Record<string, string>,
    modified: Record<string, { old: string, new: string }>,
    removed: string[],
  },
  components: {
    added: ComponentDefinition[],
    modified: { name: string, changes: Partial<ComponentDefinition> }[],
    removed: string[],
  },
  layout: {
    // Komplexer: Tree-Diff
  },
}

function computeDiff(before: Intent, after: Intent): IntentDiff
function applyDiff(intent: Intent, diff: IntentDiff): Intent
```

### 3.2 Selective Updates
```typescript
// User sagt: "Mach den Button blauer"
// LLM sollte NUR den relevanten Teil ändern

interface PartialIntent {
  // Nur die Teile die sich ändern
  tokens?: Partial<TokenDefinitions>,
  components?: Partial<ComponentDefinition>[],
  layout?: PartialLayoutUpdate[],
}
```

---

## Phase 4: LLM-Optimierung

### 4.1 Kürzerer System-Prompt
- Aktuell: ~2000 Tokens
- Ziel: ~500 Tokens
- Nur essenzielle Regeln

### 4.2 Few-Shot Examples
```typescript
// Im Prompt: Beispiele für häufige Operationen
const EXAMPLES = [
  {
    request: "Füge einen Button hinzu",
    before: { /* ... */ },
    after: { /* ... */ },
  },
  {
    request: "Ändere die Farbe zu rot",
    before: { /* ... */ },
    after: { /* ... */ },
  },
]
```

### 4.3 Streaming Support
```typescript
// Für bessere UX: Streaming-Response
async function* generateWithIntentStream(
  prompt: string,
  options: IntentGenerationOptions
): AsyncGenerator<PartialIntent>
```

---

## Phase 5: Testing

### 5.1 Unit Tests erweitern
- [ ] Alle neuen Schema-Features
- [ ] Edge Cases (leere Arrays, null values, etc.)
- [ ] Round-Trip für komplexe Mirror-Codes

### 5.2 LLM Integration Tests
```typescript
// Echte LLM-Calls mit verschiedenen Prompts
const TEST_PROMPTS = [
  "Erstelle ein Login-Formular",
  "Füge einen roten Button hinzu",
  "Mach das Layout horizontal",
  "Entferne den zweiten Text",
  "Ändere die Hintergrundfarbe zu dunkelblau",
  // ... 50+ Prompts
]

// Für jeden Prompt:
// 1. Generiere mit Intent-System
// 2. Validiere Output
// 3. Parse generierten Mirror-Code
// 4. Vergleiche mit Erwartung
```

### 5.3 Regression Tests
- Sammle echte User-Prompts
- Speichere erfolgreiche Outputs
- Teste bei Schema-Änderungen

---

## Phase 6: UI Integration

### 6.1 Toggle zwischen Modi
```
[ ] Intent-basiert (experimentell)
[x] Direkte Generierung (aktuell)
```

### 6.2 Debug-Ansicht
- Zeige Intent-JSON vor/nach
- Zeige was LLM geändert hat
- Hilft bei Fehleranalyse

### 6.3 Feedback-Loop
- User kann "falsch" markieren
- Sammle Daten für Verbesserung

---

## Prioritäten

| Prio | Task | Aufwand |
|------|------|---------|
| 1 | Schema: Layout Properties | M |
| 1 | Schema: Events erweitern | M |
| 1 | Schema: Conditions | M |
| 2 | Schema: Iterators | M |
| 2 | Schema: Animations | S |
| 2 | Schema: Primitives | M |
| 2 | Intent-Validation | M |
| 3 | Schema-Validierung (zod) | S |
| 3 | Error Recovery | M |
| 4 | Diff-basiertes Update | L |
| 4 | LLM-Prompt optimieren | M |
| 5 | Streaming | M |
| 5 | UI Integration | L |

S = Small (1-2h), M = Medium (3-5h), L = Large (1-2 Tage)

---

## Nächste Schritte

1. **Schema erweitern** - Prio 1 Tasks
2. **Tests schreiben** - Für neue Features
3. **Real-World Test** - 10-20 echte Prompts durchjagen
4. **Iterieren** - Basierend auf Ergebnissen
