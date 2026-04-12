# Mirror Compiler Teststrategie 2026

> Systematische Analyse von Schwachstellen, Risiken und daraus abgeleiteten Tests

---

## Executive Summary

Diese Teststrategie basiert auf einer umfassenden Analyse der Compiler-Architektur und der bestehenden ~3.700 Tests. Sie identifiziert **kritische Schwachstellen**, bewertet **Risiken** und leitet **konkrete Testmaßnahmen** ab.

### Wichtigste Erkenntnisse

| Bereich | Status | Handlungsbedarf |
|---------|--------|-----------------|
| Parser | ✅ Gut abgedeckt (440 Tests) | Wartung |
| IR-Transformer | ⚠️ Ungleichmäßig | 8 Transformer ohne eigene Tests |
| Layout | ✅ Gut abgedeckt (201 Tests) | Wartung |
| Events/Interaktion | ❌ Schwach (15 Tests) | **Kritisch** |
| Zag-Komponenten | ⚠️ Grundlagen ok | Edge-Cases fehlen |
| Animationen | ⚠️ Minimal (20 Tests) | Erweiterung nötig |
| Responsive Design | ❌ Nicht getestet | **Kritisch** |
| Accessibility | ❌ Nicht getestet | **Kritisch** |

---

## Teil 1: Schwachstellen-Analyse

### 1.1 Architektur-basierte Schwachstellen

Die Compiler-Pipeline hat 5 Stufen. Jede Stufe kann Fehler einführen:

```
Source → Lexer → Parser → IR (23 Transformer) → Backend → Runtime
           ↓         ↓              ↓               ↓          ↓
        Tokens     AST          IR-Nodes         Code       DOM
```

#### Schwachstelle S1: IR-Transformer-Orchestrierung

**Problem:** 23 Transformer laufen sequentiell. Die Reihenfolge ist kritisch.

```typescript
// compiler/ir/index.ts - vereinfacht
for (const node of ast.children) {
  resolveComponent()      // 1. Komponenten auflösen
  expandPropertySets()    // 2. Property-Sets expandieren
  transformProperties()   // 3. Properties → CSS
  computeLayout()         // 4. Layout berechnen
  buildStateMachine()     // 5. States aufbauen
  // ... 18 weitere
}
```

**Risiko:** Ein Transformer kann Annahmen über vorherige Transformer machen, die nicht mehr gelten, wenn sich die Reihenfolge ändert.

**Betroffene Dateien:**
- `compiler/ir/index.ts` (Orchestrierung)
- `compiler/ir/transformers/*.ts` (23 Module)

#### Schwachstelle S2: Property-Überladung

**Problem:** Dieselbe Property kann mehrfach gesetzt werden. "Letzter gewinnt" ist die Regel.

```mirror
Frame w 100 w 200 w full  // → w full (letzter gewinnt)
Frame hor ver             // → ver (letzter gewinnt)
Frame tc hor              // → ??? (Interaktion!)
```

**Risiko:** Bei kombinierten Properties (tc + hor) ist das Verhalten komplex und kann zu unerwarteten Ergebnissen führen.

#### Schwachstelle S3: Vererbungs-Kaskade

**Problem:** Komponenten können voneinander erben. Properties + Kinder werden gemergt.

```mirror
A: w 100, bg #f00
B as A: h 50        // erbt w 100, bg #f00, fügt h 50 hinzu
C as B: bg #0f0     // erbt alles, überschreibt bg

// Aber was passiert bei Kindern?
D: Frame
  Text "1"
E as D:
  Text "2"          // Ersetzt? Ergänzt?
```

**Risiko:** Child-Merging-Semantik ist komplex. Verschiedene Szenarien können unterschiedlich funktionieren.

#### Schwachstelle S4: State-Machine-Generierung

**Problem:** Custom States erzeugen JavaScript-State-Machines mit CSS-Klassen.

```mirror
Btn toggle()
  on:
    bg #0f0
    Icon "check"
```

**Risiko:**
- State-Transitions können fehlerhaft sein
- CSS-Klassen können kollidieren
- Child-Elemente in States werden möglicherweise nicht korrekt gehandhabt

#### Schwachstelle S5: Zag-Integration

**Problem:** 50+ Zag-Komponenten haben eigene State-Machines und Slots.

```mirror
Select
  Trigger: Button "Wählen"
  Content: Frame
    Item "A"
    Item "B"
```

**Risiko:**
- Slot-Zuordnung kann fehlschlagen
- Zag-Machine-Config kann inkorrekt generiert werden
- Styling von Slots kann verloren gehen

#### Schwachstelle S6: Event-Binding

**Problem:** Events werden in JavaScript-Code übersetzt.

```mirror
Button onclick toggle() toast("Clicked!")
```

**Risiko:**
- Mehrere Event-Handler auf demselben Element
- Event-Bubbling/Propagation
- Keyboard-Events mit Modifiern

#### Schwachstelle S7: Data-Binding und Iteration

**Problem:** `each`-Loops und Data-Referenzen werden zur Laufzeit aufgelöst.

```mirror
each item in $items where item.active
  Card
    Title "$item.name"
```

**Risiko:**
- Filterung (`where`) kann fehlschlagen
- Nested Loops können Performance-Probleme verursachen
- Data-Referenzen in States können outdated sein

---

### 1.2 Transformer-spezifische Schwachstellen

| Transformer | Tests vorhanden? | Schwachstellen |
|-------------|------------------|----------------|
| `component-resolver.ts` | ✅ ir-component-merging | Zirkuläre Vererbung |
| `property-transformer.ts` | ✅ Layout-Tests | Property-Aliase, Shortcuts |
| `layout-transformer.ts` | ✅ 201 Tests | Flex/Grid-Konflikte |
| `state-machine-transformer.ts` | ⚠️ Wenige | Multi-State-Transitions |
| `state-child-transformer.ts` | ⚠️ state-children.test | Nested States |
| `state-styles-transformer.ts` | ⚠️ Wenige | Hover + Custom State |
| `event-transformer.ts` | ❌ Minimal | Multi-Handler, Bubbling |
| `zag-transformer.ts` | ✅ 88 Tests | Slot-Styling, Nesting |
| `data-transformer.ts` | ⚠️ data-*.test | Nested References |
| `control-flow-transformer.ts` | ⚠️ parser-conditionals | Nested if/else |
| `expression-transformer.ts` | ⚠️ Wenige | Komplexe Ausdrücke |
| `table-transformer.ts` | ✅ table-*.test | Dynamic Columns |
| `chart-transformer.ts` | ⚠️ chart-primitives | Config-Mapping |
| `compound-transformer.ts` | ❌ Keine | Compound-Komponenten |
| `slot-utils.ts` | ⚠️ ir-slot-ir | Default Slots |
| `loop-utils.ts` | ⚠️ parser-iteration | Nested Loops |
| `value-resolver.ts` | ❌ Keine | Token-Auflösung |
| `property-set-expander.ts` | ❌ Keine | Set-Expansion |
| `inline-extraction.ts` | ❌ Keine | Inline-Styles |
| `validation.ts` | ✅ validator-*.test | Edge Cases |
| `style-utils-transformer.ts` | ⚠️ Wenige | Utility-Funktionen |
| `property-utils-transformer.ts` | ⚠️ Wenige | Property-Helpers |
| `transformer-context.ts` | ❌ Keine | Context-Management |

**8 Transformer haben keine oder minimale Tests!**

---

## Teil 2: Risiko-Bewertung

### Risiko-Matrix

| ID | Risiko | Wahrsch. | Impact | Score | Priorität |
|----|--------|----------|--------|-------|-----------|
| R1 | Event-Handler funktionieren nicht korrekt | Hoch | Kritisch | 25 | **P0** |
| R2 | State-Transitions fehlerhaft | Mittel | Hoch | 16 | **P1** |
| R3 | Zag-Slots verlieren Styling | Mittel | Hoch | 16 | **P1** |
| R4 | Layout-Konflikte bei Vererbung | Mittel | Mittel | 12 | P2 |
| R5 | Data-Binding in Loops fehlerhaft | Mittel | Hoch | 16 | **P1** |
| R6 | Animationen nicht korrekt | Niedrig | Mittel | 6 | P3 |
| R7 | Deep Nesting bricht ab | Niedrig | Hoch | 8 | P2 |
| R8 | Performance bei großen Dokumenten | Mittel | Mittel | 12 | P2 |
| R9 | Responsive Design funktioniert nicht | Hoch | Hoch | 20 | **P0** |
| R10 | Accessibility-Probleme | Hoch | Hoch | 20 | **P0** |

### Score-Berechnung
- Wahrscheinlichkeit: Niedrig=1, Mittel=3, Hoch=5
- Impact: Niedrig=1, Mittel=3, Hoch=4, Kritisch=5
- Score = Wahrscheinlichkeit × Impact

---

## Teil 3: Abgeleitete Tests

### 3.1 P0: Kritische Tests (sofort implementieren)

#### T1: Event-Handler Comprehensive Tests

**Ziel:** Alle Event-Szenarien abdecken

```typescript
// tests/compiler/events-comprehensive.test.ts

describe('Event Handler Generation', () => {
  describe('Single Events', () => {
    test('onclick generates click handler')
    test('onhover generates mouseenter handler')
    test('onfocus generates focus handler')
    test('onblur generates blur handler')
    test('onchange generates change handler')
    test('oninput generates input handler')
  })

  describe('Keyboard Events', () => {
    test('onkeydown generates keydown handler')
    test('onkeydown enter filters for Enter key')
    test('onkeydown escape filters for Escape key')
    test('onkeydown arrow-up filters for ArrowUp')
    test('onenter shorthand works')
    test('onescape shorthand works')
  })

  describe('Multiple Events', () => {
    test('onclick + onhover on same element')
    test('onclick + onkeydown enter on same element')
    test('three events on same element')
  })

  describe('Event Actions', () => {
    test('toggle() changes state')
    test('show(element) makes element visible')
    test('hide(element) hides element')
    test('toast("message") shows toast')
    test('navigate(view) changes view')
    test('multiple actions: toggle(), toast()')
  })

  describe('Event in Components', () => {
    test('event inherited from component')
    test('event overridden in instance')
    test('event in state block')
  })

  describe('Event in Loops', () => {
    test('onclick in each loop has correct scope')
    test('event handler accesses loop variable')
  })
})
```

**Geschätzter Aufwand:** 50 Tests, 2 Tage

#### T2: Responsive Design Tests

**Ziel:** @media Queries und responsive Verhalten testen

```typescript
// tests/compiler/responsive.test.ts

describe('Responsive Design', () => {
  describe('Breakpoint Properties', () => {
    test('w-sm sets width at small breakpoint')
    test('w-md sets width at medium breakpoint')
    test('w-lg sets width at large breakpoint')
    test('hidden-sm hides at small breakpoint')
  })

  describe('Grid Responsiveness', () => {
    test('grid 12 collapses to grid 6 on mobile')
    test('grid auto adjusts columns')
  })

  describe('Media Query Generation', () => {
    test('generates @media (max-width: 640px)')
    test('generates @media (min-width: 768px)')
    test('multiple breakpoints generate correct queries')
  })

  // Wenn responsive noch nicht implementiert:
  describe.skip('Future: Responsive System', () => {
    test('responsive syntax accepted by parser')
    test('responsive generates CSS media queries')
  })
})
```

**Geschätzter Aufwand:** 30 Tests, 1-2 Tage

#### T3: Accessibility Tests

**Ziel:** ARIA-Attribute und semantisches HTML prüfen

```typescript
// tests/compiler/accessibility.test.ts

describe('Accessibility', () => {
  describe('Semantic HTML', () => {
    test('Button generates <button> not <div>')
    test('Link generates <a> with href')
    test('H1-H6 generate correct heading tags')
    test('Nav generates <nav>')
    test('Main generates <main>')
    test('Footer generates <footer>')
  })

  describe('ARIA Attributes', () => {
    test('disabled adds aria-disabled')
    test('hidden adds aria-hidden')
    test('Dialog has role="dialog"')
    test('Tabs have role="tablist"')
    test('Tab has role="tab" and aria-selected')
  })

  describe('Keyboard Navigation', () => {
    test('focusable elements have tabindex')
    test('keyboard-nav container allows arrow keys')
    test('Button is focusable by default')
  })

  describe('Zag Component Accessibility', () => {
    test('Select has aria-expanded')
    test('Checkbox has aria-checked')
    test('Dialog traps focus')
    test('Tooltip has aria-describedby')
  })

  describe('Color Contrast', () => {
    // Static analysis
    test('white text on dark background')
    test('dark text on light background')
  })
})
```

**Geschätzter Aufwand:** 40 Tests, 2 Tage

---

### 3.2 P1: Wichtige Tests (nächste Iteration)

#### T4: State-Machine Comprehensive Tests

```typescript
// tests/compiler/state-machine-comprehensive.test.ts

describe('State Machine', () => {
  describe('Toggle States', () => {
    test('toggle() switches between base and on')
    test('toggle() with 3 states cycles through all')
    test('toggle() with 5 states cycles correctly')
  })

  describe('Exclusive States', () => {
    test('exclusive() deactivates siblings')
    test('exclusive() within nested containers')
  })

  describe('Cross-Element States', () => {
    test('Name.state: syntax works')
    test('MenuBtn.open: shows/hides element')
    test('multiple elements react to same state')
  })

  describe('State Transitions with Animation', () => {
    test('hover 0.3s: generates transition')
    test('on 0.2s ease-out: generates transition with easing')
    test('multiple states with different durations')
  })

  describe('State Children', () => {
    test('children in base state')
    test('different children in on state')
    test('children with their own events in states')
  })

  describe('System States', () => {
    test('hover: generates :hover CSS')
    test('focus: generates :focus CSS')
    test('active: generates :active CSS')
    test('disabled: generates [disabled] CSS')
  })

  describe('Combined States', () => {
    test('hover + custom on state')
    test('focus + hover interaction')
    test('disabled overrides hover')
  })
})
```

**Geschätzter Aufwand:** 45 Tests, 2 Tage

#### T5: Zag Edge Cases Tests

```typescript
// tests/compiler/zag-edge-cases.test.ts

describe('Zag Component Edge Cases', () => {
  describe('Slot Styling Preservation', () => {
    test('Trigger: Button with custom bg')
    test('Content: Frame with pad, bg, rad')
    test('Item: with hover state')
    test('nested styling in slots')
  })

  describe('Deep Nesting', () => {
    test('Select inside Dialog')
    test('Tabs containing Dialogs')
    test('Dialog with Tabs containing Select')
    test('3 levels of Zag nesting')
  })

  describe('Zag in Loops', () => {
    test('Select in each loop')
    test('Checkbox in each loop with bind')
    test('Dialog in each loop')
  })

  describe('Zag with Custom Components', () => {
    test('Custom Trigger component')
    test('Custom Item component')
    test('Inheritance with Zag slots')
  })

  describe('Zag Machine Config', () => {
    test('disabled prop passed to machine')
    test('defaultValue sets initial state')
    test('positioning prop for Tooltip')
  })

  describe('Zag State Sync', () => {
    test('open state syncs with CSS')
    test('selected state on items')
    test('expanded state on accordion')
  })
})
```

**Geschätzter Aufwand:** 35 Tests, 1.5 Tage

#### T6: Data-Binding in Loops Tests

```typescript
// tests/compiler/data-loops-comprehensive.test.ts

describe('Data in Loops', () => {
  describe('Basic Each', () => {
    test('each item in $items renders all items')
    test('each with object access: $item.name')
    test('each with nested object: $item.author.name')
  })

  describe('Filtered Each', () => {
    test('where item.active == true')
    test('where item.count > 0')
    test('where with string comparison')
    test('where with and/or operators')
  })

  describe('Sorted Each', () => {
    test('by price ascending')
    test('by price desc descending')
    test('by name alphabetically')
  })

  describe('Combined Operations', () => {
    test('where + by together')
    test('where + by desc')
  })

  describe('Nested Loops', () => {
    test('each category containing each item')
    test('2 levels of nesting')
    test('3 levels of nesting')
  })

  describe('Data Binding in Loop', () => {
    test('bind on container captures selected item')
    test('exclusive() in loop selects one')
    test('Checkbox in loop with individual state')
  })

  describe('Loop Performance', () => {
    test('100 items renders without timeout')
    test('1000 items renders within 1 second')
  })

  describe('Dynamic Data', () => {
    test('empty array shows nothing')
    test('single item array')
    test('data change re-renders')
  })
})
```

**Geschätzter Aufwand:** 40 Tests, 2 Tage

---

### 3.3 P2: Wichtige Tests (mittelfristig)

#### T7: Transformer Integration Tests

Für jeden der 8 untesteten Transformer:

```typescript
// tests/compiler/transformer-integration.test.ts

describe('Transformer Integration', () => {
  describe('value-resolver', () => {
    test('resolves token reference')
    test('resolves nested token')
    test('fallback for undefined token')
  })

  describe('property-set-expander', () => {
    test('expands property set')
    test('property set with token references')
    test('nested property sets')
  })

  describe('inline-extraction', () => {
    test('extracts inline component')
    test('multiple inline components')
  })

  describe('transformer-context', () => {
    test('context passed through transformers')
    test('context modifications persist')
  })

  describe('compound-transformer', () => {
    test('Table compound generates slots')
    test('compound with custom children')
  })
})
```

**Geschätzter Aufwand:** 25 Tests pro Transformer, ~60 Tests gesamt, 2 Tage

#### T8: Deep Nesting Tests

```typescript
// tests/compiler/deep-nesting.test.ts

describe('Deep Nesting', () => {
  describe('Layout Nesting', () => {
    test('5 levels of Frame nesting')
    test('alternating hor/ver 6 levels')
    test('grid inside flex inside grid')
  })

  describe('Component Nesting', () => {
    test('4 levels of inheritance')
    test('component with component child with component child')
  })

  describe('State Nesting', () => {
    test('state inside component inside state')
    test('3 levels of state references')
  })

  describe('Memory/Performance', () => {
    test('10 levels deep renders')
    test('50 siblings at each level')
  })
})
```

**Geschätzter Aufwand:** 20 Tests, 1 Tag

#### T9: Layout Conflict Resolution Tests

```typescript
// tests/compiler/layout-conflicts.test.ts

describe('Layout Conflicts', () => {
  describe('Direction Conflicts', () => {
    test('hor ver hor → hor (last wins)')
    test('hor stacked → stacked')
    test('grid hor → hor (last wins)')
  })

  describe('Alignment Conflicts', () => {
    test('center spread → spread')
    test('tl br → br')
    test('tc hor → special handling')
  })

  describe('Size Conflicts', () => {
    test('w 100 w full → w full')
    test('w hug w 100 → w 100')
    test('minw 50 w full → both applied')
  })

  describe('Inherited Conflicts', () => {
    test('parent hor, child ver inherits → child is ver')
    test('conflicting layout in inheritance chain')
  })
})
```

**Geschätzter Aufwand:** 25 Tests, 1 Tag

---

### 3.4 P3: Nice-to-have Tests (längerfristig)

#### T10: Animation Edge Cases

```typescript
// tests/compiler/animation-edge-cases.test.ts

describe('Animation Edge Cases', () => {
  describe('Timing Functions', () => {
    test('ease-in generates correct CSS')
    test('ease-out generates correct CSS')
    test('ease-in-out generates correct CSS')
    test('cubic-bezier custom timing')
  })

  describe('Animation Presets', () => {
    test('anim pulse generates keyframes')
    test('anim bounce generates keyframes')
    test('anim shake generates keyframes')
    test('anim spin generates infinite rotation')
  })

  describe('Combined Animations', () => {
    test('transition + animation preset')
    test('multiple properties with different durations')
  })

  describe('Animation in States', () => {
    test('animation starts on state enter')
    test('animation stops on state exit')
  })
})
```

**Geschätzter Aufwand:** 20 Tests, 1 Tag

#### T11: Performance Benchmarks

```typescript
// tests/compiler/performance-benchmarks.test.ts

describe('Performance Benchmarks', () => {
  describe('Parse Time', () => {
    test('1000 lines parses under 100ms')
    test('5000 lines parses under 500ms')
  })

  describe('IR Generation', () => {
    test('500 components transforms under 200ms')
    test('1000 components transforms under 500ms')
  })

  describe('Code Generation', () => {
    test('large document generates under 300ms')
  })

  describe('Memory Usage', () => {
    test('10000 element document stays under 100MB')
  })
})
```

**Geschätzter Aufwand:** 15 Tests, 1 Tag

#### T12: Browser Compatibility Tests (Playwright)

```typescript
// tests/e2e/browser-compatibility.test.ts

describe('Browser Compatibility', () => {
  describe('Chrome', () => {
    test('flex layout renders correctly')
    test('grid layout renders correctly')
    test('transitions animate')
  })

  describe('Firefox', () => {
    test('flex layout renders correctly')
    test('grid layout renders correctly')
  })

  describe('Safari', () => {
    test('flex layout renders correctly')
    test('webkit prefixes applied')
  })

  describe('Mobile Safari', () => {
    test('touch events work')
    test('viewport meta respected')
  })
})
```

**Geschätzter Aufwand:** 20 Tests, 2 Tage (Playwright Setup)

---

## Teil 4: Test-Implementierungsplan

### Phase 1: Kritische Lücken schließen (Woche 1-2)

| Tag | Tests | Aufwand |
|-----|-------|---------|
| 1-2 | T1: Event-Handler (50 Tests) | 2 Tage |
| 3-4 | T3: Accessibility (40 Tests) | 2 Tage |
| 5 | T2: Responsive (30 Tests) | 1 Tag |
| **Summe** | **120 Tests** | **5 Tage** |

### Phase 2: Wichtige Tests (Woche 3-4)

| Tag | Tests | Aufwand |
|-----|-------|---------|
| 1-2 | T4: State-Machine (45 Tests) | 2 Tage |
| 3-4 | T5: Zag Edge Cases (35 Tests) | 1.5 Tage |
| 5-6 | T6: Data-Loops (40 Tests) | 2 Tage |
| **Summe** | **120 Tests** | **5.5 Tage** |

### Phase 3: Integration & Nesting (Woche 5)

| Tag | Tests | Aufwand |
|-----|-------|---------|
| 1-2 | T7: Transformer Integration (60 Tests) | 2 Tage |
| 3 | T8: Deep Nesting (20 Tests) | 1 Tag |
| 4 | T9: Layout Conflicts (25 Tests) | 1 Tag |
| **Summe** | **105 Tests** | **4 Tage** |

### Phase 4: Polish & Performance (Woche 6)

| Tag | Tests | Aufwand |
|-----|-------|---------|
| 1 | T10: Animation Edge Cases (20 Tests) | 1 Tag |
| 2 | T11: Performance Benchmarks (15 Tests) | 1 Tag |
| 3-4 | T12: Browser Compatibility (20 Tests) | 2 Tage |
| **Summe** | **55 Tests** | **4 Tage** |

### Gesamt

| Phase | Tests | Tage |
|-------|-------|------|
| Phase 1 | 120 | 5 |
| Phase 2 | 120 | 5.5 |
| Phase 3 | 105 | 4 |
| Phase 4 | 55 | 4 |
| **Total** | **400 neue Tests** | **~18.5 Tage** |

---

## Teil 5: Metriken & Erfolgskriterien

### Ziel-Metriken nach Implementierung

| Metrik | Aktuell | Ziel |
|--------|---------|------|
| Gesamt-Tests | ~3,700 | ~4,100 |
| Event-Tests | 15 | 65 |
| State-Tests | 50 | 95 |
| Zag-Tests | 88 | 123 |
| Accessibility-Tests | 0 | 40 |
| Responsive-Tests | 0 | 30 |

### Qualitätskriterien

1. **Alle P0-Risiken abgedeckt** - Keine kritischen Lücken mehr
2. **Jeder Transformer getestet** - Mindestens 10 Tests pro Transformer
3. **Event-System vollständig** - Alle Event-Typen und Kombinationen
4. **Accessibility-Basis** - Semantisches HTML, ARIA, Keyboard-Nav

### Monitoring

Nach Implementierung:
- CI muss alle Tests in <5 Minuten durchlaufen
- Keine flaky Tests (3 Runs ohne Fehler)
- Test-Coverage-Report für kritische Module (>80%)

---

## Teil 6: Risiko-Mitigierung

### Wenn Tests scheitern

| Szenario | Aktion |
|----------|--------|
| Test findet echten Bug | → In changelog.md dokumentieren, Fix implementieren |
| Test-Annahme falsch | → Test anpassen, Dokumentation aktualisieren |
| Feature fehlt | → Als .skip markieren, Backlog-Issue erstellen |
| Performance zu langsam | → Timeout erhöhen oder Test optimieren |

### Wartbarkeit

1. **Tests gruppieren** nach Feature, nicht nach Technik
2. **Helper-Funktionen** für wiederkehrende Patterns
3. **Beschreibende Namen** - Test-Name = Spezifikation
4. **Keine Magic Numbers** - Konstanten oder Kommentare nutzen

---

## Anhang A: Test-Datei-Namenskonvention

```
tests/compiler/
├── events-comprehensive.test.ts      # T1
├── responsive.test.ts                # T2
├── accessibility.test.ts             # T3
├── state-machine-comprehensive.test.ts # T4
├── zag-edge-cases.test.ts            # T5
├── data-loops-comprehensive.test.ts  # T6
├── transformer-integration.test.ts   # T7
├── deep-nesting.test.ts              # T8
├── layout-conflicts.test.ts          # T9
├── animation-edge-cases.test.ts      # T10
├── performance-benchmarks.test.ts    # T11
tests/e2e/
└── browser-compatibility.test.ts     # T12
```

---

## Anhang B: Referenzen

- Bestehende Strategie: `tests/compiler/docs/strategie.md`
- Schema (SSOT): `compiler/schema/dsl.ts`
- Transformer: `compiler/ir/transformers/*.ts`
- Bestehende E2E: `tests/compiler/html-output-022.test.ts`
- Changelog: `tests/compiler/docs/changelog.md`

---

*Erstellt: 2026-04-12*
*Basierend auf Analyse von 118 Test-Dateien und 23 Transformer-Modulen*
