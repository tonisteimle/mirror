# Convert Mirror → Vanilla HTML + CSS (no JS framework)

You are converting a Mirror DSL project to plain semantic HTML +
hand-written CSS — no React, no Vue, no Svelte, no build framework.
Mirror source is in `source/`. Visual ground truth (if provided) is
in `visual-reference.html`. Target settings are in `target.json`.

**Read `MIRROR-BRIEF.md` first.**

## Output

```
generated/
├── index.html                  # the page
├── styles.css                  # global styles + token vars
├── components.css              # per-Mirror-component class rules
├── app.js                      # interactivity — REQUIRED if any Mirror
│                               # behavior annotation is present (see below)
└── lib/
    └── inline-md.js            # optional, only if .mir uses inline-md
                                # in dynamic contexts (rare)
```

**Hard rules:**

- No frameworks, no bundlers. Should run via `python -m http.server` or
  `npx serve`.
- Pure HTML5 + CSS3. Modern features OK (custom properties, grid, flex,
  container queries) but no PostCSS / Tailwind / SASS.
- Inline-Markdown (`**bold**`, `*italic*`) → resolved at "compile" time
  by **you, the agent** — emit `<strong>` and `<em>` directly in the
  HTML. No runtime needed.
- Tokens → CSS custom properties on `:root` (e.g. `--yellow: #FDE70E`).
- Each Mirror component → one CSS class. Use `class="logo"` instead of
  `class="Logo"`. The HTML uses semantic tags from the primitive
  (e.g. `Section as Frame` → `<section class="section">`).
- **Form controls are real HTML inputs, not styled `<div>`s.** A pixel-
  matching `<div class="checkbox">` is broken: no form-submit, no
  screen-reader, no tab-nav, no native click-to-toggle. See the Form
  controls table below.
- **Mirror behavior annotations are not optional.** `exclusive()`,
  `toggle()`, `toast(...)`, action-on-click — every one needs a working
  vanilla-JS handler. Pixel-diff alone will pass without them, but the
  page will be a static mockup, not the prototype the source describes.

## Pipeline (gate on each)

### Step 1 — Plan

`generated/PLAN.md` must list:

- every component class
- page structure outline
- token mapping
- markdown handling
- **every Mirror behavior annotation found in the source** with the
  vanilla-JS pattern that will implement it (use the table from
  "Behavior — vanilla JS in `app.js`"). Example entry:
  `GuestBtn `exclusive()`→`[data-exclusive]` group + click handler`

**Gate:** PLAN.md lists ≥ all components from every `.com`, AND every
behavior annotation present in the `.mir`/`.com` source has a row with
its mapping. If a behavior cannot be reproduced, document that
explicitly with reason.

### Step 2 — Tokens & base

`styles.css`:

- `:root { --token-name: value; … }` for every `.tok` entry
- Base resets, font-family stack, body styles
- Container queries / responsive baseline if needed

**Gate:** `styles.css` validates as CSS (no syntax errors).

### Step 3 — Component styles

`components.css`: one class rule per `.com` definition. Use the bare
component name lowercased and dash-cased.

```css
.h2 {
  font-size: 44px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.05;
}
```

**Gate:** every `.com` definition has a corresponding class in
`components.css`.

### Form controls — semantic HTML, not styled divs

| Mirror                                                  | HTML to emit                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Checkbox`                                              | `<input type="checkbox">`                                                                                                                   |
| `Checkbox checked`                                      | `<input type="checkbox" checked>`                                                                                                           |
| `Switch`                                                | `<input type="checkbox" role="switch">`                                                                                                     |
| `Switch checked`                                        | `<input type="checkbox" role="switch" checked>`                                                                                             |
| `RadioItem value "x"` (inside a `RadioGroup value "x"`) | `<input type="radio" name="<group>" value="x" checked>`                                                                                     |
| `Input placeholder "..."`                               | `<input type="text" placeholder="...">`                                                                                                     |
| `Input type "date", value "2024-04-12"`                 | `<input type="date" value="2024-04-12">`                                                                                                    |
| `Input bind <var>`                                      | `<input ...>` + JS handler that mirrors value into a state object                                                                           |
| `Textarea placeholder "..."`                            | `<textarea placeholder="..."></textarea>`                                                                                                   |
| `Button "X", disabled` (or any control with `disabled`) | `<button disabled>` / `<input disabled>` — never simulate via opacity alone, the native attribute is what blocks form-submit and key events |
| `Input readonly`                                        | `<input readonly>` — different from `disabled`: still tab-focusable, value still submits                                                    |

Wrap each input in a `<label>` so click-on-label toggles, and screen
readers pair label↔input correctly:

```html
<label class="service-row">
  <input type="checkbox" checked />
  <span class="service-text">Breakfast included</span>
</label>
```

Mirror's "checkbox doesn't look like a default browser checkbox" is a
**styling** concern, not a structural one. Keep the real `<input>`,
hide it visually with the standard pattern, draw the indicator next to
it via CSS:

```css
.service-row {
  display: flex;
  gap: 12px;
  align-items: center;
  cursor: pointer;
}
.service-row input[type='checkbox'] {
  /* invisible but accessible; sized so click-area still hits the row */
  appearance: none;
  width: 18px;
  height: 18px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--primary);
  display: grid;
  place-content: center;
}
.service-row input[type='checkbox']:checked {
  background: var(--accent);
  border-color: var(--accent);
}
.service-row input[type='checkbox']:checked::after {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--primary);
  /* or an SVG checkmark via mask-image */
  clip-path: polygon(...);
}
```

### Behavior — vanilla JS in `app.js`

For every Mirror behavior annotation (`exclusive()`, `toggle()`,
`toast(...)`, custom States with `on:`, `bind`, action-on-click),
write a small handler in `app.js`. Use `defer`-loaded vanilla JS, no
libraries.

| Mirror                                                            | Vanilla pattern                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exclusive()` on definition; `selected` initial-state on instance | **Default**: container `data-exclusive` + `<button class="...">`, JS click handler removes `selected` from siblings and adds it to the clicked one (Example 1b). Use this unless the group is part of a `<form>` that submits a chosen value — then switch to `<input type="radio">` styled as buttons (Example 1a). |
| `toggle()` on definition; `on` initial-state on instance          | `data-toggle`; click handler flips `.on` class                                                                                                                                                                                                                                                                       |
| Custom States `on:`, `selected:`, `open:`                         | Drive via classes; CSS rules use `.<class>:state` or `[data-state="..."]`                                                                                                                                                                                                                                            |
| `toast(msg, type)` action                                         | `data-toast='{"msg":"...","type":"..."}'`; on click, append a `<div class="toast toast-<type>">` to a fixed container, fade in, auto-remove after ~2.5s                                                                                                                                                              |
| `navigate(View)`                                                  | Use `location.hash` + `[data-view]` containers; show/hide via `:target` or class toggle                                                                                                                                                                                                                              |
| `bind <var>` on Input                                             | Track a `state` object in JS; `input` event updates state, optional re-render where `$<var>` is referenced                                                                                                                                                                                                           |
| `set(var, n)`, `increment(var)`, `decrement(var)`                 | Mutate `state` object, re-render bound text                                                                                                                                                                                                                                                                          |
| `show(El)` / `hide(El)`                                           | Toggle `.hidden` class on the named element                                                                                                                                                                                                                                                                          |

#### Example 1a — `exclusive()` as a button group (default)

Mirror:

```mirror
GuestBtn as Button: …, exclusive()
…
GuestBtn "1"
GuestBtn "2", selected
GuestBtn "3"
GuestBtn "4"
```

```html
<div class="row row-gap-8" data-exclusive>
  <button class="guest-btn" type="button" aria-pressed="false">1</button>
  <button class="guest-btn selected" type="button" aria-pressed="true">2</button>
  <button class="guest-btn" type="button" aria-pressed="false">3</button>
  <button class="guest-btn" type="button" aria-pressed="false">4</button>
</div>
```

```js
document.querySelectorAll('[data-exclusive]').forEach(group => {
  group.addEventListener('click', e => {
    const target = e.target.closest('button')
    if (!target || !group.contains(target)) return
    group.querySelectorAll('button').forEach(b => {
      b.classList.remove('selected')
      b.setAttribute('aria-pressed', 'false')
    })
    target.classList.add('selected')
    target.setAttribute('aria-pressed', 'true')
  })
})
```

The selected button initially carries `aria-pressed="true"`, the others
`"false"`, so screen readers announce the toggle state.

#### Example 1b — `exclusive()` as a radio group (only when form-submitted)

Switch to this _only_ if the surrounding markup is a real `<form>` that
needs the chosen value to land in form-data on submit (e.g. a payment
plan picker, a survey).

Mirror:

```mirror
GuestBtn as Button: …, exclusive()
GuestBtn "1"
GuestBtn "2", selected
GuestBtn "3"
GuestBtn "4"
```

```html
<fieldset class="guest-radio">
  <legend class="visually-hidden">Number of guests</legend>
  <label><input type="radio" name="guests" value="1" />1</label>
  <label><input type="radio" name="guests" value="2" checked />2</label>
  <label><input type="radio" name="guests" value="3" />3</label>
  <label><input type="radio" name="guests" value="4" />4</label>
</fieldset>
```

**Critical** — `<fieldset>` ships with a default border, ~0.35em padding,
and 2px inline-margin in every browser. Without an explicit reset the
group visually "grows" and pushes every following element downward,
breaking pixel-diff against the Mirror baseline. The
`.guest-radio { border: 0; padding: 0; margin: 0 }` reset below is
non-negotiable.

```css
.guest-radio {
  display: flex;
  gap: 8px;
  border: 0;
  padding: 0;
  margin: 0;
}
.guest-radio label {
  padding: 14px 24px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text);
}
.guest-radio input[type='radio'] {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
.guest-radio label:hover {
  border-color: var(--border-hover);
}
.guest-radio label:has(input:checked) {
  border-color: var(--accent);
  color: var(--accent);
}
.guest-radio label:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

No JS — the browser handles radio-group exclusivity natively.

#### Example 2 — `toast(msg, type)` action

Mirror:

```mirror
PrimaryBtn "Complete Check-in", toast("Check-in complete!", "success")
```

HTML:

```html
<button
  class="primary-btn"
  type="button"
  data-toast='{"msg":"Check-in complete!","type":"success"}'
>
  Complete Check-in
</button>
```

JS (place a single toast container once at boot, with screen-reader
announcement role so toasts are read out):

```js
const toastHost = document.createElement('div')
toastHost.className = 'toast-host'
toastHost.setAttribute('role', 'status')
toastHost.setAttribute('aria-live', 'polite')
toastHost.setAttribute('aria-atomic', 'true')
document.body.appendChild(toastHost)

function showToast(msg, type = 'info') {
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  toastHost.appendChild(el)
  requestAnimationFrame(() => el.classList.add('visible'))
  setTimeout(() => {
    el.classList.remove('visible')
    setTimeout(() => el.remove(), 250)
  }, 2500)
}

document.querySelectorAll('[data-toast]').forEach(el => {
  el.addEventListener('click', () => {
    const { msg, type } = JSON.parse(el.dataset.toast)
    showToast(msg, type)
  })
})
```

CSS for the toast (add to `styles.css`):

```css
.toast-host {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 9999;
  pointer-events: none;
}
.toast {
  padding: 12px 16px;
  border-radius: 8px;
  background: #333;
  color: #fff;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}
.toast.visible {
  opacity: 1;
  transform: none;
}
.toast-success {
  background: #10b981;
}
.toast-error {
  background: #ef4444;
}
.toast-warning {
  background: #f59e0b;
}
```

#### Example 3 — `bind <var>` on Input

Mirror:

```mirror
searchTerm: ""
Input bind searchTerm, placeholder "Suchen..."
Text "Suche: $searchTerm"
```

HTML:

```html
<input type="text" placeholder="Suchen..." data-bind="searchTerm" />
<span data-text="searchTerm">Suche: </span>
```

JS:

```js
const state = { searchTerm: '' }
function rerender() {
  document.querySelectorAll('[data-text]').forEach(el => {
    el.textContent = state[el.dataset.text] ?? ''
  })
}
document.querySelectorAll('[data-bind]').forEach(input => {
  input.addEventListener('input', e => {
    state[input.dataset.bind] = e.target.value
    rerender()
  })
})
rerender()
```

If the `.mir` source has no `bind` and no derived text, skip the
`rerender()` machinery — keep the input uncontrolled.

### Step 4 — Page HTML

For each `.mir` → one HTML output. If only one `.mir` exists, name it
`index.html`. Otherwise: `index.html` + `<name>.html` per layout.

- Each Mirror element → semantic tag from the primitive + class for the
  component (e.g. `<section class="section"><div class="container">…</div></section>`)
- Markdown lists → real `<ul><li>`
- Inline-md → `<strong>` / `<em>` resolved at write-time
- Verbatim text content (locale-specific quotes, accents preserved)

**Gate:** HTML validates (W3C) — at minimum well-formed and proper
nesting.

### Step 4.5 — Behavior (`app.js`)

For every Mirror behavior annotation listed in the PLAN, write a
handler in `app.js`. Wire it via a `data-*` attribute on the relevant
HTML element so the JS stays decoupled from the markup structure.

Reference the file from `index.html` once, in `<head>`:

```html
<script defer src="app.js"></script>
```

If — and only if — the Mirror source has zero behavior annotations,
omit `app.js` entirely.

**Gate:** open `index.html` in a browser and manually verify each
behavior. Concretely for hotel-checkin-style sources:

- Click a different `GuestBtn` → `selected` moves to it (only one
  selected at a time).
- Click a `Checkbox` → its checked state toggles (the `<input>` IS the
  checkbox; styling is on the parent label and `:checked`).
- Click `PrimaryBtn` with `toast(...)` → a toast appears bottom-right
  and fades after ~2.5 s.
- Type into a bound `Input` → derived text updates (if any).

If any behavior is broken, fix `app.js` before moving on. Do not
proceed to verify with broken behavior — pixel-diff will pass on a
visual mockup but the result is not what the source describes.

### Step 5 — Verify (visual diff against Mirror baseline)

If `render-snapshot/` is in the bundle, run the verify CLI from the
bundle README — it pixel-diffs your `generated/` (no `dist/` for vanilla)
against Mirror's render at three viewports.

```bash
npx tsx <path-from-README>/tools/verify.ts . --generated ./generated
```

Iterate: open `verify-diff-<vp>.png` (red = mismatch), fix CSS or HTML,
rerun verify. **Gate:** `verify-report.md` exists; if no snapshot was
captured, fall back to `generated/DISCREPANCIES.md` based on
`visual-reference.html`.

## CSS notes

- Spacing: use `px` directly (`padding: 96px 24px`)
- Letter-spacing: `letter-spacing: -0.025em`
- Line-height: unitless (`line-height: 1.65`)
- Colors via tokens: `background: var(--yellow);`
- For `prose`-marked containers: write CSS rules that mirror
  Tailwind-typography defaults — sensible heading scale, paragraph
  spacing, list styling

## Definition of "done"

- `index.html` opens directly in a browser, renders correctly
- All elements from `.mir` files are present
- Visual diff vs reference ≥ 95%
- No CSS errors; HTML well-formed
- **All form controls are real `<input>`/`<textarea>` elements,
  wrapped in `<label>` where appropriate** (no styled-`<div>`
  fakes for checkboxes/switches/radios)
- **Every Mirror behavior annotation has a working JS handler in
  `app.js`** and behaves as described in the Step 4.5 gate
