# Sidebar Navigation Builder

Schema-driven generator for sidebar navigation components.

## Overview

The Sidebar Navigation Builder transforms a JSON schema into Mirror DSL code. It supports:

- **Visibility modes**: permanent, collapsible (rail), drawer (mobile)
- **Structure modes**: flat, grouped (sections), tree (hierarchical)
- **Display modes**: icon-text, icon-only, text-only
- **Features**: badges, active states, hover effects

## Quick Start

```typescript
import { buildSidebarNavigation } from './services/generation/builders/sidebar-navigation';

const result = buildSidebarNavigation({
  items: [
    { icon: 'home', label: 'Dashboard', active: true },
    { icon: 'users', label: 'Users' },
    { icon: 'settings', label: 'Settings' }
  ]
});
```

## Schema Reference

### Root Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `visibility` | `'permanent' \| 'collapsible' \| 'drawer'` | `'permanent'` | How the nav is shown/hidden |
| `structure` | `'flat' \| 'grouped' \| 'tree'` | Inferred | Item organization |
| `items` | `NavItem[]` | - | Flat list of items |
| `groups` | `NavGroup[]` | - | Grouped sections |
| `tree` | `TreeItem[]` | - | Hierarchical items |
| `container` | `ContainerConfig` | See below | Container styling |
| `itemStyle` | `ItemStyleConfig` | See below | Item styling |
| `iconStyle` | `IconStyleConfig` | See below | Icon styling |

### NavItem

```typescript
{
  icon: string;      // Lucide icon name
  label: string;     // Display text
  active?: boolean;  // Currently selected
  badge?: number | string;  // Counter/status
}
```

### NavGroup (for grouped structure)

```typescript
{
  label: string;     // Section header
  items: NavItem[];  // Items in this group
}
```

### TreeItem (for tree structure)

```typescript
{
  icon: string;
  label: string;
  expanded?: boolean;   // Show children
  active?: boolean;
  children?: TreeItem[];
}
```

### ContainerConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `width` | `number` | `240` | Nav width in px |
| `railWidth` | `number` | `64` | Width when collapsed |
| `background` | `BackgroundRole` | `'surface'` | Background color |
| `padding` | `SpacingRole` | `'sm'` | Container padding |
| `gap` | `SpacingRole` | `'xs'` | Gap between items |

### ItemStyleConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `display` | `'icon-text' \| 'icon-only' \| 'text-only'` | `'icon-text'` | What to show |
| `paddingVertical` | `SpacingRole` | `'sm'` | Vertical padding |
| `paddingHorizontal` | `SpacingRole` | `'md'` | Horizontal padding |
| `gap` | `SpacingRole` | `'smd'` | Icon-label gap |
| `radius` | `RadiusRole` | `'sm'` | Corner radius |
| `background` | `BackgroundRole` | `'transparent'` | Default background |
| `hoverBackground` | `BackgroundRole` | `'hover'` | Hover background |
| `activeBackground` | `BackgroundRole` | `'active'` | Active background |
| `color` | `ForegroundRole` | `'default'` | Text color |
| `activeColor` | `ForegroundRole` | `'default'` | Active text color |

### IconStyleConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `size` | `number` | `20` | Icon size in px |
| `color` | `ForegroundRole` | `'muted'` | Icon color |

### Semantic Roles

**SpacingRole**: `'xs' | 'sm' | 'smd' | 'md' | 'lg' | 'xl'`
- xs: 4px, sm: 8px, smd: 12px, md: 16px, lg: 20px, xl: 24px

**BackgroundRole**: `'app' | 'surface' | 'elevated' | 'hover' | 'active' | 'transparent'`

**ForegroundRole**: `'default' | 'muted' | 'heading'`

**RadiusRole**: `'none' | 'sm' | 'md' | 'lg'`

## Examples

### Simple App Navigation

```typescript
{
  items: [
    { icon: 'home', label: 'Dashboard', active: true },
    { icon: 'folder', label: 'Projects' },
    { icon: 'users', label: 'Team' },
    { icon: 'settings', label: 'Settings' }
  ]
}
```

### Admin Dashboard (Grouped)

```typescript
{
  groups: [
    {
      label: 'Main',
      items: [
        { icon: 'home', label: 'Dashboard', active: true },
        { icon: 'bar-chart', label: 'Analytics' }
      ]
    },
    {
      label: 'Management',
      items: [
        { icon: 'users', label: 'Users' },
        { icon: 'shield', label: 'Roles' }
      ]
    }
  ]
}
```

### Email Client (with Badges)

```typescript
{
  items: [
    { icon: 'inbox', label: 'Inbox', active: true, badge: 12 },
    { icon: 'send', label: 'Sent' },
    { icon: 'file', label: 'Drafts', badge: 3 },
    { icon: 'trash', label: 'Trash' }
  ]
}
```

### Collapsible Navigation

```typescript
{
  visibility: 'collapsible',
  items: [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'search', label: 'Search' },
    { icon: 'bell', label: 'Notifications' }
  ]
}
```

### File Explorer (Tree)

```typescript
{
  tree: [
    {
      icon: 'folder',
      label: 'src',
      expanded: true,
      children: [
        { icon: 'file', label: 'index.ts', active: true },
        {
          icon: 'folder',
          label: 'components',
          children: [
            { icon: 'file', label: 'Button.tsx' },
            { icon: 'file', label: 'Card.tsx' }
          ]
        }
      ]
    }
  ]
}
```

### Mobile Drawer

```typescript
{
  visibility: 'drawer',
  items: [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'user', label: 'Profile' },
    { icon: 'settings', label: 'Settings' }
  ]
}
```

### Icon-Only (Rail Mode)

```typescript
{
  itemStyle: { display: 'icon-only' },
  container: { width: 64 },
  items: [
    { icon: 'home', label: 'Home', active: true },
    { icon: 'search', label: 'Search' },
    { icon: 'bell', label: 'Notifications' }
  ]
}
```

## Generated Code Structure

### Flat Navigation

```mirror
$bg: #18181B
$hover: #3F3F46
$active: #3F3F46
$text: #D4D4D8
$muted: #71717A

NavItem:
  hor, ver-center, gap 12, pad 8 16, rad 4
  Icon "", minw 20, col $muted
  Label "", col $text, truncate
  hover
    bg $hover
  state active
    bg $active

Nav 240, ver, gap 4, pad 8, bg $bg
  NavItem active, Icon "home"; Label "Dashboard"
  NavItem Icon "users"; Label "Users"
  NavItem Icon "settings"; Label "Settings"
```

### Collapsible Navigation

```mirror
ToggleNav:
  hor, right, width full, pad 8 16 8 8, cursor pointer
  Icon named Arrow, "chevron-left", col $muted, is 18
  state expanded
    Arrow "chevron-left"
  state collapsed
    Arrow "chevron-right"
  onclick toggle-state MainNav

NavItem:
  ...

Nav named MainNav, 240, ver, gap 4, pad 8, bg $bg, clip, expanded
  state expanded
    width 240
  state collapsed
    width 64
  ToggleNav expanded
  NavItem active, Icon "home"; Label "Dashboard"
  ...
```

### Tree Structure

```mirror
TreeItem:
  ver
  TreeHeader hor, ver-center, gap 12, pad 8 16, rad 4, cursor pointer
    Chevron Icon "chevron-right", is 14, col $muted
    Icon "", col $muted
    Label "", col $text
    hover
      bg $hover
    state active
      bg $active
    state expanded
      Chevron rot 90
  TreeChildren ver, pad-left 16, hidden
    state expanded
      visible
  onclick toggle-state

TreeLeaf:
  hor, ver-center, gap 12, pad 8 16, pad-left 30, rad 4, cursor pointer
  Icon "", col $muted
  Label "", col $text
  hover
    bg $hover
  state active
    bg $active

Nav 240, ver, gap 4, pad 8, bg $bg
  TreeItem expanded, TreeHeader Icon "folder"; Label "src"
    TreeChildren
      TreeLeaf active, Icon "file"; Label "index.ts"
```

### Drawer (Mobile)

```mirror
DrawerBackdrop:
  position fixed, inset 0, bg #00000080, z 100, hidden
  show fade 150
  hide fade 100
  onclick hide DrawerNav, hide self

MenuButton:
  Icon "menu", pad 8, col $text, cursor pointer
  onclick show DrawerNav, show DrawerBackdrop

DrawerNav:
  position fixed, left 0, top 0, bottom 0, width 240, bg $bg, shadow lg, z 101, hidden
  show slide-right 200
  hide slide-left 150

NavItem:
  ...

DrawerNav
  NavItem active, Icon "home"; Label "Home"
  NavItem Icon "settings"; Label "Settings"

DrawerBackdrop
MenuButton
```

## LLM Integration (Expert System)

The Sidebar Navigation Builder is integrated into the LLM pipeline as an "Expert". When a user prompt matches sidebar navigation patterns, the Expert system handles generation instead of the regular pipeline.

### How It Works

```
User: "Navigation für eine App mit Dashboard, Users, Settings"
                    |
            detectExpert()
                    |
      Pattern Match: "sidebar-navigation" (high confidence)
                    |
            LLM generates JSON:
            {
              "items": [
                { "icon": "layout-dashboard", "label": "Dashboard", "active": true },
                { "icon": "users", "label": "Users" },
                { "icon": "settings", "label": "Settings" }
              ]
            }
                    |
            Zod Validation
                    |
      buildSidebarNavigation(json) -> Mirror Code
```

### Benefits

1. **Reduced LLM complexity**: LLM only fills in options, no syntax generation
2. **Guaranteed validity**: Zod validates JSON before building
3. **Deterministic output**: Builder produces consistent, error-free code
4. **Faster generation**: Smaller prompt, simpler task for LLM

### Pattern Detection

The expert detects these patterns (German and English):

- `sidebar`, `seitenleiste`
- `navigation`, `nav`
- `menu`, `menue`
- Combinations with `items`, `icons`, `labels`

```typescript
import { detectExpert } from './services/generation/experts';

detectExpert("Sidebar Navigation mit Icons")
// -> { expert: "sidebar-navigation", confidence: "high" }

detectExpert("Ein blauer Button")
// -> { expert: "none", confidence: "high" }
```

### Using the Expert Directly

```typescript
import { tryExpertPipeline } from './services/generation/experts';

const result = await tryExpertPipeline(
  "Navigation fuer App mit Home, Settings, Profile",
  { minConfidence: 'medium' }
);

if (result) {
  console.log(result.code);  // Mirror DSL code
  console.log(result.expert); // "sidebar-navigation"
}
```

### Integration with JSON Pipeline

The expert is automatically called in `translateWithJsonPipeline()`:

```typescript
// Automatically tries expert first
const result = await translateWithJsonPipeline(
  prompt, tokensCode, componentsCode, layoutCode, cursorLine,
  { skipExpertCheck: false }  // default
);

// Skip expert (use regular pipeline)
const result = await translateWithJsonPipeline(
  prompt, tokensCode, componentsCode, layoutCode, cursorLine,
  { skipExpertCheck: true }
);
```

## API

### buildSidebarNavigation(input)

Builds Mirror code from input schema.

```typescript
function buildSidebarNavigation(input: SidebarNavigationInput): string
```

### validateSidebarNavigation(input)

Validates input without building.

```typescript
function validateSidebarNavigation(input: unknown): {
  success: boolean;
  error?: string;
  data?: SidebarNavigation;
}
```

### parseSidebarNavigation(input)

Parses and applies defaults.

```typescript
function parseSidebarNavigation(input: unknown): SidebarNavigation
```

### detectExpert(prompt)

Detects if a prompt should use an expert.

```typescript
function detectExpert(prompt: string): {
  expert: 'sidebar-navigation' | 'form' | 'tabs' | 'none';
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}
```

### tryExpertPipeline(prompt, options?)

Runs expert pipeline if pattern matches.

```typescript
function tryExpertPipeline(
  prompt: string,
  options?: { minConfidence?: 'high' | 'medium' | 'low'; debug?: boolean }
): Promise<ExpertResult | null>
```

## Files

- `src/services/generation/schemas/sidebar-navigation.ts` - Zod schemas
- `src/services/generation/builders/sidebar-navigation.ts` - Builder functions
- `src/services/generation/experts/index.ts` - Expert detection & pipeline
- `src/services/json-pipeline/index.ts` - Pipeline integration
- `src/__tests__/generation/sidebar-navigation.test.ts` - 50 builder tests
- `src/__tests__/generation/experts.test.ts` - 10 expert tests
