# Components Panel - Redesign Concept

## Übersicht

Das neue Components Panel ermöglicht Drag & Drop von Layout-Containern und Komponenten. Kategorien werden **dynamisch aus der Komponenten-Library** des Users übernommen.

---

## Dynamische Kategorien

### Kategorien aus `--- titel ---` Syntax

User definieren Kategorien in ihrer `components`-Datei mit der Section-Syntax:

```mirror
--- Layout ---

VStack: = Box ver, gap 8
HStack: = Box hor, gap 8
// ...

--- Navigation ---

NavBar: = ...
TabBar: = ...

--- Forms ---

FormField: = ...
```

**Das Panel liest diese Sections und erstellt automatisch Kategorien:**

```
┌──────────────────────────────────────────┐
│  🔍 Search...                            │
├──────────────────────────────────────────┤
│  ▼ LAYOUT                          (12) │
│    [Vertical] [Horizontal] [Grid] ...    │
├──────────────────────────────────────────┤
│  ▼ NAVIGATION                       (3) │
│    [NavBar] [TabBar] [Breadcrumb]        │
├──────────────────────────────────────────┤
│  ▼ FORMS                            (5) │
│    [FormField] [Input] [Select] ...      │
└──────────────────────────────────────────┘
```

### Fallback-Kategorien

Wenn keine Sections definiert sind, werden Standard-Kategorien verwendet:
- **Layout** - Alle Box-Varianten
- **Basics** - Text, Button, Input, etc.
- **Components** - User-definierte Komponenten

---

## Layout Container (Erweitert)

### Kern-Layouts (Direction & Distribution)

| Name | DSL | Beschreibung |
|------|-----|--------------|
| **Vertical** | `Box ver` | Kinder vertikal stapeln |
| **Horizontal** | `Box hor` | Kinder horizontal anordnen |
| **Grid 2** | `Box grid 2` | 2-Spalten Raster |
| **Grid 3** | `Box grid 3` | 3-Spalten Raster |
| **Grid 4** | `Box grid 4` | 4-Spalten Raster |

### Alignment & Spacing

| Name | DSL | Beschreibung |
|------|-----|--------------|
| **Center** | `Box center` | Zentriert horizontal & vertikal |
| **Spread** | `Box hor, spread` | Gleichmäßig verteilt |
| **Space Between** | `Box hor, between` | Abstand zwischen Elementen |
| **Wrap** | `Box hor, wrap` | Flexbox mit Umbruch |

### Overflow & Scrolling

| Name | DSL | Beschreibung |
|------|-----|--------------|
| **Scroll V** | `Box scroll` | Vertikal scrollbar |
| **Scroll H** | `Box scrollh` | Horizontal scrollbar |
| **Scroll Both** | `Box scrollxy` | Beide Richtungen |
| **Clip** | `Box clip` | Overflow hidden |

### Positioning & Layering

| Name | DSL | Beschreibung |
|------|-----|--------------|
| **Stacked** | `Box stacked` | Überlagert (absolute) |
| **Relative** | `Box rel` | Positioning context |
| **Fixed** | `Box fixed` | Viewport-fixiert |
| **Sticky** | `Box sticky` | Sticky positioning |

### Size Presets

| Name | DSL | Beschreibung |
|------|-----|--------------|
| **Full Width** | `Box w full` | 100% Breite |
| **Full Height** | `Box h full` | 100% Höhe |
| **Full Screen** | `Box w full, h full` | Viewport-füllend |
| **Aspect 16:9** | `Box aspect 16/9` | Festes Seitenverhältnis |
| **Aspect Square** | `Box aspect 1` | Quadratisch |

### Common Patterns

| Name | DSL | Beschreibung |
|------|-----|--------------|
| **Card** | `Box ver, pad 16, rad 8, bg #1a1a23` | Karten-Container |
| **Row** | `Box hor, gap 8, center` | Zentrierte Zeile |
| **Column** | `Box ver, gap 8` | Spalte mit Gap |
| **Sidebar Layout** | `Box hor` + children | 2-Column Layout |
| **Header-Content** | `Box ver` + children | Header + scrollbarer Content |

---

## Komplette Layout-Icon-Liste

| Icon | Name | DSL Template |
|------|------|--------------|
| ☰ | Vertical | `Box ver, gap 8` |
| ⫾ | Horizontal | `Box hor, gap 8` |
| ⊞ | Grid 2 | `Box grid 2, gap 8` |
| ⊟ | Grid 3 | `Box grid 3, gap 8` |
| ⊡ | Grid 4 | `Box grid 4, gap 8` |
| ◎ | Center | `Box center` |
| ⟷ | Spread | `Box hor, spread` |
| ↔ | Space Between | `Box hor, between` |
| ↩ | Wrap | `Box hor, wrap, gap 8` |
| ⬍ | Scroll V | `Box scroll, h full` |
| ⬌ | Scroll H | `Box scrollh, w full` |
| ⊕ | Scroll Both | `Box scrollxy` |
| ⧈ | Stacked | `Box stacked` |
| ⬒ | Full Width | `Box w full` |
| ⬓ | Full Height | `Box h full` |
| ▣ | Full Screen | `Box w full, h full` |
| ▢ | Card | `Box ver, pad 16, rad 8, bg #1a1a23` |
| ⊟ | Clip | `Box clip` |
| 📌 | Sticky | `Box sticky, top 0` |
| 📍 | Fixed | `Box fixed` |

### 2. Basis-Komponenten

```
┌─────────────────────────────────────────────────────────────┐
│  BASICS                                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   Aa    │  │ [Button]│  │ [____]  │  │   ☆     │        │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
│    Text       Button        Input        Icon               │
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │  🖼️    │  │ ○─────  │  │ ☐ ☑    │                      │
│  └─────────┘  └─────────┘  └─────────┘                      │
│    Image      Slider       Checkbox                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. User Components

```
┌─────────────────────────────────────────────────────────────┐
│  MY COMPONENTS                                    [+ New]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │ ◇ Card  │  │ ◇ Nav   │  │ ◇ Hero  │                      │
│  │ ┌─────┐ │  │ ───────│  │ ▓▓▓▓▓▓ │                      │
│  │ │     │ │  │ • • • • │  │ Aa     │                      │
│  │ │ Aa  │ │  │         │  │ [btn]  │                      │
│  │ └─────┘ │  │         │  │        │                      │
│  └─────────┘  └─────────┘  └─────────┘                      │
│    Card        NavBar       Hero                             │
│                                                              │
│  ┌─────────┐  ┌─────────┐                                   │
│  │ ◇ Modal │  │ ◇ Form  │                                   │
│  │ ┌─────┐ │  │ [____]  │                                   │
│  │ │  ×  │ │  │ [____]  │                                   │
│  │ │     │ │  │ [btn]   │                                   │
│  │ └─────┘ │  │         │                                   │
│  └─────────┘  └─────────┘                                   │
│    Modal       Form                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Mini-Preview für User Components

User-Komponenten bekommen eine **Mini-Preview** basierend auf ihrer Struktur:

```typescript
interface ComponentPreview {
  name: string
  // Analysierte Struktur für Icon-Generierung
  structure: {
    hasText: boolean
    hasButton: boolean
    hasImage: boolean
    hasIcon: boolean
    hasInput: boolean
    layout: 'ver' | 'hor' | 'grid' | 'stacked'
    childCount: number
  }
  // Optional: Custom Icon vom User
  customIcon?: string
}
```

### Automatische Icon-Generierung

Basierend auf der Komponenten-Struktur wird ein Mini-Icon generiert:

```
Komponente:                    Generiertes Icon:
───────────────────────────    ─────────────────
Card:                          ┌─────┐
  Box pad 16, rad 8            │ ┌─┐ │
    Image "hero.jpg"           │ │▓│ │
    Text "Title"               │ └─┘ │
    Text "Desc"                │ Aa  │
    Button "Action"            │ Aa  │
                               │[btn]│
                               └─────┘

NavBar:                        ┌─────────────┐
  Box hor, spread              │ ◉  ─ ─ ─ ─ │
    Icon "logo"                └─────────────┘
    Box hor, gap 8
      Text "Home"
      Text "About"
```

## Implementierung

### 1. Datenstruktur

```typescript
interface ComponentPaletteItem {
  id: string
  name: string
  category: 'layout' | 'basic' | 'user'

  // Für DSL-Generierung
  template: string              // z.B. "Box ver, gap 8"
  defaultProperties?: string    // z.B. "pad 16, bg #27272a"
  defaultChildren?: string[]    // z.B. ["Text 'Child'"]

  // Für Darstellung
  icon: ComponentIcon
  description?: string

  // Nur für User-Komponenten
  sourceFile?: string
  isDefinition?: boolean
}

type ComponentIcon =
  | { type: 'svg', path: string }
  | { type: 'mini-preview', structure: PreviewStructure }
  | { type: 'emoji', char: string }
```

### 2. Layout-Icons (SVG)

```typescript
const LAYOUT_ICONS = {
  vertical: `
    <g stroke="currentColor" fill="none" stroke-width="1.5">
      <rect x="5" y="3" width="14" height="5" rx="1"/>
      <rect x="5" y="10" width="14" height="5" rx="1"/>
      <rect x="5" y="17" width="14" height="5" rx="1"/>
    </g>
  `,
  horizontal: `
    <g stroke="currentColor" fill="none" stroke-width="1.5">
      <rect x="2" y="5" width="5" height="14" rx="1"/>
      <rect x="9" y="5" width="5" height="14" rx="1"/>
      <rect x="16" y="5" width="5" height="14" rx="1"/>
    </g>
  `,
  grid: `
    <g stroke="currentColor" fill="none" stroke-width="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </g>
  `,
  stacked: `
    <g stroke="currentColor" fill="none" stroke-width="1.5">
      <rect x="6" y="6" width="12" height="12" rx="1" fill="#3B82F620"/>
      <rect x="4" y="4" width="12" height="12" rx="1" fill="#3B82F640"/>
      <rect x="2" y="2" width="12" height="12" rx="1"/>
    </g>
  `,
  scroll: `
    <g stroke="currentColor" fill="none" stroke-width="1.5">
      <rect x="3" y="3" width="15" height="18" rx="2"/>
      <line x1="20" y1="6" x2="20" y2="18"/>
      <rect x="19" y="8" width="2" height="4" rx="1" fill="currentColor"/>
    </g>
  `,
  wrap: `
    <g stroke="currentColor" fill="none" stroke-width="1.5">
      <rect x="3" y="3" width="5" height="5" rx="1"/>
      <rect x="10" y="3" width="5" height="5" rx="1"/>
      <rect x="17" y="3" width="5" height="5" rx="1"/>
      <rect x="3" y="10" width="5" height="5" rx="1"/>
      <rect x="10" y="10" width="5" height="5" rx="1"/>
      <path d="M17 13 L21 13 L21 19 L3 19" stroke-dasharray="2"/>
    </g>
  `,
}
```

### 3. Mini-Preview Renderer

```typescript
class MiniPreviewRenderer {
  /**
   * Analysiert eine Komponenten-Definition und erstellt ein Mini-Icon
   */
  analyze(ast: ComponentDefinition): PreviewStructure {
    return {
      hasText: this.hasChildOfType(ast, 'Text'),
      hasButton: this.hasChildOfType(ast, 'Button'),
      hasImage: this.hasChildOfType(ast, 'Image'),
      hasIcon: this.hasChildOfType(ast, 'Icon'),
      hasInput: this.hasChildOfType(ast, 'Input'),
      layout: this.detectLayout(ast),
      childCount: this.countDirectChildren(ast),
    }
  }

  /**
   * Rendert eine SVG Mini-Preview basierend auf der Struktur
   */
  render(structure: PreviewStructure): string {
    const elements: string[] = []
    let y = 4

    // Container
    elements.push(`<rect x="2" y="2" width="20" height="20" rx="2" stroke="currentColor" fill="none"/>`)

    // Image placeholder (wenn vorhanden, oben)
    if (structure.hasImage) {
      elements.push(`<rect x="4" y="${y}" width="16" height="6" rx="1" fill="#52525B"/>`)
      y += 8
    }

    // Text (Aa Symbol)
    if (structure.hasText) {
      elements.push(`<text x="5" y="${y + 3}" font-size="5" fill="currentColor">Aa</text>`)
      y += 5
    }

    // Button
    if (structure.hasButton) {
      elements.push(`<rect x="4" y="${y}" width="10" height="4" rx="1" fill="#3B82F6"/>`)
    }

    return `<g>${elements.join('')}</g>`
  }
}
```

### 4. Panel UI

```html
<div class="components-panel">
  <!-- Search -->
  <div class="components-search">
    <input type="text" placeholder="Search components..." />
  </div>

  <!-- Layout Section -->
  <section class="components-section">
    <h3 class="components-section-title">
      <span>Layout</span>
      <span class="section-count">6</span>
    </h3>
    <div class="components-grid layout-grid">
      <!-- Items mit großen Icons -->
    </div>
  </section>

  <!-- Basics Section -->
  <section class="components-section">
    <h3 class="components-section-title">
      <span>Basics</span>
      <span class="section-count">6</span>
    </h3>
    <div class="components-grid">
      <!-- Items -->
    </div>
  </section>

  <!-- User Components Section -->
  <section class="components-section">
    <h3 class="components-section-title">
      <span>My Components</span>
      <button class="add-component-btn">+</button>
    </h3>
    <div class="components-grid user-grid">
      <!-- User-definierte mit Mini-Preview -->
    </div>
  </section>
</div>
```

### 5. Drag & Drop

```typescript
interface DragPayload {
  type: 'layout' | 'basic' | 'user'
  name: string
  template: string
  properties?: string
  children?: string[]
}

// Beim Drop wird DSL generiert:
function generateDropCode(payload: DragPayload, position: DropPosition): string {
  let code = payload.name

  if (payload.properties) {
    code += ' ' + payload.properties
  }

  if (payload.children?.length) {
    code += '\n' + payload.children.map(c => '  ' + c).join('\n')
  }

  return code
}
```

## Styling

```css
.components-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.components-search {
  padding: 8px;
  border-bottom: 1px solid #333;
}

.components-section {
  padding: 8px;
}

.components-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  margin-bottom: 8px;
}

.components-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* Layout items - größer für bessere Illustration */
.components-grid.layout-grid {
  grid-template-columns: repeat(2, 1fr);
}

.component-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  background: #1a1a23;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.15s;
}

.component-item:hover {
  border-color: #3B82F6;
  background: #1e1e2a;
}

.component-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.component-item svg {
  width: 32px;
  height: 32px;
  margin-bottom: 4px;
  color: #71717a;
}

.component-item:hover svg {
  color: #3B82F6;
}

.component-item-name {
  font-size: 11px;
  color: #a1a1aa;
  text-align: center;
}

/* User components mit Mini-Preview */
.component-item.user-component {
  position: relative;
}

.component-item.user-component::before {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #3B82F6;
  border-radius: 50%;
}
```

## Quick-Add Shortcuts

Keyboard Shortcuts für schnelles Hinzufügen:

| Shortcut | Aktion |
|----------|--------|
| `B` | Box (vertical) einfügen |
| `H` | Horizontal Box einfügen |
| `T` | Text einfügen |
| `I` | Input einfügen |
| `Shift+B` | Button einfügen |

## Nächste Schritte

1. **Phase 1**: Layout-Icons als SVG erstellen
2. **Phase 2**: MiniPreviewRenderer implementieren
3. **Phase 3**: Panel-Komponente mit Kategorien
4. **Phase 4**: Verbesserte Drag & Drop Integration
5. **Phase 5**: Keyboard Shortcuts
