/**
 * Visibility Control Functions
 *
 * show / hide / toggle / close. All accept string|element (Mirror
 * data-mirror-name lookup), self-contained for runtime-template
 * stamping. batchInFrame() was dropped to align with the template
 * (which never batched). The stateMachineToggle fast-path was
 * dropped from toggle for the same reason — the template's inline
 * toggle never had it either, and stateMachineToggle pulls in
 * transitionTo + animations which still live in the inline runtime.
 *
 * close() retains its setState-based state-pair handling but does
 * NOT have the inline runtime's `this.transitionTo(el, 'default')`
 * fast-path for state-machine elements (since transitionTo isn't
 * stamped). Stamping close would lose the animated dialog/popover
 * close, so it stays as an inline _runtime method (see runtime-template).
 */

import type { MirrorElement } from './types'
import { resolveElement } from './dom-lookup'
import { applyState, setState } from './state-machine'

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

/**
 * Toggle element visibility or paired state.
 * Priority: paired-state flip (open↔closed, expanded↔collapsed) →
 * hidden flip with on/off state styles.
 */
export function toggle(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  const STATE_PAIRS: Record<string, string> = {
    closed: 'open',
    open: 'closed',
    collapsed: 'expanded',
    expanded: 'collapsed',
  }
  const currentState = target.dataset.state || target._initialState
  const newState = STATE_PAIRS[currentState as string]
  if (newState) {
    setState(target, newState)
    return
  }
  target.hidden = !target.hidden
  applyState(target, target.hidden ? 'off' : 'on')
}

/**
 * Close an element: prefer setState('closed') / setState('collapsed') if the
 * element uses those state pairs, otherwise fall back to hide().
 *
 * Not stamped into the runtime template (the template's close() has a
 * `this.transitionTo(el, 'default')` fast-path for state-machine
 * elements — animated dialog/popover close — and transitionTo isn't
 * yet stamped).
 */
export function close(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  const states = [target._initialState, target.dataset.state]
  if (states.some(s => s === 'open' || s === 'closed')) {
    setState(target, 'closed')
    return
  }
  if (states.some(s => s === 'expanded' || s === 'collapsed')) {
    setState(target, 'collapsed')
    return
  }
  hide(target)
}
