/**
 * Panel Navigation Keymap
 *
 * Handles keyboard navigation for inline panels (color, icon, font, token)
 * in the editor. Must be registered first to intercept keys when panel is open.
 *
 * Supports both 1D (list) and 2D (grid) navigation.
 */
import { keymap } from '@codemirror/view'
import type { EditorView } from '@codemirror/view'
import type { ColorPanelState } from '../hooks/useColorPanel'
import type { InlinePanelState } from '../hooks/useInlinePanel'
import { prepareInsertText } from './utils'
import { navigateIconGrid } from '../components/InlineIconPanel'

// Grid columns for icon panel
const ICON_GRID_COLUMNS = 6

export interface PanelKeymapConfig {
  // Color panel (existing)
  getColorPanelState: () => ColorPanelState
  setColorPanelState: React.Dispatch<React.SetStateAction<ColorPanelState>>
  getSelectedValue: () => string | null // Legacy name, used for color

  // Icon panel (optional - for backward compatibility)
  getIconPanelState?: () => InlinePanelState
  setIconPanelState?: React.Dispatch<React.SetStateAction<InlinePanelState>>
  getIconSelectedValue?: () => string | null
  getIconItemCount?: () => number

  // Font panel (optional)
  getFontPanelState?: () => InlinePanelState
  setFontPanelState?: React.Dispatch<React.SetStateAction<InlinePanelState>>
  getFontSelectedValue?: () => string | null
  getFontItemCount?: () => number
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
  getIconPanelState,
  setIconPanelState,
  getIconSelectedValue,
  getIconItemCount,
  getFontPanelState,
  setFontPanelState,
  getFontSelectedValue,
  getFontItemCount,
}: PanelKeymapConfig) {
  // Helper to check if icon panel is configured and open
  const isIconPanelOpen = () => getIconPanelState?.()?.isOpen ?? false
  // Helper to check if font panel is configured and open
  const isFontPanelOpen = () => getFontPanelState?.()?.isOpen ?? false

  return keymap.of([
    // === ESCAPE: Close any open panel ===
    {
      key: 'Escape',
      run: () => {
        if (getColorPanelState().isOpen) {
          setColorPanelState(prev => ({ ...prev, isOpen: false }))
          return true
        }
        if (isIconPanelOpen() && setIconPanelState) {
          setIconPanelState(prev => ({ ...prev, isOpen: false, type: null }))
          return true
        }
        if (isFontPanelOpen() && setFontPanelState) {
          setFontPanelState(prev => ({ ...prev, isOpen: false, type: null }))
          return true
        }
        return false
      },
    },

    // === ARROW DOWN ===
    {
      key: 'ArrowDown',
      run: () => {
        // Color panel: simple increment
        if (getColorPanelState().isOpen) {
          setColorPanelState(prev => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }))
          return true
        }
        // Icon panel: grid navigation
        if (isIconPanelOpen() && setIconPanelState && getIconItemCount) {
          const itemCount = getIconItemCount()
          setIconPanelState(prev => ({
            ...prev,
            selectedIndex: navigateIconGrid(prev.selectedIndex, 'down', itemCount, ICON_GRID_COLUMNS)
          }))
          return true
        }
        // Font panel: list navigation
        if (isFontPanelOpen() && setFontPanelState && getFontItemCount) {
          const itemCount = getFontItemCount()
          setFontPanelState(prev => ({
            ...prev,
            selectedIndex: Math.min(prev.selectedIndex + 1, itemCount - 1)
          }))
          return true
        }
        return false
      },
    },

    // === ARROW UP ===
    {
      key: 'ArrowUp',
      run: () => {
        // Color panel: simple decrement
        if (getColorPanelState().isOpen) {
          setColorPanelState(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }))
          return true
        }
        // Icon panel: grid navigation
        if (isIconPanelOpen() && setIconPanelState && getIconItemCount) {
          const itemCount = getIconItemCount()
          setIconPanelState(prev => ({
            ...prev,
            selectedIndex: navigateIconGrid(prev.selectedIndex, 'up', itemCount, ICON_GRID_COLUMNS)
          }))
          return true
        }
        // Font panel: list navigation
        if (isFontPanelOpen() && setFontPanelState) {
          setFontPanelState(prev => ({
            ...prev,
            selectedIndex: Math.max(0, prev.selectedIndex - 1)
          }))
          return true
        }
        return false
      },
    },

    // === ARROW LEFT (grid only) ===
    {
      key: 'ArrowLeft',
      run: () => {
        // Icon panel: grid navigation
        if (isIconPanelOpen() && setIconPanelState && getIconItemCount) {
          const itemCount = getIconItemCount()
          setIconPanelState(prev => ({
            ...prev,
            selectedIndex: navigateIconGrid(prev.selectedIndex, 'left', itemCount, ICON_GRID_COLUMNS)
          }))
          return true
        }
        return false
      },
    },

    // === ARROW RIGHT (grid only) ===
    {
      key: 'ArrowRight',
      run: () => {
        // Icon panel: grid navigation
        if (isIconPanelOpen() && setIconPanelState && getIconItemCount) {
          const itemCount = getIconItemCount()
          setIconPanelState(prev => ({
            ...prev,
            selectedIndex: navigateIconGrid(prev.selectedIndex, 'right', itemCount, ICON_GRID_COLUMNS)
          }))
          return true
        }
        return false
      },
    },

    // === ENTER: Select and insert ===
    {
      key: 'Enter',
      run: (view: EditorView) => {
        // Color panel
        const colorState = getColorPanelState()
        if (colorState.isOpen) {
          const { triggerPos } = colorState
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

        // Icon panel
        if (isIconPanelOpen() && getIconPanelState && setIconPanelState && getIconSelectedValue) {
          const iconState = getIconPanelState()
          const { triggerPos } = iconState
          const cursorPos = view.state.selection.main.head
          const selectedValue = getIconSelectedValue()

          if (selectedValue) {
            view.dispatch({
              changes: { from: triggerPos, to: cursorPos, insert: selectedValue },
              selection: { anchor: triggerPos + selectedValue.length },
            })
          }
          setIconPanelState(prev => ({ ...prev, isOpen: false, type: null }))
          return true
        }

        // Font panel
        if (isFontPanelOpen() && getFontPanelState && setFontPanelState && getFontSelectedValue) {
          const fontState = getFontPanelState()
          const { triggerPos } = fontState
          const cursorPos = view.state.selection.main.head
          const selectedValue = getFontSelectedValue()

          if (selectedValue) {
            view.dispatch({
              changes: { from: triggerPos, to: cursorPos, insert: selectedValue },
              selection: { anchor: triggerPos + selectedValue.length },
            })
          }
          setFontPanelState(prev => ({ ...prev, isOpen: false, type: null }))
          return true
        }

        return false
      },
    },

    // === TAB: Also select (like Enter) ===
    {
      key: 'Tab',
      run: (view: EditorView) => {
        // Icon panel: Tab selects like Enter
        if (isIconPanelOpen() && getIconPanelState && setIconPanelState && getIconSelectedValue) {
          const iconState = getIconPanelState()
          const { triggerPos } = iconState
          const cursorPos = view.state.selection.main.head
          const selectedValue = getIconSelectedValue()

          if (selectedValue) {
            view.dispatch({
              changes: { from: triggerPos, to: cursorPos, insert: selectedValue },
              selection: { anchor: triggerPos + selectedValue.length },
            })
          }
          setIconPanelState(prev => ({ ...prev, isOpen: false, type: null }))
          return true
        }

        // Font panel: Tab selects like Enter
        if (isFontPanelOpen() && getFontPanelState && setFontPanelState && getFontSelectedValue) {
          const fontState = getFontPanelState()
          const { triggerPos } = fontState
          const cursorPos = view.state.selection.main.head
          const selectedValue = getFontSelectedValue()

          if (selectedValue) {
            view.dispatch({
              changes: { from: triggerPos, to: cursorPos, insert: selectedValue },
              selection: { anchor: triggerPos + selectedValue.length },
            })
          }
          setFontPanelState(prev => ({ ...prev, isOpen: false, type: null }))
          return true
        }

        return false
      },
    },
  ])
}

// Note: Icon panel config fields are optional for backward compatibility.
// If not provided, only color panel navigation will work.
