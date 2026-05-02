/**
 * Property Panel — global DOM event listeners
 *
 * The property panel dispatches plain CustomEvents on `document` to
 * request work that needs studio-level dependencies (the active
 * CodeModifier, the global IconPicker, etc.). Wiring those listeners
 * lives here so the panel itself stays free of those dependencies.
 *
 * Extracted from studio/app.js so the glue is typed.
 */

import { getGlobalIconPicker, setGlobalIconPickerCallback } from '../../pickers/icon'
import type { CodeModifier, ModificationResult } from '../../code-modifier/code-modifier'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('PropertyEvents')

// =============================================================================
// Icon picker (property-panel:open-icon-picker)
// =============================================================================

interface IconPickerEventDetail {
  onSelect?: (iconName: string) => void
}

/**
 * Wire the property panel's "open icon picker" affordance to the
 * global IconPicker instance. The panel dispatches
 * `property-panel:open-icon-picker` with an `{ onSelect }` callback;
 * we position the picker near the trigger button (or fall back to the
 * panel) and forward the selected icon back through `onSelect`.
 */
export function setupPropertyPanelIconPicker(): void {
  document.addEventListener('property-panel:open-icon-picker', e => {
    const detail = (e as CustomEvent<IconPickerEventDetail>).detail
    const onSelect = detail?.onSelect
    if (!onSelect) {
      log.warn('[IconPicker] No onSelect callback provided')
      return
    }

    const iconPicker = getGlobalIconPicker()
    iconPicker.loadLucideIcons()

    setGlobalIconPickerCallback(iconName => {
      onSelect(iconName)
      iconPicker.hide()
    })

    const target = e.target instanceof Element ? e.target : null
    const triggerButton = target?.closest<HTMLButtonElement>('button[data-open-icon-picker]')
    if (triggerButton) {
      const rect = triggerButton.getBoundingClientRect()
      iconPicker.showAt(rect.left, rect.bottom + 4)
    } else {
      const propertyPanel = document.getElementById('property-panel')
      if (propertyPanel) {
        const rect = propertyPanel.getBoundingClientRect()
        iconPicker.showAt(rect.left + 20, rect.top + 100)
      }
    }
  })
}

// =============================================================================
// Event add / delete / change (property-panel:add-event, …)
// =============================================================================

export interface PropertyPanelEventListenerDeps {
  /**
   * Active CodeModifier instance. Returned via getter so the listener
   * stays valid across recompiles that swap the modifier.
   */
  getCodeModifier: () => CodeModifier | null
  /** Called after a successful modification to apply it to the editor. */
  onCodeChange: (result: ModificationResult) => void
}

interface AddEventDetail {
  nodeId?: string
  eventName?: string
}

interface DeleteEventDetail {
  nodeId?: string
  eventName?: string
}

interface ChangeEventDetail {
  nodeId?: string
  eventName?: string
  actionsString?: string
}

/**
 * Wire the property panel's add/delete/change event affordances to
 * the active CodeModifier.
 *
 * Event format for `actionsString`:
 *   `actionName(target)` | `actionName()` | `actionName`
 */
export function setupPropertyPanelEventListeners(deps: PropertyPanelEventListenerDeps): void {
  document.addEventListener('property-panel:add-event', e => {
    const { nodeId, eventName } = (e as CustomEvent<AddEventDetail>).detail || {}
    const codeModifier = deps.getCodeModifier()
    if (!nodeId || !eventName || !codeModifier) {
      log.warn('[PropertyPanel] Add event: missing data', { nodeId, eventName })
      return
    }

    log.debug('[PropertyPanel] Adding event:', eventName, 'to node:', nodeId)
    const result = codeModifier.addEvent(nodeId, eventName, 'toggle')
    if (result.success) {
      deps.onCodeChange(result)
    } else {
      log.warn('[PropertyPanel] Failed to add event:', result.error)
    }
  })

  document.addEventListener('property-panel:delete-event', e => {
    const { nodeId, eventName } = (e as CustomEvent<DeleteEventDetail>).detail || {}
    const codeModifier = deps.getCodeModifier()
    if (!nodeId || !eventName || !codeModifier) {
      log.warn('[PropertyPanel] Delete event: missing data', { nodeId, eventName })
      return
    }

    log.debug('[PropertyPanel] Deleting event:', eventName, 'from node:', nodeId)
    const result = codeModifier.removeEvent(nodeId, eventName)
    if (result.success) {
      deps.onCodeChange(result)
    } else {
      log.warn('[PropertyPanel] Failed to delete event:', result.error)
    }
  })

  document.addEventListener('property-panel:event-change', e => {
    const { nodeId, eventName, actionsString } = (e as CustomEvent<ChangeEventDetail>).detail || {}
    const codeModifier = deps.getCodeModifier()
    if (!nodeId || !eventName || !codeModifier) {
      log.warn('[PropertyPanel] Event change: missing data', { nodeId, eventName })
      return
    }

    log.debug('[PropertyPanel] Changing event:', eventName, 'actions to:', actionsString)

    // Parse "actionName(target)" / "actionName()" / "actionName"
    let actionName = actionsString || 'toggle'
    let target: string | undefined = undefined

    const match = actionsString?.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)$/)
    if (match) {
      actionName = match[1]
      target = match[2] || undefined
    } else if (actionsString && !actionsString.includes('(')) {
      actionName = actionsString
    }

    const result = codeModifier.updateEvent(
      nodeId,
      eventName,
      undefined,
      eventName,
      actionName,
      target,
      undefined
    )
    if (result.success) {
      deps.onCodeChange(result)
    } else {
      log.warn('[PropertyPanel] Failed to update event:', result.error)
    }
  })
}
