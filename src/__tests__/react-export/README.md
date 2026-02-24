# React Export Test Suite

Diese Test-Suite prüft systematisch, dass Mirror → React Export korrekt funktioniert.

## Testansatz

### 1. Property Matrix (`property-matrix.test.ts`)

Systematischer Test **jeder einzelnen DSL-Property**:

```typescript
{
  name: 'padding: single value',
  mirror: 'Box pad 16',
  expectedCss: { padding: '16px' }
}
```

**Vorteile:**
- Sofort sichtbar welche Property nicht funktioniert
- Einfach erweiterbar
- Schnelle Feedback-Schleife

**Coverage:**
- Sizing (width, height, min/max)
- Spacing (padding, margin)
- Layout (hor, ver, gap, spread, wrap, center)
- Alignment (left, right, top, bottom)
- Colors (bg, col)
- Border (bor, rad)
- Typography (fs, weight, line)
- Visual (opacity, shadow, cursor, z)
- Scroll (scroll, clip)

### 2. Dual Render (`dual-render.test.tsx`)

Vergleicht Mirror Preview mit generiertem React-Code:

```
Mirror Code
    ↓
┌───────────────────┬───────────────────┐
│  Preview Render   │   React Export    │
│  (generateElement)│   (exportReact)   │
└─────────┬─────────┴─────────┬─────────┘
          ↓                   ↓
     Computed Styles    Generated CSS
          └─────────┬─────────┘
                    ↓
              Compare Styles
```

**Vorteile:**
- Prüft echte Konsistenz
- Findet Diskrepanzen zwischen Preview und Export
- Hilft bei komplexen Property-Kombinationen

### 3. Known Issues / Regressions

Wenn ein Bug gefunden wird:

1. **Test hinzufügen** mit `.skip`:
   ```typescript
   it.skip('TODO: shadow property generates correct box-shadow', () => {
     const { css } = exportReact('Box shadow md')
     expect(css).toContain('box-shadow')
   })
   ```

2. **Bug fixen**

3. **`.skip` entfernen** → Test bleibt als Regression-Guard

## Neue Tests hinzufügen

### Property hinzufügen

In `property-matrix.test.ts`:

```typescript
{
  name: 'neue-property',
  mirror: 'Box neue-property wert',
  expectedCss: { 'css-property': 'wert' }
}
```

### Komplexes Szenario hinzufügen

In `dual-render.test.tsx`:

```typescript
{
  name: 'Beschreibung',
  mirror: `
Box ver, g 16
  Child1
  Child2
`
}
```

### Bug dokumentieren

```typescript
it.skip('TODO: Beschreibung des Bugs', () => {
  // Minimaler Reproduktionsfall
  const { css } = exportReact('...')
  expect(css).toContain('...')
})
```

## Tests ausführen

```bash
# Nur React-Export Tests
npm test -- src/__tests__/react-export/

# Mit Verbose Output
npm test -- src/__tests__/react-export/ --reporter=verbose

# Einzelne Test-Datei
npm test -- src/__tests__/react-export/property-matrix.test.ts
```

## Coverage erweitern

Die Property-Matrix ist sortiert nach DSL-Kategorien. Um Coverage zu erhöhen:

1. Prüfe `src/dsl/properties.ts` für alle Properties
2. Füge fehlende Properties zur Matrix hinzu
3. Teste Kombinationen in `dual-render.test.tsx`

## Bekannte Lücken

| Feature | Status | Notes |
|---------|--------|-------|
| Hover States | ⚠️ Partial | `:hover` Pseudo-Klasse |
| Animations | ❌ Missing | `animate`, `show`, `hide` |
| Conditionals | ⚠️ Partial | `if/else` Blocks |
| Iterators | ⚠️ Partial | `each` Loops |
| Events | ⚠️ Partial | Event Handler Code |
| Component Definitions | ✓ Basic | Vererbung, Slots |
