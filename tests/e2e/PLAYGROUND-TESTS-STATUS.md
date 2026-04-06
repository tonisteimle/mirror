# Playground E2E Tests - Status & Ansatz

## Aktueller Stand (2026-04-06)

### Getestete Tutorial-Dateien

| Datei | Playgrounds | Tests | Status |
|-------|-------------|-------|--------|
| **00-intro.html** | 7 | 18 | ✅ Fertig |
| **01-elemente.html** | 7 | 17 | ✅ Fertig |
| **02-komponenten.html** | 12 | 24 | ✅ Fertig |
| **03-tokens.html** | 5 | 10 | ✅ Fertig |
| **04-layout.html** | 10 | 35 | ✅ Fertig |
| **05-styling.html** | 13 | 47 | ✅ Fertig |
| **06-states.html** | 11 | 91 | ✅ Fertig |
| **07-functions.html** | 4 | 29 | ✅ Fertig |
| **10-eingabe.html** | 30 | 92 | ✅ Fertig |
| **11-navigation.html** | 20 | 84 | ✅ Fertig |
| **13-anzeige.html** | 43 | 44 | ✅ Fertig |

### Noch zu testen

- 08-daten.html
- 09-seiten.html
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

### 00-intro.html (18 Tests)

```
playground-intro.spec.ts              - Intro: Button, User Card, Hierarchie, Komponente, Tokens, States (Playground 0-6)
```

### 01-elemente.html (17 Tests)

```
playground-elemente.spec.ts           - Elemente: Grundsyntax, Primitives, Styling, Hierarchie, Layout, Icons, Card (Playground 0-6)
```

### 02-komponenten.html (24 Tests)

```
playground-komponenten.spec.ts        - Komponenten: Definition, Override, Children, Variationen, Layouts (Playground 0-11)
```

### 03-tokens.html (10 Tests)

```
playground-tokens.spec.ts             - Tokens: Magische Werte, Definition, Typen, Semantisch, Drei Stufen (Playground 0-4)
```

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

### 05-styling.html (47 Tests)

```
playground-styling-colors.spec.ts     - Farben: hex, rgba, benannte, gradients (Playground 0-2)
playground-styling-borders.spec.ts    - Borders: bor, boc, rad (Playground 3-4)
playground-styling-typography.spec.ts - Typografie: fs, weight, font, styles (Playground 5-7)
playground-styling-effects.spec.ts    - Effekte: shadow, opacity, cursor (Playground 8-10)
playground-styling-patterns.spec.ts   - Patterns: Button Varianten, Card Styles (Playground 11-12)
```

### 10-eingabe.html (92 Tests)

```
playground-input-controls.spec.ts     - Checkbox, Switch, RadioGroup (Playground 0-4)
playground-input-sliders.spec.ts      - Slider, RangeSlider, NumberInput, AngleSlider (Playground 5-8, 17)
playground-input-text.spec.ts         - PinInput, PasswordInput, TagsInput, Editable (Playground 9-12)
playground-input-selection.spec.ts    - RatingGroup, SegmentedControl, ToggleGroup (Playground 13-16)
playground-input-form.spec.ts         - Form (Playground 18-19)
playground-input-dropdowns.spec.ts    - Select, Combobox, Listbox (Playground 20-22)
playground-input-menus.spec.ts        - Menu, ContextMenu, NestedMenu, NavigationMenu (Playground 23-26)
playground-input-datetime.spec.ts     - DatePicker, Timer, DateInput (Playground 27-29)
```

### 11-navigation.html (84 Tests)

```
playground-nav-tabs.spec.ts           - Tabs (Playground 0-1)
playground-nav-accordion.spec.ts      - Accordion (Playground 2-4)
playground-nav-collapsible.spec.ts    - Collapsible (Playground 5-6)
playground-nav-sidenav.spec.ts        - SideNav (Playground 7-10)
playground-nav-steps.spec.ts          - Steps (Playground 11-13)
playground-nav-pagination.spec.ts     - Pagination (Playground 14-16)
playground-nav-treeview.spec.ts       - TreeView (Playground 17-19)
```

### 13-anzeige.html (44 Tests)

```
playground-anzeige-tables.spec.ts     - Tabellen: statisch, datengebunden, Row-Template (Playground 0-5)
playground-anzeige-media.spec.ts      - Media: Avatar, FileUpload, Carousel, SignaturePad (Playground 25-31)
playground-anzeige-feedback.spec.ts   - Feedback: Progress, CircularProgress, Toast, Marquee (Playground 32-37)
playground-anzeige-utility.spec.ts    - Utility: Clipboard, QRCode, ScrollArea, Splitter (Playground 38-42)
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

# Nur Grundlagen (Intro, Elemente, Komponenten, Tokens)
npx playwright test tests/e2e/playground-intro.spec.ts tests/e2e/playground-elemente.spec.ts tests/e2e/playground-komponenten.spec.ts tests/e2e/playground-tokens.spec.ts

# Nur Navigation
npx playwright test tests/e2e/playground-nav-*.spec.ts

# Nur Eingabe (Form Controls)
npx playwright test tests/e2e/playground-input-*.spec.ts

# Nur Layout
npx playwright test tests/e2e/playground-layout-*.spec.ts

# Nur Styling
npx playwright test tests/e2e/playground-styling-*.spec.ts

# Nur Anzeige (Tables, Media, Feedback, Utility)
npx playwright test tests/e2e/playground-anzeige-*.spec.ts

# Mit neuen Screenshots
npx playwright test tests/e2e/playground-*.spec.ts --update-snapshots
```

---

## Nächste Schritte

1. **Daten (08-daten.html)** - Variablen, Datenobjekte, Conditionals
2. **Seiten (09-seiten.html)** - Tabs, Pages, Multi-File
3. **Overlays (12-overlays.html)** - Dialog, Tooltip, Popover, HoverCard
