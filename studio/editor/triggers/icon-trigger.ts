/**
 * Icon Trigger - Editor Trigger for Icon Picker
 *
 * Triggers the IconPicker when typing space after an Icon component.
 * Uses the new TriggerManager system.
 */

import type { EditorView } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import { getGlobalIconPicker, setGlobalIconPickerCallback } from '../../pickers'
import type { TriggerConfig, TriggerContext, ComponentPrimitivesMap } from './types'
import { getTriggerManager } from '../trigger-manager'

export const ICON_TRIGGER_ID = 'icon'

/**
 * Create the icon trigger configuration
 */
export function createIconTriggerConfig(): TriggerConfig {
  return {
    id: ICON_TRIGGER_ID,
    trigger: {
      type: 'component',
      names: ['Icon'],
      pattern: /Icon$/, // Matches components ending with "Icon"
      triggerChar: ' ',
    },
    picker: () => {
      const picker = getGlobalIconPicker()
      picker.loadLucideIcons()
      return picker
    },
    onSelect: (value: string, context: TriggerContext, view: EditorView) => {
      // Add to recent icons
      const picker = getGlobalIconPicker()
      if ('addToRecent' in picker) {
        picker.addToRecent(value)
      }
      insertIcon(value, context, view)
    },
    liveFilter: true,
    closeOnChars: [' ', '"', "'"], // Close on space or quote (user wants to type value directly)
    keyboard: {
      orientation: 'grid',
      columns: 7, // Match icon picker grid layout
    },
    priority: 100,
  }
}

/**
 * Insert selected icon into the editor
 */
function insertIcon(name: string, context: TriggerContext, view: EditorView): void {
  const insertText = `"${name}"`

  view.dispatch({
    changes: { from: context.startPos, to: view.state.selection.main.head, insert: insertText },
    selection: { anchor: context.startPos + insertText.length },
    annotations: Transaction.userEvent.of('input.icon'),
  })

  view.focus()
}

/**
 * Register the icon trigger with the global trigger manager
 */
export function registerIconTrigger(): void {
  const manager = getTriggerManager()
  manager.register(createIconTriggerConfig())
}

/**
 * Unregister the icon trigger
 */
export function unregisterIconTrigger(): void {
  const manager = getTriggerManager()
  manager.unregister(ICON_TRIGGER_ID)
}

/**
 * Set component primitives for icon trigger
 */
export function setIconTriggerPrimitives(primitives: ComponentPrimitivesMap): void {
  const manager = getTriggerManager()
  manager.setComponentPrimitives(primitives)
}

/**
 * Get component primitives from icon trigger
 */
export function getIconTriggerPrimitives(): ComponentPrimitivesMap {
  const manager = getTriggerManager()
  return manager.getComponentPrimitives()
}
