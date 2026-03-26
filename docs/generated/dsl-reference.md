# Mirror DSL Reference

> **Auto-generated** aus `src/schema/dsl.ts` – nicht manuell editieren!

## Table of Contents

- [Keywords](#keywords)
- [Primitives](#primitives)
- [Properties](#properties)
- [Events](#events)
- [Actions](#actions)
- [States](#states)
- [Keyboard Keys](#keyboard-keys)

---

## Keywords

Reserved keywords that cannot be used as identifiers:

```
as, extends, named, each, in, if, else, then, where, and, or, not, data, keys, selection, route, animation
```

## Primitives

Built-in component types:

| Primitive | HTML Tag | Description |
|-----------|----------|-------------|
| Frame (Box) | `<div>` | Container with vertical layout (default) |
| Text | `<span>` | Text element |
| Button | `<button>` | Clickable button |
| Input | `<input>` | Text input field |
| Textarea | `<textarea>` | Multi-line text input |
| Label | `<label>` | Form label |
| Image (Img) | `<img>` | Image element |
| Icon | `<span>` | Icon element |
| Link | `<a>` | Anchor link |
| Slot | `<div>` | Slot placeholder for composition |
| Divider | `<hr>` | Horizontal divider line |
| Spacer | `<div>` | Flexible spacer element |
| Header | `<header>` | Page or section header |
| Nav | `<nav>` | Navigation section |
| Main | `<main>` | Main content area |
| Section | `<section>` | Generic section |
| Article | `<article>` | Self-contained article |
| Aside | `<aside>` | Sidebar content |
| Footer | `<footer>` | Page or section footer |
| H1 | `<h1>` | Heading level 1 |
| H2 | `<h2>` | Heading level 2 |
| H3 | `<h3>` | Heading level 3 |
| H4 | `<h4>` | Heading level 4 |
| H5 | `<h5>` | Heading level 5 |
| H6 | `<h6>` | Heading level 6 |

## Properties

See [properties.md](./properties.md) for detailed property documentation.

Total: 79 properties

## Events

| Event | DOM Event | Description |
|-------|-----------|-------------|
| onclick | click | Click event |
| onhover | mouseenter | Mouse enter event |
| onfocus | focus | Focus event |
| onblur | blur | Blur event |
| onchange | change | Change event |
| oninput | input | Input event |
| onkeydown | keydown | Keydown event (accepts key modifier) |
| onkeyup | keyup | Keyup event (accepts key modifier) |
| onclick-outside | click-outside | Click outside element |
| onload | load | Load event |
| onenter | enter | Viewport enter (IntersectionObserver) |
| onexit | exit | Viewport exit (IntersectionObserver) |

## Actions

| Action | Description | Targets |
|--------|-------------|---------|
| show | Show element | - |
| hide | Hide element | - |
| toggle | Toggle visibility | - |
| open | Open (modal, dropdown) | - |
| close | Close | - |
| select | Select item | - |
| highlight | Highlight item | next, prev, first, last |
| activate | Activate element | - |
| deactivate | Deactivate element | - |
| page | Navigate to page | - |
| call | Call function | - |
| assign | Assign value | - |
| focus | Focus element | - |
| blur | Blur element | - |
| submit | Submit form | - |
| reset | Reset form | - |
| navigate | Navigate to route | - |

## States

### System States (CSS pseudo-classes)

| State | Description |
|-------|-------------|
| hover | Mouse hover state |
| focus | Focus state |
| active | Active/pressed state |
| disabled | Disabled state |

### Custom States (data-state attribute)

| State | Description |
|-------|-------------|
| selected | Selected state |
| highlighted | Highlighted state |
| expanded | Expanded state |
| collapsed | Collapsed state |
| on | On state (toggle) |
| off | Off state (toggle) |
| open | Open state |
| closed | Closed state |
| filled | Filled state (input has value) |
| valid | Valid state |
| invalid | Invalid state |
| loading | Loading state |
| error | Error state |

## Keyboard Keys

Valid keys for `onkeydown` events:

```
escape, enter, space, tab, backspace, delete, arrow-up, arrow-down, arrow-left, arrow-right, home, end
```
