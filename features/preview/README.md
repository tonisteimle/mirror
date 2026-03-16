# Preview Feature

Das Preview-Panel im Mirror Studio wechselt automatisch basierend auf dem Dateityp zwischen verschiedenen Darstellungsmodi.

## Dateitypen und ihre Previews

| Dateityp | Preview |
|----------|---------|
| **Layout** (`.mirror`) | Gerenderte UI-Vorschau |
| **Tokens** (`tokens.mirror`) | Token-Tabelle mit Farbswatches |
| **Components** (`components.mirror`) | Komponenten mit States |

## Dateien

- `studio.html` - Enthält CSS und JavaScript für alle Preview-Typen
- `packages/mirror-lang/src/backends/dom.ts` - Token-zu-CSS-Variable Konvertierung

## Implementierung

### Dateityp-Erkennung

Die Funktion `detectFileType()` analysiert den Dateiinhalt:

```javascript
function detectFileType(content) {
  // Tokens: $name: value (aber ohne Instanzen)
  // Components: Name: definition
  // Layout: Enthält Instanzen
}
```

### Token-Preview

Zeigt alle definierten Tokens in einer Tabelle:
- **Farben**: Mit Swatch-Vorschau
- **Abstände**: Mit visueller Größendarstellung
- **Radien**: Mit Größendarstellung

### Components-Preview

Zeigt jede Komponente mit allen definierten States:
- **Sektionen**: Gruppierung mit `--- Titel ---` Syntax
- **Name**: Links angezeigt
- **State**: DEFAULT, HOVER, etc.
- **Render**: Tatsächliche gerenderte Komponente

## CSS-Variablen

Token-Namen werden für CSS konvertiert:
- `$primary.bg` → `--primary-bg`
- `$md.rad` → `--md-rad`

(Punkte werden zu Bindestrichen, `$` wird entfernt)
