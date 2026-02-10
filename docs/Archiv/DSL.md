# <>mirror DSL Reference

Complete reference for the <>mirror Domain-Specific Language.

## Philosophy

Ultra-efficient UI design:
- **Interpreter**: Code executes directly, no build step
- **Everything is a component**: Every element can have properties, children, be reused
- **Hierarchy through indentation**: Nesting = 2 spaces
- **Tailwind-like but readable**: `pad` not `padding`, `bg` not `background`, `col` not `color`
- **Inline first, separate later**: Prototype fast, then extract with "Clean"
- **Override allowed**: Any component can be customized on use

## Two Tabs

- **Components Tab**: Define styled, reusable components (with `:`)
- **Layout Tab**: Use components, add content (no styling)

## Basic Syntax

```
ComponentName: property1 value1 property2 value2 "content"
  ChildComponent: childProp value
```

- Component names start with uppercase letter
- Properties follow the name
- Children are indented with 2 spaces
- Strings use double quotes: `"text"`
- Colors use hex: `#3B82F6`

## Component Definition

**Only definitions with `:` create reusable templates:**

```
// Creates a reusable template
Button: pad 12 bg #3B82F6 rad 8 col #FFF

// Can be reused anywhere
Button "Click me"
Button "Submit"
```

## Properties Reference

### Layout Direction

| Property | Description |
|----------|-------------|
| `hor` | Horizontal layout (flexbox row) |
| `ver` | Vertical layout (flexbox column) |

### Alignment (Absolute)

These work the same regardless of `hor` or `ver`:

| Property | Description |
|----------|-------------|
| `hor-l` | Align left |
| `hor-cen` | Center horizontally |
| `hor-r` | Align right |
| `ver-t` | Align top |
| `ver-cen` | Center vertically |
| `ver-b` | Align bottom |

### Spacing

| Property | Example | Description |
|----------|---------|-------------|
| `gap` | `gap 16` | Gap between children |
| `pad` | `pad 16` | Padding all sides |
| `pad` | `pad 16 12` | Padding vertical, horizontal |
| `pad` | `pad 16 12 8 4` | Padding top, right, bottom, left |
| `pad` | `pad l r 16` | Padding specific sides (l, r, u, d) |
| `mar` | `mar 8` | Margin (same syntax as pad) |

### Sizing

| Property | Example | Description |
|----------|---------|-------------|
| `w` | `w 200` | Width in pixels |
| `h` | `h 48` | Height in pixels |
| `full` | `full` | 100% width and height |
| `grow` | `grow` | Flex grow (fill available space) |
| `minw` | `minw 100` | Min width |
| `maxw` | `maxw 500` | Max width |
| `minh` | `minh 50` | Min height |
| `maxh` | `maxh 300` | Max height |

### Colors

| Property | Example | Description |
|----------|---------|-------------|
| `bg` | `bg #1A1A1A` | Background color |
| `col` | `col #FFFFFF` | Text color |

### Border

| Property | Example | Description |
|----------|---------|-------------|
| `bor` | `bor 2` | Border width (all sides) |
| `bor` | `bor l 1` | Border specific side |
| `boc` | `boc #333` | Border color |
| `rad` | `rad 8` | Border radius |

### Typography

| Property | Example | Description |
|----------|---------|-------------|
| `size` | `size 14` | Font size in pixels |
| `weight` | `weight 600` | Font weight |
| `font` | `font "Inter"` | Font family |

### Other

| Property | Example | Description |
|----------|---------|-------------|
| `between` | `between` | Space between (justify-content) |
| `wrap` | `wrap` | Flex wrap |
| `icon` | `icon "search"` | Lucide icon name |

### Hover States

| Property | Example | Description |
|----------|---------|-------------|
| `hover-bg` | `hover-bg #333` | Background on hover |
| `hover-col` | `hover-col #FFF` | Text color on hover |
| `hover-boc` | `hover-boc #555` | Border color on hover |
| `hover-bor` | `hover-bor 2` | Border width on hover |
| `hover-rad` | `hover-rad 12` | Border radius on hover |

## Component Inheritance

Use `from` to derive components:

```
Button: pad 12 bg #3B82F6 rad 8 col #FFF
DangerButton: from Button bg #EF4444
GhostButton: from Button bg transparent col #3B82F6
```

## Components with Children

Define components with child slots:

```
Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title size 18 weight 600 col #FFF
  Description size 14 col #9CA3AF
```

Use inline:
```
Card Title "Welcome" Description "Get started"
```

Or expanded:
```
Card
  Title "Welcome"
  Description "Get started"
```

### Instance Children Replace Template Children

When you provide children to an instance, they replace the template children:

```
Card: ver gap 8
  Header "Default Header"
  Body "Default Body"

// Uses template children
Card

// Replaces children
Card
  Header "Custom Header"
  Body "Custom Body"
```

## Examples

### Button Component

```
// Components
Button: hor hor-cen ver-cen h 40 pad l r 16 rad 8 bg #3B82F6 col #FFF size 14 weight 500

// Layout
Button "Click me"
```

### Card with Slots

```
// Components
Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title size 18 weight 600 col #FFF
  Description size 14 col #9CA3AF
  Actions hor gap 8

// Layout
Card
  Title "Welcome"
  Description "Get started with mirror"
  Actions
    Button "Start"
    Button "Learn more"
```

### Full Page Layout

```
// Components
Page: ver full bg #0c0c0c

Header: hor between ver-cen h 56 pad l r 24 bg #1a1a1a
  Logo size 20 weight 700 col #FFF
  Nav hor gap 16

Content: ver grow pad 32 gap 24

Footer: hor hor-cen ver-cen h 48 bg #121212 col #666 size 12

// Layout
Page
  Header
    Logo "MyApp"
    Nav
      Button "Home"
      Button "About"
  Content
    Card Title "Dashboard" Description "Overview of your data"
  Footer "© 2024 MyApp"
```
