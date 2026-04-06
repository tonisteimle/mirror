# Property Panel Testkonzept

## Übersicht

Dieses Dokument beschreibt das Testkonzept, die Testinfrastruktur und die Testfälle für den Property Editor (Property Panel) im Mirror Studio.

## Architektur-Überblick

```
studio/panels/property/
├── property-panel-refactored.ts  # Orchestrator (~1,160 Zeilen)
├── base/
│   ├── section.ts               # BaseSection Abstraktion
│   └── event-delegator.ts       # Event Delegation Pattern
├── sections/                    # 12 modulare Sections
│   ├── layout-section.ts        # Layout: hor/ver, gap, wrap, align
│   ├── sizing-section.ts        # Size: width, height, min/max
│   ├── spacing-section.ts       # Spacing: padding, margin
│   ├── color-section.ts         # Color: background, text color
│   ├── border-section.ts        # Border: radius, border
│   ├── typography-section.ts    # Typography: font, size, weight
│   ├── icon-section.ts          # Icon: size, color, weight, fill
│   ├── visual-section.ts        # Visual: shadow, opacity, cursor
│   ├── behavior-section.ts      # Behavior: Zag component props
│   ├── interactions-section.ts  # Interactions: toggle, exclusive
│   ├── events-section.ts        # Events: event handlers
│   └── actions-section.ts       # Actions: state definitions
├── components/                  # Wiederverwendbare UI-Komponenten
│   ├── token-input.ts           # Token-Eingabe mit Autocomplete
│   ├── toggle-group.ts          # Toggle-Button-Gruppen
│   ├── align-grid.ts            # 3x3 Alignment Grid
│   └── color-swatch.ts          # Farbvorschau
└── utils/                       # Hilfsfunktionen
    ├── html.ts                  # escapeHtml, classNames
    ├── validation.ts            # Input-Validierung
    └── tokens.ts                # Token-Extraktion
```

## Teststrategie

### Test-Pyramide

```
         ╱╲
        ╱  ╲
       ╱ E2E ╲        (~5%)   Playwright Browser-Tests
      ╱────────╲
     ╱Integration╲    (~20%)  Orchestrator + CodeModifier
    ╱──────────────╲
   ╱  Unit Tests    ╲  (~75%)  Sections, Utils, Components
  ╱──────────────────╲
```

### Testkategorien

| Kategorie | Beschreibung | Dateien |
|-----------|--------------|---------|
| **Unit** | Isolierte Section/Component-Tests | `property-sections.test.ts` |
| **Integration** | Orchestrator mit Mocks | `panel-property-panel.test.ts` |
| **Robustness** | PropertyExtractor + CodeModifier | `modifier-property-panel-robustness.test.ts` |
| **E2E** | Browser-basierte Tests | `tests/e2e/property-panel.test.ts` |

---

## Testinfrastruktur

### 1. Mock-Factories

```typescript
// tests/utils/helpers/property-panel-helpers.ts

/**
 * SelectionProvider Mock
 */
export function createMockSelectionProvider() {
  const listeners = new Set<(nodeId: string | null) => void>()
  let selection: string | null = null

  return {
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    getSelection: () => selection,
    select: (nodeId) => { selection = nodeId; listeners.forEach(l => l(nodeId)) },
    clearSelection: () => { selection = null; listeners.forEach(l => l(null)) },
    // Test helpers
    _triggerSelection: (nodeId) => { selection = nodeId; listeners.forEach(l => l(nodeId)) }
  }
}

/**
 * PropertyExtractor Mock
 */
export function createMockPropertyExtractor(elements: Map<string, ExtractedElement>) {
  return {
    getProperties: vi.fn((nodeId) => elements.get(nodeId) || null),
    getPropertiesForComponentDefinition: vi.fn(() => null),
    updateAST: vi.fn(),
    updateSourceMap: vi.fn(),
    getAllElements: vi.fn(() => Array.from(elements.values()))
  }
}

/**
 * CodeModifier Mock
 */
export function createMockCodeModifier() {
  return {
    _lastUpdate: null,
    updateProperty: vi.fn(function(nodeId, prop, value) {
      this._lastUpdate = { nodeId, prop, value }
      return { success: true, newSource: `// updated` }
    }),
    removeProperty: vi.fn(() => ({ success: true, newSource: '' })),
    addProperty: vi.fn(() => ({ success: true, newSource: '' })),
    updateSource: vi.fn(),
    getSource: vi.fn(() => '')
  }
}

/**
 * SectionDependencies Mock
 */
export function createMockSectionDeps(): SectionDependencies {
  return {
    onPropertyChange: vi.fn(),
    escapeHtml: (str) => str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c)),
    getSpacingTokens: vi.fn(() => []),
    getColorTokens: vi.fn(() => [])
  }
}
```

### 2. Test-Fixtures

```typescript
// tests/fixtures/property-panel-fixtures.ts

export const FIXTURES = {
  // Element-Fixtures
  elements: {
    simpleBox: {
      nodeId: 'node-1',
      componentName: 'Box',
      isDefinition: false,
      categories: [],
      allProperties: []
    },
    boxWithLayout: {
      nodeId: 'node-2',
      componentName: 'Box',
      categories: [{
        name: 'layout',
        label: 'Layout',
        properties: [
          { name: 'hor', value: 'true', type: 'boolean' },
          { name: 'gap', value: '12', type: 'number' }
        ]
      }]
    },
    boxWithColors: {
      nodeId: 'node-3',
      componentName: 'Box',
      categories: [{
        name: 'color',
        label: 'Color',
        properties: [
          { name: 'bg', value: '#2563eb', type: 'color' },
          { name: 'col', value: 'white', type: 'color' }
        ]
      }]
    }
  },

  // Source-Fixtures für Integration Tests
  sources: {
    simpleBox: 'Box bg #333, pad 16',
    nestedLayout: `
Frame hor, gap 12
  Box bg #333, w 100
  Box bg #666, w 200
`,
    componentDef: `
Card: bg #1a1a1a, pad 16, rad 8
  Title: col white, fs 18

Card
  Title "Hello"
`
  }
}
```

### 3. Test-Utilities

```typescript
// tests/utils/helpers/dom-helpers.ts

/**
 * DOM-Query-Helpers für Property Panel Tests
 */
export const DOM = {
  // Finde Section
  findSection: (container: HTMLElement, name: string) =>
    container.querySelector(`[data-section="${name}"]`),

  // Finde Input
  findInput: (container: HTMLElement, prop: string) =>
    container.querySelector(`input[data-prop="${prop}"]`) as HTMLInputElement | null,

  // Finde Toggle-Button
  findToggle: (container: HTMLElement, attr: string, value: string) =>
    container.querySelector(`[data-${attr}="${value}"]`) as HTMLElement | null,

  // Finde Color-Trigger
  findColorTrigger: (container: HTMLElement, prop: string) =>
    container.querySelector(`[data-color-prop="${prop}"]`) as HTMLElement | null,

  // Simuliere Input-Änderung
  changeInput: (input: HTMLInputElement, value: string) => {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  },

  // Simuliere Klick
  click: (el: HTMLElement) => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  }
}
```

---

## Testfälle

### 1. Unit Tests: Sections

#### 1.1 LayoutSection

```typescript
describe('LayoutSection', () => {
  describe('Rendering', () => {
    it('sollte Layout-Mode-Buttons rendern (hor/ver)', () => {})
    it('sollte aktiven Mode hervorheben', () => {})
    it('sollte Gap-Input mit aktuellem Wert rendern', () => {})
    it('sollte Wrap-Toggle rendern', () => {})
    it('sollte Alignment-Grid rendern', () => {})
    it('sollte Spread/Center-Toggles rendern', () => {})
  })

  describe('Event Handling', () => {
    it('sollte onPropertyChange bei Layout-Toggle aufrufen', () => {})
    it('sollte onPropertyChange bei Gap-Input aufrufen', () => {})
    it('sollte Validierung bei Gap-Input anwenden', () => {})
    it('sollte __REMOVE__ bei Toggle-Off senden', () => {})
  })

  describe('Edge Cases', () => {
    it('sollte leeren String rendern wenn keine Kategorie', () => {})
    it('sollte mit fehlenden Properties umgehen', () => {})
  })
})
```

#### 1.2 SizingSection

```typescript
describe('SizingSection', () => {
  describe('Rendering', () => {
    it('sollte Width/Height-Rows rendern', () => {})
    it('sollte Hug/Full-Toggles rendern', () => {})
    it('sollte Min/Max-Section rendern (collapsed)', () => {})
    it('sollte Position-Row rendern wenn isInPositionedContainer', () => {})
  })

  describe('Size Mode Toggle', () => {
    it('sollte "hug" bei Hug-Klick senden', () => {})
    it('sollte "full" bei Full-Klick senden', () => {})
    it('sollte __REMOVE__ bei erneutem Klick auf aktiven Mode senden', () => {})
  })

  describe('Min/Max Expansion', () => {
    it('sollte Expand-State toggeln', () => {})
    it('sollte expanded starten wenn Min/Max-Werte existieren', () => {})
  })
})
```

#### 1.3 SpacingSection

```typescript
describe('SpacingSection', () => {
  describe('Padding', () => {
    it('sollte Padding-Token-Buttons rendern', () => {})
    it('sollte H/V-Mode im Collapsed-State zeigen', () => {})
    it('sollte T/R/B/L-Mode im Expanded-State zeigen', () => {})
    it('sollte Shorthand-Werte parsen (1, 2, 3, 4 Werte)', () => {})
  })

  describe('Margin', () => {
    it('sollte Margin-Token-Buttons rendern', () => {})
    it('sollte unabhängig von Padding expandieren', () => {})
  })

  describe('Token-Handling', () => {
    it('sollte Token-Referenz bei Token-Klick senden', () => {})
    it('sollte aktiven Token hervorheben', () => {})
    it('sollte Token-Wert als Fallback verwenden', () => {})
  })

  describe('Validation', () => {
    it('sollte gültige Spacing-Werte akzeptieren', () => {})
    it('sollte ungültige Werte visuell markieren', () => {})
    it('sollte bei ungültigen Werten nicht speichern', () => {})
  })
})
```

#### 1.4 ColorSection

```typescript
describe('ColorSection', () => {
  describe('Rendering', () => {
    it('sollte immer rendern (auch ohne Farbwerte)', () => {})
    it('sollte Background-Trigger rendern', () => {})
    it('sollte Text-Color-Trigger rendern', () => {})
    it('sollte Farbvorschau als Swatch zeigen', () => {})
  })

  describe('Token-Display', () => {
    it('sollte Token-Namen anzeigen wenn Token-Referenz', () => {})
    it('sollte aufgelöste Farbe im Swatch zeigen', () => {})
  })

  describe('Color Picker Integration', () => {
    it('sollte __COLOR_PICKER__ Signal bei Klick senden', () => {})
    it('sollte Property-Name im Signal enthalten', () => {})
    it('sollte aktuellen Wert im Signal enthalten', () => {})
  })
})
```

#### 1.5 BorderSection

```typescript
describe('BorderSection', () => {
  describe('Radius', () => {
    it('sollte Radius-Token-Buttons rendern', () => {})
    it('sollte Full-Radius-Button (Circle) rendern', () => {})
    it('sollte Corner-Inputs im Expanded-State zeigen', () => {})
  })

  describe('Border', () => {
    it('sollte Border-Width-Toggles (0/1/2) rendern', () => {})
    it('sollte Border-Color-Trigger rendern', () => {})
    it('sollte Side-Borders im Expanded-State zeigen', () => {})
  })

  describe('Corner Radius', () => {
    it('sollte __RADIUS_CORNER__ Signal senden', () => {})
    it('sollte Corner-Werte korrekt formatieren', () => {})
  })
})
```

#### 1.6 TypographySection

```typescript
describe('TypographySection', () => {
  describe('Font', () => {
    it('sollte Font-Dropdown rendern', () => {})
    it('sollte aktuelle Font auswählen', () => {})
  })

  describe('Size', () => {
    it('sollte Font-Size-Tokens rendern', () => {})
    it('sollte Font-Size-Input mit Validierung rendern', () => {})
  })

  describe('Weight', () => {
    it('sollte Weight-Dropdown mit Labels rendern', () => {})
    it('sollte 100-900 Optionen bieten', () => {})
  })

  describe('Styles', () => {
    it('sollte Text-Align-Toggles rendern', () => {})
    it('sollte Italic/Underline/Truncate-Toggles rendern', () => {})
    it('sollte aktive Styles hervorheben', () => {})
  })
})
```

#### 1.7 IconSection

```typescript
describe('IconSection', () => {
  describe('Rendering', () => {
    it('sollte Size-Presets rendern (14-32)', () => {})
    it('sollte Color-Trigger rendern', () => {})
    it('sollte Weight-Input rendern', () => {})
    it('sollte Fill-Toggle rendern', () => {})
  })

  describe('Event Handling', () => {
    it('sollte Size bei Preset-Klick setzen', () => {})
    it('sollte Color-Picker bei Trigger-Klick öffnen', () => {})
    it('sollte Fill bei Toggle-Klick umschalten', () => {})
  })
})
```

#### 1.8 VisualSection

```typescript
describe('VisualSection', () => {
  describe('Rendering', () => {
    it('sollte Shadow-Toggles (sm/md/lg) rendern', () => {})
    it('sollte Opacity-Slider rendern', () => {})
    it('sollte Cursor-Dropdown rendern', () => {})
    it('sollte Overflow-Toggles rendern', () => {})
  })
})
```

#### 1.9 EventsSection

```typescript
describe('EventsSection', () => {
  describe('Empty State', () => {
    it('sollte "No events defined" zeigen wenn leer', () => {})
    it('sollte Add-Button rendern', () => {})
  })

  describe('Event List', () => {
    it('sollte Events mit Namen rendern', () => {})
    it('sollte Actions für jeden Event zeigen', () => {})
    it('sollte Edit/Delete-Buttons pro Event rendern', () => {})
  })

  describe('Event Actions', () => {
    it('sollte __ADD_EVENT__ bei Add-Klick senden', () => {})
    it('sollte __DELETE_EVENT__ bei Delete-Klick senden', () => {})
    it('sollte mit undefined events umgehen', () => {})
  })
})
```

---

### 2. Unit Tests: Components

```typescript
describe('TokenInput', () => {
  it('sollte Input mit Token-Buttons rendern', () => {})
  it('sollte aktiven Token hervorheben', () => {})
  it('sollte Tooltip mit Token-Wert zeigen', () => {})
})

describe('ToggleGroup', () => {
  it('sollte Buttons mit Icons rendern', () => {})
  it('sollte aktiven Button hervorheben', () => {})
  it('sollte Multi-Select erlauben wenn konfiguriert', () => {})
})

describe('AlignGrid', () => {
  it('sollte 3x3 Grid rendern', () => {})
  it('sollte aktive Position hervorheben', () => {})
  it('sollte Spread-Button rendern', () => {})
})

describe('ColorSwatch', () => {
  it('sollte Farbe als Hintergrund zeigen', () => {})
  it('sollte "empty" Klasse wenn keine Farbe', () => {})
  it('sollte Token-Referenz auflösen', () => {})
})
```

---

### 3. Unit Tests: Utils

```typescript
describe('Validation Utils', () => {
  describe('validateInput', () => {
    it('sollte Zahlen akzeptieren', () => {})
    it('sollte Token-Referenzen akzeptieren', () => {})
    it('sollte hug/full akzeptieren für Size', () => {})
    it('sollte ungültige Werte ablehnen', () => {})
    it('sollte Fehlermeldung zurückgeben', () => {})
  })

  describe('validateSpacingValue', () => {
    it('sollte 1-Wert-Shorthand akzeptieren', () => {})
    it('sollte 2-Wert-Shorthand akzeptieren', () => {})
    it('sollte 3-Wert-Shorthand akzeptieren', () => {})
    it('sollte 4-Wert-Shorthand akzeptieren', () => {})
    it('sollte ungültige Werte ablehnen', () => {})
  })

  describe('applyValidationStyle', () => {
    it('sollte Fehler-Klasse bei ungültig setzen', () => {})
    it('sollte Fehler-Klasse bei gültig entfernen', () => {})
    it('sollte Custom-Validity setzen', () => {})
  })
})

describe('HTML Utils', () => {
  describe('escapeHtml', () => {
    it('sollte < und > escapen', () => {})
    it('sollte & escapen', () => {})
    it('sollte Anführungszeichen escapen', () => {})
  })

  describe('classNames', () => {
    it('sollte Klassen kombinieren', () => {})
    it('sollte falsy Werte ignorieren', () => {})
    it('sollte Objekt-Syntax unterstützen', () => {})
  })
})

describe('Token Utils', () => {
  describe('resolveColorToken', () => {
    it('sollte Token zu Farbwert auflösen', () => {})
    it('sollte Token-Name bei nicht-gefunden zurückgeben', () => {})
  })

  describe('spacingTokensToOptions', () => {
    it('sollte Tokens in Options umwandeln', () => {})
    it('sollte tokenRef setzen', () => {})
  })
})
```

---

### 4. Integration Tests: Orchestrator

```typescript
describe('PropertyPanel Orchestrator', () => {
  describe('Initialization', () => {
    it('sollte alle 12 Sections initialisieren', () => {})
    it('sollte Event-Delegation einrichten', () => {})
    it('sollte Selection-Subscription erstellen', () => {})
  })

  describe('Section Rendering', () => {
    it('sollte Layout-Section für Frame rendern', () => {})
    it('sollte Icon-Section für Icon rendern', () => {})
    it('sollte Typography-Section für Text rendern', () => {})
    it('sollte Behavior-Section für Zag-Komponenten rendern', () => {})
  })

  describe('Property Change Flow', () => {
    it('sollte CodeModifier.updateProperty aufrufen', () => {})
    it('sollte onCodeChange Callback aufrufen', () => {})
    it('sollte Panel nach Änderung aktualisieren', () => {})
  })

  describe('Signal Handling', () => {
    it('sollte __REMOVE__ als removeProperty behandeln', () => {})
    it('sollte __COLOR_PICKER__ an Color-Picker weiterleiten', () => {})
    it('sollte __PAD_TOKEN__ zu Spacing-Wert konvertieren', () => {})
    it('sollte __LAYOUT__ als Layout-Signal behandeln', () => {})
  })

  describe('Error Handling', () => {
    it('sollte bei CodeModifier-Fehler nicht crashen', () => {})
    it('sollte ungültige JSON-Signale abfangen', () => {})
    it('sollte fehlende Nodes graceful behandeln', () => {})
  })
})
```

---

### 5. Integration Tests: CodeModifier

```typescript
describe('PropertyPanel + CodeModifier Integration', () => {
  describe('Property Updates', () => {
    it('sollte einfache Property aktualisieren', () => {
      // Input: Box bg #333
      // Action: bg ändern zu #2563eb
      // Expected: Box bg #2563eb
    })

    it('sollte Property zu existierendem Element hinzufügen', () => {
      // Input: Box bg #333
      // Action: pad hinzufügen mit 16
      // Expected: Box bg #333, pad 16
    })

    it('sollte Property entfernen', () => {
      // Input: Box bg #333, pad 16
      // Action: pad entfernen
      // Expected: Box bg #333
    })
  })

  describe('Token Handling', () => {
    it('sollte Token-Referenz setzen', () => {
      // Input: Box bg #333
      // Action: bg zu $primary ändern
      // Expected: Box bg $primary
    })

    it('sollte Token zu direktem Wert ändern', () => {
      // Input: Box bg $primary
      // Action: bg zu #ff0000 ändern
      // Expected: Box bg #ff0000
    })
  })

  describe('Shorthand Properties', () => {
    it('sollte Padding-Shorthand aktualisieren', () => {
      // Input: Box pad 16
      // Action: horizontales Padding ändern zu 24
      // Expected: Box pad 16 24
    })

    it('sollte individuelles Padding setzen', () => {
      // Input: Box pad 16
      // Action: Top-Padding zu 8 ändern
      // Expected: Box pad 8 16 16 16
    })
  })

  describe('Component Definitions', () => {
    it('sollte Property in Definition ändern', () => {})
    it('sollte Instance-Override hinzufügen', () => {})
  })
})
```

---

### 6. E2E Tests (Playwright)

```typescript
// tests/e2e/property-panel.test.ts

describe('Property Panel E2E', () => {
  describe('Basic Workflow', () => {
    it('sollte Panel bei Element-Klick öffnen', async () => {
      // 1. Preview laden
      // 2. Element im Preview klicken
      // 3. Prüfen ob Panel Eigenschaften zeigt
    })

    it('sollte Eigenschaft bei Input-Änderung aktualisieren', async () => {
      // 1. Element selektieren
      // 2. Wert im Input ändern
      // 3. Prüfen ob Preview aktualisiert
      // 4. Prüfen ob Code aktualisiert
    })
  })

  describe('Color Picker Integration', () => {
    it('sollte Color-Picker bei Trigger-Klick öffnen', async () => {})
    it('sollte Farbe bei Picker-Auswahl ändern', async () => {})
    it('sollte Picker bei Click-Outside schließen', async () => {})
  })

  describe('Token Selection', () => {
    it('sollte Token-Button bei Klick aktivieren', async () => {})
    it('sollte Token-Referenz im Code setzen', async () => {})
  })

  describe('Keyboard Navigation', () => {
    it('sollte Tab zwischen Inputs navigieren', async () => {})
    it('sollte Enter für Commit verwenden', async () => {})
    it('sollte Escape für Abbruch verwenden', async () => {})
  })
})
```

---

## Test-Abdeckungsziele

| Bereich | Aktuelle Abdeckung | Ziel |
|---------|-------------------|------|
| **Sections (Unit)** | 17 Tests | 120+ Tests |
| **Components (Unit)** | 0 Tests | 20+ Tests |
| **Utils (Unit)** | 0 Tests | 30+ Tests |
| **Orchestrator (Integration)** | 24 Tests | 50+ Tests |
| **CodeModifier (Integration)** | 69 Tests | 100+ Tests |
| **E2E** | 1 Test | 10+ Tests |

**Gesamt-Ziel:** ~330 Tests für Property Panel

---

## Priorisierung

### Phase 1: Kritische Lücken (Prio 1) ✅ COMPLETE
1. ✅ Utils-Tests (validation.ts, html.ts) - 99 Tests
2. ✅ Component-Tests (token-input, toggle-group) - 62 Tests
3. ✅ Fehlende Section-Tests (behavior, interactions, actions, visual, events) - 83 Tests

**Implementiert in:**
- `tests/studio/property-panel-utils.test.ts`
- `tests/studio/property-panel-components.test.ts`
- `tests/studio/property-sections-extended.test.ts`

### Phase 2: Integration (Prio 2) ✅ COMPLETE
1. ✅ Signal-Handling Tests - 10 Tests
2. ✅ Property Change Flow Tests - 10 Tests
3. ✅ Error-Recovery Tests - 8 Tests
4. ✅ Section Coordination Tests - 6 Tests
5. ✅ Dispose/Cleanup Tests - 4 Tests

**Implementiert in:**
- `tests/studio/property-panel-integration.test.ts` (38 Tests)

### Phase 3: E2E (Prio 3)
1. Basis-Workflows
2. Color-Picker Integration
3. Keyboard-Navigation

---

## Ausführung

```bash
# Alle Property Panel Tests
npm test -- tests/studio/*property*.test.ts tests/studio/panel-property*.test.ts

# Nur Section-Tests
npm test -- tests/studio/property-sections.test.ts

# Robustness-Tests
npm test -- tests/studio/modifier-property-panel-robustness.test.ts

# Mit Coverage
npm test -- --coverage tests/studio/*property*.test.ts
```

---

## Wartung

- Bei neuen Sections: Entsprechende Tests in `property-sections.test.ts` hinzufügen
- Bei neuen Signals: Tests in `panel-property-panel.test.ts` hinzufügen
- Bei neuen Utils: Tests in `property-panel-utils.test.ts` (neu) hinzufügen
- E2E-Tests bei größeren UI-Änderungen aktualisieren
