/**
 * EventsSection - Event Handlers (onclick, onhover, etc.)
 *
 * Handles:
 * - Display of existing events
 * - Add event button
 * - Edit/delete event actions
 */

import { BaseSection, type SectionDependencies } from '../base/section'
import type { SectionData, EventHandlerMap, ExtractedEvent } from '../types'
import { escapeHtml } from '../utils'

/**
 * Icons
 */
const ICONS = {
  edit: '<path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" fill="none"/>',
  delete: '<path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="1.5"/>',
  add: '<path d="M7 2V12M2 7H12" stroke="currentColor" stroke-width="1.5"/>'
}

/**
 * EventsSection class
 */
export class EventsSection extends BaseSection {
  constructor(deps: SectionDependencies) {
    super({ label: 'Events' }, deps)
  }

  render(data: SectionData): string {
    this.data = data
    const events = data.events || []

    const eventRows = events.map((event, index) => this.renderEventRow(event, index)).join('')
    const hasEvents = events.length > 0

    const emptyState = `
      <div class="pp-events-empty-state">
        <div class="pp-events-empty-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
            <path d="M12 6v6l4 2"/>
          </svg>
        </div>
        <span class="pp-events-empty-title">No events yet</span>
        <span class="pp-events-empty-hint">Add interactions like onclick, onhover, or keyboard events</span>
      </div>
    `

    return `
      <div class="pp-section">
        <div class="pp-label-with-action">
          <span class="pp-label">Events</span>
          <button class="pp-add-event-btn" title="Add event handler (onclick, onhover, etc.)">
            <svg viewBox="0 0 14 14" width="12" height="12">
              ${ICONS.add}
            </svg>
            Add
          </button>
        </div>
        <div class="pp-events-list ${hasEvents ? '' : 'empty'}">
          ${hasEvents ? eventRows : emptyState}
        </div>
      </div>
    `
  }

  getHandlers(): EventHandlerMap {
    return {
      // Add event button
      '.pp-add-event-btn': {
        click: (e: Event, target: HTMLElement) => {
          this.deps.onPropertyChange('__ADD_EVENT__', '', 'toggle')
        }
      },
      // Edit event button
      '.pp-event-edit': {
        click: (e: Event, target: HTMLElement) => {
          const index = target.getAttribute('data-event-index')
          if (index) {
            this.deps.onPropertyChange('__EDIT_EVENT__', index, 'toggle')
          }
        }
      },
      // Delete event button
      '.pp-event-delete': {
        click: (e: Event, target: HTMLElement) => {
          const index = target.getAttribute('data-event-index')
          if (index) {
            this.deps.onPropertyChange('__DELETE_EVENT__', index, 'toggle')
          }
        }
      }
    }
  }

  // ============================================
  // Private Render Methods
  // ============================================

  private renderEventRow(event: ExtractedEvent, index: number): string {
    // Format the event display
    const eventName = event.key ? `${event.name} ${event.key}` : event.name
    const actionsStr = event.actions.map(a => {
      if (a.target) {
        return `${a.name}(${a.target})`
      }
      return a.isFunctionCall ? `${a.name}()` : a.name
    }).join(', ')

    // Multiple actions: show indicator and modify edit button
    const hasMultipleActions = event.actions.length > 1
    const multiActionClass = hasMultipleActions ? ' has-multiple-actions' : ''
    const editTitle = hasMultipleActions
      ? 'Multiple actions - delete and recreate to modify'
      : 'Edit'

    return `
      <div class="pp-event-row${multiActionClass}" data-event-index="${index}">
        <span class="pp-event-name">${escapeHtml(eventName)}</span>
        <span class="pp-event-arrow">\u2192</span>
        <span class="pp-event-action">${escapeHtml(actionsStr)}</span>
        ${hasMultipleActions ? `<span class="pp-event-multi-badge" title="Multiple actions">\u00d7${event.actions.length}</span>` : ''}
        <button class="pp-event-edit" data-event-index="${index}" title="${editTitle}">
          <svg viewBox="0 0 14 14" width="12" height="12">
            ${ICONS.edit}
          </svg>
        </button>
        <button class="pp-event-delete" data-event-index="${index}" title="Delete">
          <svg viewBox="0 0 14 14" width="12" height="12">
            ${ICONS.delete}
          </svg>
        </button>
      </div>
    `
  }
}

/**
 * Factory function
 */
export function createEventsSection(deps: SectionDependencies): EventsSection {
  return new EventsSection(deps)
}
