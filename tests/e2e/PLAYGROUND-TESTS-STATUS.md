# Playground E2E Tests - Status & Ansatz

## Aktueller Stand (2026-04-06)

### Getestete Tutorial-Dateien

| Datei | Playgrounds | Tests | Status |
|-------|-------------|-------|--------|
| **04-layout.html** | 10 | 35 | ✅ Fertig |
| **06-states.html** | 11 | 91 | ✅ Fertig |
| **07-functions.html** | 4 | 29 | ✅ Fertig |
| **11-navigation.html** | 20 | ~85 | 🔄 In Arbeit |

### Noch zu testen

- 00-intro.html
- 01-elemente.html
- 02-komponenten.html
- 03-tokens.html
- 05-styling.html
- 08-daten.html bis 10-eingabe.html
- 12-overlays.html (Dialog, Tooltip, Popover)
- 13-anzeige.html

---

## Test-Ansatz

### Struktur jeder Test-Datei

```typescript
// 1. Konfiguration
const TUTORIAL_URL = '/docs/tutorial/XX-name.html'
const PLAYGROUND_INDEX = N  // 0-indexed

// 2. Setup - Warten auf Shadow DOM
async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[0].querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

// 3. Helper-Funktionen mit page.evaluate() für Shadow DOM Zugriff
// 4. Tests: DOM-Struktur, Funktionalität, Visual Regression
```

### Shadow DOM Zugriff

Playgrounds rendern in Shadow DOM. Zugriff nur via `page.evaluate()`:

```typescript
await page.evaluate((idx) => {
  const playgrounds = document.querySelectorAll('[data-playground]')
  const playground = playgrounds[idx]
  const preview = playground?.querySelector('.playground-preview')
  const shadow = preview?.shadowRoot
  const root = shadow?.querySelector('.mirror-root')
  // root.children[1] ist das erste gerenderte Element
}, PLAYGROUND_INDEX)
```

### Was getestet wird

1. **DOM-Struktur** - Elemente existieren, korrekte Texte
2. **Initial State** - data-state="default", hidden-Elemente
3. **Interaktionen** - click, toggle(), show(), hide()
4. **State-Wechsel** - data-state ändert sich
5. **Visual Regression** - Screenshots mit toHaveScreenshot()

### Bekannte Einschränkungen

| Problem | Lösung |
|---------|--------|
| CSS :hover/:active/:focus | Nicht programmatisch testbar in Shadow DOM. Nur Stylesheet-Regeln prüfen + Visual Regression |
| Farb-Transitions | Keine exakten Hex-Werte prüfen, nur "hat sich geändert" |
| toggle(ElementName) | Cross-element toggle funktioniert nicht immer zuverlässig |
| Flaky Tests | 1-2 Retries durch Playwright Config, meist Timing-Issues |

---

## Test-Dateien

### 06-states.html (91 Tests)

```
playground-simple-toggle.spec.ts      - Basic toggle
playground-hover-active.spec.ts       - System states (vereinfacht)
playground-focus-disabled.spec.ts     - Focus/disabled (vereinfacht)
playground-favbtn.spec.ts             - FavBtn mit Icon-Wechsel
playground-toggle-switch.spec.ts      - Toggle Switch
playground-expand-btn.spec.ts         - Expand mit Content-Wechsel
playground-multi-state.spec.ts        - 3-State Cycle
playground-tab-exclusive.spec.ts      - Tabs mit exclusive()
playground-panel-accordion.spec.ts    - Accordion Panel
playground-cross-element.spec.ts      - Cross-element States
playground-keyboard-events.spec.ts    - onenter/onescape
```

### 07-functions.html (29 Tests)

```
playground-fn-toggle.spec.ts          - Basic toggle() Syntax
playground-fn-show-hide.spec.ts       - show()/hide() Funktionen
playground-fn-menu.spec.ts            - Dropdown Menu Pattern
playground-fn-combined.spec.ts        - Kombinierte Funktionen
```

### 04-layout.html (35 Tests)

```
playground-layout-flex.spec.ts        - Flex: hor/ver, sizing, centering, 9 positions, wrap (Playground 0-4)
playground-layout-grid.spec.ts        - Grid: grid 12, explicit placement, component (Playground 5-7)
playground-layout-stacked.spec.ts     - Stacked: positioning, badge pattern (Playground 8-9)
```

### 11-navigation.html (~85 Tests)

```
playground-nav-tabs.spec.ts           - Tabs (Playground 0-1)
playground-nav-accordion.spec.ts      - Accordion (Playground 2-4)
playground-nav-collapsible.spec.ts    - Collapsible (Playground 5-6)
playground-nav-sidenav.spec.ts        - SideNav (Playground 7-10)
playground-nav-steps.spec.ts          - Steps (Playground 11-13)
playground-nav-pagination.spec.ts     - Pagination (Playground 14-16)
playground-nav-treeview.spec.ts       - TreeView (Playground 17-19)
```

---

## Ausführung

```bash
# Alle Playground-Tests
npx playwright test tests/e2e/playground-*.spec.ts

# Nur States
npx playwright test tests/e2e/playground-*toggle*.spec.ts tests/e2e/playground-*state*.spec.ts

# Nur Functions
npx playwright test tests/e2e/playground-fn-*.spec.ts

# Nur Navigation
npx playwright test tests/e2e/playground-nav-*.spec.ts

# Nur Layout
npx playwright test tests/e2e/playground-layout-*.spec.ts

# Mit neuen Screenshots
npx playwright test tests/e2e/playground-*.spec.ts --update-snapshots
```

---

## Nächste Schritte

1. **Styling (05-styling.html)** - Farben, Gradients, Borders, Typografie, Effekte
2. **Overlays (12-overlays.html)** - Dialog, Tooltip, Popover, HoverCard
3. **Grundlagen (01-03)** - Elemente, Komponenten, Tokens
4. **Eingabe (10-eingabe.html)** - Form Controls, Selection
