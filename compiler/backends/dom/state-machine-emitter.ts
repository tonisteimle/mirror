/**
 * State Machine Emitter
 *
 * Extracted from DOMGenerator for better maintainability.
 * Handles generation of state machine code for Mirror components.
 *
 * State machines enable:
 * - Component states (hover, focus, on, off, etc.)
 * - State transitions with animations
 * - Toggle and exclusive behaviors
 * - 'When' dependencies (show X when Y is in state Z)
 */

import type { IRNode, IRStateMachine, IRStateTransition, IRStateAnimation } from '../../ir/types'
import type { StateMachineEmitterContext, DeferredWhenWatcher } from './base-emitter-context'

// Re-export for backwards compatibility
export type { StateMachineEmitterContext, DeferredWhenWatcher } from './base-emitter-context'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Serialize an IRStateAnimation to a JavaScript object literal
 */
function serializeAnimation(anim: IRStateAnimation): string {
  const parts: string[] = []
  if (anim.preset) parts.push(`preset: '${anim.preset}'`)
  if (anim.duration !== undefined) parts.push(`duration: ${anim.duration}`)
  if (anim.easing) parts.push(`easing: '${anim.easing}'`)
  if (anim.delay !== undefined) parts.push(`delay: ${anim.delay}`)
  return `{ ${parts.join(', ')} }`
}

// =============================================================================
// State Child Emission
// =============================================================================

/**
 * Emit nested children for state child elements
 */
function emitStateChildNested(
  ctx: StateMachineEmitterContext,
  node: IRNode,
  varName: string,
  parentVar: string
): void {
  ctx.emit(`const ${varName} = document.createElement('${node.tag}')`)

  // Set HTML properties
  for (const prop of node.properties) {
    if (prop.name === 'textContent') {
      const value = typeof prop.value === 'string' ? `"${ctx.escapeString(prop.value)}"` : prop.value
      ctx.emit(`${varName}.textContent = ${value}`)
    } else if (prop.name === 'disabled' || prop.name === 'hidden') {
      ctx.emit(`${varName}.${prop.name} = ${prop.value}`)
    } else {
      const value = typeof prop.value === 'string' ? `"${ctx.escapeString(String(prop.value))}"` : prop.value
      ctx.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
    }
  }

  // Apply base styles
  const baseStyles = node.styles.filter(s => !s.state)
  for (const style of baseStyles) {
    if (style.value.includes("'")) {
      ctx.emit(`${varName}.style['${style.property}'] = "${style.value}"`)
    } else {
      ctx.emit(`${varName}.style['${style.property}'] = '${style.value}'`)
    }
  }

  // Handle icon loading
  if (node.primitive === 'icon') {
    const iconProp = node.properties.find(p => p.name === 'textContent')
    if (iconProp && typeof iconProp.value === 'string') {
      const iconName = iconProp.value
      const iconSize = node.styles.find(s => s.property === 'fontSize')?.value || '16'
      const iconColor = node.styles.find(s => s.property === 'color')?.value || 'currentColor'
      const iconWeight = node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
      ctx.emit(`${varName}.dataset.iconSize = '${iconSize.replace('px', '')}'`)
      ctx.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
      ctx.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
      ctx.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
    }
  }

  // Recursively add nested children
  for (let i = 0; i < node.children.length; i++) {
    const childVarName = `${varName}_c${i}`
    emitStateChildNested(ctx, node.children[i], childVarName, varName)
  }

  ctx.emit(`${parentVar}.appendChild(${varName})`)
}

/**
 * Emit code to create a state child element (for states with children)
 * Creates element inline within the children factory function
 */
function emitStateChild(ctx: StateMachineEmitterContext, node: IRNode, index: number): void {
  const varName = `_sc${index}`

  ctx.emit(`const ${varName} = document.createElement('${node.tag}')`)

  // Set HTML properties
  for (const prop of node.properties) {
    if (prop.name === 'textContent') {
      const value = typeof prop.value === 'string' ? `"${ctx.escapeString(prop.value)}"` : prop.value
      ctx.emit(`${varName}.textContent = ${value}`)
    } else if (prop.name === 'disabled' || prop.name === 'hidden') {
      ctx.emit(`${varName}.${prop.name} = ${prop.value}`)
    } else {
      const value = typeof prop.value === 'string' ? `"${ctx.escapeString(String(prop.value))}"` : prop.value
      ctx.emit(`${varName}.setAttribute('${prop.name}', ${value})`)
    }
  }

  // Apply base styles
  const baseStyles = node.styles.filter(s => !s.state)
  for (const style of baseStyles) {
    if (style.value.includes("'")) {
      ctx.emit(`${varName}.style['${style.property}'] = "${style.value}"`)
    } else {
      ctx.emit(`${varName}.style['${style.property}'] = '${style.value}'`)
    }
  }

  // Handle icon loading (special case for Icon primitive)
  if (node.primitive === 'icon') {
    const iconProp = node.properties.find(p => p.name === 'textContent')
    if (iconProp && typeof iconProp.value === 'string') {
      const iconName = iconProp.value
      // Store icon properties for loading
      const iconSize = node.styles.find(s => s.property === 'fontSize')?.value || '16'
      const iconColor = node.styles.find(s => s.property === 'color')?.value || 'currentColor'
      const iconWeight = node.styles.find(s => s.property === 'strokeWidth')?.value || '2'
      ctx.emit(`${varName}.dataset.iconSize = '${iconSize.replace('px', '')}'`)
      ctx.emit(`${varName}.dataset.iconColor = '${iconColor}'`)
      ctx.emit(`${varName}.dataset.iconWeight = '${iconWeight}'`)
      ctx.emit(`_runtime.loadIcon(${varName}, '${iconName}')`)
    }
  }

  // Recursively add children
  for (let i = 0; i < node.children.length; i++) {
    const childVarName = `_sc${index}_c${i}`
    emitStateChildNested(ctx, node.children[i], childVarName, varName)
  }

  ctx.emit(`_stateChildren.push(${varName})`)
}

// =============================================================================
// State Machine Listeners
// =============================================================================

/**
 * Emit event listeners for state machine transitions
 */
function emitStateMachineListeners(
  ctx: StateMachineEmitterContext,
  varName: string,
  sm: IRStateMachine
): void {
  // Separate trigger-based and when-based transitions
  const triggerTransitions = sm.transitions.filter(t => t.trigger)
  const whenTransitions = sm.transitions.filter(t => t.when)

  // Group trigger transitions by trigger type
  const byTrigger = new Map<string, IRStateTransition[]>()
  for (const t of triggerTransitions) {
    const key = t.key ? `${t.trigger}:${t.key}` : t.trigger
    if (!byTrigger.has(key)) byTrigger.set(key, [])
    byTrigger.get(key)!.push(t)
  }

  for (const [triggerKey, transitions] of byTrigger) {
    const [trigger, key] = triggerKey.split(':')
    const domEvent = trigger.replace(/^on/, '') // onclick -> click

    ctx.emit(`${varName}.addEventListener('${domEvent}', (e) => {`)
    ctx.indentIn()

    // For keyboard events, check the key
    if (key) {
      ctx.emit(`if (e.key.toLowerCase() !== '${key}') return`)
    }

    ctx.emit(`const sm = ${varName}._stateMachine`)
    ctx.emit(`const current = sm.current`)

    // Handle each transition
    for (const t of transitions) {
      // Build animation argument if present
      const animArg = t.animation ? `, ${serializeAnimation(t.animation)}` : ''

      if (t.modifier === 'toggle') {
        // Check if this is multi-state cycle or binary toggle
        // Multi-state: 2+ custom states (excluding 'default')
        const customStates = Object.keys(sm.states).filter(s => s !== 'default')
        if (customStates.length >= 2) {
          // Multi-state cycle: use stateMachineToggle to cycle through states
          ctx.emit(`_runtime.stateMachineToggle(${varName})`)
        } else {
          // Binary toggle: switch between target state and 'default'
          // Note: We use 'default' directly, not sm.initial, because initial
          // might be set to 'on' if the instance starts with that state modifier
          ctx.emit(`if (current === '${t.to}') {`)
          ctx.indentIn()
          ctx.emit(`_runtime.transitionTo(${varName}, 'default')`)
          ctx.indentOut()
          ctx.emit(`} else {`)
          ctx.indentIn()
          ctx.emit(`_runtime.transitionTo(${varName}, '${t.to}'${animArg})`)
          ctx.indentOut()
          ctx.emit(`}`)
        }
      } else if (t.modifier === 'exclusive') {
        // Exclusive: deselect siblings first
        ctx.emit(`_runtime.exclusiveTransition(${varName}, '${t.to}'${animArg})`)
      } else {
        // Normal transition
        ctx.emit(`_runtime.transitionTo(${varName}, '${t.to}'${animArg})`)
      }
    }

    ctx.indentOut()
    ctx.emit(`})`)
  }

  // Defer 'when' dependency watchers until after DOM is built
  for (const t of whenTransitions) {
    ctx.addDeferredWhenWatcher({ varName, transition: t, sm })
  }
}

// =============================================================================
// Main State Machine Emitter
// =============================================================================

/**
 * Emit a complete state machine for a node
 *
 * Generates:
 * - State machine config on element (_stateMachine)
 * - Event listeners for transitions
 * - Initial state setup
 */
export function emitStateMachine(
  ctx: StateMachineEmitterContext,
  varName: string,
  node: IRNode
): void {
  const sm = node.stateMachine!
  // Use instance's initialState if set, otherwise use state machine's initial
  const effectiveInitial = node.initialState || sm.initial

  // Store state machine config
  ctx.emit(`${varName}._stateMachine = {`)
  ctx.indentIn()
  ctx.emit(`initial: '${effectiveInitial}',`)
  ctx.emit(`current: '${effectiveInitial}',`)

  // States with their styles and animations
  ctx.emit(`states: {`)
  ctx.indentIn()
  for (const [name, state] of Object.entries(sm.states)) {
    ctx.emit(`'${name}': {`)
    ctx.indentIn()
    ctx.emit(`styles: {`)
    ctx.indentIn()
    for (const style of state.styles) {
      ctx.emit(`'${style.property}': '${style.value}',`)
    }
    ctx.indentOut()
    ctx.emit(`},`)
    // Enter animation
    if (state.enter) {
      ctx.emit(`enter: ${serializeAnimation(state.enter)},`)
    }
    // Exit animation
    if (state.exit) {
      ctx.emit(`exit: ${serializeAnimation(state.exit)},`)
    }
    // State children (like Figma Variants)
    if (state.children && state.children.length > 0) {
      ctx.emit(`children: () => {`)
      ctx.indentIn()
      ctx.emit(`const _stateChildren = []`)
      for (let i = 0; i < state.children.length; i++) {
        emitStateChild(ctx, state.children[i], i)
      }
      ctx.emit(`return _stateChildren`)
      ctx.indentOut()
      ctx.emit(`},`)
    }
    ctx.indentOut()
    ctx.emit(`},`)
  }
  ctx.indentOut()
  ctx.emit(`},`)

  // Transitions
  ctx.emit(`transitions: [`)
  ctx.indentIn()
  for (const t of sm.transitions) {
    const keyPart = t.key ? `, key: '${t.key}'` : ''
    const modPart = t.modifier ? `, modifier: '${t.modifier}'` : ''
    const animPart = t.animation ? `, animation: ${serializeAnimation(t.animation)}` : ''
    ctx.emit(`{ to: '${t.to}', trigger: '${t.trigger}'${keyPart}${modPart}${animPart} },`)
  }
  ctx.indentOut()
  ctx.emit(`],`)

  ctx.indentOut()
  ctx.emit(`}`)

  // Save base display value for visibility states (before it gets set to 'none')
  if (sm.states['visible']) {
    // For hidden elements with 'visible' state, the base display is 'flex' (default for frames)
    ctx.emit(`${varName}._baseDisplay = 'flex'`)
  }

  // Capture _baseStyles BEFORE applying initial state styles
  // This is critical for exclusive() - we need the actual base styles (e.g. gray background),
  // not the initial state styles (e.g. blue background for active state)
  // Collect all unique style properties from all states
  const allStyleProps = new Set<string>()
  for (const state of Object.values(sm.states)) {
    for (const style of state.styles) {
      allStyleProps.add(style.property)
    }
  }

  if (allStyleProps.size > 0) {
    ctx.emit(`${varName}._baseStyles = {`)
    ctx.indentIn()
    for (const prop of allStyleProps) {
      ctx.emit(`'${prop}': ${varName}.style['${prop}'] || '',`)
    }
    ctx.indentOut()
    ctx.emit(`}`)
  }

  // Set initial state
  ctx.emit(`${varName}.dataset.state = '${effectiveInitial}'`)

  // Apply initial state styles
  ctx.emit(`Object.assign(${varName}.style, ${varName}._stateMachine.states['${effectiveInitial}'].styles)`)

  // Apply initial state children if present (like Figma Variants)
  // Only call the factory if the initial state is NOT 'default'
  // When initial state is 'default', the children are rendered normally (not via factory)
  const initialStateDef = sm.states[effectiveInitial]
  if (effectiveInitial !== 'default' && initialStateDef?.children && initialStateDef.children.length > 0) {
    ctx.emit(`// Render initial state children`)
    ctx.emit(`{`)
    ctx.indentIn()
    ctx.emit(`const _initStateChildren = ${varName}._stateMachine.states['${effectiveInitial}'].children()`)
    ctx.emit(`for (const child of _initStateChildren) {`)
    ctx.indentIn()
    ctx.emit(`${varName}.appendChild(child)`)
    ctx.indentOut()
    ctx.emit(`}`)
    ctx.indentOut()
    ctx.emit(`}`)
  }

  // Generate event listeners for transitions
  emitStateMachineListeners(ctx, varName, sm)
}

// =============================================================================
// When Watcher Emission
// =============================================================================

/**
 * Emit a state watcher for 'when' dependencies
 * Example: visible when Menu open or Sidebar open:
 */
export function emitWhenWatcher(
  ctx: StateMachineEmitterContext,
  varName: string,
  transition: IRStateTransition,
  sm: IRStateMachine
): void {
  if (!transition.when) return

  // Collect all target elements from the dependency chain
  const targets: Array<{ target: string; state: string }> = []
  let dep = transition.when
  let condition = dep.condition || 'or' // Default to 'or' for single condition
  while (dep) {
    targets.push({ target: dep.target, state: dep.state })
    if (dep.condition) condition = dep.condition
    dep = dep.next as typeof dep
  }

  // Generate the check function
  ctx.emit(`// When dependency: ${transition.to} when ${targets.map(t => `${t.target} ${t.state}`).join(` ${condition} `)}`)
  ctx.emit(`_runtime.watchStates(${varName}, '${transition.to}', '${sm.initial}', '${condition}', [`)
  ctx.indentIn()
  for (const t of targets) {
    ctx.emit(`{ target: '${t.target}', state: '${t.state}' },`)
  }
  ctx.indentOut()
  ctx.emit(`])`)
}

/**
 * Emit all deferred when watchers after DOM is fully built
 * This ensures that target elements can be found via querySelector
 */
export function emitDeferredWhenWatchers(
  ctx: StateMachineEmitterContext,
  deferredWatchers: DeferredWhenWatcher[]
): void {
  if (deferredWatchers.length === 0) return

  ctx.emit('')
  ctx.emit('// Setup when dependencies (after DOM is built)')
  for (const { varName, transition, sm } of deferredWatchers) {
    emitWhenWatcher(ctx, varName, transition, sm)
  }
}
