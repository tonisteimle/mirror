/**
 * Action Picker - Select events and actions for elements
 */

import { BasePicker, type PickerConfig, type PickerCallbacks } from '../base'
import type {
  ActionPickerValue,
  ActionPickerConfig,
  ActionPickerCallbacks,
  EventOption,
  ActionOption,
} from './types'

export type { ActionPickerValue, ActionPickerConfig, ActionPickerCallbacks }

// Events available in Mirror DSL
const EVENTS: EventOption[] = [
  { name: 'onclick', description: 'Click event' },
  { name: 'onhover', description: 'Mouse enter event' },
  { name: 'onfocus', description: 'Focus event' },
  { name: 'onblur', description: 'Blur event' },
  { name: 'onchange', description: 'Change event' },
  { name: 'oninput', description: 'Input event' },
  { name: 'onenter', description: 'Enter key pressed' },
  { name: 'onescape', description: 'Escape key pressed' },
  { name: 'onspace', description: 'Space key pressed' },
  { name: 'onkeydown', description: 'Keydown event', acceptsKey: true },
  { name: 'onkeyup', description: 'Keyup event', acceptsKey: true },
  { name: 'onclick-outside', description: 'Click outside element' },
]

// Actions available in Mirror DSL
const ACTIONS: ActionOption[] = [
  // State/Interaction actions
  { name: 'toggle', description: 'Toggle between states' },
  { name: 'exclusive', description: 'Only one active (radio behavior)' },
  { name: 'select', description: 'Selection behavior' },
  // Visibility actions
  { name: 'show', description: 'Show element', requiresTarget: true },
  { name: 'hide', description: 'Hide element', requiresTarget: true },
  // Navigation actions
  { name: 'navigate', description: 'Navigate to view', requiresTarget: true },
  { name: 'navigateToPage', description: 'Navigate to page', requiresTarget: true },
  // Overlay actions
  { name: 'showBelow', description: 'Show dropdown below trigger', requiresTarget: true },
  { name: 'showAbove', description: 'Show tooltip above trigger', requiresTarget: true },
  { name: 'showModal', description: 'Show as centered modal', requiresTarget: true },
  { name: 'dismiss', description: 'Dismiss/close overlay', requiresTarget: true },
  // Scroll actions
  { name: 'scrollTo', description: 'Scroll element into view', requiresTarget: true },
  { name: 'scrollToTop', description: 'Scroll to top' },
  // Value actions
  { name: 'increment', description: 'Increment counter', requiresTarget: true },
  { name: 'decrement', description: 'Decrement counter', requiresTarget: true },
  { name: 'set', description: 'Set value', requiresTarget: true },
  { name: 'reset', description: 'Reset to initial value', requiresTarget: true },
  // Clipboard
  { name: 'copy', description: 'Copy to clipboard' },
  // Form actions
  { name: 'submit', description: 'Submit form' },
  { name: 'focus', description: 'Focus element', requiresTarget: true },
  // CRUD actions
  { name: 'create', description: 'Create new entry', requiresTarget: true },
  { name: 'save', description: 'Save changes' },
  { name: 'delete', description: 'Delete entry', requiresTarget: true },
]

// Keyboard keys for key events
const KEYBOARD_KEYS = [
  'enter',
  'escape',
  'space',
  'tab',
  'backspace',
  'delete',
  'arrow-up',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'home',
  'end',
]

export class ActionPicker extends BasePicker {
  private currentValue: ActionPickerValue
  private availableElements: string[]
  private onSelectCallback: ((value: ActionPickerValue) => void) | undefined
  private onCancelCallback: (() => void) | undefined

  constructor(
    config: ActionPickerConfig & Partial<PickerConfig>,
    callbacks: ActionPickerCallbacks & PickerCallbacks
  ) {
    super(config, callbacks, 'action')

    this.currentValue = config.initialValue || {
      event: 'onclick',
      action: 'toggle',
    }
    this.availableElements = config.availableElements || []
    this.onSelectCallback = callbacks.onSelect
    this.onCancelCallback = callbacks.onCancel
  }

  render(): HTMLElement {
    const container = document.createElement('div')
    container.className = 'action-picker'

    // Title
    const title = document.createElement('div')
    title.className = 'action-picker-title'
    title.textContent = 'Add Event'
    container.appendChild(title)

    // Event selector
    container.appendChild(this.renderEventSelector())

    // Key selector (for keyboard events)
    const selectedEvent = EVENTS.find(e => e.name === this.currentValue.event)
    if (selectedEvent?.acceptsKey) {
      container.appendChild(this.renderKeySelector())
    }

    // Action selector
    container.appendChild(this.renderActionSelector())

    // Target selector (for actions that require targets)
    const selectedAction = ACTIONS.find(a => a.name === this.currentValue.action)
    if (selectedAction?.requiresTarget && this.availableElements.length > 0) {
      container.appendChild(this.renderTargetSelector())
    }

    // Buttons
    container.appendChild(this.renderButtons())

    return container
  }

  private renderEventSelector(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'action-picker-section'

    const label = document.createElement('label')
    label.className = 'action-picker-label'
    label.textContent = 'Event'
    section.appendChild(label)

    const select = document.createElement('select')
    select.className = 'action-picker-select'
    select.setAttribute('data-field', 'event')

    EVENTS.forEach(event => {
      const option = document.createElement('option')
      option.value = event.name
      option.textContent = event.name
      option.title = event.description
      if (event.name === this.currentValue.event) {
        option.selected = true
      }
      select.appendChild(option)
    })

    select.addEventListener('change', () => {
      this.currentValue.event = select.value
      // Clear key if new event doesn't accept keys
      const newEventDef = EVENTS.find(e => e.name === select.value)
      if (!newEventDef?.acceptsKey) {
        this.currentValue.key = undefined
      }
      // Re-render to show/hide key selector
      this.updateContent()
    })

    section.appendChild(select)
    return section
  }

  private renderKeySelector(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'action-picker-section'

    const label = document.createElement('label')
    label.className = 'action-picker-label'
    label.textContent = 'Key'
    section.appendChild(label)

    const select = document.createElement('select')
    select.className = 'action-picker-select'
    select.setAttribute('data-field', 'key')

    const emptyOption = document.createElement('option')
    emptyOption.value = ''
    emptyOption.textContent = '(any key)'
    select.appendChild(emptyOption)

    KEYBOARD_KEYS.forEach(key => {
      const option = document.createElement('option')
      option.value = key
      option.textContent = key
      if (key === this.currentValue.key) {
        option.selected = true
      }
      select.appendChild(option)
    })

    select.addEventListener('change', () => {
      this.currentValue.key = select.value || undefined
    })

    section.appendChild(select)
    return section
  }

  private renderActionSelector(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'action-picker-section'

    const label = document.createElement('label')
    label.className = 'action-picker-label'
    label.textContent = 'Action'
    section.appendChild(label)

    const select = document.createElement('select')
    select.className = 'action-picker-select'
    select.setAttribute('data-field', 'action')

    // Group actions
    const interactionActions = ACTIONS.filter(a =>
      ['toggle', 'exclusive', 'select'].includes(a.name)
    )
    const visibilityActions = ACTIONS.filter(a => ['show', 'hide'].includes(a.name))
    const overlayActions = ACTIONS.filter(a =>
      ['showBelow', 'showAbove', 'showModal', 'dismiss'].includes(a.name)
    )
    const navigationActions = ACTIONS.filter(a => ['navigate', 'navigateToPage'].includes(a.name))
    const otherActions = ACTIONS.filter(
      a =>
        !interactionActions.includes(a) &&
        !visibilityActions.includes(a) &&
        !overlayActions.includes(a) &&
        !navigationActions.includes(a)
    )

    const addGroup = (groupLabel: string, actions: ActionOption[]) => {
      if (actions.length === 0) return
      const optgroup = document.createElement('optgroup')
      optgroup.label = groupLabel
      actions.forEach(a => {
        const o = document.createElement('option')
        o.value = a.name
        o.textContent = a.name + (a.requiresTarget ? '(...)' : '()')
        o.title = a.description
        o.selected = a.name === this.currentValue.action
        optgroup.appendChild(o)
      })
      select.appendChild(optgroup)
    }

    addGroup('Interaction', interactionActions)
    addGroup('Visibility', visibilityActions)
    addGroup('Overlays', overlayActions)
    addGroup('Navigation', navigationActions)
    addGroup('Other', otherActions)

    select.addEventListener('change', () => {
      this.currentValue.action = select.value
      this.currentValue.target = undefined
      // Re-render to show/hide target selector
      this.updateContent()
    })

    section.appendChild(select)
    return section
  }

  private renderTargetSelector(): HTMLElement {
    const section = document.createElement('div')
    section.className = 'action-picker-section'

    const label = document.createElement('label')
    label.className = 'action-picker-label'
    label.textContent = 'Target'
    section.appendChild(label)

    const select = document.createElement('select')
    select.className = 'action-picker-select'
    select.setAttribute('data-field', 'target')

    const emptyOption = document.createElement('option')
    emptyOption.value = ''
    emptyOption.textContent = '(select element)'
    select.appendChild(emptyOption)

    this.availableElements.forEach(el => {
      const option = document.createElement('option')
      option.value = el
      option.textContent = el
      if (el === this.currentValue.target) {
        option.selected = true
      }
      select.appendChild(option)
    })

    select.addEventListener('change', () => {
      this.currentValue.target = select.value || undefined
    })

    section.appendChild(select)
    return section
  }

  private renderButtons(): HTMLElement {
    const buttons = document.createElement('div')
    buttons.className = 'action-picker-buttons'

    const cancelBtn = document.createElement('button')
    cancelBtn.className = 'action-picker-btn cancel'
    cancelBtn.textContent = 'Cancel'
    cancelBtn.addEventListener('click', () => {
      this.onCancelCallback?.()
      this.hide()
    })

    const addBtn = document.createElement('button')
    addBtn.className = 'action-picker-btn primary'
    addBtn.textContent = 'Add'
    addBtn.addEventListener('click', () => {
      this.onSelectCallback?.(this.currentValue)
      this.hide()
    })

    buttons.appendChild(cancelBtn)
    buttons.appendChild(addBtn)
    return buttons
  }

  private updateContent(): void {
    if (!this.element) return

    // Re-render the picker content
    this.element.innerHTML = ''
    const newContent = this.render()
    // Append all children from the rendered content
    while (newContent.firstChild) {
      this.element.appendChild(newContent.firstChild)
    }
  }

  getValue(): string {
    return JSON.stringify(this.currentValue)
  }

  setValue(value: string): void {
    try {
      this.currentValue = JSON.parse(value) as ActionPickerValue
    } catch {
      // If parsing fails, treat as action name
      this.currentValue = { event: 'onclick', action: value }
    }
    this.updateContent()
  }

  /** Get the typed action value directly */
  getActionValue(): ActionPickerValue {
    return this.currentValue
  }

  /** Set the typed action value directly */
  setActionValue(value: ActionPickerValue): void {
    this.currentValue = value
    this.updateContent()
  }

  setAvailableElements(elements: string[]): void {
    this.availableElements = elements
    this.updateContent()
  }
}

/**
 * Create an ActionPicker instance
 */
export function createActionPicker(
  config: ActionPickerConfig & Partial<PickerConfig>,
  callbacks: ActionPickerCallbacks & PickerCallbacks
): ActionPicker {
  return new ActionPicker(config, callbacks)
}
