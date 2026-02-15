# Mirror DSL - Compact Reference

> Mirror is a DSL for rapid UI prototyping. This reference is optimized for AI comprehension.

## Core Syntax

```
ComponentName property value property value "text content"
```

**Indentation:** 2 spaces = child relationship
**Comments:** `// comment` or `Component "text" // inline`
**Strings:** Double quotes `"Hello World"`
**Numbers:** Default px, use `%` for percent: `w 50%`

## Dimension Shorthand

First 1-2 numbers after component = width [height]:
```
Box 300 400 pad 16    → w 300 h 400 pad 16
Card 200 pad 8        → w 200 pad 8
```

## Colors

```
bg #3B82F6            // Background (always)
col #FFFFFF           // Text color (always)
boc #333              // Border color
#RRGGBBAA             // With alpha: #3B82F680
```

## Tokens (Variables)

```
$primary: #3B82F6
$spacing: 16
Button bg $primary pad $spacing
```

**Type suffixes** auto-infer property:
- `-col/-color` → background: `$blue-col`
- `-size` → font-size: `$heading-size`
- `-pad/-spacing` → padding: `$card-pad`
- `-rad/-radius` → border-radius: `$btn-rad`
- `-gap` → gap: `$grid-gap`
- `-bor/-border` → border-width
- `-boc` → border-color

## Component References

```
Card: rad 16 pad 20 bg #2A2A3E
Button rad Card.rad bg Card.bg    // Reference Card's properties
```

## Layout Properties

| Property | Description |
|----------|-------------|
| `hor` | Horizontal (row) |
| `ver` | Vertical (column) - default |
| `gap 16` | Space between children |
| `between` | Space-between distribution |
| `wrap` | Allow wrapping |
| `grow`/`fill` | Flex grow |
| `shrink 0` | Prevent shrinking |
| `stacked` | Stack children (z-layers) |

## Alignment

| Property | Description |
|----------|-------------|
| `hor-l` | Align left |
| `hor-cen` | Center horizontal |
| `hor-r` | Align right |
| `ver-t` | Align top |
| `ver-cen` | Center vertical |
| `ver-b` | Align bottom |
| `cen` | Center both axes |

## Sizing

| Property | Description | Example |
|----------|-------------|---------|
| `w`/`h` | Width/Height | `w 200`, `h 100`, `w full`, `h 50%` |
| `minw`/`maxw` | Min/Max width | `minw 100`, `maxw 500` |
| `minh`/`maxh` | Min/Max height | `minh 50`, `maxh 300` |
| `full` | 100% both | `Container full` |

## Spacing

```
pad 16              // All sides
pad 16 12           // Vertical Horizontal
pad 16 12 8 4       // Top Right Bottom Left
pad l 16            // Left only (l/r/u/d)
pad l-r 16          // Left and right
pad u-d 16          // Up and down
mar 16              // Margin (same syntax)
```

## Border

```
bor 1               // 1px solid
bor 1 #333          // 1px solid #333
bor 2 dashed #3B82F6
bor l 1 #333        // Left only
bor l-r 2 dashed    // Left and right
rad 8               // Border radius
rad 8 8 0 0         // Per-corner
```

## Typography

| Property | Description | Example |
|----------|-------------|---------|
| `size` | Font size (px) | `size 14` |
| `weight` | Font weight | `weight 600`, `weight bold` |
| `line` | Line height | `line 1.5` |
| `font` | Font family | `font "Inter"` |
| `align` | Text align | `align center` |
| `italic` | Italic style | `italic` |
| `underline` | Underlined | `underline` |
| `uppercase`/`lowercase` | Text transform | |
| `truncate` | Ellipsis overflow | `truncate` |

## Inline Spans

Format parts within strings:
```
"This is *important*:bold and *emphasized*:italic"
"Click *here*:underline"
"A *warning*:$customToken in text"
```
Built-in: `:bold`, `:italic`, `:underline`
Custom: `:$tokenName` with token defining style properties

## Icons (Lucide)

```
Box icon "search"
Icon icon "user" size 20
```
All icons: lucide.dev/icons

## Visuals

| Property | Description | Example |
|----------|-------------|---------|
| `opacity`/`opa` | Transparency 0-1 | `opa 0.5` |
| `shadow` | Box shadow | `shadow sm`/`md`/`lg` |
| `cursor` | Cursor style | `cursor pointer` |
| `z` | Z-index | `z 100` |
| `hidden` | Start hidden | `hidden` |
| `visible` | Visibility | `visible true/false` |
| `disabled` | Disabled state | `disabled` |

## Scroll

| Property | Description |
|----------|-------------|
| `scroll`/`scroll-ver` | Vertical scroll |
| `scroll-hor` | Horizontal scroll |
| `scroll-both` | Both directions |
| `snap` | Scroll snap |
| `clip` | Overflow hidden |

## Grid

```
grid 3              // 3 equal columns
grid 2 gap 16       // With gap
grid auto 250       // Auto-fill, min 250px
grid 30% 70%        // Percentage columns
```

## HTML Primitives

| Primitive | String becomes | Example |
|-----------|---------------|---------|
| `Image` | `src` | `Image "photo.jpg" 200 150 fit cover` |
| `Input` | `placeholder` | `Input "Email..." type email` |
| `Textarea` | `placeholder` | `Textarea "Message..." rows 5` |
| `Link` | `href` | `Link "https://..." "Label"` |
| `Button` | label | `Button "Submit"` |

**Named primitives:**
```
Image Avatar: 48 48 rad 24 fit cover
Input Email: "Enter email" type email
```

## Component Definition

```
// Define (not rendered)
Button: pad 12 bg #3B82F6 rad 8

// Use
Button "Click me"
```

## Inheritance

```
Button: pad 12 bg #3B82F6 rad 8
DangerButton from Button: bg #EF4444
GhostButton from Button: bg transparent bor 1 boc #3B82F6
```

## Slots (Named Children)

```
Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title: size 18 weight 600
  Description: size 14 col #9CA3AF
  Actions: hor gap 8

// Usage - inline
Card Title "Welcome" Description "Get started"

// Usage - expanded
Card
  Title "Welcome"
  Description "Get started"
  Actions
    Button "Learn more"
```

## Flat Access

Access nested elements directly by name:
```
Header: hor between
  Left: hor gap 16
    Logo: w 120 h 32
    Nav: hor gap 8
  Right:
    Avatar: 36 36 rad 18

Header
  Logo bg #FF0000      // Modifies Logo inside Left
  Avatar bg #3B82F6    // Modifies Avatar inside Right
```

## List Items (New Instances)

Use `-` to create new instances:
```
Menu: ver w 200
  Item: pad 8 12

Menu
  - Item "Profile"
  - Item "Settings"
  - Item col #EF4444 "Logout"
```

## States

```
Toggle: w 52 h 28 rad 14
  state off
    bg #333
  state on
    bg #3B82F6
  Knob: 24 24 rad 12 bg white
```

**System states** (automatic): `hover`, `focus`, `active`, `disabled`

## Hover Shorthand

```
Button hover-bg #3B82F6 hover-col #FFF hover-scale 1.05
Card hover-opacity 0.8
```

Properties: `hover-col`, `hover-bg`, `hover-boc`, `hover-bor`, `hover-rad`, `hover-opacity`, `hover-scale`

## Events

| Event | Description |
|-------|-------------|
| `onclick` | Click |
| `onhover` | Hover |
| `onchange` | Value changed |
| `oninput` | While typing |
| `onfocus` | Focus gained |
| `onblur` | Focus lost |
| `onkeydown`/`onkeyup` | Keyboard |
| `onload` | Component loaded |

## Actions

| Action | Syntax | Example |
|--------|--------|---------|
| `toggle` | `toggle` | `onclick toggle` |
| `open` | `open Name [pos] [anim] [ms]` | `onclick open Dialog center fade 200` |
| `close` | `close [Name] [anim] [ms]` | `onclick close` |
| `show` | `show Name` | `onclick show Tooltip` |
| `hide` | `hide Name` | `onclick hide Panel` |
| `change` | `change self to state` | `onclick change self to active` |
| `page` | `page Name` | `onclick page Dashboard` |
| `assign` | `assign $var to expr` | `onclick assign $count to $count + 1` |

**Animations:** `fade`, `scale`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `none`
**Positions:** `below`, `above`, `left`, `right`, `center`

## Continuous Animations

```
Box icon "loader"
  animate spin 1000     // Spinning loader

Box 8 8 rad 4 bg #3B82F6
  animate pulse 800     // Pulsing dot
```

Types: `spin`, `pulse`, `bounce`

## Show/Hide Animations

```
Panel hidden
  show fade slide-up 300
  hide fade 150
  "Content"
```

## Conditionals

**Block:**
```
if $isLoggedIn
  Avatar
else
  Button "Login"
```

**Property:**
```
Button if $active then bg #3B82F6 else bg #333
Badge if $count > 0 then #10B981 else #666
```

## Operators

| Type | Operators |
|------|-----------|
| Comparison | `==`, `!=`, `>`, `<`, `>=`, `<=` |
| Logical | `and`, `or`, `not` |
| Arithmetic | `+`, `-`, `*`, `/` |

## Iterators

```
$tasks: [{ title: "Task 1", done: true }, { title: "Task 2", done: false }]

each $task in $tasks
  Card
    Text $task.title
    Icon if $task.done then "check" else "circle"
```

## Named Instances

```
Input Email: placeholder "Email" type email
Input Password: placeholder "Password" type password

LoginForm ver gap 16
  Email
  Password
  Button onclick if Email.value page Dashboard "Submit"
```

## Component Properties

```
Email.value           // Read input value
Submit.disabled = true // Write property (in events)
Panel.visible = false  // Toggle visibility
```

| Component | Properties |
|-----------|------------|
| All | `.visible`, `.disabled`, `.opacity`, `.col` |
| Input/Textarea | `.value`, `.placeholder`, `.focus` |
| Button | `.label`, `.loading` |
| Checkbox/Switch | `.checked` |
| Dialog/Overlay | `.open`, `.close` |
| Text/Label | `.text` |
| Image | `.src`, `.alt` |

## $event Object

```
Input onchange assign $text to $event.value
Checkbox onchange assign $active to $event.checked
```

## Centralized Events Block

```
// Components
Input Email: placeholder "Email"
Button Submit: bg #3B82F6 "Login"

// Layout
LoginForm ver gap 16
  Email
  Submit

// Behavior
events
  Email onchange
    Error.visible = false

  Submit onclick
    if Email.value
      Submit.label = "Sending..."
      page Dashboard
    else
      Error.visible = true
```

## Library Components

Use `as` syntax for named instances:
```
SettingsDialog as Dialog:
  Content: pad 24
    "Dialog content"

Button onclick open SettingsDialog "Open"
```

### Available Components

| Category | Components |
|----------|------------|
| Overlays | Dropdown, Dialog, Tooltip, Popover, ContextMenu, HoverCard, AlertDialog |
| Navigation | Tabs, Accordion, Collapsible |
| Form | FormField, Select, Checkbox, Switch, Slider, RadioGroup |
| Feedback | Toast, Progress |
| Display | Avatar |

### Component Slots & States

| Component | Slots | States |
|-----------|-------|--------|
| Tabs | Tabs, Tab, TabContent | inactive, active |
| Accordion | AccordionItem, Trigger, Content | collapsed, expanded |
| Collapsible | Trigger, Content | collapsed, expanded |
| Dropdown | Trigger, Content, Item, Separator | closed, open |
| Dialog | Trigger, Content | closed, open |
| AlertDialog | Trigger, Content, Title, Description, Cancel, Action | closed, open |
| Select | Trigger, Options, Option | selected, unselected |
| Tooltip | Trigger, Content | - |
| Popover | Trigger, Content | closed, open |
| HoverCard | Trigger, Content | - |
| ContextMenu | Trigger, Content, Item, Separator | - |
| FormField | Label, Field, Hint, Error | - |
| Checkbox | Indicator, Label | unchecked, checked |
| Switch | Track, Thumb | off, on |
| Slider | Track, Range, Thumb | props: min, max, value, step |
| RadioGroup | Item, Indicator, Label | unselected, selected |
| Progress | Track, Indicator | props: value, max |
| Toast | Title, Description, Action, Close | - |
| Avatar | Image, Fallback | - |

---

## Known Limitations

**Event handler placement:** Event handlers must be placed BEFORE deeply nested children. Handlers placed after nested children may not attach correctly.
```
// ❌ Won't work
Header:
  Title:
    Icon:
  onclick toggle       // Won't attach

// ✅ Works
Header:
  onclick toggle       // Place before children
  Title:
    Icon:
```

**Cursor values:** Only single-word cursor values work. Hyphenated values like `not-allowed` are split by the lexer.
```
// ❌ Won't work
Button cursor not-allowed

// ✅ Works
Button cursor pointer
Button disabled         // Use disabled instead
```

---

## Quick Reference Card

```
LAYOUT      hor ver gap between wrap grid stacked
ALIGN       hor-l hor-cen hor-r ver-t ver-cen ver-b cen
SPACING     pad mar (+ l r u d l-r u-d)
SIZE        w h minw maxw minh maxh full grow fill shrink
SHORTHAND   Box 300 400 → w 300 h 400
COLOR       col (text) bg (background) boc (border)
BORDER      bor [dir] [w] [style] [col] | rad
TYPE        size weight line font align italic underline uppercase lowercase truncate
INLINE      *text*:bold *text*:italic *text*:underline *text*:$token
VISUAL      opacity shadow cursor z hidden visible disabled
SCROLL      scroll scroll-hor scroll-both snap clip
HOVER       hover-col hover-bg hover-boc hover-bor hover-rad hover-opacity hover-scale

TOKENS      $name: value
REFERENCE   Component.prop
DEFINE      Name: props
INHERIT     Name from Parent: props
INSTANCE    Type named Name: props
LIBRARY     Name as Component:

STATE       state name
EVENTS      onclick onchange oninput onfocus onblur onkeydown onkeyup onload
ACTIONS     toggle | open X [pos] [anim] [ms] | close | show X | hide X | page X | assign $var to expr
ANIMATIONS  fade scale slide-up slide-down slide-left slide-right spin pulse bounce
POSITIONS   below above left right center

CONDITION   if $cond ... else
CONDPROP    if $x then prop val else prop val
ITERATOR    each $x in $list
OPERATORS   == != > < >= <= | and or not | + - * /
```
