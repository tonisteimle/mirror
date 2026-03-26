# Mirror DSL Properties

> **Auto-generated** aus `src/schema/dsl.ts` – nicht manuell editieren!

## Übersicht

- [Sizing](#sizing)
- [Layout](#layout)
- [Spacing](#spacing)
- [Color](#color)
- [Border](#border)
- [Typography](#typography)
- [Position](#position)
- [Transform](#transform)
- [Effect](#effect)

---

## Sizing

### width (`w`)

Element width

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `full` | Fill available space in flex container | `flex: 1 1 0%`, `min-width: 0`, `align-self: stretch` |
| `hug` | Fit content (fit-content) | `width: fit-content` |
| `<number>` | Fixed width in pixels | `width: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box w full
Box w hug
Box w 200
```

### height (`h`)

Element height

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `full` | Fill available space in flex container | `flex: 1 1 0%`, `min-height: 0`, `align-self: stretch` |
| `hug` | Fit content (fit-content) | `height: fit-content` |
| `<number>` | Fixed height in pixels | `height: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box h full
Box h hug
Box h 200
```

### size

Width and height (square) or font-size for text

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `full` | Fill available space | `flex: 1 1 0%`, `min-width: 0`, `min-height: 0`, `align-self: stretch` |
| `hug` | Fit content | `width: fit-content`, `height: fit-content` |
| `<number>` | Square size in pixels (or font-size for text) | `size: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box size full
Box size hug
Box size 100
```

### min-width (`minw`)

Minimum width

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Minimum width in pixels | `min-width: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box minw 100
```

### max-width (`maxw`)

Maximum width

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Maximum width in pixels | `max-width: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box maxw 500
```

### min-height (`minh`)

Minimum height

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Minimum height in pixels | `min-height: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box minh 50
```

### max-height (`maxh`)

Maximum height

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Maximum height in pixels | `max-height: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box maxh 300
```

### aspect

Aspect ratio

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `square` | 1:1 aspect ratio | `aspect-ratio: 1` |
| `video` | 16:9 aspect ratio | `aspect-ratio: 16/9` |
| `<number>` | Custom aspect ratio (e.g., 16/9) | `aspect: N` |

**Beispiele:**
```mirror
Box aspect square
Box aspect video
Box aspect 4/3
```

## Layout

### horizontal (`hor`)

Horizontal layout (flex-direction: row)

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Children arranged horizontally | `display: flex`, `flex-direction: row` |

**Beispiele:**
```mirror
Box hor
```

### vertical (`ver`)

Vertical layout (flex-direction: column)

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Children arranged vertically (default for frame) | `display: flex`, `flex-direction: column` |

**Beispiele:**
```mirror
Box ver
```

### gap (`g`)

Gap between children

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Gap in pixels | `gap: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box gap 16
```

### center (`cen`)

Center children horizontally and vertically

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Center children on both axes | `display: flex`, `justify-content: center`, `align-items: center` |

**Beispiele:**
```mirror
Box center
```

### spread

Spread children with space between

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Space-between distribution | `display: flex`, `justify-content: space-between` |

**Beispiele:**
```mirror
Box spread
```

### top-left (`tl`)

Align children to top-left

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to top-left corner | `display: flex`, `flex-direction: column`, `justify-content: flex-start`, `align-items: flex-start` |

**Beispiele:**
```mirror
Box top-left
```

### top-center (`tc`)

Align children to top-center

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to top-center | `display: flex`, `flex-direction: column`, `justify-content: flex-start`, `align-items: center` |

**Beispiele:**
```mirror
Box top-center
```

### top-right (`tr`)

Align children to top-right

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to top-right corner | `display: flex`, `flex-direction: column`, `justify-content: flex-start`, `align-items: flex-end` |

**Beispiele:**
```mirror
Box top-right
```

### center-left (`cl`)

Align children to center-left

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to center-left | `display: flex`, `flex-direction: column`, `justify-content: center`, `align-items: flex-start` |

**Beispiele:**
```mirror
Box center-left
```

### center-right (`cr`)

Align children to center-right

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to center-right | `display: flex`, `flex-direction: column`, `justify-content: center`, `align-items: flex-end` |

**Beispiele:**
```mirror
Box center-right
```

### bottom-left (`bl`)

Align children to bottom-left

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to bottom-left corner | `display: flex`, `flex-direction: column`, `justify-content: flex-end`, `align-items: flex-start` |

**Beispiele:**
```mirror
Box bottom-left
```

### bottom-center (`bc`)

Align children to bottom-center

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to bottom-center | `display: flex`, `flex-direction: column`, `justify-content: flex-end`, `align-items: center` |

**Beispiele:**
```mirror
Box bottom-center
```

### bottom-right (`br`)

Align children to bottom-right

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Align to bottom-right corner | `display: flex`, `flex-direction: column`, `justify-content: flex-end`, `align-items: flex-end` |

**Beispiele:**
```mirror
Box bottom-right
```

### wrap

Allow flex items to wrap

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Enable flex wrapping | `flex-wrap: wrap` |

**Beispiele:**
```mirror
Box wrap
```

### pos (`positioned`)

Positioned container - children are automatically absolute and can use x/y

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Children can be positioned with x/y coordinates | `position: relative` |

**Beispiele:**
```mirror
Box pos w 400 h 300
```

### stacked

Stack children on top of each other (z-layers for overlays, badges)

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Children stacked on z-axis | `position: relative` |

**Beispiele:**
```mirror
Box stacked size 48
```

### grid

CSS Grid layout

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `auto` | Auto-fill grid with minmax | `display: grid`, `grid-template-columns: repeat(auto-fill, minmax(250px, 1fr))` |
| `<number>` | Number of equal columns | `grid: N` |

**Beispiele:**
```mirror
Box grid auto 250
Box grid 3
```

### grow

Flex grow

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Allow element to grow | `flex-grow: 1` |

**Beispiele:**
```mirror
Box grow
```

### shrink

Flex shrink

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Allow element to shrink | `flex-shrink: 1` |

**Beispiele:**
```mirror
Box shrink
```

### align

Alignment of children

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `top` | Align to top | `justify-content: flex-start` |
| `bottom` | Align to bottom | `justify-content: flex-end` |
| `left` | Align to left | `align-items: flex-start` |
| `right` | Align to right | `align-items: flex-end` |
| `center` | Align to center | `justify-content: center`, `align-items: center` |

### left

Align children to left

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Left alignment | `display: flex`, `flex-direction: column`, `align-items: flex-start` |

**Beispiele:**
```mirror
Box left
```

### right

Align children to right

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Right alignment | `display: flex`, `flex-direction: column`, `align-items: flex-end` |

**Beispiele:**
```mirror
Box right
```

### top

Align children to top

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Top alignment | `display: flex`, `flex-direction: column`, `justify-content: flex-start` |

**Beispiele:**
```mirror
Box top
```

### bottom

Align children to bottom

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Bottom alignment | `display: flex`, `flex-direction: column`, `justify-content: flex-end` |

**Beispiele:**
```mirror
Box bottom
```

### hor-center

Center children horizontally

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Horizontal center alignment | `display: flex`, `flex-direction: column`, `align-items: center` |

**Beispiele:**
```mirror
Box hor-center
```

### ver-center

Center children vertically

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Vertical center alignment | `display: flex`, `flex-direction: column`, `justify-content: center` |

**Beispiele:**
```mirror
Box ver-center
```

## Spacing

### padding (`pad`, `p`)

Inner spacing

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Padding in pixels (all sides) | `padding: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box pad 16
```

### margin (`m`)

Outer spacing

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Margin in pixels (all sides) | `margin: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box margin 16
```

## Color

### background (`bg`)

Background color

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<color>` | Hex color or token | `background: <color>` |
| `$token` | Design Token | *(Token-Wert)* |

### color (`col`, `c`)

Text color

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<color>` | Hex color or token | `color: <color>` |
| `$token` | Design Token | *(Token-Wert)* |

### border-color (`boc`)

Border color

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<color>` | Hex color or token | `border-color: <color>` |
| `$token` | Design Token | *(Token-Wert)* |

## Border

### border (`bor`)

Border (width, style, color)

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Border width in pixels | `border: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box bor 1 #333
```

### radius (`rad`)

Border radius

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Radius in pixels | `radius: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Box rad 8
```

## Typography

### font-size (`fs`)

Font size

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Font size in pixels | `font-size: Npx` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Text fs 16
```

### weight

Font weight

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `thin` | Font weight 100 | `font-weight: 100` |
| `light` | Font weight 300 | `font-weight: 300` |
| `normal` | Font weight 400 | `font-weight: 400` |
| `medium` | Font weight 500 | `font-weight: 500` |
| `semibold` | Font weight 600 | `font-weight: 600` |
| `bold` | Font weight 700 | `font-weight: 700` |
| `black` | Font weight 900 | `font-weight: 900` |
| `<number>` | Font weight (100-900) | `weight: N` |

**Beispiele:**
```mirror
Text weight 600
```

### line

Line height

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Line height (unitless or pixels) | `line: N` |
| `$token` | Design Token | *(Token-Wert)* |

**Beispiele:**
```mirror
Text line 1.5
```

### font

Font family

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `sans` | Sans-serif font stack | `font-family: system-ui, sans-serif` |
| `serif` | Serif font stack | `font-family: Georgia, serif` |
| `mono` | Monospace font stack | `font-family: ui-monospace, monospace` |
| `roboto` | Roboto font | `font-family: Roboto, system-ui, sans-serif` |
| `$token` | Design Token | *(Token-Wert)* |

### text-align

Text alignment

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `left` | Left align | `text-align: left` |
| `center` | Center align | `text-align: center` |
| `right` | Right align | `text-align: right` |
| `justify` | Justify text | `text-align: justify` |

### italic

Italic text

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Apply italic style | `font-style: italic` |

**Beispiele:**
```mirror
Text italic
```

### underline

Underlined text

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Apply underline | `text-decoration: underline` |

**Beispiele:**
```mirror
Text underline
```

### uppercase

Uppercase text

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Transform to uppercase | `text-transform: uppercase` |

**Beispiele:**
```mirror
Text uppercase
```

### lowercase

Lowercase text

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Transform to lowercase | `text-transform: lowercase` |

**Beispiele:**
```mirror
Text lowercase
```

### truncate

Truncate text with ellipsis

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Truncate overflowing text | `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` |

**Beispiele:**
```mirror
Text truncate
```

## Position

### x

X position (left) - sets position: absolute

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | X position in pixels | `x: Npx` |

**Beispiele:**
```mirror
Box x 100
```

### y

Y position (top) - sets position: absolute

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Y position in pixels | `y: Npx` |

**Beispiele:**
```mirror
Box y 50
```

### pin-left (`pl`)

Pin to left edge with offset

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Distance from left edge in pixels | `pin-left: Npx` |

**Beispiele:**
```mirror
Box pin-left 20
```

### pin-right (`pr`)

Pin to right edge with offset

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Distance from right edge in pixels | `pin-right: Npx` |

**Beispiele:**
```mirror
Box pin-right 20
```

### pin-top (`pt`)

Pin to top edge with offset

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Distance from top edge in pixels | `pin-top: Npx` |

**Beispiele:**
```mirror
Box pin-top 20
```

### pin-bottom (`pb`)

Pin to bottom edge with offset

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Distance from bottom edge in pixels | `pin-bottom: Npx` |

**Beispiele:**
```mirror
Box pin-bottom 20
```

### pin-center-x (`pcx`)

Center horizontally within parent

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Center horizontally | `position: absolute`, `left: 50%`, `transform: translateX(-50%)` |

### pin-center-y (`pcy`)

Center vertically within parent

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Center vertically | `position: absolute`, `top: 50%`, `transform: translateY(-50%)` |

### pin-center (`pc`)

Center both horizontally and vertically

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Center in both directions | `position: absolute`, `left: 50%`, `top: 50%`, `transform: translate(-50%, -50%)` |

### z

Z-index (stacking order)

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Z-index value | `z: N` |

**Beispiele:**
```mirror
Box z 10
```

### absolute (`abs`)

Absolute positioning

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Position absolute | `position: absolute` |

**Beispiele:**
```mirror
Box absolute
```

### fixed

Fixed positioning

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Position fixed | `position: fixed` |

**Beispiele:**
```mirror
Box fixed
```

### relative

Relative positioning

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Position relative | `position: relative` |

**Beispiele:**
```mirror
Box relative
```

## Transform

### rotate (`rot`)

Rotate element

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Rotation in degrees | `rotate: Ndeg` |

**Beispiele:**
```mirror
Box rotate 45
```

### scale

Scale element

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Scale factor | `scale: N` |

**Beispiele:**
```mirror
Box scale 1.2
```

### translate

Translate element (x, y)

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Translation in pixels | `translate: Npx` |

**Beispiele:**
```mirror
Box translate 10 20
```

## Effect

### opacity (`o`, `opa`)

Element opacity

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Opacity (0-1) | `opacity: N` |

**Beispiele:**
```mirror
Box opacity 0.5
```

### shadow

Box shadow

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `sm` | Small shadow | `box-shadow: 0 1px 2px rgba(0,0,0,0.05)` |
| `md` | Medium shadow | `box-shadow: 0 4px 6px rgba(0,0,0,0.1)` |
| `lg` | Large shadow | `box-shadow: 0 10px 15px rgba(0,0,0,0.1)` |

**Beispiele:**
```mirror
Box shadow sm
Box shadow md
Box shadow lg
```

### cursor

Mouse cursor style

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `pointer` | Pointer cursor | `cursor: pointer` |
| `grab` | Grab cursor | `cursor: grab` |
| `move` | Move cursor | `cursor: move` |
| `text` | Text cursor | `cursor: text` |
| `wait` | Wait cursor | `cursor: wait` |
| `not-allowed` | Not allowed cursor | `cursor: not-allowed` |

### blur

Blur filter

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Blur radius in pixels | `blur: Npx` |

**Beispiele:**
```mirror
Box blur 5
```

### backdrop-blur (`blur-bg`)

Backdrop blur filter

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| `<number>` | Blur radius in pixels | `backdrop-blur: Npx` |

**Beispiele:**
```mirror
Box backdrop-blur 10
```

### hidden

Hide element

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Display none | `display: none` |

**Beispiele:**
```mirror
Box hidden
```

### visible

Show element

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Visibility visible | `visibility: visible` |

**Beispiele:**
```mirror
Box visible
```

### disabled

Disable element

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Disable interactions | `pointer-events: none`, `opacity: 0.5` |

**Beispiele:**
```mirror
Button disabled
```

### scroll (`scroll-ver`)

Enable vertical scrolling

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Overflow-y auto | `overflow-y: auto` |

**Beispiele:**
```mirror
Box scroll
```

### scroll-hor

Enable horizontal scrolling

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Overflow-x auto | `overflow-x: auto` |

**Beispiele:**
```mirror
Box scroll-hor
```

### scroll-both

Enable scrolling in both directions

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Overflow auto | `overflow: auto` |

**Beispiele:**
```mirror
Box scroll-both
```

### clip

Clip overflow content

| Wert | Beschreibung | CSS |
|------|--------------|-----|
| *(standalone)* | Overflow hidden | `overflow: hidden` |

**Beispiele:**
```mirror
Box clip
```
