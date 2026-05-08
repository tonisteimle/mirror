# Mirror DSL — Brief for Code Generation

You are converting source files written in **Mirror**, a UI design DSL,
to a target framework. You don't need to be an expert; this brief covers
exactly the constructs used in this project. Read carefully — Mirror's
short syntax is precise, not approximate.

## Files

| Extension | Purpose                           |
| --------- | --------------------------------- |
| `.mir`    | Layout / page composition (entry) |
| `.com`    | Component definitions             |
| `.tok`    | Design tokens (colors, sizes)     |

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

## Property reference (only the ones used here)

| Property       | CSS / meaning                                         |
| -------------- | ----------------------------------------------------- |
| `w N` / `h N`  | width/height in px (or `full` / `hug`)                |
| `maxw N`       | max-width in px                                       |
| `pad N`        | padding (1, 2, or 4 values like CSS)                  |
| `mar N`        | margin (`mar 0 auto` = horizontal-center)             |
| `gap N`        | flex/grid gap                                         |
| `gap N M`      | row-gap N column-gap M (grid)                         |
| `bg #hex`      | background-color                                      |
| `col #hex`     | text color                                            |
| `boc #hex`     | border-color                                          |
| `bor N`        | border-width                                          |
| `rad N`        | border-radius                                         |
| `fs N`         | font-size in px                                       |
| `weight N`     | font-weight (300, 400, bold, …)                       |
| `line N`       | line-height (unitless)                                |
| `ls N`         | letter-spacing in **em** (negative tightens)          |
| `font sans`    | font-family system stack                              |
| `font serif`   | serif stack                                           |
| `italic`       | font-style: italic                                    |
| `hor`          | flex-direction: row (default is column)               |
| `ver-center`   | align-items: center (in row)                          |
| `align top`    | align-items: flex-start                               |
| `align bottom` | align-items: flex-end                                 |
| `wrap`         | flex-wrap: wrap                                       |
| `grid N`       | grid with N columns                                   |
| `grow`         | flex-grow: 1                                          |
| `prose`        | reading-width content (no specific CSS — just a hint) |
| `center`       | center children both axes                             |

## Components (`.com`)

Definition:

```mirror
H2 as Text: fs 44, weight bold, ls -0.02, line 1.05
```

`as Text` = inherits from primitive. `H2` is now a usable element with
those default properties baked in. **In the target framework, generate
one component per definition.**

Multi-slot definition:

```mirror
Logo: hor, gap 14, ver-center
  Frame hor, ver-center
    LogoMarkN "n"
```

Top-level (`Logo:`) becomes a component whose default body is the
indented children. Generate it as a component that renders that body.

## Tokens (`.tok`)

```mirror
yellow.bg: #FDE70E    // suffix .bg means "use as background"
content.maxw: 1280    // suffix .maxw means "use as max-width"
```

The suffix is a _property hint_ — when the token is referenced as
`bg $yellow`, it resolves to `#FDE70E`. **In Tailwind: put each token
under `theme.extend` of its property class (colors, maxWidth, …) using
the bare name (`yellow`, `content`).**

## Inline-Markdown in `Text`

```mirror
H2 "Fünf Personas, die zusammen den *Entscheidungsraum* aufspannen."
```

The string contains inline markdown:

- `**bold**` → `<strong>`
- `*italic*` → `<em>`

The text is **already escaped** (no other HTML allowed). Render with
`dangerouslySetInnerHTML` after running this transformation, or pre-
process the string at build-time. Don't strip the markers.

## Markdown-style list blocks in `.mir`

```mirror
ProseBody
  - **Universalfrage**, die durch alle Personas geht:
    - «Schaffe ich das?»
    - «Passe ich da rein?»
  - Sehr viele Fragen haben **nichts mit Curriculum** zu tun.
```

Lines starting with `- ` (after indentation) are **markdown list items**
inside a Mirror element. Render them as proper `<ul><li>` lists. Nested
list items (`-` indented further) become nested `<ul>`. Inline-markdown
applies inside list items.

## Inheritance and `prose`

`ProseBody as Frame: grow, maxw 768, gap 18, prose`

`prose` is a hint that the contents are reading-flow text + lists, not
laid out children. Use Tailwind's `prose` class (typography plugin) or
equivalent. Apply only to the `ProseBody` element itself.

## What you can ignore (not used in this project)

- `each` loops, `if` conditions, data-binding (`bind`, `$varname` for
  variables — only `$tokenname` is used here)
- States (`hover:`, `on:`, `toggle()`, `exclusive()`, etc.)
- Custom icons, animations, transforms
- All event handlers (`onclick`, etc.)
- `Dialog`, `Tooltip`, `Tabs`, `Select`, form-controls

This is a **static document page**. No interactivity beyond what HTML+CSS
provides natively.
