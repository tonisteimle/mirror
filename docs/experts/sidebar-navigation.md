# Sidebar Navigation Spezifikation

> Deterministische Code-Generierung für Sidebar-Navigation

## Taxonomie

Eine vollständige Sidebar-Navigation hat viele Dimensionen. Unser Schema trennt diese sauber:

### Dimensionen

| Dimension | Optionen | MVP | Phase 2 |
|-----------|----------|-----|---------|
| **Rolle** | global, lokal, explorer, filter, inspector | global ✅ | |
| **Layout** | left/right, width, resizable | left, 240px ✅ | |
| **Visibility** | permanent, collapsible, overlay, drawer | permanent ✅ | collapsible ✅ |
| **Structure** | flat, grouped, tree, accordion | flat ✅ | grouped ✅ |
| **Item Style** | text, icon+text, icon-only, badges, meta, actions | icon+text ✅ | badges ✅ |
| **Interaction** | hover, click, pin, search, keyboard | hover, click ✅ | |

### Visibility / Öffnungszustand

| Variante | Beschreibung | Status |
|----------|--------------|--------|
| Permanent | Klassische Sidebar, immer sichtbar | ✅ MVP |
| Collapsible | expanded ↔ collapsed/rail | ✅ Phase 2 |
| Drawer | Temporär, öffnet bei Bedarf | 🔲 Phase 3 |
| Overlay | Liegt über dem Content | 🔲 Phase 3 |
| Push | Schiebt Content zur Seite | 🔲 Phase 3 |

### Breite / Dichte

| Variante | Beschreibung | Status |
|----------|--------------|--------|
| Breit mit Labels | Icons + Text (240px) | ✅ MVP |
| Rail | Nur Icons (64px) | ✅ Phase 2 |
| Mini-Variant | Schmal default, bei Hover erweitert | 🔲 Future |
| Resizierbar | User kann Breite ziehen | 🔲 Future |

### Inhaltsstruktur

| Variante | Beschreibung | Status |
|----------|--------------|--------|
| Flat | 1 Ebene, alle Items gleichwertig | ✅ MVP |
| Grouped | Sektionen mit Überschriften | ✅ Phase 2 |
| Tree | Mehrere Ebenen, hierarchisch | 🔲 Phase 3 |
| Accordion | Nur ein Bereich gleichzeitig offen | 🔲 Future |

### Darstellungsform der Einträge

| Variante | Beschreibung | Status |
|----------|--------------|--------|
| Icon + Text | Standard-Darstellung | ✅ MVP |
| Icon-only | Für Rail-Mode | ✅ Phase 2 |
| Text-only | Ohne Icons | 🔲 Future |
| Mit Badges | Zähler, Status-Indikatoren | ✅ Phase 2 |
| Mit Meta-Infos | Letzte Aktivität, Zustand | 🔲 Future |
| Mit Quick Actions | Menü, Plus, Pin, Favorit | 🔲 Future |

### Interaktion / Verhalten

| Variante | Beschreibung | Status |
|----------|--------------|--------|
| Click-to-activate | Item wird aktiv bei Klick | ✅ MVP |
| Hover-State | Visuelles Feedback | ✅ MVP |
| Click-to-expand | Für Tree/Accordion | 🔲 Phase 3 |
| Hover-to-peek | Zeigt Labels bei Rail | 🔲 Future |
| Keyboard-first | Pfeiltasten, Shortcuts | 🔲 Future |
| Searchable | Filter/Command Palette | 🔲 Future |

### Navigationsrolle

| Rolle | Beschreibung | Status |
|-------|--------------|--------|
| Global | Hauptbereiche der App | ✅ MVP |
| Bereichs-/Sekundär | Innerhalb eines Moduls | 🔲 Phase 3 |
| Explorer | Dateien, Seiten, Entities | 🔲 Phase 3 |
| Filter/Facetten | Seitliche Filter | 🔲 Future |
| Property/Inspector | Keine Navigation, aber seitlich | 🔲 Anderer Expert |

### Häufige Muster

| Pattern | Dimensionen | Status |
|---------|-------------|--------|
| **Classic Sidebar** | permanent, flat, icon+text | ✅ MVP |
| **Navigation Rail** | permanent, flat, icon-only | ✅ Phase 2 |
| **Mini Sidebar** | collapsible, flat, hover-expand | ✅ Phase 2 |
| **Drawer Sidebar** | drawer, flat, icon+text | 🔲 Phase 3 |
| **Tree Sidebar** | permanent, tree, icon+text | 🔲 Phase 3 |
| **Two-level Sidebar** | permanent, grouped, icon+text | ✅ Phase 2 |

---

## Überblick

Die Sidebar Navigation ist der erste vollständig implementierte Experte im LLM-Generation-System. Das LLM liefert nur die **Items** (Icon + Label), der Builder generiert deterministisch korrekten Mirror-Code.

```
User: "Navigation für Projektmanagement-App"
           ↓
    LLM (JSON-Output)
           ↓
    { items: [...] }
           ↓
    Builder (deterministisch)
           ↓
    Mirror Code (garantiert korrekt)
```

## Feature Status

| Feature | Status |
|---------|--------|
| Permanente Visibility | ✅ |
| Feste Breite | ✅ |
| Flache Liste (1 Ebene) | ✅ |
| Icon + Text Items | ✅ |
| Hover State | ✅ |
| Active State | ✅ |
| **Badges** | ✅ Phase 2 |
| **Gruppierte Sektionen** | ✅ Phase 2 |
| **Collapsible/Rail-Mode** | ✅ Phase 2 |
| Hierarchie/Tree | 🔲 |

## Generierter Code

### MVP: Einfache Navigation

```mirror
$bg: #18181B
$hover: #3F3F46
$active: #3F3F46
$text: #D4D4D8
$muted: #71717A

NavItem:
  hor, ver-center, gap 12, pad 8 16, rad 4
  Icon "", col $muted
  Label "", col $text
  hover
    bg $hover
  state active
    bg $active

Nav 240, ver, gap 4, pad 8, bg $bg
  NavItem Icon "layout-dashboard"; Label "Dashboard", active
  NavItem Icon "folder"; Label "Projekte"
  NavItem Icon "check-square"; Label "Aufgaben"
  NavItem Icon "users"; Label "Team"
  NavItem Icon "settings"; Label "Einstellungen"
```

### Phase 2: Mit Badges

```mirror
$bg: #18181B
$hover: #3F3F46
$active: #3F3F46
$text: #D4D4D8
$muted: #71717A
$badge-bg: #27272A

NavItem:
  hor, ver-center, gap 12, pad 8 16, rad 4
  Icon "", col $muted
  Label "", col $text, width full
  Badge "", hidden
    hor, center, minw 20, h 18, rad 999, bg $badge-bg, col $text, fs 11
  hover
    bg $hover
  state active
    bg $active

Nav 240, ver, gap 4, pad 8, bg $bg
  NavItem Icon "inbox"; Label "Inbox"; Badge "12", visible, active
  NavItem Icon "send"; Label "Sent"
  NavItem Icon "file-edit"; Label "Drafts"; Badge "3", visible
  NavItem Icon "trash"; Label "Trash"
```

### Phase 2: Gruppierte Struktur

```mirror
$bg: #18181B
$hover: #3F3F46
$active: #3F3F46
$text: #D4D4D8
$muted: #71717A

NavSection:
  Label "", col $muted, fs 11, uppercase, pad 8 16

NavItem:
  hor, ver-center, gap 12, pad 8 16, rad 4
  Icon "", col $muted
  Label "", col $text
  hover
    bg $hover
  state active
    bg $active

Nav 240, ver, gap 4, pad 8, bg $bg
  NavSection Label "Main"
  NavItem Icon "home"; Label "Dashboard", active
  NavItem Icon "bar-chart"; Label "Analytics"
  NavSection Label "Content"
  NavItem Icon "file-text"; Label "Pages"
  NavItem Icon "image"; Label "Media"
  NavSection Label "System"
  NavItem Icon "settings"; Label "Settings"
```

### Phase 2: Collapsible/Rail Mode

```mirror
$bg: #18181B
$hover: #3F3F46
$active: #3F3F46
$text: #D4D4D8
$muted: #71717A

ToggleNav:
  hor, right, width full, pad 8 16 8 8, cursor pointer
  Icon named Arrow, "chevron-left", col $muted, is 18
  state expanded
    Arrow "chevron-left"
  state collapsed
    Arrow "chevron-right"
  onclick toggle-state MainNav

NavItem:
  hor, ver-center, gap 12, pad 8 16, rad 4
  Icon "", col $muted
  Label "", col $text
  hover
    bg $hover
  state active
    bg $active

MainNav 240, ver, gap 4, pad 8, bg $bg, expanded
  state expanded
    width 240
  state collapsed
    width 64
    NavItem Label hidden
  ToggleNav expanded
  NavItem Icon "home"; Label "Dashboard", active
  NavItem Icon "folder"; Label "Projects"
  NavItem Icon "star"; Label "Favorites"
  NavItem Icon "settings"; Label "Settings"
```

**Wichtige Konzepte:**

1. **State-Aktivierung auf Instanzen**: `ToggleNav expanded` setzt den initialen State
2. **Named Children**: `Icon named Arrow` ermöglicht State-Overrides für das Icon
3. **Icon-Swap**: `Arrow "chevron-left"` / `Arrow "chevron-right"` in den States

### Struktur

```
Nav (Container)
  ├── ToggleNav (nur bei collapsible)
  │     ├── Icon named Arrow (für Icon-Swap in States)
  │     ├── state expanded (Arrow "chevron-left")
  │     └── state collapsed (Arrow "chevron-right")
  ├── NavSection (nur bei grouped)
  │     └── Label (Slot)
  └── NavItem (Definition mit Slots)
        ├── Icon (Slot)
        ├── Label (Slot)
        ├── Badge (Slot, nur bei badges)
        ├── hover (System State)
        └── state active (Behavior State)
```

## Schema

### Input Format

Das LLM liefert JSON in verschiedenen Formaten:

#### Flat (Standard)
```typescript
interface SidebarNavigationInput {
  items: Array<{
    icon: string;      // Lucide icon name
    label: string;     // Display text
    active?: boolean;  // Initial active state
    badge?: number | string;  // Phase 2: Badge content
  }>;
  visibility?: 'permanent' | 'collapsible';  // Phase 2
  container?: {
    width?: number;      // Default: 240
    railWidth?: number;  // Phase 2: Default: 64
    background?: string;
    padding?: string;
    gap?: string;
  };
}
```

#### Grouped (Phase 2)
```typescript
interface SidebarNavigationInput {
  structure?: 'grouped';
  groups: Array<{
    label: string;
    items: Array<{
      icon: string;
      label: string;
      active?: boolean;
      badge?: number | string;
    }>;
  }>;
  visibility?: 'permanent' | 'collapsible';
  container?: ContainerConfig;
}
```

### Beispiel LLM Responses

**Einfache Navigation:**
```json
{
  "items": [
    { "icon": "layout-dashboard", "label": "Dashboard", "active": true },
    { "icon": "folder", "label": "Projekte" },
    { "icon": "settings", "label": "Einstellungen" }
  ]
}
```

**Mit Badges:**
```json
{
  "items": [
    { "icon": "inbox", "label": "Posteingang", "badge": 12, "active": true },
    { "icon": "send", "label": "Gesendet" },
    { "icon": "file-edit", "label": "Entwürfe", "badge": 3 }
  ]
}
```

**Gruppiert:**
```json
{
  "structure": "grouped",
  "groups": [
    {
      "label": "Übersicht",
      "items": [
        { "icon": "layout-dashboard", "label": "Dashboard", "active": true },
        { "icon": "bar-chart", "label": "Analytics" }
      ]
    },
    {
      "label": "System",
      "items": [
        { "icon": "settings", "label": "Einstellungen" }
      ]
    }
  ]
}
```

**Collapsible:**
```json
{
  "visibility": "collapsible",
  "items": [
    { "icon": "home", "label": "Start", "active": true },
    { "icon": "folder", "label": "Projekte" }
  ]
}
```

**Kombiniert (alle Features):**
```json
{
  "visibility": "collapsible",
  "groups": [
    {
      "label": "Messages",
      "items": [
        { "icon": "inbox", "label": "Inbox", "badge": 5, "active": true },
        { "icon": "send", "label": "Sent" }
      ]
    },
    {
      "label": "System",
      "items": [
        { "icon": "settings", "label": "Settings" }
      ]
    }
  ]
}
```

## Design Defaults

Alle Styling-Entscheidungen sind fix - das LLM hat keinen Einfluss darauf.

### Farben (Semantische Rollen)

| Rolle | Hex | Verwendung |
|-------|-----|------------|
| `surface` | #18181B | Nav Hintergrund |
| `elevated` | #27272A | Badge Hintergrund |
| `hover` | #3F3F46 | Hover State |
| `active` | #3F3F46 | Active State |
| `default` | #D4D4D8 | Label Text |
| `muted` | #71717A | Icon Farbe, Section Label |

### Spacing

| Rolle | Wert | Verwendung |
|-------|------|------------|
| `xs` | 4px | Nav gap |
| `sm` | 8px | Nav padding, Item padding-vertical |
| `smd` | 12px | Icon-Label gap |
| `md` | 16px | Item padding-horizontal |

### Weitere Defaults

| Property | Wert |
|----------|------|
| Nav Breite | 240px |
| Rail Breite | 64px |
| Icon Größe | 20px |
| Border Radius | 4px |
| Badge Radius | 999 (pill) |

## LLM Prompt

Der Prompt ist pattern-basiert:

### Patterns

| Pattern | Beschreibung | Anwendung |
|---------|--------------|-----------|
| SIMPLE_APP | 3-6 gleichwertige Bereiche | Einstellungen, Tools, Portfolio |
| ADMIN_DASHBOARD | >8 Bereiche, gruppierbar | Admin-Panel, CRM |
| EMAIL_CLIENT | Mit Badges für Zähler | E-Mail, Chat, Notifications |
| COMPACT_TOOL | 2-4 Items | Notiz-App, Timer |
| COLLAPSIBLE_NAV | Platzsparend | Code-Editor, komplexe Apps |

### Icon-Katalog

Häufig verwendete Lucide Icons:

```
Navigation: home, layout-dashboard, menu, arrow-left
Inhalte: file, folder, image, book
Personen: user, users, contact
Aktionen: plus, edit, trash, save, download
Kommunikation: mail, message-square, bell, inbox, send
Daten: bar-chart, pie-chart, database
Einstellungen: settings, sliders, lock
Status: check, x, alert-circle, info
```

## Dateien

```
src/services/generation/
├── index.ts                           # Public API
├── design-defaults.ts                 # Semantische Rollen → Werte
├── schemas/
│   └── sidebar-navigation.ts          # Zod Schema + Defaults
├── builders/
│   └── sidebar-navigation.ts          # Schema → Mirror Code
├── prompts/
│   └── sidebar-navigation.ts          # LLM Prompt
└── experts/
    └── sidebar-navigation.ts          # Kombiniert alles
```

## Usage

### Mit LLM

```typescript
import { generateSidebarNavigation } from './services/generation';

const result = await generateSidebarNavigation(
  "Navigation für Projektmanagement-App",
  llmCall
);

console.log(result.code);  // Mirror Code
```

### Ohne LLM (direktes Schema)

```typescript
import { generateSidebarNavigationFromSchema } from './services/generation';

// Einfach
const result = generateSidebarNavigationFromSchema({
  items: [
    { icon: 'home', label: 'Dashboard', active: true },
    { icon: 'settings', label: 'Settings' }
  ]
});

// Mit Badges
const emailNav = generateSidebarNavigationFromSchema({
  items: [
    { icon: 'inbox', label: 'Inbox', badge: 12, active: true },
    { icon: 'send', label: 'Sent' }
  ]
});

// Gruppiert
const adminNav = generateSidebarNavigationFromSchema({
  groups: [
    { label: 'Main', items: [{ icon: 'home', label: 'Home' }] },
    { label: 'System', items: [{ icon: 'settings', label: 'Settings' }] }
  ]
});

// Collapsible
const compactNav = generateSidebarNavigationFromSchema({
  visibility: 'collapsible',
  items: [{ icon: 'home', label: 'Home' }]
});
```

## Geplante Erweiterungen

### Phase 3: Tree + Drawer

**Neue Dimensionen:**
- Visibility: `drawer`, `overlay`
- Structure: `tree` (hierarchisch)
- Interaction: `click-to-expand`

**Schema-Erweiterung:**
```json
{
  "visibility": "drawer",
  "structure": "tree",
  "items": [
    {
      "icon": "folder",
      "label": "Projekte",
      "children": [
        { "icon": "file", "label": "Website Redesign" },
        { "icon": "file", "label": "Mobile App" }
      ]
    }
  ]
}
```

### Future: Advanced Features

- **Resizable**: User kann Breite ziehen
- **Keyboard-first**: Pfeiltasten, Shortcuts
- **Searchable**: Integrierte Suche/Filter
- **Quick Actions**: Kontextmenüs pro Item
- **Meta-Infos**: Zeitstempel, Status-Indikatoren

## Tests

31 Tests in der Hauptdatei:

- `src/__tests__/generation/sidebar-navigation.test.ts` - Builder Tests
- `src/__tests__/generation/sidebar-expert.test.ts` - Expert Tests

```bash
npm test -- sidebar-navigation
```
