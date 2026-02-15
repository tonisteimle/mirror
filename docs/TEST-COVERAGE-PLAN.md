# Test Coverage Plan: Ziel 90%+

## Aktueller Stand
- **Statements**: 67.62%
- **Branches**: 61.26%
- **Functions**: 63.12%
- **Lines**: 69%

## Ziel
- **Statements**: 90%+
- **Branches**: 85%+
- **Lines**: 90%+

---

## Priorität 1: Parser (Kritisch)

### Dateien mit niedriger Coverage

| Datei | Coverage | Priorität |
|-------|----------|-----------|
| `parser/lexer/string-lexer.ts` | 24% | HOCH |
| `parser/lexer/json-lexer.ts` | 0% | HOCH |
| `parser/lexer/operator-lexer.ts` | 0% | MITTEL |
| `parser/component-parser/slot-properties.ts` | 34% | HOCH |
| `parser/component-parser/property-defaults.ts` | 11% | MITTEL |
| `parser/sugar/handlers/token-handler.ts` | 3% | MITTEL |

### Tests zu erstellen

```
src/__tests__/parser/
  lexer/
    string-lexer.test.ts       # Multiline strings, escapes, edge cases
    json-lexer.test.ts         # JSON data parsing
    operator-lexer.test.ts     # Operators, comparisons
  component-parser/
    slot-properties.test.ts    # Slot property inheritance
    property-defaults.test.ts  # Default value handling
  sugar/
    token-handler.test.ts      # Token resolution
```

---

## Priorität 2: Generator (Kritisch)

### Dateien mit niedriger Coverage

| Datei | Coverage | Priorität |
|-------|----------|-----------|
| `generator/actions/action-executor.ts` | 14% | HOCH |
| `generator/overlay-registry.tsx` | 22% | HOCH |
| `generator/overlay-portal.tsx` | 15% | MITTEL |
| `generator/data-context.tsx` | 17% | MITTEL |
| `generator/behaviors/registry.tsx` | 29% | HOCH |

### Tests zu erstellen

```
src/__tests__/generator/
  actions/
    action-executor.test.ts    # Alle Actions: show, hide, toggle, change, etc.
  overlays/
    overlay-registry.test.ts   # Overlay registration/deregistration
    overlay-portal.test.ts     # Portal rendering
  data/
    data-context.test.ts       # Data binding
    data-utils.test.ts         # Data transformation
  behaviors/
    registry.test.ts           # Behavior state management
```

---

## Priorität 3: Style System

### Dateien mit niedriger Coverage

| Datei | Coverage | Priorität |
|-------|----------|-----------|
| `utils/style-converter.ts` | 64% | MITTEL |
| `utils/color.ts` | 63% | MITTEL |

### Tests zu erstellen

```
src/__tests__/utils/
  style-converter/
    edge-cases.test.ts         # Grenzfälle, ungültige Werte
    hover-styles.test.ts       # Hover-Extraktion
    directional.test.ts        # Directional padding/margin/border
  color/
    contrast.test.ts           # Auto-contrast Berechnung
    parsing.test.ts            # Color parsing (hex, rgba, etc.)
```

---

## Priorität 4: Components (UI)

### Dateien mit niedriger Coverage

| Datei | Coverage | Priorität |
|-------|----------|-----------|
| `components/EditorPanel.tsx` | 32% | MITTEL |
| `components/editor-panel/SubMenu.tsx` | 2% | NIEDRIG |
| `components/Preview.tsx` | 45% | MITTEL |

### Tests zu erstellen

```
src/__tests__/components/
  EditorPanel/
    tabs.test.tsx              # Tab switching
    actions.test.tsx           # Clear, extract, etc.
    keyboard.test.tsx          # Keyboard shortcuts
  Preview/
    rendering.test.tsx         # Element rendering
    interaction.test.tsx       # Click, hover, etc.
```

---

## Priorität 5: Services

### Dateien mit niedriger Coverage

| Datei | Coverage | Priorität |
|-------|----------|-----------|
| `services/ai.ts` | 5% | NIEDRIG |
| `services/nl-translation.ts` | 33% | MITTEL |
| `services/confidence.ts` | 32% | NIEDRIG |

### Tests zu erstellen

```
src/__tests__/services/
  nl-translation/
    simple-phrases.test.ts     # Basic NL → DSL
    complex-phrases.test.ts    # Multi-component phrases
    edge-cases.test.ts         # Unbekannte Eingaben
```

---

## Implementierungsreihenfolge

### Phase 1: Core Parser Tests (Ziel: +10% Coverage)
1. `string-lexer.test.ts`
2. `json-lexer.test.ts`
3. `slot-properties.test.ts`

### Phase 2: Generator Tests (Ziel: +10% Coverage)
1. `action-executor.test.ts`
2. `registry.test.ts` (behaviors)
3. `overlay-registry.test.ts`

### Phase 3: Utils & Edge Cases (Ziel: +5% Coverage)
1. `style-converter/edge-cases.test.ts`
2. `color/contrast.test.ts`

### Phase 4: Component Tests (Ziel: +5% Coverage)
1. `EditorPanel/*.test.tsx`
2. `Preview/*.test.tsx`

---

## Test-Patterns

### Unit Test Pattern
```typescript
describe('FunctionName', () => {
  describe('happy path', () => {
    it('handles basic input', () => {})
    it('handles complex input', () => {})
  })

  describe('edge cases', () => {
    it('handles empty input', () => {})
    it('handles null/undefined', () => {})
    it('handles invalid input', () => {})
  })

  describe('error cases', () => {
    it('throws on invalid X', () => {})
  })
})
```

### Integration Test Pattern
```typescript
describe('Feature', () => {
  it('works end-to-end', () => {
    // Parse → Generate → Verify
  })
})
```

---

## Tracking

| Phase | Status | Tests Hinzugefügt | Beschreibung |
|-------|--------|-------------------|--------------|
| Phase 1 | DONE | 195+ | Lexer-Tests (string, json, operator) + Action-Executor + Registry |
| Phase 2 | TODO | - | Generator Tests |
| Phase 3 | TODO | - | Utils & Edge Cases |
| Phase 4 | TODO | - | Component Tests |

### Phase 1 Details (abgeschlossen)
- `src/__tests__/parser/lexer/string-lexer.test.ts` - 43 Tests
- `src/__tests__/parser/lexer/json-lexer.test.ts` - 29 Tests
- `src/__tests__/parser/lexer/operator-lexer.test.ts` - 52 Tests
- `src/__tests__/generator/actions/action-executor.test.ts` - 56 Tests
- `src/__tests__/generator/behaviors/registry.test.tsx` - 15 neue Tests (36 gesamt)

---

## Befehle

```bash
# Alle Tests mit Coverage
npm test -- --coverage

# Spezifische Datei testen
npm test -- --coverage src/__tests__/parser/lexer/

# Coverage Report öffnen
open coverage/lcov-report/index.html
```
