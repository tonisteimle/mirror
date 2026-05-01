/**
 * Visibility Control Functions
 *
 * Functions for showing, hiding, and toggling element visibility.
 */

import type { MirrorElement } from './types'
import { batchInFrame } from './batching'
import { applyState, setState, stateMachineToggle } from './state-machine'

/**
 * Show an element by restoring its display value
 */
export function show(el: MirrorElement | null): void {
  if (!el) return
  batchInFrame(() => {
    el.style.display = el._savedDisplay || ''
    el.hidden = false
  })
}

/**
 * Hide an element by setting display to none
 */
export function hide(el: MirrorElement | null): void {
  if (!el) return
  if (el.style.display !== 'none') {
    el._savedDisplay = el.style.display
  }
  batchInFrame(() => {
    el.style.display = 'none'
    el.hidden = true
  })
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
