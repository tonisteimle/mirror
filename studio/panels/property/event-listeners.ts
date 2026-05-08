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

let iconPickerListenerRegistered = false

/**
 * Wire the property panel's "open icon picker" affordance to the
 * global IconPicker instance. The panel dispatches
 * `property-panel:open-icon-picker` with an `{ onSelect }` callback;
 * we position the picker near the trigger button (or fall back to the
 * panel) and forward the selected icon back through `onSelect`.
 *
 * Idempotent: a second call is a no-op so hot-reload / repeat-init
 * does not stack listeners.
 */
export function setupPropertyPanelIconPicker(): void {
  if (iconPickerListenerRegistered) return
  iconPickerListenerRegistered = true

  const handler: EventListener = e => {
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
  }
  document.addEventListener('property-panel:open-icon-picker', handler)
  registeredIconPickerListeners.push({ type: 'property-panel:open-icon-picker', handler })
}

// =============================================================================
// Event add / delete / change (property-panel:add-event, …)
// =============================================================================

export type NotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface PropertyPanelEventListenerDeps {
  /**
   * Active CodeModifier instance. Returned via getter so the listener
   * stays valid across recompiles that swap the modifier.
   */
  getCodeModifier: () => CodeModifier | null
  /** Called after a successful modification to apply it to the editor. */
  onCodeChange: (result: ModificationResult) => void
  /**
   * Optional: surface failures to the user (toast, banner, …). When
   * omitted, failures only log to the console.
   */
  notify?: (level: NotificationLevel, message: string) => void
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
 * Module-level slot holding the active deps. The DOM listeners below
 * read `currentDeps` on each event so a second `setupPropertyPanelEventListeners`
 * call simply swaps the deps in-place without stacking listeners.
 */
let currentDeps: PropertyPanelEventListenerDeps | null = null
let eventListenersRegistered = false
const registeredListeners: Array<{ type: string; handler: EventListener }> = []
const registeredIconPickerListeners: Array<{ type: string; handler: EventListener }> = []

/**
 * Normalize a user-typed action chain so each action ends in `()` even
 * if the user typed a bare name. `toggle, show(Menu)` →
 * `toggle(), show(Menu)`. Top-level-only — commas inside parens are
 * preserved verbatim.
 */
function normalizeActionsString(s: string): string {
  const parts: string[] = []
  let depth = 0
  let buf = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) {
      parts.push(buf)
      buf = ''
      continue
    }
    buf += ch
  }
  parts.push(buf)
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => (p.includes('(') ? p : `${p}()`))
    .join(', ')
}

/**
 * Wire the property panel's add/delete/change event affordances to
 * the active CodeModifier.
 *
 * Idempotent: a second call swaps the deps in-place so hot-reload
 * does not stack listeners. Failures fire `deps.notify('error', …)`
 * (when supplied) so the user sees a toast instead of a silent log.
 *
 * Event format for `actionsString`: any combination of
 *   `actionName(target)` | `actionName()` | `actionName`
 * separated by top-level commas. The first action's name+target is
 * forwarded to `updateEvent`; the rest is preserved verbatim in the
 * source line by `updateEvent`'s implementation.
 */
export function setupPropertyPanelEventListeners(deps: PropertyPanelEventListenerDeps): void {
  currentDeps = deps
  if (eventListenersRegistered) return
  eventListenersRegistered = true

  const addHandler: EventListener = e => {
    if (!currentDeps) return
    const { nodeId, eventName } = (e as CustomEvent<AddEventDetail>).detail || {}
    const codeModifier = currentDeps.getCodeModifier()
    if (!nodeId || !eventName || !codeModifier) {
      log.warn('[PropertyPanel] Add event: missing data', { nodeId, eventName })
      return
    }

    log.debug('[PropertyPanel] Adding event:', eventName, 'to node:', nodeId)
    const result = codeModifier.addEvent(nodeId, eventName, 'toggle')
    if (result.success) {
      currentDeps.onCodeChange(result)
    } else {
      log.warn('[PropertyPanel] Failed to add event:', result.error)
      currentDeps.notify?.('error', `Could not add event: ${result.error || 'unknown error'}`)
    }
  }

  const deleteHandler: EventListener = e => {
    if (!currentDeps) return
    const { nodeId, eventName } = (e as CustomEvent<DeleteEventDetail>).detail || {}
    const codeModifier = currentDeps.getCodeModifier()
    if (!nodeId || !eventName || !codeModifier) {
      log.warn('[PropertyPanel] Delete event: missing data', { nodeId, eventName })
      return
    }

    log.debug('[PropertyPanel] Deleting event:', eventName, 'from node:', nodeId)
    const result = codeModifier.removeEvent(nodeId, eventName)
    if (result.success) {
      currentDeps.onCodeChange(result)
    } else {
      log.warn('[PropertyPanel] Failed to delete event:', result.error)
      currentDeps.notify?.('error', `Could not delete event: ${result.error || 'unknown error'}`)
    }
  }

  const changeHandler: EventListener = e => {
    if (!currentDeps) return
    const { nodeId, eventName, actionsString } = (e as CustomEvent<ChangeEventDetail>).detail || {}
    const codeModifier = currentDeps.getCodeModifier()
    if (!nodeId || !eventName || !codeModifier) {
      log.warn('[PropertyPanel] Event change: missing data', { nodeId, eventName })
      return
    }

    log.debug('[PropertyPanel] Changing event:', eventName, 'actions to:', actionsString)

    const normalized = normalizeActionsString((actionsString || '').trim() || 'toggle')
    const result = codeModifier.setEventActions(nodeId, eventName, normalized)
    if (result.success) {
      currentDeps.onCodeChange(result)
    } else {
      log.warn('[PropertyPanel] Failed to update event:', result.error)
      currentDeps.notify?.('error', `Could not update event: ${result.error || 'unknown error'}`)
    }
  }

  document.addEventListener('property-panel:add-event', addHandler)
  document.addEventListener('property-panel:delete-event', deleteHandler)
  document.addEventListener('property-panel:event-change', changeHandler)
  registeredListeners.push(
    { type: 'property-panel:add-event', handler: addHandler },
    { type: 'property-panel:delete-event', handler: deleteHandler },
    { type: 'property-panel:event-change', handler: changeHandler }
  )
}

/**
 * Test-only reset of the module-level registration flags so unit tests
 * can re-wire listeners with fresh deps without stacking them.
 */
export function __resetPropertyPanelListenersForTests(): void {
  for (const { type, handler } of registeredListeners) {
    document.removeEventListener(type, handler)
  }
  for (const { type, handler } of registeredIconPickerListeners) {
    document.removeEventListener(type, handler)
  }
  registeredListeners.length = 0
  registeredIconPickerListeners.length = 0
  currentDeps = null
  eventListenersRegistered = false
  iconPickerListenerRegistered = false
}
