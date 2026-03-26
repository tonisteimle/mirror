# Component Auto-Add Feature

## Konzept

Wenn eine Komponente aus der Palette auf ein `.mir` File gedroppt wird und diese Komponente noch nicht im Projekt definiert ist, soll sie automatisch zu einem `.com` File hinzugefügt werden.

## Logik: Welches .com File?

| Situation | Aktion |
|-----------|--------|
| Kein .com File existiert | `components.com` erstellen |
| Ein .com File existiert | Dieses verwenden (egal welcher Name) |
| Mehrere .com Files | `components.com` bevorzugen, sonst irgendein .com File |

## Ablauf

1. Drop auf `.mir` File erkannt
2. Prüfen: Existiert Komponente bereits in einem .com File?
   - Ja → Nur Insert ins .mir (fertig)
   - Nein → Weiter
3. .com File ermitteln (siehe Tabelle oben)
4. Komponente zum .com File hinzufügen (`com`-Template)
5. Insert ins .mir File (`mir`-Template)

## Komponente "existiert bereits" wenn

Prüfung ob `Select` bereits existiert - Match bei:

```
Select:                      // direkte Definition
Select from @zag/select      // Import
MySelection as Select:       // abgeleitet
```

Regex-Pattern für Basis-Komponente `X`:
- `^X:` oder `^X\s+from\s+@` (direkt)
- `as\s+X:` (abgeleitet)

## Templates

Definiert in `studio/panels/components/component-templates.ts`:

```typescript
COMPONENT_TEMPLATES['zag-select'] = {
  mir: `Select placeholder "Choose..."    // → .mir File
  Item "Option A"
  Item "Option B"`,
  com: `Select placeholder "Choose...", searchable, clearable    // → .com File
  Item "Option A"
  Item "Option B"`,
}
```

- `mir` Template: Minimal, für den Insert ins .mir File
- `com` Template: Vollständig, für den Auto-Add ins .com File

## Nicht betroffen

- Drops direkt auf .com Files (dort wird sowieso die volle Definition eingefügt)
- Bereits definierte Komponenten (keine Duplikate)
- Canvas-Drops (Verschieben, nicht Hinzufügen)

## Implementierung

### Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `studio/drag-drop/executor/code-executor.ts` | Auto-Add Logik aufrufen |
| `studio/panels/components/component-auto-add.ts` | Neue Datei: Auto-Add Service |
| `studio/panels/components/index.ts` | Export hinzufügen |

### Auto-Add Service API

```typescript
interface ComponentAutoAddService {
  // Prüft ob Komponente bereits definiert ist (in allen .com Files)
  isComponentDefined(componentName: string): Promise<boolean>

  // Fügt Komponente zum passenden .com File hinzu
  addComponent(componentId: string): Promise<boolean>
}
```

### Dependencies

- Storage API: Zugriff auf Projekt-Dateien (lesen/schreiben)
- `COMPONENT_TEMPLATES`: Für das `com`-Template

## Status

Implementiert.

### Implementierte Dateien

| Datei | Beschreibung |
|-------|--------------|
| `studio/panels/components/component-auto-add.ts` | Auto-Add Service |
| `studio/panels/components/index.ts` | Export hinzugefügt |
| `studio/drag-drop/executor/code-executor.ts` | Integration |

### Funktionen

- `isComponentDefined(componentName)` - Prüft ob Komponente in .com Files definiert ist
- `addComponentToComFile(componentId)` - Fügt Komponente zum passenden .com File hinzu
