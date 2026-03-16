# Icon Picker - Technische Lösung

## Übersicht

Der Icon Picker ist als CodeMirror Extension implementiert und interagiert mit dem Mirror Compiler.

## Komponenten

### CodeMirror Extensions

1. **iconTriggerExtension** - Erkennt Space nach Icon-Komponente
2. **iconKeyboardExtension** - Keyboard-Handler (Prec.highest für Priorität)

### Compiler Integration

- Primitive-Map: `componentName → primitive` wird beim Compile erstellt
- Bei Space-Eingabe wird geprüft ob Komponente ein Icon ist

## Implementierung

### Trigger-Logik

```typescript
// Bei Space-Eingabe prüfen
const componentName = getWordBeforeCursor();
const primitive = primitiveMap.get(componentName);
if (primitive === 'icon') {
  openIconPicker();
}
```

### Keyboard-Handling

```typescript
// Prec.highest für Enter-Priorität vor CodeMirror
Prec.highest(iconKeyboardExtension)
```

**Problem gelöst:** Enter wurde von CodeMirror's Standard-Handler abgefangen. Lösung: `Prec.highest()` um den Keyboard-Handler gewrapped.

### Icon-Laden

- URL: `https://unpkg.com/lucide-static/icons/{name}.svg`
- Fallback: Icon-Name als Text bei Fehler
- Icons werden als `<span>` mit inline SVG gerendert

### localStorage

```typescript
// Zuletzt verwendete Icons
const RECENT_KEY = 'mirror-recent-icons';
const MAX_RECENT = 12;

function addRecentIcon(name: string) {
  const recent = getRecentIcons();
  const filtered = recent.filter(i => i !== name);
  const updated = [name, ...filtered].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
```

## DOM Backend

- Icons werden als `<span>` gerendert
- Runtime Helper `loadIcon` lädt SVG von CDN
- `data-icon` Attribut für Icon-Name
- Icon-Properties als `data-*` Attribute
