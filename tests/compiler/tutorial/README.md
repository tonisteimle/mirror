# Tutorial Tests

## Status

```
Tests:     267 passed (267 total)
Dateien:   12 passed
```

## Philosophie

**Wir testen VERHALTEN, nicht nur Compilation.**

```
Schlecht: "kompiliert ohne Fehler" ✓
Gut:      "exclusive() deaktiviert Geschwister" ✓
```

## Test-Ebenen

| Ebene | Datei | Prüft | Tests |
|-------|-------|-------|-------|
| **Compilation** | `tutorial-compilation.test.ts` | Alle 124 Beispiele kompilieren | 127 |
| **DOM-Struktur** | `tutorial-09-navigation.test.ts` | Zag-Komponenten DOM | 17 |
| **Verhalten** | `tutorial-*-behavior.test.ts` | Events, States, Layout | 123 |

## Gelöste Bugs

| Bug | Lösung |
|-----|--------|
| `each` Loop rendert nur 1 Item | Inline-Arrays werden jetzt korrekt geparst und gerendert |
| `fixed` wird zu `absolute` | Pin-Properties (pt, pl, pr, pb) setzen nicht mehr `position: absolute` |
| `x`/`y` erzeugt kein translateX/Y | IR-Transformation verwendet jetzt `transform: translateX/Y` statt `left/top` |
| `rgba()` wird nicht geparst | Parser unterstützt jetzt Funktionsaufrufe wie `rgba()`, `rgb()`, `hsl()` als Werte |

## Dateien

```
tests/compiler/tutorial/
├── README.md                              ← Diese Datei
├── test-utils.ts                          ← Render + Click + State Helpers
├── extract-examples.ts                    ← Extrahiert Code aus Tutorial-HTML
│
├── tutorial-compilation.test.ts           ← Smoke: alle Beispiele kompilieren (127)
│
├── tutorial-02-components-behavior.test.ts ← Komponenten, Slots, Vererbung (9)
├── tutorial-03-tokens-behavior.test.ts    ← Tokens als CSS-Vars (9)
├── tutorial-04-states-behavior.test.ts    ← toggle, exclusive, cycle (11)
├── tutorial-05-layout-behavior.test.ts    ← Flexbox, Center, Spread (17)
├── tutorial-06-grid-behavior.test.ts      ← CSS Grid (9)
├── tutorial-07-positioning-behavior.test.ts ← Stacked, Pin, Z-Index (14)
├── tutorial-08-styling-behavior.test.ts   ← Farben, Border, Typography (21)
├── tutorial-09-navigation.test.ts         ← Tabs, Accordion, Collapsible (17)
├── tutorial-10-overlays-behavior.test.ts  ← Dialog, Tooltip, Popover (9)
├── tutorial-11-data-behavior.test.ts      ← each, when (10)
└── tutorial-12-forms-behavior.test.ts     ← Input, Checkbox, Switch (14)
```

## Test-Utils

```typescript
import { renderWithRuntime, click, getState } from './test-utils'

// Rendert Code MIT Runtime (Events funktionieren)
const { root } = renderWithRuntime(code, container)

// Simuliert Click
click(element)

// Prüft State
expect(getState(element)).toBe('active')
```

## Bewiesene Features

### ✅ Kapitel 04: States

| Feature | Test | Status |
|---------|------|--------|
| `toggle()` | Wechselt default ↔ active | ✅ |
| `exclusive()` | Deaktiviert Geschwister | ✅ |
| `cycle()` | Rotiert durch States | ✅ |
| State-Styles | Werden bei Wechsel angewendet | ✅ |

### ✅ Kapitel 05: Layout

| Feature | Test | Status |
|---------|------|--------|
| `hor` | flex-direction: row | ✅ |
| `ver` | flex-direction: column | ✅ |
| `gap N` | gap: Npx | ✅ |
| `center` | alignItems + justifyContent | ✅ |
| `spread` | space-between | ✅ |
| `w full` | width: 100% | ✅ |
| 9-Zone (tl, tc, br, ...) | Korrekte Alignment-Werte | ✅ |

### ✅ Kapitel 06: Grid

| Feature | Test | Status |
|---------|------|--------|
| `grid N` | display: grid, N Spalten | ✅ |
| `w 2` in Grid | gridColumn: span 2 | ✅ |
| `dense` | gridAutoFlow: dense | ✅ |

### ✅ Kapitel 09: Navigation (Zag)

| Feature | Test | Status |
|---------|------|--------|
| Tabs | Root + Trigger + Content Slots | ✅ |
| Accordion | Items + ItemTrigger + ItemContent | ✅ |
| Collapsible | Trigger + Content Slots | ✅ |

## Befehle

```bash
# Alle Tutorial-Tests
npm test -- tests/compiler/tutorial/

# Nur Behavior-Tests
npm test -- tests/compiler/tutorial/tutorial-04-states-behavior.test.ts

# Nur Compilation
npm test -- tests/compiler/tutorial/tutorial-compilation.test.ts
```

## Neue Tests hinzufügen

### Behavior-Test (empfohlen)

```typescript
it('feature X funktioniert', () => {
  const { root } = renderWithRuntime(`
ComponentDef: ...
  state:
    ...
  onclick toggle()

ComponentDef "Instance"
`, container)

  const el = root.querySelector('[data-mirror-name="ComponentDef"]')

  click(el)
  expect(getState(el)).toBe('state')
})
```

### Bug als Test dokumentieren

```typescript
// BUG: Beschreibung - siehe Backlog
it.skip('expected behavior', () => {
  // Test-Code
})
```
