# Component System

## Übersicht

Das Component System verwaltet die verfügbaren UI-Komponenten basierend auf der Zag-Bibliothek. Es verwendet ein **On-Demand Pattern**, bei dem Komponenten durch Nutzung aktiviert werden.

---

## Zielarchitektur

### Studio Layout

```
┌──┬──────────────┬──────────────────┬─────────────┐
│  │              │                  │             │
│📁│  Explorer    │     Editor       │   Preview   │
│──│  Panel       │                  │             │
│🧩│              │                  │             │
│  │              │                  │             │
│  │              │                  │             │
└──┴──────────────┴──────────────────┴─────────────┘
 ↑
 Activity Bar
```

### Explorer Panel mit Activity Bar

```
┌──┬─────────────────┐
│📁│ Files           │  ← Projekt-Dateien
│  │ ├── app.mir     │
│  │ ├── tokens.tok  │
│  │ └── ui.com      │     (Component-Definitionen)
├──┼─────────────────┤
│🧩│ Components      │  ← Palette zum Draggen
│  │                 │
│  │  Basic    All   │     ← Tab Bar
│  │  ─────────────  │
│  │  [▾] Select     │
│  │  [☰] Menu       │
│  │  [☑] Checkbox   │
│  │                 │
└──┴─────────────────┘
```

### Activity Bar Views

| Icon | View | Beschreibung |
|------|------|--------------|
| 📁 | Files | Datei-Explorer mit allen Projektdateien |
| 🧩 | Components | Komponenten-Palette (Basic/All Tabs) |

---

## Basic/All Pattern

### Konzept

| Tab | Inhalt | Quelle |
|-----|--------|--------|
| **Basic** | Projekt-Komponenten | Spiegelt `components` File |
| **All** | Komplette Bibliothek | Statische Zag-Komponenten (50+) |

### Transparenz-Prinzip

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   components File  ←───────→  Basic Tab             │
│   (editierbar)               (draggable)            │
│                                                     │
│   - Syntax sichtbar          - Visuell gruppiert    │
│   - Anpassbar                - Drag & Drop          │
│   - Löschbar                 - Mit Icons            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Kein versteckter State** - alles was im Basic Tab erscheint, ist im components File sichtbar und editierbar.

---

## Drag & Drop

### Zwei Drop-Targets

```
┌──────────────┬──────────────────┬─────────────┐
│              │                  │             │
│  Components  │     Editor       │   Preview   │
│              │                  │             │
│  [Select] ──drag──→ Drop hier   │  Drop hier  │
│              │   (Code)         │  (Visuell)  │
│              │                  │             │
└──────────────┴──────────────────┴─────────────┘
```

| Drop Target | Verhalten |
|-------------|-----------|
| **Editor** | Code wird an Cursor/Drop-Position eingefügt |
| **Preview** | Visuell positionieren → Code wird generiert |

### Workflow: Komponente aus "All"

```
User zieht "DatePicker" aus "All" Tab
    ↓
Drop in Editor ODER Preview
    ↓
Code wird eingefügt
    ↓
DatePicker wird zum components File hinzugefügt
    ↓
DatePicker erscheint im "Basic" Tab
```

---

## components File (`.com`)

Single Source of Truth für Projekt-Komponenten:

```mirror
--- Layouts ---

V-Box as Box:
  ver, gap 8

H-Box as Box:
  hor, gap 8

--- Selection ---

Select from @zag/select
Menu from @zag/menu

--- Form ---

Checkbox from @zag/checkbox
Switch from @zag/switch
```

### Syntax

| Typ | Syntax | Beschreibung |
|-----|--------|--------------|
| **Kategorie** | `--- Name ---` | Section-Trenner für Gruppierung |
| **Custom** | `Name as Primitive:` | Eigene Komponente definieren |
| **Zag Import** | `Name from @zag/name` | Zag-Komponente importieren |

### Auto-Cleanup

Wenn eine Komponente nicht mehr im Projekt verwendet wird:
- Wird automatisch aus dem `.com` File entfernt
- Verschwindet aus dem "Basic" Tab

---

## Component Panel Design

### Struktur

```
┌─────────────────────────┐
│  Basic (5)   All        │  ← Tab Bar
├─────────────────────────┤
│ 🔍 Search...            │  ← Search Bar
├─────────────────────────┤
│ ▼ Layouts               │  ← Section (collapsible)
│   [≡] V-Box             │  ← Item (icon + name)
│   [☰] H-Box             │
├─────────────────────────┤
│ ▼ Selection             │
│   [▾] Select            │
│   [☰] Menu              │
├─────────────────────────┤
│ ▼ Form                  │
│   [☑] Checkbox          │
│   [◐] Switch            │
└─────────────────────────┘
```

### Elemente

| Element | Beschreibung |
|---------|--------------|
| **Tab Bar** | Basic / All Umschaltung |
| **Search Bar** | Filter über alle sichtbaren Komponenten |
| **Section** | Thematische Gruppierung, collapsible |
| **Item** | Icon + Name, draggable |

### Sections in "All"

| Section | Komponenten |
|---------|-------------|
| **Layouts** | V-Box, H-Box, ZStack, Grid, Sidebar, etc. |
| **Selection** | Select, Combobox, Listbox, Menu, ContextMenu |
| **Navigation** | Tabs, Accordion, Steps, Pagination, TreeView |
| **Form** | Checkbox, Switch, RadioGroup, Slider, NumberInput, etc. |
| **Overlay** | Dialog, Tooltip, Popover, HoverCard, FloatingPanel |
| **Feedback** | Progress, Toast, CircularProgress |
| **Date/Time** | DatePicker, DateInput, Timer |
| **Media** | Avatar, FileUpload, Carousel, SignaturePad |
| **Utility** | Clipboard, QRCode, ScrollArea, Splitter |

---

## Technische Implementierung

### Neue/Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `studio/panels/explorer/activity-bar.ts` | **NEU** - Activity Bar UI |
| `studio/panels/explorer/explorer-panel.ts` | **NEU** - Container für Views |
| `studio/panels/explorer/files-view.ts` | **NEU** - Datei-Explorer View |
| `studio/panels/components/component-panel.ts` | **ÄNDERN** - Tab Bar hinzufügen |
| `studio/panels/components/components-file-sync.ts` | **NEU** - Sync mit components File |
| `studio/editor/drop-handler.ts` | **ÄNDERN** - Editor als Drop-Target |

### State

```typescript
interface ExplorerPanelState {
  activeView: 'files' | 'components'
}

interface ComponentPanelState {
  activeTab: 'basic' | 'all'
  searchQuery: string
  basicComponents: ComponentItem[]  // aus components File
  allComponents: ComponentItem[]    // statisch aus BASIC_COMPONENTS
}
```

### Events

```typescript
// Activity Bar
type ViewChangedEvent = {
  type: 'explorer:view-changed'
  view: 'files' | 'components'
}

// Component Panel
type TabChangedEvent = {
  type: 'components:tab-changed'
  tab: 'basic' | 'all'
}

type ComponentAddedEvent = {
  type: 'components:added-to-project'
  componentName: string
}

// Drop Events
type ComponentDroppedEvent = {
  type: 'component:dropped'
  target: 'editor' | 'preview'
  componentName: string
  position: { line: number; column: number } | { x: number; y: number }
}
```

---

## Implementierungsplan

### Phase 1: Activity Bar & Explorer Panel

**Ziel:** Grundstruktur für linkes Panel mit View-Umschaltung

1. `activity-bar.ts` erstellen
   - Vertikale Icon-Leiste
   - Click Handler für View-Wechsel
   - Active State Styling

2. `explorer-panel.ts` erstellen
   - Container der Views hostet
   - View-Switching Logik
   - Integration mit Activity Bar

3. `files-view.ts` erstellen (oder bestehenden File-Explorer verschieben)
   - Bestehende Funktionalität erhalten
   - In neuen Container integrieren

### Phase 2: Component Panel Tab Bar

**Ziel:** Basic/All Tabs im bestehenden Component Panel

1. `component-panel.ts` erweitern
   - Tab Bar UI rendern
   - activeTab State
   - Tab-Wechsel Handler

2. Filtering implementieren
   - All Tab: bestehende BASIC_COMPONENTS zeigen
   - Basic Tab: nur aus components File

### Phase 3: components File Sync

**Ziel:** Bidirektionale Synchronisation

1. `components-file-sync.ts` erstellen
   - components File parsen
   - ComponentItem[] generieren
   - File Watcher für Updates

2. Bei Drop aus "All"
   - Komponente zum components File hinzufügen
   - Basic Tab aktualisieren

### Phase 4: Editor Drop Target

**Ziel:** Komponenten in Editor droppen

1. `editor/drop-handler.ts` erweitern
   - Drop Event Handler für CodeMirror
   - Position aus Drop-Event ermitteln
   - Code an Position einfügen

2. Integration mit Component Panel
   - dragData Format definieren
   - Code-Template aus ComponentItem generieren

### Phase 5: Polish & Integration

**Ziel:** Alles zusammenführen

1. Styling
   - Activity Bar Icons
   - Tab Bar Design
   - Hover/Active States

2. Edge Cases
   - Leere Sections ausblenden
   - Error Handling
   - Loading States

