/**
 * React backend — Events cluster (Slice 2 of react-backend-decomp).
 *
 * Maps Mirror events (`onclick`, `onhover`, `onkeydown(escape)`, …) to
 * React JSX event-handler attributes (`onClick`, `onMouseEnter`,
 * `onKeyDown` with key-filter branches).
 *
 * Side-effect-only actions (toast, copy, openUrl, back/forward,
 * scrollTo*) translate to plain browser APIs that work without any
 * Mirror runtime. State-mutating actions (increment, set, toggle, add,
 * remove, …) emit a no-op comment so the generated JSX still compiles.
 * The DOM/Framework backends still wire these via their own runtimes —
 * pinned in `tests/differential/actions.test.ts`.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type { Action, Event as EventNode } from '../../../parser/ast'

/**
 * Map Mirror event names to React JSX event-handler attribute names.
 * Mirror's `onclick` → React's `onClick`, `onhover` (= mouseenter) →
 * `onMouseEnter`, etc. Keyboard shorthands (`onenter`, `onkeyescape`,
 * etc.) all funnel through `onKeyDown` with a key-filter inside the
 * handler body.
 */
const REACT_EVENT_NAME: Record<string, string> = {
  onclick: 'onClick',
  onhover: 'onMouseEnter',
  onfocus: 'onFocus',
  onblur: 'onBlur',
  onchange: 'onChange',
  oninput: 'onInput',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onload: 'onLoad',
}

const KEY_NAME_TO_DOM_KEY: Record<string, string> = {
  enter: 'Enter',
  escape: 'Escape',
  esc: 'Escape',
  space: ' ',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  home: 'Home',
  end: 'End',
}

/**
 * Emit a React-friendly inline-handler body for a single Action.
 *
 * Side-effect-only actions translate to plain browser APIs. State-
 * mutating actions emit a no-op comment so the JSX remains valid; the
 * DOM/Framework backends still wire these via their own runtimes.
 */
export function emitActionExpression(action: Action): string {
  const args = action.args ?? []
  const arg0 = args[0]
  const arg1 = args[1]
  const literal = (s: string) => JSON.stringify(s)
  switch (action.name) {
    case 'toast': {
      if (typeof arg0 !== 'string') return '/* toast */'
      // window.alert is the simplest cross-browser feedback channel.
      // Type/position args are ignored — there is no toast UI in the
      // generated React app.
      return `window.alert(${literal(arg0)})`
    }
    case 'copy': {
      if (typeof arg0 !== 'string') return '/* copy */'
      return `navigator.clipboard?.writeText(${literal(arg0)})`
    }
    case 'openUrl': {
      if (typeof arg0 !== 'string') return '/* openUrl */'
      const newTab = arg1 === 'true' || arg1 === undefined
      return newTab
        ? `window.open(${literal(arg0)}, '_blank')`
        : `window.location.href = ${literal(arg0)}`
    }
    case 'back':
      return 'window.history.back()'
    case 'forward':
      return 'window.history.forward()'
    case 'scrollToTop':
      return 'window.scrollTo({ top: 0, behavior: "smooth" })'
    case 'scrollToBottom':
      return 'window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })'
    default:
      // Unsupported in React without a state runtime — emit no-op so the
      // JSX remains valid but the action is silently skipped. DOM and
      // Framework backends still wire these via their own runtimes.
      return `/* ${action.name}: no React runtime */`
  }
}

/**
 * Emit JSX event-handler attributes (`onClick={...}`, `onKeyDown={...}`,
 * etc.) for the events on this instance.
 *
 * Multiple events on the same instance with the same React event name
 * (e.g. `onkeydown(enter)` + `onkeydown(escape)`) coalesce into a single
 * handler with key-filter branches inside, so React doesn't drop one
 * binding by overwriting the JSX prop.
 */
export function generateEventHandlers(events: EventNode[] | undefined): string {
  if (!events || events.length === 0) return ''
  // Group events by React JSX prop name. `onkeydown(enter)` and
  // `onkeydown(escape)` share the `onKeyDown` slot; they must merge.
  const grouped = new Map<string, EventNode[]>()
  for (const ev of events) {
    const reactName = REACT_EVENT_NAME[ev.name]
    if (!reactName) continue
    const list = grouped.get(reactName) ?? []
    list.push(ev)
    grouped.set(reactName, list)
  }
  const attrs: string[] = []
  for (const [reactName, group] of grouped) {
    const isKeyboard = reactName === 'onKeyDown' || reactName === 'onKeyUp'
    const bodies: string[] = []
    for (const ev of group) {
      const actionExprs = ev.actions.map(a => emitActionExpression(a)).join('; ')
      const key = ev.key ? (KEY_NAME_TO_DOM_KEY[ev.key.toLowerCase()] ?? ev.key) : null
      if (isKeyboard && key) {
        // Each key-filtered branch is a complete `if (...) { ... }` block;
        // adjacent blocks don't need a `;` between them.
        bodies.push(`if (e.key === ${JSON.stringify(key)}) { ${actionExprs} }`)
      } else {
        bodies.push(actionExprs)
      }
    }
    // For non-keyboard groups, multiple events on the same JSX prop must
    // be separated by `;` so two adjacent `window.alert(...)` calls don't
    // parse as a single expression. Keyboard branches are statement-form
    // already, so join with space.
    const body = isKeyboard ? bodies.join(' ') : bodies.join('; ')
    const arg = isKeyboard ? '(e)' : '()'
    attrs.push(`${reactName}={${arg} => { ${body} }}`)
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}
