# Mirror DSL — Brief for Code Generation

You are converting source files written in **Mirror**, a UI design DSL,
to a target framework. This brief covers exactly the constructs likely to
appear. Read carefully — Mirror's short syntax is precise, not approximate.

## Files

| Extension | Purpose                           |
| --------- | --------------------------------- |
| `.mir`    | Layout / page composition (entry) |
| `.com`    | Component definitions             |
| `.tok`    | Design tokens (colors, sizes)     |
| `.data`   | Comments / data-only declarations |

Files are processed in this order: tokens → components → layout.

## Syntax basics

```mirror
// 2-space indentation = nesting (HTML hierarchy)
Frame gap 12, pad 16, bg #1a1a1a
  Text "Title", col white, fs 18
  Text "Subtitle", col #888

// , separates properties
// Quoted string after element name = text content
// $name = token reference
// Inline-Markdown in strings: **bold**, *italic* — render as HTML
```

## Primitives → HTML

| Mirror    | HTML        | Notes                   |
| --------- | ----------- | ----------------------- |
| `Frame`   | `<div>`     | Default flex column     |
| `Text`    | `<span>`    | Block when has children |
| `Button`  | `<button>`  |                         |
| `H1`–`H6` | `<hN>`      |                         |
| `Section` | `<section>` |                         |
| `Image`   | `<img>`     |                         |
| `Icon`    | `<span>`    | Lucide icon by name     |
| `Divider` | `<hr>`      |                         |
| `Link`    | `<a>`       | `href` property         |

## Property reference

| Property       | CSS / meaning                                    |
| -------------- | ------------------------------------------------ |
| `w N` / `h N`  | width/height in px (or `full` / `hug`)           |
| `maxw N`       | max-width in px                                  |
| `pad N`        | padding (1, 2, or 4 values like CSS: T R B L)    |
| `mar N`        | margin (`mar 0 auto` = horizontal-center)        |
| `gap N`        | flex/grid gap                                    |
| `gap N M`      | row-gap N column-gap M (grid)                    |
| `bg #hex`      | background-color                                 |
| `col #hex`     | text color                                       |
| `boc #hex`     | border-color                                     |
| `bor N`        | border-width                                     |
| `rad N`        | border-radius                                    |
| `fs N`         | font-size in px                                  |
| `weight N`     | font-weight (300, 400, bold, …)                  |
| `line N`       | line-height (unitless)                           |
| `ls N`         | letter-spacing in **em** (negative tightens)     |
| `font sans`    | font-family system stack                         |
| `font serif`   | serif stack                                      |
| `italic`       | font-style: italic                               |
| `hor`          | flex-direction: row (default is column)          |
| `ver-center`   | align-items: center (in row)                     |
| `align top`    | align-items: flex-start                          |
| `align bottom` | align-items: flex-end                            |
| `wrap`         | flex-wrap: wrap                                  |
| `grid N`       | grid with N columns                              |
| `grow`         | flex-grow: 1                                     |
| `prose`        | reading-flow text + lists, not laid-out children |
| `center`       | center children both axes                        |

`pad N1 N2 N3 N4` follows CSS shorthand: top, right, bottom, left.
`pad N1 N2` = vertical, horizontal.

## Components (`.com`)

### Form A — `as <Primitive>` (single-leaf default)

```mirror
H2 as Text: fs 44, weight bold, ls -0.02, line 1.05
```

`H2` is now a usable element that renders as `<span>` (Text) with those
properties baked in. **Generate one component per definition.** It accepts
a `text` prop when used as `H2 "Title"`, and `children` when used as a
container.

### Form B — `Foo: <props>` (no `as`, has body slot)

```mirror
Logo: hor, gap 14, ver-center
  Frame hor, ver-center
    LogoMarkN "n"
    LogoBar
    LogoMarkW "w"
```

Top-level `Logo:` defines a component whose **default body** is the
indented children. When used in `app.mir` as bare `Logo` (no children),
render that default body. When used with indented children in `app.mir`,
those children **replace** the default body (or extend it — adopt the
behavior that matches the visual reference).

### Form C — `Foo: <props>` followed by inline children in `app.mir`

```mirror
// in components.com:
Card: bg $card, pad 16, rad 8, gap 8

// in app.mir:
Card
  Title "Hello"
  Desc "World"
```

Same as Form A from React's perspective: render a wrapper element with
the baked-in props, accept and render `children`.

## Tokens (`.tok`)

```mirror
yellow.bg: #FDE70E    // suffix .bg  → use as background
content.maxw: 1280    // suffix .maxw → use as max-width
ink.col: #000         // suffix .col → use as text color
```

The suffix is a _property hint_ — when referenced as `bg $yellow`, it
resolves to `#FDE70E`. **Map each token to your framework's design-token
system using the bare name** (`yellow`, `content`, `ink`, …).

## Inline-Markdown in strings

```mirror
H2 "Five Personas that *together* unfold the **decision space**."
```

Inline markdown is allowed inside `Text`-like strings:

- `**bold**` → `<strong>`
- `*italic*` → `<em>`

Strings are otherwise plain text (already escaped). Render with safe
HTML insertion (e.g. `dangerouslySetInnerHTML` after running the
transform). Don't strip the markers, don't render them as plain `**`.

The HTML mapping is fixed; the **visual styling** of `<em>` and `<strong>`
is a separate decision. Browser defaults are slanted italic + bold. If a
visual reference is provided and shows something else (upright stress,
different weight, color shift), let the reference override defaults via
CSS — don't change the HTML.

## Markdown-style blocks inside containers

Inside `prose`-marked or other text-flow containers, two markdown
constructs may appear as **lines of content** (not as Mirror children):

```mirror
ProseBody
  ### Section heading
  - **Top-level point**, with context:
    - sub-point one
    - sub-point two
  - Another point.

  ### Another section
  Plain paragraph text here.
```

| Markdown line          | Render as                          |
| ---------------------- | ---------------------------------- |
| `### Heading`          | `<h3>`                             |
| `## Heading`           | `<h2>`                             |
| `- item`               | `<ul><li>` (nested by indentation) |
| Plain text (no marker) | `<p>`                              |

Inline-markdown (`**bold**`, `*italic*`) applies inside any of these.
Treat the prose container's body as a markdown sub-document.

## Components: library vs. used

A `.com` file may define more components than `app.mir` uses. Generate
all of them anyway — they're the design library. Don't try to be clever
about pruning unused ones; they may be referenced by other layouts later.

## Optional ground-truth: render snapshot

If `render-snapshot/` is present in the bundle, it contains the **actual
computed CSS** and rendered screenshots from headless-rendering the
Mirror project. Use this as ground truth — it's how Mirror really
resolves tokens, layout, and computed values.

```
render-snapshot/
├── snapshot-manifest.json
├── computed-styles-desktop.json   # 1440×900 viewport
├── computed-styles-tablet.json    #  768×1024
├── computed-styles-mobile.json    #  375×812
├── screenshot-desktop.png
├── screenshot-tablet.png
└── screenshot-mobile.png
```

Each `computed-styles-*.json` is an array of:

```json
{
  "id": "node-1",
  "tag": "DIV",
  "text": "Personas",
  "rect": { "x": 100, "y": 50, "width": 200, "height": 30 },
  "styles": { "display": "flex", "background-color": "rgb(...)", ... },
  "parentId": "node-0",
  "childIds": ["node-2", "node-3"]
}
```

When you generate code, **verify your output against this snapshot**:

- Token resolved values (e.g. `$yellow` actually became `rgb(253, 231, 14)`)
- Layout direction, gap, padding pixel values
- Font-size / line-height / letter-spacing actually applied
- Element ordering and parent-child relationships

If your generated layout has, say, `font-size: 17px` but the snapshot
shows `19px` for that node, your code is wrong — the snapshot is right.

## What might be present (skim and apply only if used)

- `each x in $list` loops, `if cond` blocks, data-binding (`bind varName`)
- States (`hover:`, `on:`, `toggle()`, `exclusive()`, ...)
- Custom icon registry (`$icons:` block)
- Animation presets (`anim bounce`, ...)
- Event handlers (`onclick`, ...)
- Navigation actions (`navigate(View)`, `back()`)
- UI patterns: `Dialog`, `Tooltip`, `Tabs`, `Select`, form-controls

If the source uses none of these, ignore. If it does, fall back to the
simplest framework-idiomatic mapping — these constructs all have direct
equivalents in any modern framework (state hooks, conditional rendering,
event handlers, router).

## Runtime-computed property values

Mirror allows values that compute at runtime, e.g.:

```mirror
Frame w $project.progress + "%"
Frame bg $project.statusColor
```

Atomic CSS frameworks (Tailwind JIT, UnoCSS) generate utility classes at
**build time** — they can't synthesize a class from a string template
that's only known at render. For these values, fall back to **inline
styles** in the target's idiom:

- React: `style={{ width: \`${progress}%\` }}`
- Vue: `:style="{ width: progress + '%' }"`
- Svelte: `style="width: {progress}%"`
- Vanilla: emit a static `style` attribute or, if you need dynamism, a
  small JS sprinkle that updates the inline style

Static values still go through utility classes; only the dynamic ones
need inline-style escape hatches.
