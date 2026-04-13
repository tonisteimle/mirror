# Drag & Drop Teststrategie

> **Ziel: Fehler finden, nicht Funktionalität bestätigen.**

---

## Philosophie

### Was wir NICHT tun

```
❌ "Funktioniert toggle() wenn ich es aufrufe?" → Ja, im Mock
❌ "Zeigt der Controller 'over-target' wenn ich setTarget() aufrufe?" → Ja, weil ich es setze
❌ "Besteht der Test?" → Ja, expect(true).toBe(true)
```

Diese Tests bestätigen, dass Mocks funktionieren. Sie finden keine Fehler.

### Was wir tun

```
✓ "Wird die Checkbox korrekt eingefügt?" (Happy Path)
✓ "Was passiert bei Komponenten MIT vs. OHNE Definition?"
✓ "Was passiert, wenn ich während des Drags die Seite scrolle?"
✓ "Funktioniert der Drop nach Undo/Redo?"
```

Diese Fragen decken echte Szenarien ab – vom Normalfall bis zum Edge Case.

### Wann Unit-Tests Wert haben

Unit-Tests sind **wertvoll für isolierte Logik**:

- Offset-Berechnungen (z.B. `insertComponentWithDefinition`)
- State-Machine-Übergänge
- Algorithmen ohne DOM-Abhängigkeit

Unit-Tests sind **weniger wertvoll für**:

- Event-Handling (braucht echte Events)
- DOM-Manipulation (braucht echten DOM)
- System-Integration (braucht mehrere Komponenten)

---

## Happy Path Matrix

### Dimensionen

| Dimension      | Varianten                                         |
| -------------- | ------------------------------------------------- |
| **Quelle**     | Palette, Canvas                                   |
| **Target**     | Flex (hor/ver), Positioned, Non-Container, Editor |
| **Operation**  | Insert, Move, Duplicate (Alt)                     |
| **Placement**  | before, after, inside, absolute                   |
| **Komponente** | Einfach, Mit Definition, Mit Slots                |

### Komponenten-Kategorien

| Kategorie          | Komponenten                             | Code-Pfad                       |
| ------------------ | --------------------------------------- | ------------------------------- |
| **Einfach**        | Button, Text, Frame, Input, Icon, Image | `insertComponentCode`           |
| **Mit Definition** | Checkbox, Switch, Slider, RadioGroup    | `insertComponentWithDefinition` |
| **Mit Slots**      | Select, Dialog, Tooltip, DatePicker     | Definition + Slots              |
| **Navigation**     | Tabs, SideNav                           | Definition + Items              |
| **Layout**         | Row, Column, Grid, Stack                | Frame mit Properties            |
| **Charts**         | Line, Bar, Pie, Donut, Area             | Spezial-Template                |
| **Data**           | Table                                   | Definition + Row/Column         |

### A. Palette → Editor (12 Tests)

| #   | Komponenten-Typ           | Was prüfen                             |
| --- | ------------------------- | -------------------------------------- |
| A1  | Einfach (Button)          | Code eingefügt, keine Definition       |
| A2  | Einfach (Text)            | Mit Textinhalt                         |
| A3  | Einfach (Frame)           | Container ohne Kinder                  |
| A4  | Mit Definition (Checkbox) | Definition + Instanz, korrekter Offset |
| A5  | Mit Definition (Switch)   | Definition + Instanz                   |
| A6  | Mit Definition (Slider)   | Definition + Instanz                   |
| A7  | Mit Slots (Select)        | Definition + Trigger + Content + Items |
| A8  | Mit Slots (Dialog)        | Definition + Trigger + Content         |
| A9  | Mit Slots (Tooltip)       | Definition + Trigger + Content         |
| A10 | Navigation (Tabs)         | Definition + List + Tab Items          |
| A11 | Layout (Row)              | Frame hor, gap 8                       |
| A12 | Chart (Line)              | Chart-spezifisches Template            |

### B. Palette → Preview Flex (9 Tests)

| #   | Placement | Target                    | Was prüfen                     |
| --- | --------- | ------------------------- | ------------------------------ |
| B1  | before    | Erstes Kind               | Neues Element ist erstes Kind  |
| B2  | after     | Letztes Kind              | Neues Element ist letztes Kind |
| B3  | inside    | Leerer Container          | Element wird einziges Kind     |
| B4  | inside    | Container mit Kindern     | Element wird letztes Kind      |
| B5  | before    | Mittleres Kind            | Reihenfolge korrekt            |
| B6  | after     | Mittleres Kind            | Reihenfolge korrekt            |
| B7  | inside    | Verschachtelter Container | Korrektes Parent gewählt       |
| B8  | before    | In horizontalem Layout    | Visuell links davon            |
| B9  | after     | In horizontalem Layout    | Visuell rechts davon           |

### C. Palette → Preview Positioned (3 Tests)

| #   | Szenario                  | Was prüfen                |
| --- | ------------------------- | ------------------------- |
| C1  | Drop in Stacked Container | x/y Koordinaten im Code   |
| C2  | Drop mit Scroll-Offset    | Koordinaten kompensiert   |
| C3  | Drop nahe Rand            | Koordinaten nicht negativ |

### D. Canvas → Preview Move (9 Tests)

| #   | Szenario               | Was prüfen                              |
| --- | ---------------------- | --------------------------------------- |
| D1  | before sibling         | Element vor Geschwister verschoben      |
| D2  | after sibling          | Element nach Geschwister verschoben     |
| D3  | inside other container | Element in anderen Container verschoben |
| D4  | Reorder: 3→1           | Drittes wird erstes                     |
| D5  | Reorder: 1→3           | Erstes wird drittes                     |
| D6  | Cross-container        | Von Container A nach B                  |
| D7  | Into nested            | In verschachtelten Container            |
| D8  | Out of nested          | Aus verschachteltem Container heraus    |
| D9  | Same position (No-Op)  | Keine Code-Änderung                     |

### E. Canvas → Duplicate (3 Tests)

| #   | Szenario                      | Was prüfen                      |
| --- | ----------------------------- | ------------------------------- |
| E1  | Alt+Drag einfaches Element    | Original bleibt, Kopie entsteht |
| E2  | Alt+Drag Element mit Kindern  | Kinder werden mitkopiert        |
| E3  | Alt+Drag in anderen Container | Kopie im neuen Container        |

### F. Spezialfälle (6 Tests)

| #   | Szenario                            | Was prüfen                |
| --- | ----------------------------------- | ------------------------- |
| F1  | Definition bereits vorhanden        | Keine doppelte Definition |
| F2  | Drop auf Non-Container              | Fallback zu before/after  |
| F3  | Drop auf sich selbst                | No-Op, keine Änderung     |
| F4  | Drop außerhalb aller Targets        | Kein Crash, kein Effekt   |
| F5  | Sehr tief verschachtelt (5+ Ebenen) | Korrektes Parent          |
| F6  | User-defined Component aus .com     | Template korrekt geladen  |

### Zusammenfassung

| Kategorie                       | Anzahl | Priorität |
| ------------------------------- | ------ | --------- |
| A: Palette → Editor             | 12     | **P0**    |
| B: Palette → Preview Flex       | 9      | **P0**    |
| C: Palette → Preview Positioned | 3      | P1        |
| D: Canvas → Move                | 9      | **P0**    |
| E: Canvas → Duplicate           | 3      | P1        |
| F: Spezialfälle                 | 6      | P1        |
| **Gesamt**                      | **42** |           |

---

## Die vier Test-Kategorien

### 1. Happy Path Tests (Normale Szenarien)

**Der häufigste Fehler: Der Normalfall funktioniert nicht.**

| Szenario                       | Was wir prüfen                              |
| ------------------------------ | ------------------------------------------- |
| Button aus Palette droppen     | Code enthält `Button`, Preview zeigt Button |
| Checkbox aus Palette droppen   | Definition UND Instanz werden eingefügt     |
| Select aus Palette droppen     | Komplexe Komponente mit allen Slots         |
| Element im Preview verschieben | Position im Code ändert sich                |

**Test-Prinzip:** Bevor wir Edge Cases testen, müssen die Standardfälle funktionieren.

### 2. Komponenten-Typ Tests

**Erkenntnis:** Komponenten MIT Definition (Checkbox, Select, Dialog) haben andere Code-Pfade als Komponenten OHNE Definition (Button, Text, Frame).

| Komponenten-Typ                       | Besonderheit                | Kritische Logik                 |
| ------------------------------------- | --------------------------- | ------------------------------- |
| **Einfach** (Button, Text)            | Nur Instanz                 | `insertComponentCode`           |
| **Mit Definition** (Checkbox, Select) | Definition + Instanz        | `insertComponentWithDefinition` |
| **Verschachtelt** (Dialog, Tabs)      | Definition + Slots + Kinder | Mehrfache Offsets               |

**Test-Prinzip:** Jeder Komponenten-Typ braucht dedizierte Tests.

### 3. Boundary Tests (Systemgrenzen)

Fehler entstehen an Grenzen zwischen Systemen:

| Grenze                    | Was kann schiefgehen?                               |
| ------------------------- | --------------------------------------------------- |
| Browser → Adapter         | Event kommt nicht an, falsche Daten                 |
| Adapter → Controller      | Koordinaten falsch, State-Sync fehlt                |
| Controller → CodeExecutor | Drop-Result inkorrekt, AST-Position falsch          |
| CodeExecutor → Editor     | **Offset-Berechnung falsch**, kein Re-Render        |
| Editor → Preview          | Kompilierung fehlgeschlagen, DOM nicht aktualisiert |

**Test-Prinzip:** Ein Integrations-Test muss mindestens eine Grenze überqueren.

### 4. Adversarial Tests (Stress-Szenarien)

Für robuste Software – aber **nachdem** die Happy Paths funktionieren:

| Szenario                    | Erwartetes Problem                        |
| --------------------------- | ----------------------------------------- |
| Schnelle Bewegungen         | Race Conditions, Flackern                 |
| Abgebrochene Drags (Escape) | Zombie-States, nicht aufgeräumte Listener |
| Drag nach Undo/Redo         | Stale References                          |
| Drag über Scroll-Boundary   | Falsche Koordinaten                       |

**Test-Prinzip:** Provoziere Timing-Probleme und unerwartete Sequenzen.

---

## Test-Qualitätskriterien

### Ein Test ist WERTVOLL wenn:

1. **Er kann fehlschlagen** - Bei einem echten Bug schlägt er fehl
2. **Er testet echtes Verhalten** - Prüft Ergebnis, nicht Aufruf
3. **Er ist spezifisch** - Bei Fehlschlag weiß man sofort, was kaputt ist
4. **Er ist reproduzierbar** - Keine zufälligen Timing-Abhängigkeiten

### Ein Test ist WERTLOS wenn:

1. **Er nur Mocks testet** - Mock rein, Mock raus
2. **Er immer besteht** - `expect(true).toBe(true)`
3. **Er Feature-Existenz prüft** - "Hat draggable=true?" statt "Kann ich draggen?"
4. **Er bei Bug nicht fehlschlägt** - Der Test ist grün, obwohl die App kaputt ist

---

## Konkrete Test-Spezifikationen

### T1: Einfache Komponente droppen (Happy Path)

**Ziel:** Beweise, dass ein Button-Drop funktioniert.

```typescript
test('dropping Button from palette inserts code and renders in preview', async ({ page }) => {
  // 1. Komponente in Palette finden
  const button = page.locator('[data-component-id="comp-button"]')
  await expect(button).toBeVisible()

  // 2. Editor als Drop-Target
  const editor = page.locator('.cm-content')

  // 3. Drag ausführen
  await button.dragTo(editor)

  // 4. Code prüfen
  const code = await page.locator('.cm-content').textContent()
  expect(code).toContain('Button')

  // 5. Preview prüfen
  const previewButton = page.frameLocator('#preview-frame').locator('button')
  await expect(previewButton).toBeVisible()
})
```

**Fehlerraum:** Event-Handling, Code-Generierung, Preview-Render

### T2: Komponente MIT Definition droppen (Kritisch!)

**Ziel:** Beweise, dass Checkbox/Select/Dialog korrekt eingefügt werden.

```typescript
test('dropping Checkbox inserts definition AND instance', async ({ page }) => {
  // Setup: Leerer Editor
  await setEditorContent(page, 'Frame gap 8')

  // Checkbox droppen
  const checkbox = page.locator('[data-component-id="comp-checkbox"]')
  const editor = page.locator('.cm-content')
  await checkbox.dragTo(editor)

  // Code prüfen: Definition UND Instanz
  const code = await getEditorContent(page)

  // Definition muss vorhanden sein
  expect(code).toMatch(/Checkbox:/)

  // Instanz muss vorhanden sein
  expect(code).toMatch(/Checkbox\s+"/)

  // Keine Fehler in Console
  const errors = await getConsoleErrors(page)
  expect(errors).toHaveLength(0)
})

test('dropping Select inserts definition AND instance', async ({ page }) => {
  await setEditorContent(page, 'Frame gap 8')

  const select = page.locator('[data-component-id="comp-select"]')
  const editor = page.locator('.cm-content')
  await select.dragTo(editor)

  const code = await getEditorContent(page)
  expect(code).toMatch(/Select:/)
  expect(code).toMatch(/Select\s+placeholder/)
})

test('dropping Dialog inserts definition AND instance', async ({ page }) => {
  await setEditorContent(page, 'Frame gap 8')

  const dialog = page.locator('[data-component-id="comp-dialog"]')
  const editor = page.locator('.cm-content')
  await dialog.dragTo(editor)

  const code = await getEditorContent(page)
  expect(code).toMatch(/Dialog:/)
})
```

**Fehlerraum:**

- `insertComponentWithDefinition` Offset-Berechnung
- Definition-Erkennung (`hasComponentDefinition`)
- Position der Definition (`findDefinitionInsertPosition`)

### T3: Alle Komponenten-Typen systematisch

**Ziel:** Jeder Komponenten-Typ wird getestet.

```typescript
const SIMPLE_COMPONENTS = ['comp-button', 'comp-text', 'comp-frame', 'comp-input']
const DEFINITION_COMPONENTS = ['comp-checkbox', 'comp-select', 'comp-switch', 'comp-dialog']

for (const compId of SIMPLE_COMPONENTS) {
  test(`simple component ${compId} drops correctly`, async ({ page }) => {
    const comp = page.locator(`[data-component-id="${compId}"]`)
    const editor = page.locator('.cm-content')
    await comp.dragTo(editor)

    const errors = await getConsoleErrors(page)
    expect(errors).toHaveLength(0)

    const code = await getEditorContent(page)
    expect(code.length).toBeGreaterThan(10) // Nicht leer
  })
}

for (const compId of DEFINITION_COMPONENTS) {
  test(`definition component ${compId} drops with definition`, async ({ page }) => {
    await setEditorContent(page, 'Frame gap 8')

    const comp = page.locator(`[data-component-id="${compId}"]`)
    const editor = page.locator('.cm-content')
    await comp.dragTo(editor)

    const errors = await getConsoleErrors(page)
    expect(errors).toHaveLength(0)

    const code = await getEditorContent(page)
    // Definition enthält Doppelpunkt
    expect(code).toMatch(/\w+:/)
  })
}
```

### T4: Element im Preview verschieben

**Ziel:** Beweise, dass ein Element verschoben werden kann.

```typescript
test('dragging element in preview changes code order', async ({ page }) => {
  await setEditorContent(
    page,
    `
Frame
  Text "First"
  Text "Second"
`
  )
  await waitForPreview(page)

  const preview = page.frameLocator('#preview-frame')
  const second = preview.locator('text=Second')
  const first = preview.locator('text=First')

  // Drag Second vor First
  await second.dragTo(first)

  // Code-Reihenfolge prüfen
  const code = await getEditorContent(page)
  const secondPos = code.indexOf('Text "Second"')
  const firstPos = code.indexOf('Text "First"')

  expect(secondPos).toBeLessThan(firstPos)
})
```

### T5: Abgebrochener Drag (Escape)

**Ziel:** System bleibt konsistent nach Abbruch.

```typescript
test('escape during drag cleans up completely', async ({ page }) => {
  await setEditorContent(page, 'Frame\n  Text "Drag me"')
  await waitForPreview(page)

  const preview = page.frameLocator('#preview-frame')
  const element = preview.locator('text=Drag me')

  await element.hover()
  await page.mouse.down()
  await page.mouse.move(100, 100)

  // Abbrechen
  await page.keyboard.press('Escape')

  // Keine Ghost-Elemente
  const ghosts = page.locator('.drag-ghost, .drag-preview, .editor-drop-indicator')
  await expect(ghosts).toHaveCount(0)

  // Keine Console Errors
  const errors = await getConsoleErrors(page)
  expect(errors).toHaveLength(0)
})
```

### T6: Drag nach Undo

**Ziel:** Keine Stale References nach Undo.

```typescript
test('drag works after undo without errors', async ({ page }) => {
  await setEditorContent(page, 'Frame\n  Text "A"')
  await waitForPreview(page)

  // Button hinzufügen
  const button = page.locator('[data-component-id="comp-button"]')
  const editor = page.locator('.cm-content')
  await button.dragTo(editor)
  await waitForPreview(page)

  // Undo
  await page.keyboard.press('Meta+z')
  await waitForPreview(page)

  // Nochmal droppen sollte funktionieren
  await button.dragTo(editor)

  const errors = await getConsoleErrors(page)
  expect(
    errors.filter(
      e => e.includes('Cannot read') || e.includes('undefined') || e.includes('RangeError')
    )
  ).toHaveLength(0)
})
```

---

## Unit-Tests für kritische Logik

### Offset-Berechnungen testen

Der Bug in `insertComponentWithDefinition` war ein reiner Logik-Fehler. Solche Fehler sind mit Unit-Tests findbar:

```typescript
// tests/studio/editor/insert-component.test.ts

describe('insertComponentWithDefinition', () => {
  test('calculates correct offset when definition is inserted before instance', () => {
    const mockDoc = createMockDoc('Frame gap 8')
    const pos = { line: 1, column: 0, offset: 10, indent: 2 }

    const changes = calculateInsertChanges(mockDoc, 'Checkbox "Test"', pos, 'Checkbox')

    // Definition-Offset sollte am Anfang sein
    expect(changes[0].from).toBe(0)

    // Instance-Offset sollte NACH Definition sein, aber relativ zum Original-Dokument
    expect(changes[1].from).toBe(10) // Original offset, nicht angepasst
  })

  test('does not insert definition if already present', () => {
    const mockDoc = createMockDoc('Checkbox:\n  Control: ...\n\nFrame gap 8')
    const pos = { line: 4, column: 0, offset: 40, indent: 2 }

    const changes = calculateInsertChanges(mockDoc, 'Checkbox "Test"', pos, 'Checkbox')

    // Nur eine Änderung (Instanz), keine Definition
    expect(changes).toHaveLength(1)
  })
})
```

---

## Test-Pyramide

```
                    ┌─────────────┐
                    │   E2E (10)  │  ← Playwright, echter Browser
                    │  Happy Path │     T1, T2, T3, T4
                    ├─────────────┤
                    │             │
                ┌───┴─────────────┴───┐
                │  Integration (20)   │  ← Vitest + JSDOM
                │  Systemgrenzen      │     Controller, Executor
                ├─────────────────────┤
                │                     │
            ┌───┴─────────────────────┴───┐
            │      Unit Tests (30)        │  ← Vitest, isoliert
            │  Offset-Calc, StateMachine  │     Reine Logik
            └─────────────────────────────┘
```

### Wert-Verteilung

| Ebene           | Anzahl | Wert   | Was testen                                      |
| --------------- | ------ | ------ | ----------------------------------------------- |
| **E2E**         | ~10    | Hoch   | Komplette User-Journeys, alle Komponenten-Typen |
| **Integration** | ~20    | Hoch   | Systemgrenzen, Code-Änderungen                  |
| **Unit**        | ~30    | Mittel | Algorithmen, Berechnungen, State-Transitions    |

**Alle Ebenen haben Wert** – aber unterschiedlichen:

- E2E findet Integrationsfehler
- Unit findet Logikfehler schneller und mit besserem Feedback

---

## Fehlerbehandlung und Debugging

### Console-Error-Tracking

Jeder E2E-Test sollte Console-Errors prüfen:

```typescript
// Helper für alle Tests
async function getConsoleErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__consoleErrors__ || [])
}

// In beforeEach
page.on('console', msg => {
  if (msg.type() === 'error') {
    page.evaluate(text => {
      ;(window as any).__consoleErrors__ =
        (window as any).__consoleErrors__ || [](window as any).__consoleErrors__.push(text)
    }, msg.text())
  }
})
```

### Typische Fehlermuster

| Fehler                              | Ursache                  | Wo testen                      |
| ----------------------------------- | ------------------------ | ------------------------------ |
| `RangeError: Invalid change range`  | Offset-Berechnung falsch | Unit + E2E                     |
| `Cannot read property of undefined` | Stale Reference          | E2E nach Undo                  |
| `Component did not render`          | Definition fehlt         | E2E für Definition-Komponenten |

---

## Aktuelle Metriken (Stand: 2026-04-13)

| Metrik                              | Wert                                                                                                   | Ziel |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------ | ---- |
| **Happy Path Matrix Tests**         | **38 passed, 4 skipped**                                                                               | 42   |
| E2E Tests für Component-Drop        | 21 + 38 = **59**                                                                                       | 60   |
| Komponenten-Typen getestet          | 12 (Button, Text, Input, Icon, Checkbox, Switch, Select, Slider, RadioGroup, Dialog, Tabs, DatePicker) | Alle |
| Unit Tests für Offset-Logik         | 10                                                                                                     | 10 ✓ |
| Unit Tests für Definition-Detection | 31                                                                                                     | -    |
| Gefundene Bugs durch Tests          | 2                                                                                                      | -    |
| Tests mit `expect(true)`            | 0                                                                                                      | 0 ✓  |

### Happy Path Matrix Coverage

| Kategorie                       | Passed | Skipped | Total  |
| ------------------------------- | ------ | ------- | ------ |
| A: Palette → Editor             | 11     | 1       | 12     |
| B: Palette → Preview Flex       | 9      | 0       | 9      |
| C: Palette → Preview Positioned | 3      | 0       | 3      |
| D: Canvas → Move                | 9      | 0       | 9      |
| E: Canvas → Duplicate           | 3      | 0       | 3      |
| F: Spezialfälle                 | 6      | 0       | 6      |
| **Gesamt**                      | **41** | **1**   | **42** |

**Skipped Tests:**

- A9: Tooltip nicht im Component Panel sichtbar

**API-Erweiterungen (2026-04-13):**

- `simulateDuplicate()` implementiert in `DragDropController`
- E1-E3 Tests aktiviert und bestanden

### Kürzlich gefundene Bugs

| Bug                                              | Gefunden durch                   | Status                     |
| ------------------------------------------------ | -------------------------------- | -------------------------- |
| `insertComponentWithDefinition` doppelter Offset | E2E component-panel-drop.spec.ts | ✓ Gefixt                   |
| Escape-Taste versteckt Drop-Indicator nicht      | Adversarial Test T5              | Offen (test.fail markiert) |

---

## Nächste Schritte

### Priorität 1: Unit-Tests für kritische Logik ✓ ERLEDIGT

1. [x] `insertComponentWithDefinition` Offset-Tests (10 Tests)
2. [x] `findDefinitionInsertPosition` Tests (8 Tests)
3. [x] `hasComponentDefinition` Tests (12 Tests)

### Priorität 2: Fehlende Komponenten-Typen ✓ ERLEDIGT

4. [x] RadioGroup testen
5. [x] Slider testen
6. [x] Tabs testen
7. [x] DatePicker testen
8. [x] Switch testen

### Priorität 3: Adversarial Tests (Teilweise)

7. [ ] Schnelle Bewegungen
8. [ ] Doppelte Drags
9. [ ] Memory-Leak-Detection
10. [x] Escape während Drag → **Bug gefunden!**
11. [x] Drag nach Undo → Funktioniert

### Priorität 4: Gefundenen Bug fixen

12. [ ] Escape-Handler in editor-drop-handler.ts hinzufügen

---

## Test-Helpers

```typescript
// tests/e2e/helpers/editor.ts

export async function setEditorContent(page: Page, content: string) {
  await page.evaluate(code => {
    const editor = document.querySelector('.cm-content')
    // Trigger CodeMirror update
  }, content)
}

export async function getEditorContent(page: Page): Promise<string> {
  return page.locator('.cm-content').textContent() || ''
}

export async function waitForPreview(page: Page) {
  await page.waitForSelector('#preview-frame')
  await page.waitForTimeout(100) // Render-Zeit
}

export async function getConsoleErrors(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as any).__consoleErrors__ || [])
}
```

---

_Aktualisiert: 2026-04-13_
_Basierend auf kritischer Analyse und dem gefundenen `insertComponentWithDefinition`-Bug_
