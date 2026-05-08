/**
 * Events Section - onclick, onhover, etc.
 *
 * Displays and allows editing of element events and their actions.
 * Supports inline autocomplete for action names.
 */

import {
  BaseSection,
  type SectionDependencies,
  type SectionData,
  type EventHandlerMap,
} from '../base/section'
import { DSL, getAllEvents, getAllActions, getEvent } from '../../../../compiler/schema/dsl'

/**
 * Build the dropdown list from the DSL schema. Single source of truth —
 * if the schema gains a new event (e.g. `onswipe`), it appears here
 * automatically. We sort common interaction events first, then keyboard
 * shorthand, then everything else.
 */
const COMMON_FIRST = [
  'onclick',
  'onhover',
  'onchange',
  'oninput',
  'onfocus',
  'onblur',
  'onenter',
  'onescape',
]

function eventLabel(name: string): string {
  // Friendly label: strip "on", split on dashes, title-case
  const stripped = name.replace(/^on/, '').replace(/-/g, ' ')
  return stripped.charAt(0).toUpperCase() + stripped.slice(1)
}

function buildAvailableEvents(): { name: string; label: string; acceptsKey: boolean }[] {
  const all = getAllEvents()
  const common = COMMON_FIRST.filter(n => all.includes(n))
  const rest = all.filter(n => !COMMON_FIRST.includes(n)).sort()
  return [...common, ...rest].map(name => {
    const def = DSL.events[name]
    return { name, label: eventLabel(name), acceptsKey: !!def?.acceptsKey }
  })
}

/** Action names sourced from the schema, presented as `name()` for the datalist. */
function buildActionHints(): string[] {
  return getAllActions()
    .sort()
    .map(a => `${a}()`)
}

/**
 * Extended SectionData with events
 */
interface EventsSectionData extends SectionData {
  events?: Array<{
    name: string
    key?: string
    actions: Array<{
      name: string
      target?: string
      arguments?: string[]
      isFunctionCall: boolean
    }>
  }>
}

/**
 * Icons for the section
 */
const ADD_ICON =
  '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
const DELETE_ICON =
  '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'

/**
 * Events Section class
 */
export class EventsSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Events' }, deps)
  }

  render(data: EventsSectionData): string {
    this.data = data
    const element = data.currentElement
    if (!element) return ''

    // Get events from the element (passed via extended SectionData)
    const events = data.events || []

    // Render existing events
    const eventRows = events.map((event, index) => this.renderEventRow(event, index)).join('')

    // Get events not yet added for the "Add" dropdown — sourced from schema.
    const usedEvents = new Set(events.map(e => e.name))
    const availableToAdd = buildAvailableEvents().filter(e => !usedEvents.has(e.name))

    return `
      <div class="section">
        <div class="section-label">Events</div>
        <div class="section-content">
          ${eventRows}
          ${this.renderAddEventRow(availableToAdd)}
        </div>
      </div>
    `
  }

  /**
   * Render a single event row
   */
  private renderEventRow(
    event: {
      name: string
      key?: string
      actions: Array<{
        name: string
        target?: string
        arguments?: string[]
        isFunctionCall: boolean
      }>
    },
    index: number
  ): string {
    const def = getEvent(event.name)
    const label = def ? eventLabel(event.name) : event.name.replace('on', '')

    // Format actions as string
    const actionsStr = this.formatActions(event.actions)

    // Keyboard events accept a key modifier — hint the syntax in the placeholder.
    const placeholder = def?.acceptsKey
      ? 'toggle(), show(Menu) — for keys: onkeydown(arrow-down)'
      : 'toggle(), show(Menu)...'

    return `
      <div class="prop-row pp-event-row" data-event-index="${index}">
        <span class="prop-label pp-event-name">${this.deps.escapeHtml(label)}</span>
        <div class="prop-content pp-event-content">
          <input type="text"
                 class="prop-input wide pp-event-action"
                 value="${this.deps.escapeHtml(actionsStr)}"
                 data-event-name="${event.name}"
                 data-event-index="${index}"
                 placeholder="${this.deps.escapeHtml(placeholder)}"
                 autocomplete="off"
                 list="pp-action-hints">
          <button class="pp-event-delete" data-delete-event="${event.name}" title="Remove event">
            <svg class="icon" viewBox="0 0 24 24">${DELETE_ICON}</svg>
          </button>
        </div>
      </div>
    `
  }

  /**
   * Render the "Add event" row
   */
  private renderAddEventRow(
    availableToAdd: { name: string; label: string; acceptsKey: boolean }[]
  ): string {
    if (availableToAdd.length === 0) {
      return '' // All events already added
    }

    const options = availableToAdd
      .map(e => `<option value="${e.name}">${this.deps.escapeHtml(e.label)}</option>`)
      .join('')

    return `
      <div class="prop-row pp-add-event-row">
        <div class="prop-content">
          <select class="prop-select pp-add-event-select">
            <option value="">+ Add event...</option>
            ${options}
          </select>
        </div>
      </div>
      <datalist id="pp-action-hints">
        ${buildActionHints()
          .map(a => `<option value="${this.deps.escapeHtml(a)}">`)
          .join('')}
      </datalist>
    `
  }

  /**
   * Format actions array to string representation
   */
  private formatActions(
    actions: Array<{ name: string; target?: string; arguments?: string[]; isFunctionCall: boolean }>
  ): string {
    return actions
      .map(action => {
        if (action.isFunctionCall) {
          const args = action.arguments?.join(', ') || ''
          const target = action.target ? action.target + (args ? ', ' + args : '') : args
          return `${action.name}(${target})`
        } else {
          // Legacy syntax: action target
          return action.target ? `${action.name} ${action.target}` : action.name
        }
      })
      .join(', ')
  }

  getHandlers(): EventHandlerMap {
    return {
      'input.pp-event-action': {
        change: (e: Event, target: HTMLElement) => {
          const input = target as HTMLInputElement
          const eventName = input.dataset.eventName
          if (eventName) {
            // Emit event change with the new action string
            this.deps.onPropertyChange(
              '__EVENT_ACTION__',
              JSON.stringify({
                event: eventName,
                actions: input.value,
              }),
              'input'
            )
          }
        },
      },
      'select.pp-add-event-select': {
        change: (e: Event, target: HTMLElement) => {
          const select = target as HTMLSelectElement
          const eventName = select.value
          if (eventName) {
            // Emit add event command
            this.deps.onPropertyChange('__ADD_EVENT__', eventName, 'select')
            // Reset select
            select.value = ''
          }
        },
      },
      'button.pp-event-delete': {
        click: (e: Event, target: HTMLElement) => {
          const eventName = (target as HTMLElement).dataset.deleteEvent
          if (eventName) {
            // Emit delete event command
            this.deps.onPropertyChange('__DELETE_EVENT__', eventName, 'button')
          }
        },
      },
    }
  }
}

/**
 * Factory function
 */
export function createEventsSection(deps: SectionDependencies): EventsSection {
  return new EventsSection(deps)
}
