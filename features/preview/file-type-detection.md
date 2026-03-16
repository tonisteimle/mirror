# File Type Detection

## Übersicht

Das Studio erkennt automatisch den Typ einer Datei anhand ihres Inhalts und zeigt die entsprechende Preview.

## Reihenfolge der Erkennung

Die Erkennung erfolgt in dieser Reihenfolge (spezifischer zuerst):

1. **JavaScript** - `javascript` und `end` Keywords
2. **Data** - Enthält `- item` Zeilen
3. **Tokens** - Token-Definitionen OHNE Instanzen
4. **Component** - Komponenten-Definitionen (Name:)
5. **Layout** - Fallback (alles andere)

## Erkennung: Tokens

Eine Datei wird als "Tokens" erkannt wenn:
- Mindestens eine Token-Definition vorhanden: `$name: value`
- KEINE Komponenten-Instanzen vorhanden (PascalCase ohne `:`)

```javascript
detect: (lines) => {
  let hasTokens = false
  let hasInstances = false

  for (const line of lines) {
    // Token definition: $name: value
    if (/^\$?[a-z][a-zA-Z0-9.-]*:\s*(#|"|'\d)/.test(line)) {
      hasTokens = true
    }
    // Component instance: PascalCase without colon
    if (/^[A-Z][a-zA-Z0-9]*(\s|$)/.test(line) && !line.includes(':')) {
      hasInstances = true
    }
  }

  return hasTokens && !hasInstances
}
```

## Erkennung: Components

Eine Datei wird als "Components" erkannt wenn:
- Mindestens eine Komponenten-Definition vorhanden: `Name: properties`

```javascript
detect: (lines) => {
  for (const line of lines) {
    // Component definition: PascalCase with colon
    if (/^[A-Z][a-zA-Z0-9]*:/.test(line)) {
      return true
    }
  }
  return false
}
```

## Erkennung: Layout

Layout ist der Fallback wenn keine andere Erkennung zutrifft. Typisch für:
- Dateien mit Instanzen (App, Button, etc.)
- Gemischte Dateien mit Tokens UND Instanzen

## Preview-Mapping

| File Type | Preview Class | Render Function |
|-----------|---------------|-----------------|
| `tokens` | `tokens-preview` | `renderTokensPreview()` |
| `component` | `components-preview` | `renderComponentsPreview()` |
| `layout` | (none) | Standard UI Rendering |
| `data` | (none) | Standard UI Rendering |
| `javascript` | (none) | Standard UI Rendering |
