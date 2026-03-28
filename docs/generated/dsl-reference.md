# DSL Reference

> Auto-generated from `src/schema/dsl.ts`. Do not edit manually.
> Run `npm run generate` to update.
## DSL Reference (auto-generated)

### Primitives

| Primitive | HTML | Aliases |
|-----------|------|---------|
| Frame | `<div>` | Box |
| Text | `<span>` | - |
| Button | `<button>` | - |
| Input | `<input>` | - |
| Textarea | `<textarea>` | - |
| Label | `<label>` | - |
| Image | `<img>` | Img |
| Icon | `<span>` | - |
| Link | `<a>` | - |
| Slot | `<div>` | - |
| Divider | `<hr>` | - |
| Spacer | `<div>` | - |
| Header | `<header>` | - |
| Nav | `<nav>` | - |
| Main | `<main>` | - |
| Section | `<section>` | - |
| Article | `<article>` | - |
| Aside | `<aside>` | - |
| Footer | `<footer>` | - |
| H1 | `<h1>` | - |
| H2 | `<h2>` | - |
| H3 | `<h3>` | - |
| H4 | `<h4>` | - |
| H5 | `<h5>` | - |
| H6 | `<h6>` | - |

### Zag Primitives (Behavior Components)

> Note: Select, Checkbox, Radio are now Zag components with full accessibility and keyboard navigation.

| Component | Machine | Slots | Description |
|-----------|---------|-------|-------------|
| **Selection & Dropdowns** | | | |
| Select | select | Trigger, Content, Item +8 | Dropdown select with keyboard navigation |
| Combobox | combobox | Root, Label, Control +9 | Autocomplete combobox with filtering |
| Listbox | listbox | Root, Label, Content +5 | Listbox selection |
| **Menus** | | | |
| Menu | menu | Trigger, Positioner, Content +5 | Dropdown menu with keyboard navigation |
| ContextMenu | menu | Trigger, Positioner, Content +4 | Right-click context menu |
| NestedMenu | menu | Trigger, Positioner, Content +5 | Nested submenu structure |
| NavigationMenu | navigation-menu | Root, List, Item +5 | Navigation menu with submenus |
| **Form Controls** | | | |
| Checkbox | checkbox | Root, Control, Label +2 | Checkbox with label |
| Switch | switch | Track, Thumb, Label | Toggle switch |
| RadioGroup | radio-group | Root, Item, ItemControl +4 | Radio button group |
| Slider | slider | Root, Track, Range +6 | Range slider |
| RangeSlider | slider | Root, Track, Range +6 | Range slider with two thumbs |
| AngleSlider | angle-slider | Root, Control, Thumb +4 | Circular angle slider |
| NumberInput | number-input | Root, Label, Control +4 | Number input with increment/decrement |
| PinInput | pin-input | Root, Label, Control +2 | PIN/OTP input |
| PasswordInput | password-input | Root, Label, Control +2 | Password input with visibility toggle |
| TagsInput | tags-input | Root, Label, Control +6 | Tags/chips input |
| Editable | editable | Root, Area, Preview +5 | Inline editable text |
| RatingGroup | rating-group | Root, Label, Control +2 | Star rating input |
| SegmentedControl | radio-group | Root, Item, ItemText +2 | Segmented control / button group |
| ToggleGroup | toggle-group | Root, Item | Toggle button group |
| **Date & Time** | | | |
| DatePicker | date-picker | Root, Label, Control +20 | Date picker calendar |
| DateInput | date-input | Root, Label, Control +2 | Segmented date input |
| Timer | timer | Root, Area, Control +3 | Timer/stopwatch |
| **Overlays & Modals** | | | |
| Dialog | dialog | Trigger, Backdrop, Positioner +4 | Modal dialog |
| Tooltip | tooltip | Trigger, Positioner, Content +1 | Hover tooltip |
| Popover | popover | Trigger, Positioner, Content +5 | Click popover |
| HoverCard | hover-card | Trigger, Positioner, Content +1 | Hover card preview |
| FloatingPanel | floating-panel | Trigger, Positioner, Content +5 | Draggable floating panel |
| Tour | tour | Backdrop, Spotlight, Positioner +9 | Guided tour/walkthrough |
| Presence | presence | Root | Presence animation utility |
| **Navigation** | | | |
| Tabs | tabs | Root, List, Trigger +2 | Tabbed navigation |
| Accordion | accordion | Root, Item, ItemTrigger +2 | Collapsible accordion |
| Collapsible | collapsible | Root, Trigger, Content | Collapsible section |
| Steps | steps | Root, List, Item +7 | Step wizard/stepper |
| Pagination | pagination | Root, PrevTrigger, NextTrigger +2 | Pagination controls |
| TreeView | tree-view | Root, Tree, Branch +5 | Tree view navigation |
| **Media & Files** | | | |
| Avatar | avatar | Root, Image, Fallback | Avatar with fallback |
| FileUpload | file-upload | Root, Dropzone, Trigger +8 | File upload with drag & drop |
| ImageCropper | image-cropper | Root, Image, Overlay +9 | Image cropping tool |
| Carousel | carousel | Root, ItemGroup, Item +6 | Carousel/slider |
| SignaturePad | signature-pad | Root, Control, Segment +4 | Signature drawing pad |
| **Feedback & Status** | | | |
| Progress | progress | Root, Track, Range +5 | Linear progress bar |
| CircularProgress | progress | Root, Circle, CircleTrack +3 | Circular progress indicator |
| Toast | toast | Root, Title, Description +2 | Toast notification |
| Marquee | marquee | Root, Content | Scrolling marquee |
| **Utility** | | | |
| Clipboard | clipboard | Root, Label, Control +3 | Clipboard copy utility |
| QRCode | qr-code | Root, Frame, Pattern +1 | QR code generator |
| ScrollArea | scroll-area | Root, Viewport, Content +3 | Custom scrollbar area |
| Splitter | splitter | Root, Panel, ResizeTrigger | Resizable split panels |

### Compound Primitives (Layout Components)

> Pre-built layout components for rapid prototyping. Fully customizable.

| Component | Slots | Nested Slots | Description |
|-----------|-------|--------------|-------------|
| Shell | Header, Sidebar, Main, Footer | Logo, Nav, Actions, NavItem +4 | App shell with header, sidebar, and main content area |

### Properties

| Property | Aliases | Werte |
|----------|---------|-------|
| width | w | full, hug, <number>, $token |
| height | h | full, hug, <number>, $token |
| size | - | full, hug, <number>, $token |
| min-width | minw | <number>, $token |
| max-width | maxw | <number>, $token |
| min-height | minh | <number>, $token |
| max-height | maxh | <number>, $token |
| aspect | - | square, video, <number> |
| horizontal | hor | *(standalone)* |
| vertical | ver | *(standalone)* |
| gap | g | <number>, $token |
| center | cen | *(standalone)* |
| spread | - | *(standalone)* |
| top-left | tl | *(standalone)* |
| top-center | tc | *(standalone)* |
| top-right | tr | *(standalone)* |
| center-left | cl | *(standalone)* |
| center-right | cr | *(standalone)* |
| bottom-left | bl | *(standalone)* |
| bottom-center | bc | *(standalone)* |
| bottom-right | br | *(standalone)* |
| wrap | - | *(standalone)* |
| pos | positioned, position | *(standalone)* |
| stacked | - | *(standalone)* |
| grid | - | auto, <number> |
| dense | - | *(standalone)* |
| gap-x | gx | <number>, $token |
| gap-y | gy | <number>, $token |
| row-height | rh | <number>, $token |
| grow | - | *(standalone)* |
| shrink | - | *(standalone)* |
| align | - | top, bottom, left, right, center |
| left | - | *(standalone)* |
| right | - | *(standalone)* |
| top | - | *(standalone)* |
| bottom | - | *(standalone)* |
| hor-center | - | *(standalone)* |
| ver-center | - | *(standalone)* |
| padding | pad, p | <number>, $token |
| margin | m | <number>, $token |
| background | bg | <color>, $token |
| color | col, c | <color>, $token |
| border-color | boc | <color>, $token |
| border | bor | <number>, $token |
| radius | rad | <number>, $token |
| font-size | fs | <number>, $token |
| weight | - | thin, light, normal, medium, semibold, bold, black, <number> |
| line | - | <number>, $token |
| font | - | sans, serif, mono, roboto, $token |
| text-align | - | left, center, right, justify |
| italic | - | *(standalone)* |
| underline | - | *(standalone)* |
| uppercase | - | *(standalone)* |
| lowercase | - | *(standalone)* |
| truncate | - | *(standalone)* |
| x | - | <number> |
| y | - | <number> |
| pin-left | pl | <number> |
| pin-right | pr | <number> |
| pin-top | pt | <number> |
| pin-bottom | pb | <number> |
| pin-center-x | pcx | *(standalone)* |
| pin-center-y | pcy | *(standalone)* |
| pin-center | pc | *(standalone)* |
| z | - | <number> |
| absolute | abs | *(standalone)* |
| fixed | - | *(standalone)* |
| relative | - | *(standalone)* |
| rotate | rot | <number> |
| scale | - | <number> |
| translate | - | <number> |
| opacity | o, opa | <number> |
| shadow | - | sm, md, lg |
| cursor | - | pointer, grab, move, text, wait, not-allowed |
| blur | - | <number> |
| backdrop-blur | blur-bg | <number> |
| hidden | - | *(standalone)* |
| visible | - | *(standalone)* |
| disabled | - | *(standalone)* |
| scroll | scroll-ver | *(standalone)* |
| scroll-hor | - | *(standalone)* |
| scroll-both | - | *(standalone)* |
| clip | - | *(standalone)* |
| content | - | - |
| href | - | - |
| src | - | - |
| placeholder | - | - |
| focusable | - | *(standalone)* |
| readonly | - | *(standalone)* |
| type | - | - |
| name | - | - |
| value | - | - |
| checked | - | *(standalone)* |
| text | - | - |
| icon-size | is | <number>, $token |
| icon-color | ic | <color>, $token |
| icon-weight | iw | <number> |
| fill | - | *(standalone)* |
| material | - | *(standalone)* |
| animation | anim | fade-in, fade-out, slide-in, slide-out, scale-in, scale-out, bounce, pulse, shake, spin |
| x-offset | - | <number> |
| y-offset | - | <number> |
| hover-bg | hover-background | <color>, $token |
| hover-col | hover-color, hover-c | <color>, $token |
| hover-opacity | hover-opa, hover-o | <number> |
| hover-scale | - | <number> |
| hover-border | hover-bor | <number> |
| hover-border-color | hover-boc | <color>, $token |
| hover-radius | hover-rad | <number> |

### Zag Behavior Properties

> Component-specific behavior properties for Zag components.

*50 components with 195 behavior properties total.*

**Boolean:** addOnBlur, addOnPaste, allowCustomValue, allowDrop, allowDuplicate, allowHalf, allowMouseWheel, autoFocus, autoStart, autoplay, checked, clampValueOnBlur, clearable, closeOnClick, closeOnEscape, closeOnOutsideClick, closeOnScroll, closeOnSelect, collapsible, countdown, deselectable, directory, disabled, draggable, fixedWeeks, indeterminate, interactive, invalid, lazyMount, linear, lockAspectRatio, loop, loopFocus, mask, modal, multiple, open, openOnChange, otp, pauseOnHover, preventInteraction, preventScroll, readOnly, required, resizable, restoreFocus, searchable, selectOnFocus, trapFocus, typeahead, unmountOnExit, visible

**Enum:** activationMode, encoding, errorCorrection, orientation, origin, placement, positioning, selectionMode, submitMode

**Number:** aspectRatio, autoplayInterval, closeDelay, count, duration, gap, interval, length, max, maxFiles, maxTags, maxZoom, min, minStepsBetweenThumbs, minZoom, openDelay, pageSize, scrollHideDelay, siblingCount, slidesPerView, speed, spotlightOffset, spotlightRadius, startOfWeek, step, timeout

**String:** label, locale, name, placeholder

### Events

| Event | DOM | Key? |
|-------|-----|------|
| onclick | click | - |
| onhover | mouseenter | - |
| onfocus | focus | - |
| onblur | blur | - |
| onchange | change | - |
| oninput | input | - |
| onkeydown | keydown | ✓ |
| onkeyup | keyup | ✓ |
| onclick-outside | click-outside | - |
| onload | load | - |
| onenter | enter | - |
| onexit | exit | - |

### Actions

| Action | Targets |
|--------|---------|
| show | - |
| hide | - |
| toggle | - |
| open | - |
| close | - |
| select | - |
| highlight | next, prev, first, last |
| activate | - |
| deactivate | - |
| page | - |
| call | - |
| assign | - |
| focus | - |
| blur | - |
| submit | - |
| reset | - |
| navigate | - |

### States

**System:** hover, focus, active, disabled

**Custom:** selected, highlighted, expanded, collapsed, on, off, open, closed, filled, valid, invalid, loading, error

### Keyboard Keys

escape, enter, space, tab, backspace, delete, arrow-up, arrow-down, arrow-left, arrow-right, home, end