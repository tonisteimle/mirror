/**
 * Event Emitter Module
 *
 * Handles generation of event listeners and action handlers.
 * Extracted from dom.ts for modularity.
 */

import type { IREvent, IRAction } from '../../ir/types'
import type { EventEmitterContext } from './base-emitter-context'

// Re-export for backwards compatibility
export type { EventEmitterContext } from './base-emitter-context'

/**
 * Map DSL key names to JavaScript key event values.
 */
export function mapKeyName(key: string): string {
  const mapping: Record<string, string> = {
    escape: 'Escape',
    enter: 'Enter',
    tab: 'Tab',
    space: ' ',
    'arrow-up': 'ArrowUp',
    'arrow-down': 'ArrowDown',
    'arrow-left': 'ArrowLeft',
    'arrow-right': 'ArrowRight',
    backspace: 'Backspace',
    delete: 'Delete',
  }
  return mapping[key] || key
}

/**
 * Emit enter/exit viewport observer.
 */
export function emitEnterExitObserver(
  ctx: EventEmitterContext,
  varName: string,
  event: IREvent,
  isEnter: boolean,
  emitAction: (action: IRAction, currentVar: string) => void
): void {
  const callbackName = `${varName}_${isEnter ? 'enter' : 'exit'}`

  ctx.emit(`// ${isEnter ? 'Enter' : 'Exit'} viewport observer`)
  ctx.emit(`const ${callbackName}Callback = () => {`)
  ctx.indentIn()
  for (const action of event.actions) {
    emitAction(action, varName)
  }
  ctx.indentOut()
  ctx.emit(`}`)

  if (isEnter) {
    ctx.emit(`${varName}._enterCallback = ${callbackName}Callback`)
  } else {
    ctx.emit(`${varName}._exitCallback = ${callbackName}Callback`)
  }

  ctx.emit(`if (!${varName}._enterExitObserver) {`)
  ctx.indentIn()
  ctx.emit(
    `_runtime.setupEnterExitObserver(${varName}, ${varName}._enterCallback, ${varName}._exitCallback)`
  )
  ctx.indentOut()
  ctx.emit(`}`)
}

/**
 * Emit a standard event listener.
 */
export function emitEventListener(
  ctx: EventEmitterContext,
  varName: string,
  event: IREvent,
  emitAction: (action: IRAction, currentVar: string) => void
): void {
  const eventName = event.name

  // Handle enter/exit events with IntersectionObserver
  if (eventName === 'enter' || eventName === 'exit') {
    emitEnterExitObserver(ctx, varName, event, eventName === 'enter', emitAction)
    return
  }

  // Handle hover event specially - needs both mouseenter and mouseleave
  if (eventName === 'mouseenter') {
    const hasHighlight = event.actions.some(a => a.type === 'highlight')
    if (hasHighlight) {
      ctx.emit(`${varName}.addEventListener('mouseenter', (e) => {`)
      ctx.indentIn()
      for (const action of event.actions) {
        emitAction(action, varName)
      }
      ctx.indentOut()
      ctx.emit('})')
      // Add mouseleave to clear highlight
      ctx.emit(`${varName}.addEventListener('mouseleave', (e) => {`)
      ctx.indentIn()
      ctx.emit(`_runtime.unhighlight(${varName})`)
      ctx.indentOut()
      ctx.emit('})')
      return
    }
  }

  // Handle click-outside event specially
  if (eventName === 'click-outside') {
    ctx.emit(`// Click outside handler`)
    ctx.emit(`const ${varName}_clickOutsideHandler = (e) => {`)
    ctx.indentIn()
    ctx.emit(`if (!${varName}.contains(e.target)) {`)
    ctx.indentIn()
    for (const action of event.actions) {
      emitAction(action, varName)
    }
    ctx.indentOut()
    ctx.emit('}')
    ctx.indentOut()
    ctx.emit('}')
    ctx.emit(`document.addEventListener('click', ${varName}_clickOutsideHandler)`)
    ctx.emit(`${varName}._clickOutsideHandler = ${varName}_clickOutsideHandler`)
    return
  }

  // Handle keyboard events with specific keys
  if (event.key) {
    ctx.emit(`${varName}.addEventListener('${eventName}', (e) => {`)
    ctx.indentIn()
    ctx.emit(`if (e.key === '${mapKeyName(event.key)}') {`)
    ctx.indentIn()
    for (const action of event.actions) {
      emitAction(action, varName)
    }
    ctx.indentOut()
    ctx.emit('}')
    ctx.indentOut()
    ctx.emit('})')
  } else {
    ctx.emit(`${varName}.addEventListener('${eventName}', (e) => {`)
    ctx.indentIn()
    for (const action of event.actions) {
      emitAction(action, varName)
    }
    ctx.indentOut()
    ctx.emit('})')
  }
}

/**
 * Emit a template event listener (for loop items).
 */
export function emitTemplateEventListener(
  ctx: EventEmitterContext,
  varName: string,
  event: IREvent,
  itemVar: string,
  emitTemplateAction: (action: IRAction, currentVar: string, itemVar: string) => void
): void {
  const eventName = event.name

  ctx.emit(`${varName}.addEventListener('${eventName}', (e) => {`)
  ctx.indentIn()
  for (const action of event.actions) {
    emitTemplateAction(action, varName, itemVar)
  }
  ctx.indentOut()
  ctx.emit('})')
}

/**
 * Emit an action call.
 * This is the main action dispatch function.
 */
export function emitAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  // Function call syntax: toggle(), exclusive(), show(Menu), animate(FadeIn), customFn()
  if (action.isFunctionCall) {
    if (action.isBuiltinStateFunction) {
      // Built-in state functions: toggle(), cycle() (alias), exclusive()
      switch (action.type) {
        case 'toggle':
        case 'cycle': // cycle() is now an alias for toggle()
          if (action.args && action.args.length > 0) {
            const states = action.args.map(s => `'${s}'`).join(', ')
            ctx.emit(`_runtime.stateMachineToggle(${currentVar}, [${states}])`)
          } else {
            ctx.emit(`_runtime.stateMachineToggle(${currentVar})`)
          }
          break
        case 'exclusive':
          ctx.emit(
            `_runtime.exclusiveTransition(${currentVar}, Object.keys(${currentVar}._stateMachine?.states || {}).find(s => s !== 'default') || 'active')`
          )
          break
      }
    } else {
      // Known runtime functions or custom functions
      const fnName = action.type
      emitRuntimeAction(ctx, fnName, action, currentVar)
    }
    return
  }

  // Multi-element trigger: ElementName state (e.g., Menu open, Backdrop visible)
  const isElementTransition = /^[A-Z]/.test(action.type) && action.target
  if (isElementTransition) {
    ctx.emit(`_runtime.transitionTo(_elements['${action.type}'], '${action.target}')`)
  } else {
    ctx.emit(
      `// Warning: Action '${action.type}' requires function call syntax, e.g., ${action.type}()`
    )
  }
}

/**
 * Emit a runtime action call.
 */
function emitRuntimeAction(
  ctx: EventEmitterContext,
  fnName: string,
  action: IRAction,
  currentVar: string
): void {
  switch (fnName) {
    case 'show':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.show(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.show(${currentVar})`)
      }
      break
    case 'hide':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.hide(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.hide(${currentVar})`)
      }
      break
    case 'close':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.close(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.close(${currentVar})`)
      }
      break
    case 'select':
      if (action.args?.[0] === 'highlighted') {
        ctx.emit(`_runtime.selectHighlighted(${currentVar})`)
      } else if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.select(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.select(${currentVar})`)
      }
      break
    case 'deselect':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.deselect(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.deselect(${currentVar})`)
      }
      break
    case 'highlight':
      emitHighlightAction(ctx, action, currentVar)
      break
    case 'activate':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.activate(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.activate(${currentVar})`)
      }
      break
    case 'deactivate':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.deactivate(_elements['${action.args[0]}'])`)
      } else {
        ctx.emit(`_runtime.deactivate(${currentVar})`)
      }
      break
    case 'navigate':
      emitNavigateAction(ctx, action, currentVar)
      break
    case 'animate':
      emitAnimateAction(ctx, action, currentVar)
      break
    case 'setState':
      if (action.args && action.args.length >= 2) {
        ctx.emit(`_runtime.setState(_elements['${action.args[0]}'], '${action.args[1]}')`)
      } else if (action.args && action.args.length === 1) {
        ctx.emit(`_runtime.setState(${currentVar}, '${action.args[0]}')`)
      }
      break
    // Overlay & Positioning actions
    case 'showBelow':
    case 'showAbove':
    case 'showLeft':
    case 'showRight':
    case 'showAt':
      emitPositionAction(ctx, fnName, action, currentVar)
      break
    case 'showModal':
      if (action.args && action.args.length > 0) {
        const target = action.args[0]
        const backdrop = action.args[1] !== 'false'
        ctx.emit(`_runtime.showModal(_elements['${target}'] || '${target}', ${backdrop})`)
      }
      break
    case 'dismiss':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.dismiss(_elements['${action.args[0]}'] || '${action.args[0]}')`)
      } else {
        ctx.emit(`_runtime.dismiss(${currentVar})`)
      }
      break
    // Scroll actions
    case 'scrollTo':
    case 'scrollBy':
    case 'scrollToTop':
    case 'scrollToBottom':
      emitScrollAction(ctx, fnName, action, currentVar)
      break
    // Value & Counter actions
    case 'increment':
    case 'decrement':
    case 'set':
    case 'get':
    case 'reset':
      emitValueAction(ctx, fnName, action)
      break
    case 'copy':
      if (action.args && action.args.length > 0) {
        const textArg = action.args[0]
        if (textArg.startsWith('$')) {
          ctx.emit(`_runtime.copy(_runtime.get('${textArg}'), ${currentVar})`)
        } else {
          ctx.emit(`_runtime.copy('${textArg}', ${currentVar})`)
        }
      }
      break
    // Feedback functions
    case 'toast':
      if (action.args && action.args.length > 0) {
        const message = action.args[0]
        if (action.args.length > 1) {
          const type = action.args[1] || 'info'
          const position = action.args[2] || 'bottom'
          ctx.emit(`_runtime.toast('${message}', { type: '${type}', position: '${position}' })`)
        } else {
          ctx.emit(`_runtime.toast('${message}')`)
        }
      }
      break
    // Input control
    case 'focus':
    case 'blur':
    case 'clear':
    case 'selectText':
    case 'setError':
    case 'clearError':
      emitInputAction(ctx, fnName, action, currentVar)
      break
    // Browser navigation
    case 'back':
      ctx.emit(`_runtime.back()`)
      break
    case 'forward':
      ctx.emit(`_runtime.forward()`)
      break
    case 'openUrl':
      if (action.args && action.args.length > 0) {
        const url = action.args[0]
        const newTab = action.args.length > 1 ? action.args[1] === 'true' : true
        ctx.emit(`_runtime.openUrl('${url}', { newTab: ${newTab} })`)
      }
      break
    // CRUD actions
    case 'add':
      emitAddAction(ctx, action)
      break
    case 'remove':
      emitRemoveAction(ctx, action, currentVar)
      break
    case 'create':
      emitCreateAction(ctx, action, currentVar)
      break
    case 'save':
      emitSaveAction(ctx, action, currentVar)
      break
    case 'delete':
      emitDeleteAction(ctx, action, currentVar)
      break
    case 'revert':
      emitRevertAction(ctx, action, currentVar)
      break
    default:
      // Custom function: inject element as first parameter
      if (action.args && action.args.length > 0) {
        const args = action.args.map(a => `'${a}'`).join(', ')
        ctx.emit(`if (typeof ${fnName} === 'function') ${fnName}(${currentVar}, ${args})`)
      } else {
        ctx.emit(`if (typeof ${fnName} === 'function') ${fnName}(${currentVar})`)
      }
  }
}

function emitHighlightAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (action.args?.[0] === 'next') {
    ctx.emit(`_runtime.highlightNext(${currentVar})`)
  } else if (action.args?.[0] === 'prev') {
    ctx.emit(`_runtime.highlightPrev(${currentVar})`)
  } else if (action.args?.[0] === 'first') {
    ctx.emit(`_runtime.highlightFirst(${currentVar})`)
  } else if (action.args?.[0] === 'last') {
    ctx.emit(`_runtime.highlightLast(${currentVar})`)
  } else if (action.args && action.args.length > 0) {
    ctx.emit(`_runtime.highlight(_elements['${action.args[0]}'])`)
  } else {
    ctx.emit(`_runtime.highlight(${currentVar})`)
  }
}

function emitNavigateAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (action.args && action.args.length > 0) {
    const target = action.args[0]
    const isPageRoute = /^[a-z]/.test(target)
    if (isPageRoute) {
      ctx.emit(`_runtime.navigateToPage('${target}', ${currentVar})`)
    } else {
      ctx.emit(`_runtime.navigate('${target}', ${currentVar})`)
    }
  }
}

function emitAnimateAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (action.args && action.args.length > 0) {
    const animationName = action.args[0]
    if (action.args.length > 1) {
      const restArgs = action.args.slice(1)
      const staggerMatch = restArgs.find(a => a.startsWith('stagger'))
      if (staggerMatch) {
        const staggerValue = staggerMatch.replace('stagger', '').trim() || '100'
        const elemTargets = restArgs
          .filter(a => !a.startsWith('stagger'))
          .map(t => `_elements['${t}']`)
          .join(', ')
        ctx.emit(
          `_runtime.animate('${animationName}', [${elemTargets}], { stagger: ${staggerValue} })`
        )
      } else {
        const targets = restArgs.map(t => `_elements['${t}']`).join(', ')
        ctx.emit(`_runtime.animate('${animationName}', [${targets}])`)
      }
    } else {
      ctx.emit(`_runtime.animate('${animationName}', ${currentVar})`)
    }
  }
}

function emitPositionAction(
  ctx: EventEmitterContext,
  fnName: string,
  action: IRAction,
  currentVar: string
): void {
  if (action.args && action.args.length > 0) {
    const target = action.args[0]
    if (fnName === 'showAt') {
      const position = action.args[1] || 'below'
      ctx.emit(
        `_runtime.showAt(_elements['${target}'] || '${target}', ${currentVar}, '${position}')`
      )
    } else {
      const offset = action.args[1] || '4'
      ctx.emit(
        `_runtime.${fnName}(_elements['${target}'] || '${target}', ${currentVar}, ${offset})`
      )
    }
  }
}

function emitScrollAction(
  ctx: EventEmitterContext,
  fnName: string,
  action: IRAction,
  currentVar: string
): void {
  switch (fnName) {
    case 'scrollTo':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.scrollTo(_elements['${action.args[0]}'] || '${action.args[0]}')`)
      }
      break
    case 'scrollBy':
      if (action.args && action.args.length >= 3) {
        const container = action.args[0]
        const x = action.args[1] || '0'
        const y = action.args[2] || '0'
        ctx.emit(`_runtime.scrollBy(_elements['${container}'] || '${container}', ${x}, ${y})`)
      } else if (action.args && action.args.length === 2) {
        const container = action.args[0]
        const y = action.args[1] || '0'
        ctx.emit(`_runtime.scrollBy(_elements['${container}'] || '${container}', 0, ${y})`)
      }
      break
    case 'scrollToTop':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.scrollToTop(_elements['${action.args[0]}'] || '${action.args[0]}')`)
      } else {
        ctx.emit(`_runtime.scrollToTop()`)
      }
      break
    case 'scrollToBottom':
      if (action.args && action.args.length > 0) {
        ctx.emit(`_runtime.scrollToBottom(_elements['${action.args[0]}'] || '${action.args[0]}')`)
      } else {
        ctx.emit(`_runtime.scrollToBottom()`)
      }
      break
  }
}

function emitValueAction(ctx: EventEmitterContext, fnName: string, action: IRAction): void {
  if (!action.args || action.args.length === 0) return

  const tokenName = action.args[0]

  switch (fnName) {
    case 'increment':
    case 'decrement': {
      const opts: string[] = []
      if (action.args.length > 1) {
        for (let i = 1; i < action.args.length; i++) {
          const arg = action.args[i]
          if (arg.includes(':')) {
            const [key, val] = arg.split(':')
            opts.push(`${key}: ${val}`)
          }
        }
      }
      if (opts.length > 0) {
        ctx.emit(`_runtime.${fnName}('${tokenName}', { ${opts.join(', ')} })`)
      } else {
        ctx.emit(`_runtime.${fnName}('${tokenName}')`)
      }
      break
    }
    case 'set':
      if (action.args.length >= 2) {
        const value = action.args[1]
        if (!isNaN(Number(value))) {
          ctx.emit(`_runtime.set('${tokenName}', ${value})`)
        } else {
          ctx.emit(`_runtime.set('${tokenName}', '${value}')`)
        }
      }
      break
    case 'get':
      ctx.emit(`_runtime.get('${tokenName}')`)
      break
    case 'reset':
      if (action.args.length > 1) {
        const initialValue = action.args[1]
        if (!isNaN(Number(initialValue))) {
          ctx.emit(`_runtime.reset('${tokenName}', ${initialValue})`)
        } else {
          ctx.emit(`_runtime.reset('${tokenName}', '${initialValue}')`)
        }
      } else {
        ctx.emit(`_runtime.reset('${tokenName}')`)
      }
      break
  }
}

function emitInputAction(
  ctx: EventEmitterContext,
  fnName: string,
  action: IRAction,
  currentVar: string
): void {
  const target = action.args?.[0]

  switch (fnName) {
    case 'focus':
    case 'blur':
    case 'clear':
    case 'selectText':
      if (target) {
        ctx.emit(`_runtime.${fnName}(_elements['${target}'])`)
      } else {
        ctx.emit(`_runtime.${fnName}(${currentVar})`)
      }
      break
    case 'setError':
      if (target) {
        const message = action.args?.[1] || ''
        if (message) {
          ctx.emit(`_runtime.setError(_elements['${target}'], '${message}')`)
        } else {
          ctx.emit(`_runtime.setError(_elements['${target}'])`)
        }
      } else {
        ctx.emit(`_runtime.setError(${currentVar})`)
      }
      break
    case 'clearError':
      if (target) {
        ctx.emit(`_runtime.clearError(_elements['${target}'])`)
      } else {
        ctx.emit(`_runtime.clearError(${currentVar})`)
      }
      break
  }
}

/**
 * Emit add() action for CRUD operations
 * Generates: _runtime.add('collectionName', { key: value, ... })
 */
function emitAddAction(ctx: EventEmitterContext, action: IRAction): void {
  if (!action.args || action.args.length === 0) {
    ctx.emit(`// Warning: add() requires collection name`)
    return
  }

  const collectionName = action.args[0]

  // Check for named parameters (key: value pairs)
  const namedParams: string[] = []
  for (let i = 1; i < action.args.length; i++) {
    const arg = action.args[i]
    if (arg.includes(':')) {
      const [key, val] = arg.split(':').map(s => s.trim())
      // Handle different value types
      if (val === 'true' || val === 'false') {
        namedParams.push(`${key}: ${val}`)
      } else if (!isNaN(Number(val))) {
        namedParams.push(`${key}: ${val}`)
      } else if (val.startsWith('$')) {
        // Token/variable reference - emit runtime $get call
        const varName = val.slice(1) // Remove $ prefix
        namedParams.push(`${key}: $get('${varName}')`)
      } else {
        // String value
        namedParams.push(`${key}: "${val}"`)
      }
    }
  }

  if (namedParams.length > 0) {
    ctx.emit(`_runtime.add('${collectionName}', { ${namedParams.join(', ')} })`)
  } else {
    ctx.emit(`_runtime.add('${collectionName}')`)
  }
}

/**
 * Emit remove() action for CRUD operations
 * Generates: _runtime.remove(itemVar)
 */
function emitRemoveAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (!action.args || action.args.length === 0) {
    ctx.emit(`// Warning: remove() requires item reference`)
    return
  }

  const itemRef = action.args[0]
  // If it's a loop variable reference (like 'todo'), it should be available in scope
  ctx.emit(`_runtime.remove(${itemRef})`)
}

/**
 * Emit create action - creates a new entry in a collection
 * create(collectionName) - creates empty entry
 * create(collectionName, initialValues) - creates with initial data
 */
function emitCreateAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (!action.args || action.args.length === 0) {
    ctx.emit(`// Warning: create() requires collection name`)
    return
  }
  const collectionName = action.args[0]
  if (action.args.length > 1) {
    const initialValues = action.args[1]
    ctx.emit(`_runtime.create('${collectionName}', ${initialValues})`)
  } else {
    ctx.emit(`_runtime.create('${collectionName}')`)
  }
}

/**
 * Emit save action - saves current item in a collection
 * save(collectionName) - saves the current selected item
 */
function emitSaveAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (!action.args || action.args.length === 0) {
    ctx.emit(`_runtime.save()`)
  } else {
    const target = action.args[0]
    ctx.emit(`_runtime.save('${target}')`)
  }
}

/**
 * Emit delete action - deletes an entry from a collection
 * delete(itemRef) - deletes the specified item
 * Note: 'delete' is a JS reserved word, so we use _runtime.deleteItem()
 */
function emitDeleteAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (!action.args || action.args.length === 0) {
    ctx.emit(`_runtime.deleteItem(${currentVar})`)
  } else {
    const target = action.args[0]
    // Check if it's a variable reference or a string
    if (target.startsWith('$')) {
      ctx.emit(`_runtime.deleteItem($get('${target.slice(1)}'))`)
    } else {
      ctx.emit(`_runtime.deleteItem('${target}')`)
    }
  }
}

/**
 * Emit revert action - reverts changes to an entry
 */
function emitRevertAction(ctx: EventEmitterContext, action: IRAction, currentVar: string): void {
  if (!action.args || action.args.length === 0) {
    ctx.emit(`_runtime.revert()`)
  } else {
    const target = action.args[0]
    ctx.emit(`_runtime.revert('${target}')`)
  }
}
