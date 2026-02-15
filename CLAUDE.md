# Mirror DSL Reference

> Mirror is a DSL for rapid UI prototyping. This reference is optimized for AI comprehension.

## Property Names

Mirror supports both **long-form** (readable) and **shorthand** property names. **Prefer long forms** for clarity:

| Long Form | Shorthand | Description |
|-----------|-----------|-------------|
| `padding` | `pad` | Inner spacing |
| `margin` | `mar` | Outer spacing |
| `background` | `bg` | Background color |
| `color` | `col` | Text color |
| `border` | `bor` | Border width/style |
| `radius` | `rad` | Border radius |
| `horizontal` | `hor` | Horizontal layout |
| `vertical` | `ver` | Vertical layout |
| `width` | `w` | Element width |
| `height` | `h` | Element height |
| `border-color` | `boc` | Border color |
| `opacity` | `opa` | Transparency |

Both forms are fully supported. The editor auto-expands shortcuts to long forms.

## Syntax Grammar

```
LINE        ::= Component [dims] [props] ["text"]
DEFINE      ::= Name: [props]                     -- Definition only, no render
INHERIT     ::= Name from Parent: [props]         -- Inheritance
PRIMITIVE   ::= Keyword Name: [props]             -- Input Email: "placeholder"
CHILD       ::= 2-space indent                    -- Hierarchy via indentation
LIST_ITEM   ::= - Component [props]               -- New instance (not modify)
NAMED       ::= - Component named Name [props]    -- Named instance for referencing

dims        ::= N [N]                             -- Box 300 400 → w 300 h 400
props       ::= (prop value)* | token*
token       ::= $name[-suffix]                    -- $primary-col → infers col
```

## Core Rules

```
1. First usage defines, subsequent inherit       Button #F00 "A"  Button "B" ← inherits #F00
2. Colon = define only, no render               Button: padding 12   ← not visible
3. No colon = render                            Button "Click"   ← visible
4. 2-space indent = child                       Parent\n  Child
5. - prefix = new instance                      - Item "New"     ← creates, not modifies
6. Flat access to nested slots                  Header\n  Logo background #F00  ← finds Logo anywhere
7. color = text color, background = bg (always) Button background #00F color #FFF
8. Dimension shorthand: first numbers = w h     Card 200 150 padding 16 → width 200 height 150
9. Component property references                Button radius Card.radius background Card.background
10. Text content is LAST on line                Button background #F00 "Click"  ← text at end
11. Use named instances for event targeting     Button named Btn1 "Click"  ← can reference Btn1
```

## Common Pitfalls

```
// ❌ WRONG: Text on separate line
Button background #F00
  "Click me"

// ✅ CORRECT: Text inline at end
Button background #F00 "Click me"

// ❌ WRONG: Semicolon chaining actions
Button onclick show A; hide B

// ✅ CORRECT: Use events block for multiple actions
events
  Button onclick
    show A
    hide B

// ❌ WRONG: Referencing unnamed instances
- Button "Save"
- Button "Cancel"
events
  Button[0] onclick    // Can't reference by index

// ✅ CORRECT: Name instances you need to reference
- Button named SaveBtn "Save"
- Button named CancelBtn "Cancel"
events
  SaveBtn onclick
    show SuccessMsg
  CancelBtn onclick
    hide Form

// ❌ WRONG: Missing behavior state definitions
Item onhover highlight self      // highlight won't show visually

// ✅ CORRECT: Define states that actions will activate
Item: padding 12 cursor pointer
  state default
    background transparent
  state highlighted
    background #333
  onhover highlight self

// ❌ WRONG: Event handlers AFTER deeply nested children
Accordion: vertical
  Item:
    Header: horizontal
      Title:
        Icon:
    onclick toggle-state         // Won't attach to Header!

// ✅ CORRECT: Event handlers BEFORE nested children
Accordion: vertical
  Item:
    Header: horizontal
      onclick toggle-state       // Attaches correctly
      Title:
        Icon:

// ❌ WRONG: Hyphenated cursor values
Button cursor not-allowed        // Lexer splits this incorrectly

// ✅ CORRECT: Use single-word cursor values
Button cursor pointer
Button cursor move
Button cursor grab
Button disabled                  // Use disabled property instead
```

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
Box 300 400 padding 16    → width 300 height 400 padding 16
Card 200 padding 8        → width 200 padding 8
```

## Colors

```
background #3B82F6    // Background (always)
color #FFFFFF         // Text color (always)
border-color #333     // Border color
#RRGGBBAA             // With alpha: #3B82F680
```

## Tokens (Variables)

```
$primary: #3B82F6
$spacing: 16
Button background $primary padding $spacing
```

**Type suffixes** auto-infer property:
- `-color` → background: `$blue-color`
- `-size` → font-size: `$heading-size`
- `-padding/-spacing` → padding: `$card-padding`
- `-radius` → border-radius: `$btn-radius`
- `-gap` → gap: `$grid-gap`
- `-border` → border-width
- `-border-color` → border-color

## Component References

```
Card: radius 16 padding 20 background #2A2A3E
Button radius Card.radius background Card.background    // Reference Card's properties
```

## Layout Properties

| Property | Shorthand | Description |
|----------|-----------|-------------|
| `horizontal` | `hor` | Horizontal (row) |
| `vertical` | `ver` | Vertical (column) - default |
| `gap 16` | | Space between children |
| `between` | | Space-between distribution |
| `wrap` | | Allow wrapping |
| `grow`/`fill` | | Flex grow |
| `shrink 0` | | Prevent shrinking |
| `stacked` | | Stack children (z-layers) |

## Alignment

| Property | Shorthand | Description |
|----------|-----------|-------------|
| `horizontal-left` | `hor-l` | Align left |
| `horizontal-center` | `hor-cen` | Center horizontal |
| `horizontal-right` | `hor-r` | Align right |
| `vertical-top` | `ver-t` | Align top |
| `vertical-center` | `ver-cen` | Center vertical |
| `vertical-bottom` | `ver-b` | Align bottom |
| `center` | `cen` | Center both axes |

## Sizing

| Property | Shorthand | Description | Example |
|----------|-----------|-------------|---------|
| `width`/`height` | `w`/`h` | Width/Height | `width 200`, `height 100`, `width full` |
| `min-width`/`max-width` | `minw`/`maxw` | Min/Max width | `min-width 100`, `max-width 500` |
| `min-height`/`max-height` | `minh`/`maxh` | Min/Max height | `min-height 50`, `max-height 300` |
| `full` | | 100% both | `Container full` |

## Spacing

```
padding 16              // All sides
padding 16 12           // Vertical Horizontal
padding 16 12 8 4       // Top Right Bottom Left
padding left 16         // Left only (left/right/top/bottom)
padding left-right 16   // Left and right
padding top-bottom 16   // Top and bottom
margin 16               // Margin (same syntax)
```

Direction shortcuts: `l`=left, `r`=right, `t`/`u`=top, `b`/`d`=bottom

## Border

```
border 1               // 1px solid
border 1 #333          // 1px solid #333
border 2 dashed #3B82F6
border left 1 #333     // Left only
border left-right 2 dashed    // Left and right
radius 8               // Border radius
radius 8 8 0 0         // Per-corner
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

| Property | Shorthand | Description | Example |
|----------|-----------|-------------|---------|
| `opacity` | `opa` | Transparency 0-1 | `opacity 0.5` |
| `shadow` | | Box shadow | `shadow sm`/`md`/`lg` |
| `cursor` | | Cursor style | `cursor pointer` |
| `z` | | Z-index | `z 100` |
| `hidden` | | Start hidden | `hidden` |
| `visible` | | Visibility | `visible true/false` |
| `disabled` | | Disabled state | `disabled` |

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
Image Avatar: 48 48 radius 24 fit cover
Input Email: "Enter email" type email
```

## Component Definition

```
// Define (not rendered)
Button: padding 12 background #3B82F6 radius 8

// Use
Button "Click me"
```

## Inheritance

```
Button: padding 12 background #3B82F6 radius 8
DangerButton from Button: background #EF4444
GhostButton from Button: background transparent border 1 border-color #3B82F6
```

## Slots (Named Children)

```
Card: vertical padding 16 background #1E1E1E radius 12 gap 8
  Title: size 18 weight 600
  Description: size 14 color #9CA3AF
  Actions: horizontal gap 8

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
Header: horizontal between
  Left: horizontal gap 16
    Logo: width 120 height 32
    Nav: horizontal gap 8
  Right:
    Avatar: 36 36 radius 18

Header
  Logo background #FF0000      // Modifies Logo inside Left
  Avatar background #3B82F6    // Modifies Avatar inside Right
```

## List Items (New Instances)

Use `-` to create new instances:
```
Menu: vertical width 200
  Item: padding 8 12

Menu
  - Item "Profile"
  - Item "Settings"
  - Item color #EF4444 "Logout"
```

## States

```
Toggle: width 52 height 28 radius 14
  state off
    background #333
  state on
    background #3B82F6
  Knob: 24 24 radius 12 background white
```

**System states** (automatic): `hover`, `focus`, `active`, `disabled`

**Behavior states** (activated by actions):
```
Item: padding 12
  state default
    background transparent
  state highlighted
    background #333
  state selected
    background #3B82F6

// Activated via: onhover highlight self
```

Common behavior states: `highlighted`, `selected`, `active`, `inactive`, `expanded`, `collapsed`, `valid`, `invalid`

## Hover Shorthand

```
Button hover-background #3B82F6 hover-color #FFF hover-scale 1.05
Card hover-opacity 0.8
```

Properties: `hover-color`, `hover-background`, `hover-border-color`, `hover-border`, `hover-radius`, `hover-opacity`, `hover-scale`

## Events

| Event | Description |
|-------|-------------|
| `onclick` | Click |
| `onclick-outside` | Click outside element |
| `onhover` | Hover |
| `onchange` | Value changed |
| `oninput` | While typing |
| `onfocus` | Focus gained |
| `onblur` | Focus lost |
| `onkeydown KEY` | Key pressed |
| `onkeyup KEY` | Key released |
| `onload` | Component loaded |

**Key modifiers** for `onkeydown`/`onkeyup`:
```
onkeydown escape close self
onkeydown enter select highlighted
onkeydown arrow-down highlight next
onkeydown arrow-up highlight prev
```

Available keys: `escape`, `enter`, `tab`, `space`, `arrow-up`, `arrow-down`, `arrow-left`, `arrow-right`, `backspace`, `delete`, `home`, `end`

**Timing modifiers** for debouncing/delaying:
```
oninput debounce 300 filter Results     // Wait 300ms after last input
onblur delay 200 hide Results           // Hide after 200ms delay
onkeydown escape debounce 100 close     // Combine with key modifier
```

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
| `highlight` | `highlight target` | `onhover highlight self` |
| `select` | `select target` | `onclick select self` |
| `deselect` | `deselect target` | `onclick deselect self` |
| `clear-selection` | `clear-selection` | `onclick clear-selection` |
| `filter` | `filter Container` | `oninput filter Dropdown` |
| `focus` | `focus target` | `onfill focus next` |
| `activate` | `activate target` | `onclick activate self` |
| `deactivate` | `deactivate target` | `onclick deactivate self` |
| `deactivate-siblings` | `deactivate-siblings` | `onclick deactivate-siblings` |
| `toggle-state` | `toggle-state` | `onclick toggle-state` |
| `validate` | `validate target` | `onclick validate Form` |
| `reset` | `reset target` | `onclick reset Form` |

**Animations:** `fade`, `scale`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `none`
**Positions:** `below`, `above`, `left`, `right`, `center`
**Targets:** `self`, `next`, `prev`, `first`, `last`, `highlighted`, `selected`

### Multiple Actions

**Single action** - inline is fine:
```
Button onclick toggle "Toggle"
Button onclick show Panel "Show"
```

**Multiple actions (inline)** - use comma chaining:
```
onclick select self, close Dropdown
onclick highlight self, show Preview
```

**Multiple actions (complex)** - use events block:
```
// DON'T: No semicolon chaining (not supported)
// Button onclick show A; hide B; assign $x to 1   ← WRONG

// DO: Use events block for complex behavior
Panel: padding 16 background #1E1E2E radius 8

Content named Content1: "First content"
Content named Content2: hidden "Second content"

Nav horizontal gap 8
  - Button named Btn1 "Show First"
  - Button named Btn2 "Show Second"

events
  Btn1 onclick
    show Content1
    hide Content2
    change self to active

  Btn2 onclick
    show Content2
    hide Content1
    change self to active
```

## Continuous Animations

```
Box icon "loader"
  animate spin 1000     // Spinning loader

Box 8 8 radius 4 background #3B82F6
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

There are **three ways** to create named/referenceable components:

### 1. Named Primitives (Input, Image, Button, etc.)
```
Input Email: "Enter email" type email
Input Password: "Password" type password
Image Avatar: 48 48 radius 24 fit cover
```
The primitive keyword comes first, then the name, then colon.

### 2. Named Custom Components (using `named`)
```
Panel: padding 16 background #1E1E2E radius 8

Panel named Dashboard:
  "Dashboard content"

Panel named Settings:
  "Settings content"
```
Use `named` between component and name to create a referenceable instance.

### 3. Inheritance (using `from`)
```
Panel: padding 16 background #1E1E2E radius 8

DashboardPanel from Panel:
  "Dashboard content"

SettingsPanel from Panel:
  background #2A2A3E  // override background
  "Settings content"
```
Creates a new component type that inherits from parent.

### Usage Example
```
Input Email: "Email" type email
Input Password: "Password" type password

LoginForm vertical gap 16
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
| All | `.visible`, `.disabled`, `.opacity`, `.color` |
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
Button Submit: background #3B82F6 "Login"

// Layout
LoginForm vertical gap 16
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

---

## Doc Mode

Doc Mode provides a specialized syntax for writing documentation with formatted text and live code examples.

### Components

- `text` – Formatted text blocks
- `playground` – Live code examples with preview
- `doc` – Container wrapper for documentation pages

### Multiline Strings

Use single quotes for multiline content:
```
text
  '$h2 Welcome

   $p This paragraph spans multiple lines.'
```

### Block Tokens

Block tokens start a line and style all following text:
```
# Heading 1           // Markdown-style headings
## Heading 2
### Heading 3
#### Heading 4

$p                     // Paragraph (legacy token syntax)
$lead                  // Lead paragraph
$subtitle              // Subtitle
$label                 // Small uppercase label
$li                    // List item
```

### Inline Formatting

Inline formatting uses markdown-style syntax:
```
**bold**              // Bold text
_italic_              // Italic text
`code`                // Inline code
[text](url)           // Hyperlink
```

### Example

```
doc
  text
    '# Documentation

     $p Welcome to **Mirror**. Visit [our site](https://example.com).'

  playground
    'Button background #2271c1 padding 12 24 radius 8 "Click me"'
```

---

## Quick Reference Card

```
LAYOUT      horizontal vertical gap between wrap grid stacked
ALIGN       horizontal-left horizontal-center horizontal-right vertical-top vertical-center vertical-bottom center
SPACING     padding margin (+ left right top bottom left-right top-bottom)
SIZE        width height min-width max-width min-height max-height full grow fill shrink
SHORTHAND   Box 300 400 → width 300 height 400
COLOR       color (text) background (bg) border-color (border)
BORDER      border [dir] [width] [style] [color] | radius
TYPE        size weight line font align italic underline uppercase lowercase truncate
INLINE      *text*:bold *text*:italic *text*:underline *text*:$token
VISUAL      opacity shadow cursor z hidden visible disabled
SCROLL      scroll scroll-horizontal scroll-both snap clip
HOVER       hover-color hover-background hover-border-color hover-border hover-radius hover-opacity hover-scale

TOKENS      $name: value | $name-suffix: value (auto-infer)
REFERENCE   Component.prop
DEFINE      Name: props                              // definition only
INHERIT     Name from Parent: props                  // inheritance
PRIMITIVE   Input Name: props                        // named primitive
NAMED       Component named Name: props              // named instance

STATE       state name | system: hover focus active disabled
BEHAVIOR    highlighted selected active inactive expanded collapsed valid invalid

EVENTS      onclick onclick-outside onhover onfocus onblur onchange oninput onload
KEYBOARD    onkeydown KEY | onkeyup KEY
KEYS        escape enter tab space arrow-up arrow-down arrow-left arrow-right backspace delete home end
TIMING      debounce N | delay N

ACTIONS     toggle | open X [pos] [anim] [ms] | close | show X | hide X | page X | assign $var to expr
SELECTION   highlight X | select X | deselect X | clear-selection | filter X | focus X
ACTIVATION  activate X | deactivate X | deactivate-siblings | toggle-state
FORM        validate X | reset X
TARGETS     self next prev first last highlighted selected self-and-before all none

MULTI-ACT   Comma chain: onclick select self, close X
            Complex: Use events block (no semicolon chaining)

ANIMATIONS  fade scale slide-up slide-down slide-left slide-right spin pulse bounce
POSITIONS   below above left right center

CONDITION   if $cond ... else
CONDPROP    if $x then prop val else prop val
ITERATOR    each $x in $list
OPERATORS   == != > < >= <= | and or not | + - * /

DOC-MODE    text | playground | doc
DOC-STRING  '...' (multiline with single quotes)
DOC-BLOCK   # ## ### #### (markdown headings) | $p $lead $subtitle $label $li (legacy)
DOC-INLINE  **bold** | _italic_ | `code` | [text](url)

SHORTCUTS   pad→padding mar→margin bg→background col→color rad→radius bor→border
            hor→horizontal ver→vertical w→width h→height opa→opacity
```
