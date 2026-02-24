# Maximal Validation Pattern

Dieses Dokument beschreibt, wie ein einzelner Mirror-Code-Schritt **vollständig validiert** werden kann.

## Konzept

Statt oberflächliche Tests zu schreiben ("rendert ohne Fehler"), prüfen wir **jeden Aspekt** des Codes:

```
Code → Parser → AST → Registry → React → DOM → Styles → Interaktionen
```

Jede Stufe wird einzeln validiert.

---

## Die 13 Validierungs-Kategorien

### 1. Parser-Ebene
**Was:** Syntaktische Korrektheit
**Wie:**
```typescript
const result = parse(CODE)
expect(getParseErrors(result)).toHaveLength(0)
expect(getSyntaxWarnings(result)).toHaveLength(0)
```

### 2. Tokens
**Was:** Design-Variablen korrekt definiert
**Wie:**
```typescript
expect(result.tokens.has('primary')).toBe(true)
expect(result.tokens.get('primary')).toBe('#3B82F6')
```

### 3. Registry (Komponenten-Definitionen)
**Was:** Komponenten korrekt in Registry registriert
**Wie:**
```typescript
expect(result.registry.has('Button')).toBe(true)
const buttonDef = result.registry.get('Button')
expect(buttonDef.states?.length).toBeGreaterThanOrEqual(1)
```

### 4. AST-Struktur
**Was:** Korrekte Baumstruktur der Nodes
**Wie:**
```typescript
const form = result.nodes?.find(n => n.name === 'Form')
expect(form?.children?.length).toBe(1)
expect(form?.children?.[0].name).toBe('Button')
```

### 5. React-Rendering
**Was:** Fehlerfreies Rendering
**Wie:**
```typescript
expect(() => parseAndRender(CODE)).not.toThrow()
const { container } = parseAndRender(CODE)
expect(container.innerHTML).not.toBe('')
```

### 6. DOM-Struktur
**Was:** Korrekte HTML-Elemente und Attribute
**Wie:**
```typescript
const button = queryByDataId('Button', container).element
expect(button).not.toBeNull()
expect(button?.getAttribute('data-id')).toMatch(/^Button/)
expect(button?.className).toContain('Button')
```

### 7. CSS/Styles
**Was:** Alle Style-Properties korrekt angewendet
**Wie:**
```typescript
expect(button.style.padding).toBe('12px 24px')
expect(button.style.borderRadius).toBe('6px')
expect(colorsMatch(button.style.backgroundColor, '#3B82F6')).toBe(true)
```

### 8. Text-Content
**Was:** Texte korrekt gerendert und platziert
**Wie:**
```typescript
expect(screen.getByText('Anmelden')).toBeInTheDocument()
expect(button.textContent).toContain('Anmelden')
const span = button.querySelector('span')
expect(span?.textContent).toBe('Anmelden')
```

### 9. Hover-State
**Was:** Hover ändert Styles korrekt
**Wie:**
```typescript
const originalBg = button.style.backgroundColor
fireEvent.mouseEnter(button)
expect(colorsMatch(button.style.backgroundColor, '#2563EB')).toBe(true)
fireEvent.mouseLeave(button)
expect(button.style.backgroundColor).toBe(originalBg)
```

### 10. Behavior-States (disabled, selected, etc.)
**Was:** States in Definition vorhanden
**Wie:**
```typescript
const disabledState = buttonDef.states?.find(s => s.name === 'disabled')
expect(disabledState).toBeDefined()
```

### 11. Interaktionen
**Was:** Click, MouseDown, etc. funktionieren
**Wie:**
```typescript
expect(() => fireEvent.click(button)).not.toThrow()
expect(() => {
  fireEvent.mouseDown(button)
  fireEvent.mouseUp(button)
}).not.toThrow()
```

### 12. Edge Cases
**Was:** Robustheit bei ungewöhnlichen Eingaben
**Wie:**
```typescript
// Leerer Text
expect(() => parseAndRender(CODE.replace('"Anmelden"', '""'))).not.toThrow()

// Langer Text
const longText = 'A'.repeat(100)
expect(() => parseAndRender(CODE.replace('"Anmelden"', `"${longText}"`))).not.toThrow()

// Sonderzeichen
expect(() => parseAndRender(CODE.replace('"Anmelden"', '"→ Weiter"'))).not.toThrow()

// Emoji
expect(() => parseAndRender(CODE.replace('"Anmelden"', '"✓ OK"'))).not.toThrow()
```

### 13. Zusammenfassung (Integration)
**Was:** Gesamter Flow in einem Test
**Wie:**
```typescript
it('sollte den gesamten Flow durchlaufen', () => {
  // 1. Parse
  const result = parse(CODE)
  expect(getParseErrors(result)).toHaveLength(0)

  // 2. Tokens
  expect(result.tokens.size).toBeGreaterThan(0)

  // 3. Registry
  expect(result.registry.has('Button')).toBe(true)

  // 4. Render
  const { container } = parseAndRender(CODE)

  // 5. DOM
  const button = queryByDataId('Button', container).element!
  expect(button).toBeDefined()

  // 6. Styles
  expect(button.style.padding).toBe('12px 24px')

  // 7. Text
  expect(button.textContent).toContain('Anmelden')

  // 8. Hover
  fireEvent.mouseEnter(button)
  expect(colorsMatch(button.style.backgroundColor, '#2563EB')).toBe(true)
  fireEvent.mouseLeave(button)

  // 9. Interaktion
  expect(() => fireEvent.click(button)).not.toThrow()
})
```

---

## Utility-Funktionen

Die Tests nutzen diese Helfer aus `./utils`:

| Funktion | Zweck |
|----------|-------|
| `parseAndRender(code)` | Parst und rendert Code |
| `getParseErrors(result)` | Extrahiert Parser-Fehler |
| `getSyntaxWarnings(result)` | Extrahiert Syntax-Warnungen |
| `queryByDataId(prefix, container)` | Findet Element per data-id |
| `countElements(prefix, container)` | Zählt Elemente |
| `colorsMatch(actual, expected)` | Vergleicht Farben (normalisiert) |
| `hasElement(prefix, container)` | Prüft ob Element existiert |

---

## Beispiel: Button mit States

```mirror
$primary: #3B82F6

Button: pad 12 24, bg $primary, rad 6, cen, cursor pointer
  hover
    bg #2563EB
  state disabled
    bg #333
    cursor default

Form bg #1A1A1A, pad 24, rad 12
  Button "Anmelden"
```

**Dieser Code erzeugt 59 Tests** in folgenden Kategorien:

| Kategorie | Tests |
|-----------|-------|
| 1. Parser | 3 |
| 2. Tokens | 4 |
| 3. Registry | 5 |
| 4. AST | 4 |
| 5. Rendering | 3 |
| 6. DOM | 6 |
| 7. CSS | 13 |
| 8. Text | 4 |
| 9. Hover | 4 |
| 10. Disabled | 2 |
| 11. Interaktionen | 4 |
| 12. Edge Cases | 6 |
| 13. Zusammenfassung | 1 |
| **Total** | **59** |

---

## Wann verwenden?

**Maximal Validation** eignet sich für:

1. **Kritische Komponenten** - Buttons, Inputs, Cards
2. **Komplexe States** - Hover, Focus, Disabled, Selected
3. **Nach Refactoring** - Sicherstellen dass nichts kaputt ging
4. **Neue Features** - Vollständige Abdeckung von Anfang an

**Nicht nötig für:**

- Einfache Text-Nodes ohne Interaktion
- Temporäre Test-Fixtures
- Explorative Prototypen

---

## Checkliste für neue Maximal-Validierung

```
□ Parser-Ebene
  □ Keine Parse-Errors
  □ Keine Syntax-Warnings

□ Tokens
  □ Alle Tokens existieren
  □ Token-Werte korrekt

□ Registry
  □ Komponente registriert
  □ States vorhanden

□ AST
  □ Korrekte Hierarchie
  □ Korrekte Node-Namen

□ Rendering
  □ Kein Throw
  □ Container nicht leer

□ DOM
  □ Elemente existieren
  □ Korrekte Hierarchie
  □ data-id gesetzt
  □ class-Namen korrekt

□ CSS
  □ Alle Properties geprüft
  □ Farben normalisiert verglichen

□ Text
  □ Text sichtbar
  □ Text im richtigen Element

□ States (Hover/Disabled/etc.)
  □ State ändert Styles
  □ State reversibel

□ Interaktionen
  □ Click funktioniert
  □ Mouse-Events funktionieren

□ Edge Cases
  □ Leerer Text
  □ Langer Text
  □ Sonderzeichen
  □ Emoji
```

---

## Datei-Referenz

- **Test:** `src/__tests__/journeys/maximal-validation.test.tsx`
- **Utils:** `src/__tests__/journeys/utils/index.ts`
- **Doku:** `src/__tests__/journeys/MAXIMAL-VALIDATION.md`
