/**
 * Visibility Control Functions
 *
 * Functions for showing, hiding, and toggling element visibility.
 *
 * `show` and `hide` accept string|element (Mirror data-mirror-name
 * lookup) and are self-contained so they can be stamped into the
 * runtime template. The previous implementation wrapped DOM writes in
 * batchInFrame() — dropped here to align with the template, which
 * never batched. Re-introduce batching in a dedicated pass once the
 * batching module itself is stamped.
 *
 * `toggle` and `close` still depend on the state-machine helpers
 * (applyState, setState, stateMachineToggle). They're not yet stamped
 * — the template uses its own this.setState/applyState methods on
 * _runtime, which works but diverges from this typed implementation.
 * Consolidation of the state-machine cluster is a separate sprint.
 */

import type { MirrorElement } from './types'
import { resolveElement } from './dom-lookup'
import { applyState, setState, stateMachineToggle } from './state-machine'

/**
 * Show an element by restoring its display value.
 */
export function show(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  target.style.display = target._savedDisplay || ''
  target.hidden = false
}

/**
 * Hide an element by setting display to none.
 */
export function hide(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  if (target.style.display !== 'none') {
    target._savedDisplay = target.style.display
  }
  target.style.display = 'none'
  target.hidden = true
}

const STATE_PAIRS: Record<string, string> = {
  closed: 'open',
  open: 'closed',
  collapsed: 'expanded',
  expanded: 'collapsed',
}

/**
 * Toggle element visibility or paired state.
 * Priority: state-machine toggle → paired-state toggle → hidden flip.
 */
export function toggle(el: MirrorElement | null): void {
  if (!el) return
  if (el._stateMachine) {
    stateMachineToggle(el)
    return
  }
  const currentState = el.dataset.state || el._initialState
  const newState = STATE_PAIRS[currentState as string]
  if (newState) {
    setState(el, newState)
    return
  }
  el.hidden = !el.hidden
  applyState(el, el.hidden ? 'off' : 'on')
}

/**
 * Close an element: prefer setState('closed') / setState('collapsed') if the
 * element uses those state pairs, otherwise fall back to hide().
 */
export function close(el: MirrorElement | null): void {
  if (!el) return
  const states = [el._initialState, el.dataset.state]
  if (states.some(s => s === 'open' || s === 'closed')) {
    setState(el, 'closed')
    return
  }
  if (states.some(s => s === 'expanded' || s === 'collapsed')) {
    setState(el, 'collapsed')
    return
  }
  hide(el)
}
