# mirror-ide

> Visual Editor for Mirror DSL

Mirror IDE ist ein visueller Editor für die Mirror DSL mit Live-Preview, Syntax-Highlighting und Auto-Completion.

## Features

- Live-Preview mit sofortiger Aktualisierung
- Syntax-Highlighting für Mirror DSL
- Context-aware Auto-Completion
- Design-Token Picker (Farben, Fonts, Icons)
- Component Library View
- Keyboard Shortcuts

## Entwicklung

```bash
# Dependencies installieren
npm install

# Dev-Server starten
npm run dev

# Tests ausführen
npm test
```

## Architektur

```
src/
├── components/       # React UI-Komponenten
│   ├── EditorPanel   # Code-Editor mit CodeMirror
│   ├── Preview       # Live-Vorschau
│   └── LibraryView   # Komponenten-Bibliothek
├── editor/           # CodeMirror Integration
│   ├── dsl-syntax    # Syntax-Highlighting
│   └── autocomplete  # Auto-Completion
├── hooks/            # Custom React Hooks
└── containers/       # Layout-Container
```

## Verwendung mit mirror-lang

Die IDE verwendet `mirror-lang` als Compiler:

```javascript
import { parse } from 'mirror-lang'

// Code parsen
const result = parse(code)

// Preview rendern
renderPreview(result.nodes)
```

## Keyboard Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Cmd+S` | Speichern |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+/` | Kommentar toggle |
| `Tab` | Einrücken |
| `Shift+Tab` | Ausrücken |

## Lizenz

MIT
