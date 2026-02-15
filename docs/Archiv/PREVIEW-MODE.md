# Preview Mode

Mirror bietet zwei Vorschau-Modi für die Präsentation von Prototypen ohne Editor-UI.

## Modi

### Preview Mode
- Blendet den Code-Editor aus
- Zeigt die Preview mit Page-Sidebar (bei mehreren Seiten)
- Ideal für Walkthroughs und Demonstrationen

### Fullscreen Mode
- Zeigt ausschließlich die Preview
- Keine UI-Elemente sichtbar (kein Header, keine Sidebar)
- Perfekt für Präsentationen und User-Tests

## Tastaturkürzel

| Aktion | Shortcut |
|--------|----------|
| Preview Mode ein/aus | `⌘.` |
| Fullscreen Mode ein/aus | `⌘⇧.` |
| Zurück zum Editor | `Escape` |

Die Modi sind auch über die Icons in der Header-Bar erreichbar:
- Auge-Icon = Preview Mode
- Expand-Icon = Fullscreen Mode

## Code-Struktur

### State Management
**`src/hooks/useAppState.ts`**
```typescript
export type ViewMode = 'edit' | 'preview' | 'fullscreen'
const [viewMode, setViewMode] = useState<ViewMode>('edit')
```

### Keyboard Shortcuts
**`src/hooks/useAppState.ts:76-104`**
- `Escape` - Zurück zu Edit Mode
- `⌘.` / `Ctrl+.` - Toggle Preview Mode
- `⌘⇧.` / `Ctrl+Shift+.` - Toggle Fullscreen Mode

### UI Rendering
**`src/App.tsx`**
```typescript
const isEditMode = app.viewMode === 'edit'
const isPreviewMode = app.viewMode === 'preview'
const isFullscreenMode = app.viewMode === 'fullscreen'
```

Bedingte Anzeige:
- Header: Nur in `edit` und `preview` Mode (ausgeblendet in `fullscreen`)
- Editor + Resizer: Nur in `edit` Mode
- Page-Sidebar: In `edit` Mode (im Editor) und `preview` Mode (standalone, bei >1 Seite)
- Preview: Immer sichtbar

### Header Bar Controls
**`src/components/HeaderBar.tsx:62-86`**
- Toggle-Buttons für Preview und Fullscreen
- Aktiver Zustand wird visuell hervorgehoben
