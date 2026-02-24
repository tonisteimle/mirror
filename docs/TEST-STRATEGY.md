# Mirror Test-Strategie

## Problem

Mirror → React Export hat systematische Bugs die schwer zu finden sind:
- Properties werden falsch konvertiert
- CSS-Werte sind inkorrekt
- Kombinationen von Properties funktionieren nicht

## Lösung: Dreistufiger Testansatz

### Stufe 1: Property-Matrix (Schnell, Systematisch)

**Datei:** `src/__tests__/react-export/property-matrix.test.ts`

Testet **jede einzelne DSL-Property** isoliert:

```typescript
{
  name: 'width: full',
  mirror: 'Box w full',
  expectedCss: { width: '100%', 'flex-grow': '1' }
}
```

**Vorteile:**
- Sofort sichtbar welche Property kaputt ist
- Einfach zu erweitern
- Schnelle Ausführung (~20ms)

**Wann erweitern:**
- Neue Property hinzugefügt → Test hinzufügen
- Bug gefunden → Test für diese Property hinzufügen

### Stufe 2: Dual-Render (Konsistenz Preview ↔ Export)

**Datei:** `src/__tests__/react-export/dual-render.test.tsx`

Vergleicht Mirror Preview mit generiertem React:

```
Mirror → Preview → DOM A
      ↘ Export → CSS → DOM B
                  ↓
            Compare A ≡ B
```

**Vorteile:**
- Prüft echte visuelle Konsistenz
- Findet Probleme bei Property-Kombinationen
- Deckt Interaktionen zwischen Properties auf

**Wann erweitern:**
- Komplexes UI-Pattern funktioniert nicht → Test hinzufügen
- Diskrepanz zwischen Preview und Export gefunden → Test hinzufügen

### Stufe 3: Regressions-Tests (Bugfixes absichern)

**Sektion:** `describe('Known Issues / Regressions')`

Für jeden gefundenen Bug:

```typescript
it.skip('TODO: shadow property generates correct box-shadow', () => {
  const { css } = exportReact('Box shadow md')
  expect(css).toContain('box-shadow')
})
```

**Workflow:**
1. Bug gefunden → `.skip` Test hinzufügen
2. Bug fixen
3. `.skip` entfernen
4. Test bleibt dauerhaft als Guard

## Ausführung

```bash
# Alle React-Export Tests
npm test -- src/__tests__/react-export/

# Nur Property-Matrix
npm test -- src/__tests__/react-export/property-matrix.test.ts

# Mit Detail-Output
npm test -- src/__tests__/react-export/ --reporter=verbose
```

## Coverage-Tracking

### Properties (Ziel: 100%)

| Kategorie | Covered | Total | % |
|-----------|---------|-------|---|
| Sizing | 6 | 10 | 60% |
| Spacing | 5 | 8 | 62% |
| Layout | 6 | 8 | 75% |
| Alignment | 4 | 6 | 67% |
| Colors | 3 | 4 | 75% |
| Border | 4 | 6 | 67% |
| Typography | 3 | 8 | 38% |
| Visual | 4 | 10 | 40% |
| Scroll | 2 | 4 | 50% |

### Aktuelle Bugs (Stand: Initial)

| Bug | Priorität | Test |
|-----|-----------|------|
| `full` → `max` | P1 | `width: full` |
| `hug` → `min` | P1 | `width: hug` |
| `left/right/top/bottom` → falsche Values | P1 | alignment tests |
| Border-Color fehlt | P2 | `border: width color` |
| Padding-Shorthand → einzelne Props | P3 | `padding: two values` |

## Erweitern der Test-Suite

### Neue Property testen

1. Property-Name und erwartetes CSS ermitteln
2. Test in `PROPERTY_TESTS` Array hinzufügen:

```typescript
{
  name: 'property-name: variante',
  mirror: 'Box property value',
  expectedCss: { 'css-property': 'expected-value' }
}
```

3. Tests ausführen, bei Fehler Bug dokumentieren

### Komplexes Szenario testen

1. Test in `dual-render.test.tsx` hinzufügen:

```typescript
{
  name: 'Beschreibung',
  mirror: `
Component1
  Component2
`
}
```

2. Bei Fehler: Minimalen Reproduktionsfall finden
3. Zur Property-Matrix hinzufügen falls einzelne Property kaputt

## Ziel

- **100% Property-Coverage** in der Matrix
- **Alle dokumentierten Features** in Dual-Render Tests
- **Alle gefundenen Bugs** als Regressions-Tests
- **< 1 Sekunde** Ausführungszeit für schnelles Feedback
