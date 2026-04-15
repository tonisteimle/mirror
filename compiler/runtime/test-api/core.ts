/**
 * Test API Core Module
 *
 * Element access, state machine, and event simulation.
 */

import type { MirrorElement, RuntimeFunctions, CoreTestAPI, StateMachineInfo } from './types'

/**
 * Create the Core Test API
 */
export function createCoreAPI(runtime: RuntimeFunctions): CoreTestAPI {
  return {
    // ----------------------------------------
    // Element Access
    // ----------------------------------------

    getElement(nodeId: string): MirrorElement | null {
      return document.querySelector(`[data-mirror-id="${nodeId}"]`) as MirrorElement | null
    },

    getAllElements(): MirrorElement[] {
      return Array.from(document.querySelectorAll('[data-mirror-id]')) as MirrorElement[]
    },

    findByName(name: string): MirrorElement | null {
      return (document.querySelector(`[data-mirror-name="${name}"]`) ||
        document.querySelector(`[data-instance-name="${name}"]`) ||
        document.querySelector(`[data-component-name="${name}"]`) ||
        document.querySelector(`[name="${name}"]`)) as MirrorElement | null
    },

    // ----------------------------------------
    // State Inspection
    // ----------------------------------------

    getState(el: MirrorElement): string {
      if (!el) return 'default'
      // Check state machine first
      if (el._stateMachine) {
        return el._stateMachine.current
      }
      // Fallback to dataset
      return el.dataset.state || 'default'
    },

    getAvailableStates(el: MirrorElement): string[] {
      if (!el?._stateMachine) return ['default']
      return Object.keys(el._stateMachine.states)
    },

    getStyles(el: MirrorElement): Record<string, string> {
      if (!el) return {}
      const styles: Record<string, string> = {}
      // Get current inline styles
      for (let i = 0; i < el.style.length; i++) {
        const prop = el.style[i]
        styles[prop] = el.style.getPropertyValue(prop)
      }
      return styles
    },

    getBaseStyles(el: MirrorElement): Record<string, string> {
      return el?._baseStyles || {}
    },

    // ----------------------------------------
    // State Manipulation
    // ----------------------------------------

    setState(el: MirrorElement, state: string): void {
      if (!el) return
      runtime.transitionTo(el, state)
    },

    resetToBase(el: MirrorElement): void {
      if (!el) return
      runtime.transitionTo(el, 'default')
    },

    // ----------------------------------------
    // Event Simulation
    // ----------------------------------------

    trigger(
      el: MirrorElement,
      event: 'click' | 'hover' | 'focus' | 'blur' | 'change' | 'input'
    ): void {
      if (!el) return

      switch (event) {
        case 'click':
          el.click()
          break
        case 'hover':
          el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
          break
        case 'focus':
          el.focus()
          el.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
          break
        case 'blur':
          el.blur()
          el.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
          break
        case 'change':
          el.dispatchEvent(new Event('change', { bubbles: true }))
          break
        case 'input':
          el.dispatchEvent(new InputEvent('input', { bubbles: true }))
          break
      }
    },

    triggerKey(el: MirrorElement, key: string, eventType: 'keydown' | 'keyup' = 'keydown'): void {
      if (!el) return

      // Map common key names
      const keyMap: Record<string, string> = {
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
        up: 'ArrowUp',
        down: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
      }

      const normalizedKey = keyMap[key.toLowerCase()] || key

      el.dispatchEvent(
        new KeyboardEvent(eventType, {
          key: normalizedKey,
          code: normalizedKey,
          bubbles: true,
          cancelable: true,
        })
      )
    },

    // ----------------------------------------
    // Built-in Function Calls
    // ----------------------------------------

    toggle(el: MirrorElement, states?: string[]): void {
      if (!el) return
      runtime.stateMachineToggle(el, states)
    },

    exclusive(el: MirrorElement, state?: string): void {
      if (!el) return
      // Determine target state
      const targetState =
        state ||
        (el._stateMachine
          ? Object.keys(el._stateMachine.states).find(s => s !== 'default')
          : 'active') ||
        'active'
      runtime.exclusiveTransition(el, targetState)
    },

    // ----------------------------------------
    // Debug
    // ----------------------------------------

    logStateMachine(el: MirrorElement): void {
      const info = this.getStateMachineInfo(el)
      if (!info) {
        console.log('[Mirror Test API] No state machine on element')
        return
      }

      console.group('[Mirror Test API] State Machine')
      console.log('Current:', info.current)
      console.log('Initial:', info.initial)
      console.log('States:', info.states)
      console.log('Transitions:', info.transitions)
      console.groupEnd()
    },

    getStateMachineInfo(el: MirrorElement): StateMachineInfo | null {
      if (!el?._stateMachine) return null
      const sm = el._stateMachine
      return {
        current: sm.current,
        initial: sm.initial,
        states: Object.keys(sm.states),
        transitions: sm.transitions.map(t => ({
          trigger: t.trigger,
          to: t.to,
          key: t.key,
          modifier: t.modifier,
        })),
      }
    },
  }
}
