/**
 * State Machine System
 *
 * State transitions, toggle, exclusive selection, and visibility management.
 */

import type { MirrorElement, StateAnimation } from './types'
import { batchInFrame } from './batching'
import { playStateAnimation } from './animations'
import { notifyDataChange } from './data-binding'

// ============================================
// BASE STYLE MANAGEMENT
// ============================================

/**
 * Collect all style properties that can be changed by any state
 */
function collectStateProperties(stateStyles: Record<string, Record<string, string>>): Set<string> {
  const props = new Set<string>()
  for (const state of Object.values(stateStyles)) {
    for (const prop of Object.keys(state)) {
      props.add(prop)
    }
  }
  return props
}

/**
 * Store base styles for state properties
 */
function storeBaseStyles(el: MirrorElement, props: Set<string>): void {
  el._baseStyles = {}
  for (const prop of props) {
    el._baseStyles[prop] = (el.style as unknown as Record<string, string>)[prop] || ''
  }
}

/**
 * Ensure element has base styles stored
 */
function ensureBaseStyles(el: MirrorElement): void {
  if (el._baseStyles || !el._stateStyles) return
  const props = collectStateProperties(el._stateStyles)
  storeBaseStyles(el, props)
}

/**
 * Ensure element has base styles from state machine
 */
function ensureBaseStylesFromMachine(el: MirrorElement): void {
  if (el._baseStyles || !el._stateMachine) return

  const props = new Set<string>()
  for (const state of Object.values(el._stateMachine.states)) {
    for (const prop of Object.keys(state.styles)) {
      props.add(prop)
    }
  }
  storeBaseStyles(el, props)
}

// ============================================
// SIMPLE STATE FUNCTIONS
// ============================================

/**
 * Apply state styles to an element
 */
export function applyState(el: MirrorElement | null, state: string): void {
  if (!el?._stateStyles?.[state]) return
  Object.assign(el.style, el._stateStyles[state])
}

/**
 * Remove state styles from an element (restore base styles)
 */
export function removeState(el: MirrorElement | null, _state: string): void {
  if (!el?._baseStyles) return
  Object.assign(el.style, el._baseStyles)
}

/**
 * Set element to a named state
 */
export function setState(el: MirrorElement | null, stateName: string): void {
  if (!el) return
  ensureBaseStyles(el)
  if (el._baseStyles) Object.assign(el.style, el._baseStyles)
  el.dataset.state = stateName
  if (stateName !== 'default' && el._stateStyles?.[stateName])
    Object.assign(el.style, el._stateStyles[stateName])
  updateVisibility(el)
}

/**
 * Toggle between two states
 */
export function toggleState(el: MirrorElement | null, state1: string, state2?: string): void {
  if (!el) return
  const fallback = state2 || 'default'
  const current = el.dataset.state || fallback
  const next = current === state1 ? fallback : state1
  setState(el, next)
}

// ============================================
// STATE MACHINE TOGGLE
// ============================================

const CSS_PSEUDO_STATES = ['default', 'hover', 'focus', 'active', 'disabled']

/**
 * Get custom states from state machine (excluding CSS pseudo-states)
 */
function getCustomStates(sm: NonNullable<MirrorElement['_stateMachine']>): string[] {
  return Object.keys(sm.states).filter(s => !CSS_PSEUDO_STATES.includes(s))
}

/**
 * Toggle: 1 state = binary (default ↔ state), 2+ states = cycle
 */
export function stateMachineToggle(el: MirrorElement | null, stateOrder?: string[]): void {
  if (!el?._stateMachine) return
  const sm = el._stateMachine
  const order = stateOrder || getCustomStates(sm)
  if (order.length === 0) return
  if (order.length === 1) {
    transitionTo(el, sm.current === order[0] ? 'default' : order[0])
    return
  } // Binary toggle
  const currentIndex = order.indexOf(sm.current)
  transitionTo(el, order[currentIndex === -1 ? 0 : (currentIndex + 1) % order.length])
}

// ============================================
// TRANSITION HELPERS
// ============================================

/**
 * Store base children on first transition
 */
function storeBaseChildren(el: MirrorElement): void {
  if (el._baseChildren) return

  const hasStateWithChildren = Object.values(el._stateMachine!.states).some(s => s.children)
  if (hasStateWithChildren) {
    el._baseChildren = Array.from(el.children) as HTMLElement[]
  }
}

/**
 * Handle visibility state entry
 */
function handleVisibilityEntry(el: MirrorElement, stateName: string): void {
  if (stateName === 'visible') {
    el.style.display = el._baseDisplay || 'flex'
    el.hidden = false
  }
}

/**
 * Restore base styles before applying new state
 */
function restoreBaseStyles(
  el: MirrorElement,
  hasExitAnim: boolean,
  baseDisplay: string | undefined
): void {
  if (!el._baseStyles) return

  if (hasExitAnim && baseDisplay === 'none') {
    const { display: _, ...otherStyles } = el._baseStyles
    Object.assign(el.style, otherStyles)
  } else {
    Object.assign(el.style, el._baseStyles)
  }
}

/**
 * Swap children for state with children (Figma Variants style)
 */
function swapChildren(
  el: MirrorElement,
  newState: NonNullable<MirrorElement['_stateMachine']>['states'][string],
  prevState: NonNullable<MirrorElement['_stateMachine']>['states'][string] | undefined
): void {
  if (newState.children) {
    const fragment = document.createDocumentFragment()
    for (const child of newState.children()) {
      fragment.appendChild(child)
    }
    el.replaceChildren(fragment)
  } else if (el._baseChildren && prevState?.children) {
    const fragment = document.createDocumentFragment()
    for (const child of el._baseChildren) {
      fragment.appendChild(child.cloneNode(true))
    }
    el.replaceChildren(fragment)
  }
}

/**
 * Apply animated or immediate transition
 */
function applyTransition(
  el: MirrorElement,
  anim: StateAnimation | undefined,
  newStyles: Record<string, string>,
  shouldHideAfter: boolean
): void {
  if (!anim) {
    Object.assign(el.style, newStyles as Partial<CSSStyleDeclaration>)
    el._isTransitioning = false
    return
  }

  const maxDuration = Math.min(((anim.duration || 0.3) + (anim.delay || 0)) * 1000 + 500, 10000)
  const safetyTimeout = setTimeout(() => {
    if (el._isTransitioning) el._isTransitioning = false
  }, maxDuration)

  playStateAnimation(el, anim, newStyles)
    .then(() => {
      clearTimeout(safetyTimeout)
      if (shouldHideAfter) {
        el.style.display = 'none'
        el.hidden = true
      }
      el._isTransitioning = false
    })
    .catch(() => {
      clearTimeout(safetyTimeout)
      el._isTransitioning = false
    })
}

/**
 * Handle visibility when leaving visible state
 */
function handleVisibilityExit(
  el: MirrorElement,
  prevStateName: string,
  stateName: string,
  sm: NonNullable<MirrorElement['_stateMachine']>
): void {
  if (prevStateName === 'visible' && sm.states['visible'] && stateName !== 'visible') {
    el.style.display = 'none'
    el.hidden = true
  }
}

// ============================================
// MAIN TRANSITION FUNCTION
// ============================================

/**
 * Transition element to a new state using its state machine
 */
export function transitionTo(
  el: MirrorElement | null,
  stateName: string,
  animation?: StateAnimation
): void {
  if (!el?._stateMachine) return

  const sm = el._stateMachine
  const prevStateName = sm.current
  const prevState = sm.states[prevStateName]
  const newState = sm.states[stateName]

  if (!newState || prevStateName === stateName) return
  if (el._isTransitioning) return

  el._isTransitioning = true
  ensureBaseStylesFromMachine(el)
  storeBaseChildren(el)
  sm.current = stateName

  const anim = animation || newState.enter || prevState?.exit
  const hasExitAnim = Boolean(anim && prevState?.exit)
  const shouldHideAfter = hasExitAnim && el._baseStyles?.display === 'none'

  batchInFrame(() => {
    el.dataset.state = stateName
    handleVisibilityEntry(el, stateName)
    restoreBaseStyles(el, hasExitAnim, el._baseStyles?.display)
    swapChildren(el, newState, prevState)
    applyTransition(el, anim, newState.styles, shouldHideAfter)
    handleVisibilityExit(el, prevStateName, stateName, sm)
    updateVisibility(el)
  })
}

// ============================================
// EXCLUSIVE TRANSITION
// ============================================

/**
 * Find siblings with same component type
 */
function findSiblings(el: MirrorElement): MirrorElement[] {
  const parent = el.parentElement
  if (!parent) return []

  const componentName = el.dataset.component
  const selector = componentName ? `[data-component="${componentName}"]` : '[data-mirror-id]'

  return Array.from(parent.querySelectorAll(selector)) as MirrorElement[]
}

/**
 * Deselect all siblings
 */
function deselectSiblings(el: MirrorElement, siblings: MirrorElement[]): void {
  for (const sibling of siblings) {
    if (sibling !== el && sibling._stateMachine?.current !== 'default') {
      transitionTo(sibling, 'default')
    }
  }
}

/**
 * Find loop item value for binding
 */
function findLoopItem(el: MirrorElement): unknown {
  if (el._loopItem !== undefined) return el._loopItem

  let walker = el.parentElement as MirrorElement | null
  while (walker) {
    if (walker._loopItem !== undefined) return walker._loopItem
    if (walker.dataset?.eachItem !== undefined) break
    walker = walker.parentElement as MirrorElement | null
  }
  return undefined
}

/**
 * Update bind variable in parent container
 */
function updateBindVariable(el: MirrorElement): void {
  let container = el.parentElement as MirrorElement | null

  while (container) {
    const bindVar = container.dataset.bind
    if (bindVar) {
      const loopItem = findLoopItem(el)
      const value = loopItem !== undefined ? loopItem : el.textContent?.trim() || ''

      if (typeof window !== 'undefined') {
        window._mirrorState = window._mirrorState || {}
        window._mirrorState[bindVar] = value
      }

      notifyDataChange(bindVar, value)
      return
    }
    container = container.parentElement as MirrorElement | null
  }
}

/**
 * Exclusive transition - deselect siblings before transitioning
 */
export function exclusiveTransition(
  el: MirrorElement | null,
  stateName: string,
  animation?: StateAnimation
): void {
  if (!el?._stateMachine) return

  const siblings = findSiblings(el)
  deselectSiblings(el, siblings)
  transitionTo(el, stateName, animation)
  updateBindVariable(el)
}

// ============================================
// WATCH STATES
// ============================================

interface WatchDependency {
  target: string
  state: string
}

/**
 * Find target elements by name
 */
function findTargetElements(
  root: Element,
  dependencies: WatchDependency[]
): Map<string, MirrorElement> {
  const targets = new Map<string, MirrorElement>()

  for (const dep of dependencies) {
    const el = root.querySelector(`[data-mirror-name="${dep.target}"]`) as MirrorElement
    if (el) targets.set(dep.target, el)
  }

  return targets
}

/**
 * Check if condition is met
 */
function checkWatchCondition(
  condition: 'and' | 'or',
  dependencies: WatchDependency[],
  targets: Map<string, MirrorElement>
): boolean {
  const checker = (dep: WatchDependency) => targets.get(dep.target)?.dataset.state === dep.state

  return condition === 'and' ? dependencies.every(checker) : dependencies.some(checker)
}

/**
 * Watch states of target elements and transition when condition is met
 */
export function watchStates(
  el: MirrorElement | null,
  targetState: string,
  initialState: string,
  condition: 'and' | 'or',
  dependencies: WatchDependency[]
): void {
  if (!el) return

  const root = el.closest('[data-mirror-root]') || document.body
  const targets = findTargetElements(root, dependencies)

  let isActive = true
  let stateObserver: MutationObserver
  let cleanupObserver: MutationObserver

  const cleanup = () => {
    if (!isActive) return
    isActive = false
    stateObserver.disconnect()
    cleanupObserver.disconnect()
  }

  const updateState = () => {
    if (!el.isConnected) {
      cleanup()
      return
    }
    const shouldTransition = checkWatchCondition(condition, dependencies, targets)
    transitionTo(el, shouldTransition ? targetState : initialState)
  }

  // Initial check
  updateState()

  // Watch for state changes
  stateObserver = new MutationObserver(mutations => {
    if (!el.isConnected) {
      cleanup()
      return
    }
    for (const m of mutations) {
      if (m.attributeName === 'data-state') {
        updateState()
        break
      }
    }
  })

  for (const target of targets.values()) {
    stateObserver.observe(target, { attributes: true, attributeFilter: ['data-state'] })
  }

  // Cleanup on element removal
  cleanupObserver = new MutationObserver(mutations => {
    if (!el.isConnected) {
      cleanup()
      return
    }
    for (const m of mutations) {
      for (const node of m.removedNodes) {
        if (node === el || (node instanceof Element && node.contains(el))) {
          cleanup()
          return
        }
      }
    }
  })

  cleanupObserver.observe(root, { childList: true, subtree: true })
}

// ============================================
// VISIBILITY
// ============================================

/**
 * Known state names for condition evaluation
 */
const KNOWN_STATES = [
  'open',
  'closed',
  'expanded',
  'collapsed',
  'active',
  'inactive',
  'selected',
  'disabled',
  'loading',
  'error',
  'on',
  'off',
]

/**
 * Build state context for condition evaluation
 */
function buildStateContext(currentState: string | undefined): Record<string, boolean> {
  const states: Record<string, boolean> = {}

  for (const name of KNOWN_STATES) {
    states[name] = currentState === name
  }

  if (currentState) {
    states[currentState] = true
  }

  return states
}

/**
 * Evaluate a single token in condition
 */
function evaluateToken(
  token: string,
  states: Record<string, boolean>,
  currentState: string | undefined
): boolean {
  let negate = false
  let stateName = token

  if (stateName.startsWith('!')) {
    negate = true
    stateName = stateName.slice(1).trim()
  }

  const value = states[stateName] !== undefined ? states[stateName] : currentState === stateName
  return negate ? !value : value
}

/**
 * Safe condition evaluator for visibility
 */
function evaluateCondition(condition: string, currentState: string | undefined): boolean {
  const states = buildStateContext(currentState)
  const tokens = condition.split(/(\s*&&\s*|\s*\|\|\s*)/).filter(t => t.trim())

  let result: boolean | null = null
  let pendingOp: string | null = null

  for (const token of tokens) {
    const trimmed = token.trim()

    if (trimmed === '&&' || trimmed === '||') {
      pendingOp = trimmed
      continue
    }

    const value = evaluateToken(trimmed, states, currentState)

    if (result === null) {
      result = value
    } else if (pendingOp === '&&') {
      result = result && value
    } else if (pendingOp === '||') {
      result = result || value
    }
    pendingOp = null
  }

  return result === true
}

/**
 * Check if condition contains logical operators
 */
function hasLogicalOperators(condition: string): boolean {
  return condition.includes('&&') || condition.includes('||') || condition.includes('!')
}

/**
 * Evaluate child visibility based on condition
 */
function evaluateChildVisibility(condition: string, state: string | undefined): boolean {
  if (hasLogicalOperators(condition)) {
    try {
      return evaluateCondition(condition, state)
    } catch (err) {
      console.warn(`[Mirror] Invalid visibility condition "${condition}":`, err)
      return false
    }
  }
  return state === condition
}

/**
 * Update visibility of children based on parent state
 */
export function updateVisibility(el: MirrorElement | null): void {
  if (!el) return

  const state = el.dataset.state
  const children = el.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>

  for (const child of children) {
    if (child._visibleWhen) {
      const visible = evaluateChildVisibility(child._visibleWhen, state)
      child.style.display = visible ? '' : 'none'
    }
  }
}
