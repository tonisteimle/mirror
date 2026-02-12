/**
 * Panel Navigation Keymap
 *
 * Handles keyboard navigation for inline panels (color picker, etc.)
 * in the editor. Must be registered first to intercept keys when panel is open.
 */
import { keymap } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { ColorPanelState } from '../hooks/useColorPanel'
import { prepareInsertText } from './utils'

export interface PanelKeymapConfig {
  getColorPanelState: () => ColorPanelState
  setColorPanelState: React.Dispatch<React.SetStateAction<ColorPanelState>>
  getSelectedValue: () => string | null
}

/** @deprecated Use PanelKeymapConfig instead */
export type PanelKeymapOptions = PanelKeymapConfig

/**
 * Create keymap extension for panel navigation.
 */
export function createPanelKeymap({
  getColorPanelState,
  setColorPanelState,
  getSelectedValue,
}: PanelKeymapConfig) {
  return keymap.of([
    {
      key: 'Escape',
      run: () => {
        if (getColorPanelState().isOpen) {
          setColorPanelState(prev => ({ ...prev, isOpen: false }))
          return true
        }
        return false
      },
    },
    {
      key: 'ArrowDown',
      run: () => {
        if (getColorPanelState().isOpen) {
          setColorPanelState(prev => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }))
          return true
        }
        return false
      },
    },
    {
      key: 'ArrowUp',
      run: () => {
        if (getColorPanelState().isOpen) {
          setColorPanelState(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }))
          return true
        }
        return false
      },
    },
    {
      key: 'Enter',
      run: (view: EditorView) => {
        const panelState = getColorPanelState()
        if (panelState.isOpen) {
          const { triggerPos } = panelState
          const cursorPos = view.state.selection.main.head

          // Read filter directly from document
          let filter = view.state.doc.sliceString(triggerPos, cursorPos)
          if (filter.startsWith('#')) {
            filter = filter.slice(1)
          }

          // Determine the value to insert
          let selectedValue: string | null = null
          const isHexInput = /^[0-9a-fA-F]{1,8}$/.test(filter)
          if (isHexInput && filter.length >= 3) {
            selectedValue = '#' + filter.toUpperCase()
          } else {
            selectedValue = getSelectedValue()
          }

          if (selectedValue) {
            const insertText = prepareInsertText(view, selectedValue, triggerPos)
            view.dispatch({
              changes: { from: triggerPos, to: cursorPos, insert: insertText },
            })
          }
          setColorPanelState(prev => ({ ...prev, isOpen: false }))
          return true
        }
        return false
      },
    },
  ])
}
