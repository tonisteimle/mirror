# Playground Test Concept

Dieses Dokument beschreibt das Testkonzept für die zuverlässige Validierung von Mirror Tutorial Playgrounds.

---

## Übersicht

Ein Playground ist ein interaktives Code-Beispiel im Tutorial, das:
1. Mirror-Code kompiliert
2. In einem Shadow DOM rendert
3. Interaktiv ist (Klicks, States, etc.)

**Ziel:** Maximale Zuverlässigkeit bei der Prüfung, ob ein Playground korrekt gerendert wurde und funktioniert.

---

## Referenz-Playground: Cross-Element

Als Referenz dient der komplexeste Playground aus dem States-Kapitel:

```mirror
Frame gap 12, bg #0a0a0a, pad 16, rad 8
  Button "Menü", name MenuBtn, pad 10 20, rad 6, bg #333, col white, toggle()
    open:
      bg #2563eb

  Frame bg #1a1a1a, pad 12, rad 8, gap 4, hidden
    MenuBtn.open:
      visible
    Text "Dashboard", col white, fs 14, pad 8
    Text "Einstellungen", col white, fs 14, pad 8
```

**Dieser Playground testet:**
- Rendering (Frame, Button, Text)
- Styling (bg, col, pad, rad, gap)
- States (toggle(), open:)
- Named Elements (name MenuBtn)
- Cross-Element References (MenuBtn.open:)
- Visibility (hidden → visible)

---

## Die 9 Test-Dimensionen

### 1. DOM Structure Validation

**Was:** Prüft, ob die HTML-Struktur korrekt generiert wurde.

**Wie:**
```typescript
const structure = await page.evaluate((idx) => {
  const shadow = getPlaygroundShadow(idx)
  const root = shadow.querySelector('.mirror-root')
  return {
    rootChildCount: root.children.length,
    hasButton: !!root.querySelector('button'),
    buttonText: root.querySelector('button')?.textContent,
  }
})

expect(structure.rootChildCount).toBe(2)
expect(structure.hasButton).toBe(true)
expect(structure.buttonText).toBe('Menü')
```

**Confidence:** Hoch - DOM-Struktur ist deterministisch.

---

### 2. Initial State Validation

**Was:** Prüft den korrekten Startzustand vor jeder Interaktion.

**Wie:**
```typescript
// Button im Base-State (grau)
const buttonBg = await getShadowStyle(page, 'button', 'background-color')
expect(colorsMatch(buttonBg, COLORS.buttonBase)).toBe(true)

// Button hat NICHT data-state="open"
const buttonState = await getElementState(page, 'button')
expect(buttonState).not.toBe('open')

// Menu ist hidden
const menuDisplay = await getShadowStyle(page, menuSelector, 'display')
expect(menuDisplay).toBe('none')
```

**Confidence:** Hoch - Startzustand ist definiert.

---

### 3. First Click (State Transition)

**Was:** Prüft, ob ein Klick den State korrekt wechselt.

**Wie:**
```typescript
await clickShadowElement(page, 'button')
await page.waitForTimeout(100)

// Button ist jetzt blau
expect(colorsMatch(buttonBg, COLORS.buttonOpen)).toBe(true)

// Button hat data-state="open"
expect(buttonState).toBe('open')

// Menu ist sichtbar
expect(menuDisplay).not.toBe('none')
```

**Confidence:** Kritisch - Kernfunktionalität.

---

### 4. Second Click (Toggle Back)

**Was:** Prüft, ob der Toggle-Mechanismus bidirektional funktioniert.

**Wie:**
```typescript
await clickShadowElement(page, 'button') // open
await clickShadowElement(page, 'button') // close

// Zurück im Base-State
expect(colorsMatch(buttonBg, COLORS.buttonBase)).toBe(true)
expect(buttonState).not.toBe('open')
expect(menuDisplay).toBe('none')
```

**Confidence:** Kritisch - Toggle muss in beide Richtungen funktionieren.

---

### 5. Styling Validation

**Was:** Prüft, ob alle CSS-Properties korrekt angewandt wurden.

**Wie:**
```typescript
// Root Frame
expect(wrapperBg).toMatch(COLORS.rootBg)
expect(wrapperPad).toBe('16px')
expect(wrapperRad).toBe('8px')
expect(wrapperGap).toBe('12px')

// Button
expect(btnPad).toBe('10px 20px')
expect(btnRad).toBe('6px')
expect(btnCol).toBe('rgb(255, 255, 255)')
```

**Confidence:** Mittel - CSS kann Browser-spezifisch variieren.

---

### 6. Cross-Element Causality

**Was:** Prüft, ob die Kausalität zwischen Elementen funktioniert (Button-State → Menu-Visibility).

**Wie:**
```typescript
const getStates = async () => ({
  buttonState: await getElementState(page, 'button'),
  menuHidden: (await getShadowStyle(..., 'display')) === 'none'
})

// Initial: button=base → menu=hidden
let states = await getStates()
expect(states.buttonState).not.toBe('open')
expect(states.menuHidden).toBe(true)

// Nach Klick: button=open → menu=visible
await clickShadowElement(page, 'button')
states = await getStates()
expect(states.buttonState).toBe('open')
expect(states.menuHidden).toBe(false)
```

**Confidence:** Kritisch - Kernfeature von Mirror.

---

### 7. Content Validation

**Was:** Prüft, ob der Inhalt korrekt gerendert wurde.

**Wie:**
```typescript
await clickShadowElement(page, 'button') // Menu öffnen

const menuTexts = await getShadowTextContent(page, menuSelector + ' span')

expect(menuTexts).toHaveLength(2)
expect(menuTexts).toContain('Dashboard')
expect(menuTexts).toContain('Einstellungen')
```

**Confidence:** Hoch - Text ist deterministisch.

---

### 8. Rapid Toggle Stress Test

**Was:** Prüft Stabilität bei schnellen, wiederholten Interaktionen.

**Wie:**
```typescript
// 10x schnell klicken
for (let i = 0; i < 10; i++) {
  await clickShadowElement(page, 'button')
  await page.waitForTimeout(50)
}
await page.waitForTimeout(200) // Settle

// Nach gerader Anzahl: Base-State
expect(buttonState).not.toBe('open')
expect(menuDisplay).toBe('none')

// +1 Klick → Open
await clickShadowElement(page, 'button')
expect(buttonState).toBe('open')
```

**Confidence:** Mittel - Testet Race Conditions.

---

### 9. Visual Regression (Screenshot)

**Was:** Prüft pixel-perfekte Darstellung.

**Wie:**
```typescript
const preview = playground.locator('.playground-preview')

// Screenshot: Menu closed
await expect(preview).toHaveScreenshot('cross-element-menu-closed.png')

// Screenshot: Menu open
await clickShadowElement(page, 'button')
await expect(preview).toHaveScreenshot('cross-element-menu-open.png')
```

**Confidence:** Hoch - Fängt visuelle Regressionen.

---

## Wichtige Erkenntnisse

### Shadow DOM Handling

Playgrounds rendern in einem Shadow DOM. Standard-Selektoren funktionieren nicht:

```typescript
// FALSCH
await page.locator('button').click()

// RICHTIG
await page.evaluate(() => {
  const shadow = preview.shadowRoot
  shadow.querySelector('button').click()
})
```

### Mirror DOM-Struktur

Mirror generiert eine spezifische DOM-Struktur:

```
.mirror-root
├── <style>           (CSS Reset)
└── <div>             (Wrapper mit Styling)
    ├── <button>      (Erstes Kind)
    └── <div>         (Zweites Kind = Menu)
        ├── <span>    (Dashboard)
        └── <span>    (Einstellungen)
```

**Wichtig:** Der Wrapper-Div hat die Styles, nicht `.mirror-root` direkt.

### Farb-Toleranz

Browser rendern Farben unterschiedlich. Exakte Vergleiche schlagen fehl:

```typescript
// FALSCH
expect(buttonBg).toBe('rgb(37, 99, 235)')

// RICHTIG - mit Toleranz
const COLORS = {
  buttonOpen: { r: 37, g: 99, b: 235, tolerance: 20 }
}
expect(colorsMatch(buttonBg, COLORS.buttonOpen)).toBe(true)
```

### State vs. Color Checks

State-Attribute sind stabiler als Farb-Checks:

```typescript
// Weniger zuverlässig (Farbe variiert)
expect(colorsMatch(buttonBg, COLORS.buttonOpen)).toBe(true)

// Zuverlässiger (Attribut ist deterministisch)
expect(buttonState).toBe('open')
```

### State-Only Komponenten (Wichtig!)

Wenn eine Komponente **keinen Base-Content** hat (alles in States definiert), verhält sie sich anders:

```mirror
// Alle Inhalte sind in States definiert
StatusBtn: pad 12 24, rad 6, col white, toggle()
  todo:
    bg #333
    Icon "circle", ic white, is 14
  doing:
    bg #f59e0b
    Icon "clock", ic white, is 14
  done:
    bg #10b981
    Icon "check", ic white, is 14
```

**Verhalten:**
1. **Initial:** `data-state="default"` mit **leerem Inhalt** (keine Children)
2. **Erster Klick:** Wechselt zu `todo` (erster definierter State)
3. **Weitere Klicks:** Cyclet durch `todo → doing → done → todo`

**Wichtig für Tests:**
- Initial state ist "default", NICHT der erste Custom State
- Nach dem ersten Klick wird "default" übersprungen
- Der Cycle ist: `default → todo → doing → done → todo → ...`

```typescript
// Test für state-only Komponente
test('initial state is default (empty)', async ({ page }) => {
  const state = await getElementState(page, BUTTON_SELECTOR)
  expect(state).toBe('default')

  const childCount = await getWrapperChildCount(page)
  expect(childCount).toBe(0) // Keine Children im default state
})

test('first click activates first defined state', async ({ page }) => {
  await clickShadowElement(page, BUTTON_SELECTOR)

  const state = await getElementState(page, BUTTON_SELECTOR)
  expect(state).toBe('todo') // Nicht "default"!
})
```

### Content Variants (Figma-Style States)

Wenn ein State komplett andere Kinder hat (nicht nur andere Styles), spricht man von "Content Variants":

```mirror
ExpandBtn: pad 12, bg #333, col white, rad 6, hor, gap 8, toggle()
  "Mehr zeigen"
  Icon "chevron-down", ic white, is 16
  open:
    "Weniger zeigen"
    Icon "chevron-up", ic white, is 16
```

**Wichtig für Tests:**
- Der Content wird **ersetzt**, nicht versteckt
- Im State können die DOM-Attribute anders sein (z.B. fehlendes `data-mirror-name`)
- Selektoren müssen robust sein

```typescript
// FALSCH - funktioniert nicht im open state
const textSpan = wrapper?.querySelector('span[data-mirror-name="Text"]')

// RICHTIG - funktioniert in allen states
const firstSpan = wrapper?.querySelector('span')
return firstSpan?.textContent?.trim()
```

---

## Test-Matrix

| # | Test | Prüft | Confidence | Kritisch? |
|---|------|-------|------------|-----------|
| 1 | DOM Structure | Hierarchie, Elemente | Hoch | Ja |
| 2 | Initial State | Startzustand | Hoch | Ja |
| 3 | First Click | State-Wechsel | Kritisch | Ja |
| 4 | Second Click | Toggle zurück | Kritisch | Ja |
| 5 | Styling | CSS Properties | Mittel | Nein |
| 6 | Causality | Cross-Element | Kritisch | Ja |
| 7 | Content | Text-Inhalt | Hoch | Nein |
| 8 | Stress Test | Rapid Clicks | Mittel | Nein |
| 9 | Visual | Screenshots | Hoch | Nein |

---

## Helper-Funktionen

### getShadowStyle

```typescript
async function getShadowStyle(page: Page, selector: string, property: string): Promise<string> {
  return page.evaluate(({ sel, prop, idx }) => {
    const playground = document.querySelectorAll('[data-playground]')[idx]
    const shadow = playground.querySelector('.playground-preview').shadowRoot
    const el = shadow.querySelector(sel)
    return getComputedStyle(el).getPropertyValue(prop)
  }, { sel: selector, prop: property, idx: PLAYGROUND_INDEX })
}
```

### clickShadowElement

```typescript
async function clickShadowElement(page: Page, selector: string): Promise<void> {
  await page.evaluate(({ sel, idx }) => {
    const playground = document.querySelectorAll('[data-playground]')[idx]
    const shadow = playground.querySelector('.playground-preview').shadowRoot
    const el = shadow.querySelector(sel)
    el.click()
  }, { sel: selector, idx: PLAYGROUND_INDEX })
}
```

### colorsMatch

```typescript
function colorsMatch(actual: string, expected: ColorSpec): boolean {
  const match = actual.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return false
  const [, r, g, b] = match.map(Number)
  return Math.abs(r - expected.r) <= expected.tolerance &&
         Math.abs(g - expected.g) <= expected.tolerance &&
         Math.abs(b - expected.b) <= expected.tolerance
}
```

---

## Anwendung auf andere Playgrounds

Dieses Konzept kann auf jeden Playground angewendet werden:

1. **Identifiziere die Features** - Was testet dieser Playground?
2. **Wähle relevante Dimensionen** - Nicht jeder Playground braucht alle 9 Tests
3. **Passe Selektoren an** - DOM-Struktur kann variieren
4. **Definiere erwartete Werte** - Farben, Texte, States

### Beispiel: Einfacher Toggle-Button

```typescript
test.describe('Simple Toggle Playground', () => {
  test('toggles on click', async ({ page }) => {
    // Nur Tests 2, 3, 4 relevant
    await clickShadowElement(page, 'button')
    expect(await getElementState(page, 'button')).toBe('on')

    await clickShadowElement(page, 'button')
    expect(await getElementState(page, 'button')).not.toBe('on')
  })
})
```

---

## Fazit

**Das Prinzip:** Ein komplexer Playground, aber orthogonale Tests die verschiedene Aspekte isoliert prüfen.

**Wenn alle 9 Tests bestehen:**
- DOM-Struktur ✓
- Styling ✓
- States ✓
- Interaktionen ✓
- Cross-Element ✓
- Stabilität ✓
- Visuelle Darstellung ✓

→ Der Playground ist mit sehr hoher Wahrscheinlichkeit korrekt.
