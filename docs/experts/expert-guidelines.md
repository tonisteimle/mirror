# Expert Guidelines

> Formale Regeln für konsistente, erweiterbare Expert-Architektur

## Das Problem

Ohne formale Regeln entstehen inkonsistente Experten:
- Unterschiedliche API-Signaturen
- Unterschiedliche Density-Implementierungen
- Duplizierter Code (jeder Expert baut eigene Buttons)
- Keine Garantien über generierten Code

## Die Lösung: Expert Manifest

Jeder Expert MUSS ein Manifest deklarieren, das seine Fähigkeiten und Grenzen formal beschreibt.

---

## Expert Manifest Schema

```typescript
// src/services/generation/types/expert-manifest.ts

interface ExpertManifest {
  // =========================================================================
  // IDENTITY
  // =========================================================================

  /** Eindeutiger Name (kebab-case) */
  name: string;  // "sidebar-navigation", "form", "tabs"

  /** Kurze Beschreibung (1 Satz) */
  description: string;

  /** UI-Domäne */
  category: 'navigation' | 'input' | 'content' | 'feedback' | 'layout';

  /** Versionsnummer für Schema-Kompatibilität */
  version: string;  // "1.0.0"

  // =========================================================================
  // DEPENDENCIES
  // =========================================================================

  /** Welche Primitives werden benötigt */
  primitives: PrimitiveName[];  // ['button', 'input', 'label']

  /** Welche Patterns werden benötigt */
  patterns: PatternName[];  // ['field', 'container', 'action-bar']

  /** Abhängigkeiten zu anderen Experts (für Architekt) */
  composableWith: ExpertName[];  // ['dialog', 'card']

  // =========================================================================
  // DIMENSIONS (Konfigurationsmöglichkeiten)
  // =========================================================================

  dimensions: {
    /** Shared Dimensions (MÜSSEN unterstützt werden) */
    shared: {
      density: true;      // compact | default | spacious
      background?: true;  // surface | elevated | transparent
      radius?: true;      // none | sm | md | lg
    };

    /** Expert-spezifische Dimensions */
    custom: {
      [key: string]: {
        options: string[];
        default: string;
        phase: 'mvp' | 'phase2' | 'phase3' | 'future';
        description: string;
      };
    };
  };

  // =========================================================================
  // SCHEMAS
  // =========================================================================

  /** Zod Schema für LLM Input */
  inputSchema: ZodSchema;

  /** Zod Schema für Builder Output (vor Code-Generierung) */
  outputSchema: ZodSchema;

  // =========================================================================
  // CONTRACTS (Garantien & Grenzen)
  // =========================================================================

  /** Was dieser Expert GARANTIERT */
  guarantees: string[];
  // Beispiele:
  // - "Generiert immer validen Mirror-Code"
  // - "Respektiert Density-System"
  // - "Alle States sind korrekt deklariert"
  // - "Keine hardcodierten Farben (nur Tokens/Roles)"

  /** Was dieser Expert NICHT kann */
  limitations: string[];
  // Beispiele:
  // - "Maximal 2 Verschachtelungsebenen"
  // - "Keine Tree-Struktur (nur flat/grouped)"
  // - "Keine Animationen"

  // =========================================================================
  // DETECTION (für automatisches Routing)
  // =========================================================================

  /** Regex-Patterns für Prompt-Erkennung */
  detectionPatterns: RegExp[];

  /** Beispiel-Prompts für Tests */
  examplePrompts: string[];
}
```

---

## Shared Dimensions

Diese Dimensions MÜSSEN von ALLEN Experts unterstützt werden:

### Density (Pflicht)

| Density | Button H | Input Pad | Gap | Font | Icon | Radius |
|---------|----------|-----------|-----|------|------|--------|
| compact | 28px | 6 10 | 8px | 12px | 16px | 4px |
| default | 38px | 10 12 | 12px | 13px | 18px | 6px |
| spacious | 48px | 14 16 | 16px | 14px | 20px | 8px |

```typescript
// src/services/generation/dimensions/density.ts

export const DENSITY = {
  compact: {
    button: { height: 28, paddingHorizontal: 12 },
    input: { paddingVertical: 6, paddingHorizontal: 10 },
    gap: 8,
    fontSize: 12,
    iconSize: 16,
    radius: 4,
  },
  default: {
    button: { height: 38, paddingHorizontal: 16 },
    input: { paddingVertical: 10, paddingHorizontal: 12 },
    gap: 12,
    fontSize: 13,
    iconSize: 18,
    radius: 6,
  },
  spacious: {
    button: { height: 48, paddingHorizontal: 20 },
    input: { paddingVertical: 14, paddingHorizontal: 16 },
    gap: 16,
    fontSize: 14,
    iconSize: 20,
    radius: 8,
  },
} as const;

export type Density = keyof typeof DENSITY;

export function getDensity(density: Density) {
  return DENSITY[density];
}
```

**Regel:** Experten nutzen `getDensity()`, nie eigene Werte.

### Background (Optional)

| Role | Hex | Verwendung |
|------|-----|------------|
| app | #09090B | Tiefster Hintergrund |
| surface | #18181B | Standard-Oberflächen |
| elevated | #27272A | Erhöhte Oberflächen |
| transparent | transparent | Kein Hintergrund |

### Radius (Optional)

| Role | Wert |
|------|------|
| none | 0 |
| sm | 4 |
| md | 8 |
| lg | 12 |

---

## Shared Patterns

Patterns die von mehreren Experts genutzt werden:

### Container Pattern

```typescript
// src/services/generation/patterns/container.ts

interface ContainerConfig {
  background: BackgroundRole;
  padding: SpacingRole;
  radius: RadiusRole;
  gap: SpacingRole;
}

function buildContainer(config: ContainerConfig): PatternResult {
  return {
    tokens: new Map([
      ['$bg', resolveBackground(config.background)],
    ]),
    definitions: [
      `ver, gap ${resolveSpacing(config.gap)}, pad ${resolveSpacing(config.padding)}, bg $bg, rad ${resolveRadius(config.radius)}`,
    ],
  };
}
```

**Verwendet von:** Form, Card, Dialog, Section, Panel

### Field Pattern

```typescript
// src/services/generation/patterns/field.ts

interface FieldConfig {
  labelPosition: 'top' | 'left' | 'hidden';
  requiredStyle: 'asterisk' | 'text' | 'dot' | 'none';
  withHelper: boolean;
  withError: boolean;
  density: Density;
}

function buildField(config: FieldConfig): PatternResult {
  // Kombiniert: Label + Input + Helper + Error
  // States: focus, invalid
}
```

**Verwendet von:** Form, Dialog, Settings, InlineEdit

### ActionBar Pattern

```typescript
// src/services/generation/patterns/action-bar.ts

interface ActionBarConfig {
  actions: Array<{
    type: 'submit' | 'cancel' | 'reset' | 'custom';
    variant: 'primary' | 'secondary' | 'ghost' | 'danger';
    label: string;
  }>;
  position: 'bottom' | 'inline' | 'sticky';
  alignment: 'left' | 'right' | 'spread';
  density: Density;
}

function buildActionBar(config: ActionBarConfig): PatternResult {
  // Kombiniert: Mehrere Buttons
}
```

**Verwendet von:** Form, Dialog, Modal, Toolbar

### Item Pattern

```typescript
// src/services/generation/patterns/item.ts

interface ItemConfig {
  withIcon: boolean;
  withLabel: boolean;
  withBadge: boolean;
  withMeta: boolean;
  selectable: boolean;
  density: Density;
}

function buildItem(config: ItemConfig): PatternResult {
  // Kombiniert: Icon + Label + Badge + Meta
  // States: hover, active, selected
}
```

**Verwendet von:** Navigation, Menu, Select, List, Tabs

---

## Expert Template

Jeder neue Expert folgt diesem Template:

```typescript
// src/services/generation/experts/[name].ts

import { z } from 'zod';
import { ExpertManifest, ExpertResult } from '../types';
import { getDensity, DENSITY } from '../dimensions/density';
import { DESIGN_DEFAULTS } from '../design-defaults';

// =============================================================================
// 1. MANIFEST
// =============================================================================

export const manifest: ExpertManifest = {
  name: 'example',
  description: 'Example expert for demonstration',
  category: 'content',
  version: '1.0.0',

  primitives: ['button'],
  patterns: ['container'],
  composableWith: ['dialog'],

  dimensions: {
    shared: {
      density: true,
      background: true,
    },
    custom: {
      layout: {
        options: ['vertical', 'horizontal'],
        default: 'vertical',
        phase: 'mvp',
        description: 'Layout direction',
      },
    },
  },

  guarantees: [
    'Generiert validen Mirror-Code',
    'Respektiert Density-System',
    'Verwendet nur semantische Farb-Rollen',
  ],

  limitations: [
    'Maximal 10 Items',
  ],

  detectionPatterns: [
    /\b(example|beispiel)\b/i,
  ],

  examplePrompts: [
    'Ein Beispiel mit 3 Items',
  ],
};

// =============================================================================
// 2. INPUT SCHEMA (was das LLM liefert)
// =============================================================================

export const InputSchema = z.object({
  items: z.array(z.object({
    label: z.string(),
  })).min(1).max(10),

  // Shared dimensions
  density: z.enum(['compact', 'default', 'spacious']).optional(),
  background: z.enum(['surface', 'elevated', 'transparent']).optional(),

  // Custom dimensions
  layout: z.enum(['vertical', 'horizontal']).optional(),
});

export type Input = z.infer<typeof InputSchema>;

// =============================================================================
// 3. DEFAULTS
// =============================================================================

const DEFAULTS: Required<Omit<Input, 'items'>> = {
  density: 'default',
  background: 'surface',
  layout: 'vertical',
};

function applyDefaults(input: Input): Required<Input> {
  return {
    ...DEFAULTS,
    ...input,
  };
}

// =============================================================================
// 4. TOKEN BUILDER
// =============================================================================

function buildTokens(input: Required<Input>): Map<string, string> {
  const tokens = new Map<string, string>();

  tokens.set('$bg', DESIGN_DEFAULTS.background[input.background]);
  tokens.set('$text', DESIGN_DEFAULTS.foreground.default);

  return tokens;
}

// =============================================================================
// 5. DEFINITION BUILDER
// =============================================================================

function buildDefinitions(input: Required<Input>): string[] {
  const d = getDensity(input.density);
  const lines: string[] = [];

  // Container
  lines.push('Example:');
  lines.push(`  ${input.layout === 'vertical' ? 'ver' : 'hor'}, gap ${d.gap}, pad ${d.gap}, bg $bg, rad ${d.radius}`);

  // Item Definition
  lines.push('');
  lines.push('ExampleItem:');
  lines.push(`  pad ${d.input.paddingVertical} ${d.input.paddingHorizontal}, col $text`);

  return lines;
}

// =============================================================================
// 6. INSTANCE BUILDER
// =============================================================================

function buildInstances(input: Required<Input>): string[] {
  const lines: string[] = [];

  lines.push('Example');
  for (const item of input.items) {
    lines.push(`  ExampleItem "${item.label}"`);
  }

  return lines;
}

// =============================================================================
// 7. MAIN BUILDER (Schema → Mirror Code)
// =============================================================================

export function build(input: Input): ExpertResult {
  const normalized = applyDefaults(input);

  const tokens = buildTokens(normalized);
  const definitions = buildDefinitions(normalized);
  const instances = buildInstances(normalized);

  // Tokens als String
  const tokenLines: string[] = [];
  for (const [name, value] of tokens) {
    tokenLines.push(`${name}: ${value}`);
  }

  const code = [
    ...tokenLines,
    '',
    ...definitions,
    '',
    ...instances,
  ].join('\n');

  return {
    code,
    tokens,
    definitions,
    instances,
  };
}

// =============================================================================
// 8. LLM PROMPT
// =============================================================================

export const PROMPT = `
Du generierst JSON für ein Example-Komponente.

## Output Schema
${JSON.stringify(InputSchema.shape, null, 2)}

## Beispiel
{
  "items": [
    { "label": "Item 1" },
    { "label": "Item 2" }
  ],
  "density": "default",
  "layout": "vertical"
}
`;

// =============================================================================
// 9. PUBLIC API
// =============================================================================

/**
 * Generate with LLM
 */
export async function generate(
  description: string,
  llmCall: LLMCallFn
): Promise<ExpertResult> {
  const response = await llmCall(PROMPT, description);
  const parsed = InputSchema.parse(JSON.parse(response));
  return build(parsed);
}

/**
 * Generate from schema (no LLM)
 */
export function generateFromSchema(input: Input): ExpertResult {
  const validated = InputSchema.parse(input);
  return build(validated);
}
```

---

## Konsistenz-Regeln

### Regel 1: Density via getDensity()

```typescript
// ✅ RICHTIG
const d = getDensity(config.density);
lines.push(`pad ${d.input.paddingVertical} ${d.input.paddingHorizontal}`);

// ❌ FALSCH
lines.push('pad 10 12');  // Hardcodiert
```

### Regel 2: Farben via DESIGN_DEFAULTS

```typescript
// ✅ RICHTIG
tokens.set('$bg', DESIGN_DEFAULTS.background.surface);
tokens.set('$text', DESIGN_DEFAULTS.foreground.default);

// ❌ FALSCH
tokens.set('$bg', '#18181B');  // Hardcodiert
```

### Regel 3: Keine Magic Numbers

```typescript
// ✅ RICHTIG
const d = getDensity(density);
lines.push(`h ${d.button.height}`);

// ❌ FALSCH
lines.push('h 38');  // Was bedeutet 38?
```

### Regel 4: Patterns wiederverwenden

```typescript
// ✅ RICHTIG
import { buildField } from '../patterns/field';
const fieldResult = buildField({ ... });

// ❌ FALSCH (Code duplizieren)
function buildMyField() {
  // Label + Input + Error nochmal bauen
}
```

### Regel 5: Schema-First

```typescript
// ✅ RICHTIG
const InputSchema = z.object({ ... });
type Input = z.infer<typeof InputSchema>;

// ❌ FALSCH
interface Input { ... }  // Keine Validierung
```

### Regel 6: Manifest vollständig

Jeder Expert MUSS ein vollständiges Manifest haben. Unvollständige Manifeste führen zu Build-Fehlern.

---

## Konsistenz-Tests

```typescript
// src/__tests__/generation/architecture.test.ts

import { getAllExperts } from '../experts';
import { getDensity } from '../dimensions/density';
import { parse } from '../../parser';

describe('Expert Architecture Consistency', () => {
  const experts = getAllExperts();

  describe.each(experts)('Expert: $name', (expert) => {

    // =========================================================================
    // MANIFEST TESTS
    // =========================================================================

    it('has valid manifest', () => {
      expect(expert.manifest.name).toMatch(/^[a-z-]+$/);
      expect(expert.manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(expert.manifest.guarantees.length).toBeGreaterThan(0);
    });

    it('declares all used primitives', () => {
      const result = expert.build(expert.defaultConfig);
      const usedPrimitives = extractPrimitiveUsage(result.code);

      for (const primitive of usedPrimitives) {
        expect(expert.manifest.primitives).toContain(primitive);
      }
    });

    // =========================================================================
    // DENSITY TESTS
    // =========================================================================

    it('supports all density levels', () => {
      for (const density of ['compact', 'default', 'spacious'] as const) {
        const result = expert.build({ ...expert.defaultConfig, density });
        expect(result.code).toBeDefined();
      }
    });

    it('respects density values', () => {
      const compact = expert.build({ ...expert.defaultConfig, density: 'compact' });
      const spacious = expert.build({ ...expert.defaultConfig, density: 'spacious' });

      // Compact sollte kleinere Werte haben
      const compactPadding = extractPadding(compact.code);
      const spaciousPadding = extractPadding(spacious.code);

      expect(compactPadding).toBeLessThan(spaciousPadding);
    });

    // =========================================================================
    // CODE QUALITY TESTS
    // =========================================================================

    it('generates valid Mirror code', () => {
      const result = expert.build(expert.defaultConfig);
      expect(() => parse(result.code)).not.toThrow();
    });

    it('uses only semantic color roles', () => {
      const result = expert.build(expert.defaultConfig);
      const colors = extractHexColors(result.code);

      // Alle Hex-Farben müssen in Tokens definiert sein
      for (const color of colors) {
        expect(result.tokens.values()).toContain(color);
      }
    });

    it('defines all used tokens', () => {
      const result = expert.build(expert.defaultConfig);
      const usedTokens = extractTokenReferences(result.code);
      const definedTokens = Array.from(result.tokens.keys());

      for (const token of usedTokens) {
        expect(definedTokens).toContain(token);
      }
    });

    // =========================================================================
    // DETECTION TESTS
    // =========================================================================

    it('detects example prompts', () => {
      for (const prompt of expert.manifest.examplePrompts) {
        const detected = detectExpert(prompt);
        expect(detected.expert).toBe(expert.manifest.name);
      }
    });

    // =========================================================================
    // SCHEMA TESTS
    // =========================================================================

    it('validates input against schema', () => {
      const invalidInput = { items: 'not-an-array' };
      expect(() => expert.InputSchema.parse(invalidInput)).toThrow();
    });

    it('applies defaults correctly', () => {
      const minimalInput = { items: [{ label: 'Test' }] };
      const result = expert.build(minimalInput);

      // Sollte mit Defaults funktionieren
      expect(result.code).toContain('default'); // oder entsprechender Check
    });
  });
});
```

---

## Pattern-Katalog

Patterns die extrahiert werden sollten:

| Pattern | Verwendet von | Status |
|---------|---------------|--------|
| **Container** | Form, Card, Dialog, Section, Panel | 🔲 |
| **Field** | Form, Dialog, Settings, InlineEdit | 🔲 |
| **ActionBar** | Form, Dialog, Modal, Toolbar | 🔲 |
| **Item** | Navigation, Menu, Select, List, Tabs | 🔲 |
| **Header** | Card, Dialog, Section, Panel | 🔲 |
| **Section** | Form, Navigation, Settings | 🔲 |
| **Overlay** | Dialog, Dropdown, Popover, Tooltip | 🔲 |

### Wann Pattern extrahieren?

**Regel:** Erst extrahieren wenn der zweite Consumer existiert.

```
1. Form Expert gebaut
   → Field inline im Form Builder

2. Dialog Expert gebaut, braucht auch Fields
   → Field als Pattern extrahieren
   → Form und Dialog nutzen Pattern

3. Settings Expert gebaut, braucht auch Fields
   → Pattern ist schon da, einfach nutzen
```

---

## Implementierungsreihenfolge

### Phase 1: Foundation

1. **dimensions/density.ts** - Zentrale Density-Definitionen
2. **types/expert-manifest.ts** - Manifest-Interface
3. **types/expert-result.ts** - Result-Interface
4. **architecture.test.ts** - Konsistenz-Tests

### Phase 2: Patterns extrahieren

1. **patterns/container.ts** - Aus Form extrahieren
2. **patterns/field.ts** - Aus Form extrahieren
3. **patterns/action-bar.ts** - Aus Form extrahieren
4. **patterns/item.ts** - Aus Navigation extrahieren

### Phase 3: Experts refaktoren

1. **SidebarNavigation** - Manifest hinzufügen, Item-Pattern nutzen
2. **Form** - Manifest hinzufügen, Field/Container/ActionBar-Patterns nutzen

### Phase 4: Neue Experts

1. **Tabs** - Nutzt Item-Pattern
2. **Dialog** - Nutzt Container/Field/ActionBar-Patterns
3. **Card** - Nutzt Container/Header-Patterns

---

## Dateistruktur (Ziel)

```
src/services/generation/
├── index.ts                    # Public API
├── design-defaults.ts          # Semantische Rollen
│
├── types/
│   ├── expert-manifest.ts      # Manifest-Interface
│   ├── expert-result.ts        # Result-Interface
│   └── index.ts
│
├── dimensions/
│   ├── density.ts              # Density-Werte (ZENTRAL)
│   ├── spacing.ts              # Spacing-Rollen
│   ├── radius.ts               # Radius-Rollen
│   └── index.ts
│
├── primitives/
│   ├── button.ts               # ✅ Existiert
│   ├── input.ts                # ✅ Existiert
│   ├── label.ts                # ✅ Existiert
│   ├── icon.ts                 # 🔲
│   ├── badge.ts                # 🔲
│   └── index.ts
│
├── patterns/
│   ├── container.ts            # 🔲
│   ├── field.ts                # 🔲
│   ├── action-bar.ts           # 🔲
│   ├── item.ts                 # 🔲
│   ├── header.ts               # 🔲
│   ├── section.ts              # 🔲
│   └── index.ts
│
├── experts/
│   ├── sidebar-navigation.ts   # ✅ Existiert (Manifest fehlt)
│   ├── form.ts                 # 🔲 (Primitives existieren)
│   ├── tabs.ts                 # 🔲
│   ├── dialog.ts               # 🔲
│   ├── card.ts                 # 🔲
│   └── index.ts                # Detection + Routing
│
├── schemas/
│   ├── sidebar-navigation.ts   # ✅ Existiert
│   ├── form.ts                 # 🔲
│   └── index.ts
│
├── builders/
│   ├── sidebar-navigation.ts   # ✅ Existiert
│   ├── form.ts                 # 🔲
│   └── index.ts
│
├── prompts/
│   ├── sidebar-navigation.ts   # ✅ Existiert
│   ├── form.ts                 # 🔲
│   └── index.ts
│
└── validation/
    ├── syntax-validator.ts     # 🔲
    ├── token-checker.ts        # 🔲
    └── index.ts
```

---

## Zusammenfassung

| Konzept | Zweck |
|---------|-------|
| **Manifest** | Formale Deklaration was ein Expert kann/nicht kann |
| **Shared Dimensions** | Konsistente Density/Background/Radius über alle Experts |
| **Patterns** | Wiederverwendbare Kombinationen (Field, Container, etc.) |
| **Konsistenz-Tests** | Automatische Validierung aller Regeln |
| **Expert Template** | Standard-Struktur für neue Experts |

**Die Architektur ist elegant wenn:**
- Jeder Expert sein Manifest erfüllt
- Patterns wiederverwendet werden statt Code dupliziert
- Konsistenz-Tests alle grün sind
- Neue Experts in <1h gebaut werden können
