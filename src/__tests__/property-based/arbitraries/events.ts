/**
 * Event Arbitraries for Mirror DSL
 *
 * Generates random event handlers, keyboard events, and actions.
 */

import * as fc from 'fast-check'
import {
  componentName,
  anyComponentName,
  shortLabel,
  smallPixelValue
} from './primitives'

// =============================================================================
// Event Names
// =============================================================================

/** Basic event names */
export const basicEventName = fc.constantFrom(
  'onclick', 'onhover', 'onchange', 'oninput', 'onload', 'onfocus', 'onblur'
)

/** Keyboard event with key modifier */
export const keyboardEventName = fc.record({
  event: fc.constantFrom('onkeydown', 'onkeyup'),
  key: fc.constantFrom(
    'escape', 'enter', 'tab', 'space',
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'backspace', 'delete', 'home', 'end'
  )
}).map(({ event, key }) => `${event} ${key}`)

/** Any event name */
export const anyEventName = fc.oneof(basicEventName, keyboardEventName)

// =============================================================================
// Action Generators
// =============================================================================

/** Toggle action */
export const toggleAction = fc.constant('toggle')

/** Show action */
export const showAction = anyComponentName.map(name => `show ${name}`)

/** Hide action */
export const hideAction = anyComponentName.map(name => `hide ${name}`)

/** Open action with optional position and animation */
export const openAction = fc.record({
  target: anyComponentName,
  position: fc.option(fc.constantFrom('below', 'above', 'left', 'right', 'center'), { nil: undefined }),
  animation: fc.option(fc.constantFrom('fade', 'scale', 'slide-up', 'slide-down'), { nil: undefined }),
  duration: fc.option(fc.integer({ min: 100, max: 500 }), { nil: undefined })
}).map(({ target, position, animation, duration }) => {
  const parts = ['open', target]
  if (position) parts.push(position)
  if (animation) parts.push(animation)
  if (duration !== undefined) parts.push(String(duration))
  return parts.join(' ')
})

/** Close action */
export const closeAction = fc.oneof(
  fc.constant('close'),
  anyComponentName.map(name => `close ${name}`)
)

/** Page action */
export const pageAction = anyComponentName.map(name => `page ${name}`)

/** Change action */
export const changeAction = fc.record({
  target: fc.constantFrom('self', 'next', 'prev'),
  state: fc.constantFrom('active', 'inactive', 'expanded', 'collapsed', 'on', 'off')
}).map(({ target, state }) => `change ${target} to ${state}`)

/** Highlight action */
export const highlightAction = fc.constantFrom(
  'highlight next', 'highlight prev', 'highlight first', 'highlight last', 'highlight self'
)

/** Select action */
export const selectAction = fc.constantFrom(
  'select highlighted', 'select self', 'select first', 'select last'
)

/** Deselect action */
export const deselectAction = fc.oneof(
  fc.constant('deselect'),
  fc.constant('clear-selection'),
  anyComponentName.map(name => `deselect ${name}`)
)

/** Filter action */
export const filterAction = anyComponentName.map(name => `filter ${name}`)

/** Activate/deactivate actions */
export const activateAction = fc.oneof(
  fc.constant('activate'),
  fc.constant('deactivate'),
  fc.constant('deactivate-siblings'),
  anyComponentName.map(name => `activate ${name}`)
)

/** Focus action */
export const focusAction = fc.oneof(
  fc.constant('focus first'),
  fc.constant('focus next'),
  fc.constant('focus first-empty'),
  anyComponentName.map(name => `focus ${name}`)
)

/** Alert action */
export const alertAction = shortLabel.map(msg => `alert "${msg}"`)

/** Assign action */
export const assignAction = fc.record({
  variable: fc.array(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 6 })
    .map(chars => `$${chars.join('')}`),
  value: fc.oneof(
    fc.constant('$event.value'),
    fc.constant('$item'),
    shortLabel.map(s => `"${s}"`)
  )
}).map(({ variable, value }) => `assign ${variable} to ${value}`)

/** Call action (external JS function) */
export const callAction = fc.record({
  fn: fc.constantFrom('handleClick', 'submitForm', 'validateInput', 'fetchData', 'updateState')
}).map(({ fn }) => `call ${fn}`)

/** Any single action */
export const anyAction = fc.oneof(
  toggleAction,
  showAction,
  hideAction,
  openAction,
  closeAction,
  pageAction,
  changeAction,
  highlightAction,
  selectAction,
  deselectAction,
  filterAction,
  activateAction,
  focusAction,
  alertAction,
  assignAction,
  callAction
)

// =============================================================================
// Action Chains
// =============================================================================

/** Multiple actions (comma-separated) */
export const actionChain = fc.array(anyAction, { minLength: 2, maxLength: 4 })
  .map(actions => actions.join(', '))

// =============================================================================
// Event Handler Blocks
// =============================================================================

/** Simple onclick handler */
export const simpleOnclick = anyAction.map(action => `onclick\n  ${action}`)

/** Onclick with multiple actions */
export const onclickMultiple = fc.array(anyAction, { minLength: 2, maxLength: 4 })
  .map(actions => `onclick\n  ${actions.join('\n  ')}`)

/** Inline onclick */
export const inlineOnclick = anyAction.map(action => `onclick ${action}`)

/** Keyboard event handler */
export const keyboardHandler = fc.record({
  event: fc.constantFrom('onkeydown', 'onkeyup'),
  key: fc.constantFrom('escape', 'enter', 'arrow-down', 'arrow-up'),
  action: anyAction
}).map(({ event, key, action }) => `${event} ${key}: ${action}`)

/** Onchange handler (for inputs) */
export const onchangeHandler = fc.record({
  variable: fc.array(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 6 })
    .map(chars => `$${chars.join('')}`)
}).map(({ variable }) => `onchange\n  assign ${variable} to $event.value`)

/** Oninput with debounce */
export const oninputDebounced = fc.record({
  debounce: fc.integer({ min: 100, max: 500 }),
  action: anyAction
}).map(({ debounce, action }) => `oninput debounce ${debounce}: ${action}`)

/** Any event handler */
export const anyEventHandler = fc.oneof(
  simpleOnclick,
  onclickMultiple,
  inlineOnclick,
  keyboardHandler,
  onchangeHandler,
  oninputDebounced
)

// =============================================================================
// Components with Events
// =============================================================================

/** Button with onclick */
export const buttonWithClick = fc.record({
  label: shortLabel,
  action: anyAction
}).map(({ label, action }) =>
  `Button "${label}"\n  onclick\n    ${action}`
)

/** Input with events */
export const inputWithEvents = fc.record({
  placeholder: shortLabel,
  variable: fc.array(fc.constantFrom(...'abcdefghij'.split('')), { minLength: 3, maxLength: 6 })
    .map(chars => `$${chars.join('')}`)
}).map(({ placeholder, variable }) =>
  `Input "${placeholder}"\n  onchange\n    assign ${variable} to $event.value`
)

/** Menu item with keyboard navigation */
export const menuItemWithKeyboard = fc.record({
  label: shortLabel
}).map(({ label }) =>
  `Item "${label}"\n  onkeydown arrow-down: highlight next\n  onkeydown arrow-up: highlight prev\n  onkeydown enter: select highlighted`
)

// =============================================================================
// Centralized Events Block
// =============================================================================

/** Events block */
export const eventsBlock = fc.record({
  components: fc.array(
    fc.record({
      name: anyComponentName,
      event: basicEventName,
      action: anyAction
    }),
    { minLength: 1, maxLength: 4 }
  )
}).map(({ components }) => {
  let code = 'events\n'
  components.forEach(c => {
    code += `  ${c.name} ${c.event}\n`
    code += `    ${c.action}\n`
  })
  return code.trimEnd()
})

// =============================================================================
// Timing Modifiers
// =============================================================================

/** Debounce modifier */
export const debounceModifier = fc.integer({ min: 50, max: 500 }).map(ms => `debounce ${ms}`)

/** Delay modifier */
export const delayModifier = fc.integer({ min: 50, max: 300 }).map(ms => `delay ${ms}`)

/** Event with timing modifier */
export const eventWithTiming = fc.record({
  event: fc.constantFrom('oninput', 'onblur', 'onfocus'),
  timing: fc.oneof(debounceModifier, delayModifier),
  action: anyAction
}).map(({ event, timing, action }) => `${event} ${timing}: ${action}`)

// =============================================================================
// Combined Generators
// =============================================================================

/** Complete event example */
export const completeEventExample = fc.oneof(
  buttonWithClick,
  inputWithEvents,
  menuItemWithKeyboard,
  eventsBlock
)
