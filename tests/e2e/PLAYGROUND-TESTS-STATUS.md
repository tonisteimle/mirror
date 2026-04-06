# Playground E2E Tests - Status & Ansatz

## Aktueller Stand (2026-04-06)

### Getestete Tutorial-Dateien

| Datei | Playgrounds | Tests | Status |
|-------|-------------|-------|--------|
| **06-states.html** | 11 | 91 | ✅ Fertig |
| **07-functions.html** | 4 | 29 | ✅ Fertig |

### Noch zu testen

- 00-intro.html
- 01-elemente.html
- 02-komponenten.html
- 03-tokens.html
- 04-layout.html
- 05-styling.html
- 08-daten.html bis 13-anzeige.html
- 11-navigation.html (Tabs, Accordion, Collapsible)
- 12-overlays.html (Dialog, Tooltip, Popover)

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

---

## Ausführung

```bash
# Alle Playground-Tests
npx playwright test tests/e2e/playground-*.spec.ts

# Nur States
npx playwright test tests/e2e/playground-*toggle*.spec.ts tests/e2e/playground-*state*.spec.ts

# Nur Functions
npx playwright test tests/e2e/playground-fn-*.spec.ts

# Mit neuen Screenshots
npx playwright test tests/e2e/playground-*.spec.ts --update-snapshots
```

---

## Nächste Schritte

1. **Navigation (11-navigation.html)** - Tabs, Accordion, Collapsible, SideNav
2. **Overlays (12-overlays.html)** - Dialog, Tooltip, Popover, HoverCard
3. **Layout (04-layout.html)** - Flex, Grid, Stacked
4. **Grundlagen (01-03)** - Elemente, Komponenten, Tokens
