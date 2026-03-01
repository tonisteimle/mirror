# Mirror Codebase Cleanup Plan

> Ziel: Reiner Parser + Generator ohne Magic. Alle Komponenten transparent in _template Projekt.

---

## Phase 1: LLM Pipelines entfernen

### 1.1 React-Pivot System (komplett)
```
src/converter/react-pivot/           # ~5.575 Zeilen - LÖSCHEN
├── index.ts
├── types.ts
├── pipeline/
│   ├── react-generator.ts
│   ├── transformer.ts
│   ├── post-processor.ts
│   ├── retry-strategy.ts
│   ├── generation-strategies.ts
│   ├── dry-extractor.ts
│   └── index.ts
├── validation/
│   ├── react-linter.ts
│   ├── healing.ts
│   ├── llm-error-patterns.ts
│   ├── incremental-healing.ts
│   └── test-driven-regeneration.ts
├── spec/
│   ├── mapping.generated.ts
│   └── index.ts
├── prompts/
│   ├── system.ts
│   ├── correction.ts
│   └── index.ts
├── eval/
│   ├── index.ts
│   ├── runner.ts
│   └── test-cases.ts
└── integration/
    ├── adapter.ts
    └── index.ts
```

### 1.2 JS Converter
```
src/converter/js-builder.ts          # LÖSCHEN
src/converter/js-to-mirror.ts        # LÖSCHEN
src/converter/llm-js-generator.ts    # LÖSCHEN
```

### 1.3 LLM Services
```
src/lib/llm/                         # Prüfen was weg kann
src/lib/ai.ts                        # Prüfen
src/lib/ai-context.ts                # Prüfen
src/lib/llm-call.ts                  # Prüfen
src/services/nl-translation.ts       # LÖSCHEN (nutzt react-pivot)
src/services/nl-detection.ts         # LÖSCHEN
src/services/nl-prompts.ts           # LÖSCHEN
src/services/json-generation.ts      # Prüfen
src/services/json-pipeline/          # Prüfen
src/services/llm-post-processor.ts   # LÖSCHEN
```

### 1.4 Self-Healing System
```
src/lib/self-healing/                # LÖSCHEN
├── types.ts
├── validator.ts
└── pre-parse-validator.ts
```

### 1.5 Tests entfernen
```
src/__tests__/llm-evaluation/        # LÖSCHEN
src/__tests__/llm/                   # LÖSCHEN
src/__tests__/self-healing/          # LÖSCHEN
src/__tests__/services/nl-*.test.ts  # LÖSCHEN
src/__tests__/converter/             # LÖSCHEN
```

---

## Phase 2: Core Components System entfernen

### 2.1 Parser Core Components
```
src/parser/core-components.ts        # LÖSCHEN (975 Zeilen)
```

### 2.2 Parser.ts bereinigen
- Import von core-components entfernen
- buildCoreComponentRegistry() Aufruf entfernen
- CORE_COMPONENT_NAMES Referenzen entfernen

### 2.3 Referenzen in anderen Dateien
```
src/generator/export/analyze-interactivity.ts  # CORE_COMPONENT_NAMES Import entfernen
```

---

## Phase 3: Defaults.mirror System entfernen

### 3.1 Dateien
```
src/library/defaults.mirror          # LÖSCHEN (1.521 Zeilen)
src/library/defaults-loader.ts       # LÖSCHEN
```

### 3.2 Parser.ts bereinigen
- Import von defaults.mirror entfernen
- getDefaultsRegistry() entfernen
- clearDefaultsCache() entfernen
- Defaults-Loading aus parse() entfernen

### 3.3 Tests anpassen
```
src/__tests__/library/defaults-loading.test.ts  # LÖSCHEN
src/__tests__/docu/utils/parser-helpers.ts      # skipDefaults nicht mehr nötig
```

---

## Phase 4: Radix/Behaviors System entfernen

### 4.1 Behaviors
```
src/generator/behaviors/             # LÖSCHEN (komplett)
├── dropdown.tsx
├── input.tsx
├── doc-text.tsx
├── doc-wrapper.tsx
├── playground.tsx
├── registry.tsx
├── hooks.ts
├── types.ts
└── index.ts
```

### 4.2 Library Registry
```
src/library/registry.ts              # LÖSCHEN
src/library/types.ts                 # LÖSCHEN
src/library/components/              # LÖSCHEN
├── dropdown.ts
├── input.ts
├── doc-text.ts
├── doc-wrapper.ts
└── playground.ts
```

### 4.3 Generator bereinigen
- react-generator.tsx: BehaviorHandler Logik entfernen
- Behavior Registry Context entfernen

---

## Phase 5: Weitere Aufräumarbeiten

### 5.1 Nicht mehr benötigte Services
```
src/services/component-extractor.ts  # Prüfen
src/services/token-generator.ts      # Prüfen
src/services/generation/             # Prüfen
```

### 5.2 Experiment Ordner
```
src/experiment/react-to-mirror/      # LÖSCHEN
```

### 5.3 Intent System (falls nicht gebraucht)
```
src/intent/                          # Prüfen
├── intent-to-mirror.ts
├── mirror-to-intent.ts
├── schema-validator.ts
└── schema.ts
```

---

## Was bleibt übrig (Kern-System)

```
src/
├── parser/
│   ├── parser.ts                    # Reiner Parser
│   ├── lexer/                       # Tokenisierung
│   ├── component-parser/            # Komponenten-Parsing
│   ├── property-parser.ts
│   ├── state-parser.ts
│   ├── block-parser.ts
│   ├── children-parser.ts
│   ├── definition-parser.ts
│   └── types.ts
├── generator/
│   ├── react-generator.tsx          # Reiner React Output
│   ├── primitives/                   # HTML Primitives
│   ├── components/                   # React Components
│   ├── contexts/                     # React Contexts
│   ├── actions/                      # Action Executor
│   └── export/                       # Export Utils
├── editor/                           # CodeMirror Editor
├── components/                       # UI Components
├── hooks/                            # React Hooks
└── utils/                            # Utilities
```

---

## Reihenfolge der Ausführung

1. **LLM Pipelines** - Geringste Abhängigkeiten, sauberer Schnitt
2. **Core Components** - Parser vereinfachen
3. **Defaults.mirror** - Library-Loading entfernen
4. **Behaviors** - Generator vereinfachen
5. **Cleanup** - Restliche nicht genutzte Dateien

---

## Notizen

- Nach jeder Phase: Tests laufen lassen
- Imports prüfen die auf gelöschte Module zeigen
- TypeScript Compiler nutzen um tote Referenzen zu finden
- Git Commits pro Phase für einfaches Rollback
