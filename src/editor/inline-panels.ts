/**
 * Inline Panels - Editor integration for picker panels.
 *
 * This module provides CodeMirror extensions that:
 * - Track filter text typed after a trigger
 * - Handle keyboard navigation (arrows, enter, tab, escape)
 * - Keep focus in the editor while panels are open
 */
import { keymap } from '@codemirror/view'
import { EditorView } from '@codemirror/view'
import { StateField, StateEffect, type Extension } from '@codemirror/state'

// Panel types
export type PanelType = 'color' | 'spacing' | 'font' | 'icon' | 'shadow' | 'weight' | 'value'

// Panel state
export interface PanelState {
  type: PanelType | null
  triggerPos: number // Position where panel was triggered
  filter: string // Text typed since trigger
  selectedIndex: number
  mode: string // For panels with multiple modes (e.g., 'tokens' | 'picker')
}

// State effects
export const openPanel = StateEffect.define<{ type: PanelType; triggerPos: number; mode?: string }>()
export const closePanel = StateEffect.define<void>()
export const updateFilter = StateEffect.define<string>()
export const updateSelection = StateEffect.define<number>()
export const updateMode = StateEffect.define<string>()

// Initial state
const initialPanelState: PanelState = {
  type: null,
  triggerPos: 0,
  filter: '',
  selectedIndex: 0,
  mode: 'tokens',
}

// State field
export const panelState = StateField.define<PanelState>({
  create() {
    return initialPanelState
  },
  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(openPanel)) {
        return {
          type: effect.value.type,
          triggerPos: effect.value.triggerPos,
          filter: '',
          selectedIndex: 0,
          mode: effect.value.mode || 'tokens',
        }
      }
      if (effect.is(closePanel)) {
        return initialPanelState
      }
      if (effect.is(updateFilter)) {
        return { ...state, filter: effect.value, selectedIndex: 0 }
      }
      if (effect.is(updateSelection)) {
        return { ...state, selectedIndex: effect.value }
      }
      if (effect.is(updateMode)) {
        return { ...state, mode: effect.value, selectedIndex: 0 }
      }
    }

    // Track document changes to update filter
    if (tr.docChanged && state.type !== null) {
      const doc = tr.state.doc
      const cursorPos = tr.state.selection.main.head

      // If cursor moved before trigger, close panel
      if (cursorPos < state.triggerPos) {
        return initialPanelState
      }

      // Extract filter text (from trigger to cursor)
      const filter = doc.sliceString(state.triggerPos, cursorPos)

      // If filter contains space or newline, close panel
      if (/[\s\n]/.test(filter)) {
        return initialPanelState
      }

      return { ...state, filter }
    }

    return state
  },
})

// Callbacks interface
export interface PanelCallbacks {
  onSelect: (type: PanelType, value: string) => void
  getItemCount: (type: PanelType, filter: string, mode: string) => number
}

// Create keymap for panel navigation
export function createPanelKeymap(callbacks: PanelCallbacks): Extension {
  return keymap.of([
    {
      key: 'ArrowDown',
      run: (view) => {
        const state = view.state.field(panelState)
        if (state.type === null) return false

        const itemCount = callbacks.getItemCount(state.type, state.filter, state.mode)
        if (itemCount === 0) return false

        const newIndex = Math.min(itemCount - 1, state.selectedIndex + 1)
        view.dispatch({ effects: updateSelection.of(newIndex) })
        return true
      },
    },
    {
      key: 'ArrowUp',
      run: (view) => {
        const state = view.state.field(panelState)
        if (state.type === null) return false

        const newIndex = Math.max(0, state.selectedIndex - 1)
        view.dispatch({ effects: updateSelection.of(newIndex) })
        return true
      },
    },
    {
      key: 'Tab',
      run: (view) => {
        const state = view.state.field(panelState)
        if (state.type === null) return false

        // Toggle mode for panels that support it
        if (state.type === 'color') {
          const newMode = state.mode === 'tokens' ? 'picker' : 'tokens'
          view.dispatch({ effects: updateMode.of(newMode) })
          return true
        }

        return false
      },
    },
    {
      key: 'Enter',
      run: (view) => {
        const state = view.state.field(panelState)
        if (state.type === null) return false

        // Selection is handled by the React component via callback
        // Just close the panel here
        view.dispatch({ effects: closePanel.of() })
        return true
      },
    },
    {
      key: 'Escape',
      run: (view) => {
        const state = view.state.field(panelState)
        if (state.type === null) return false

        // Remove the filter text and close
        const triggerPos = state.triggerPos
        const cursorPos = view.state.selection.main.head

        view.dispatch({
          changes: { from: triggerPos, to: cursorPos, insert: '' },
          effects: closePanel.of(),
        })
        return true
      },
    },
    {
      key: 'Backspace',
      run: (view) => {
        const state = view.state.field(panelState)
        if (state.type === null) return false

        const cursorPos = view.state.selection.main.head

        // If at trigger position, close panel
        if (cursorPos <= state.triggerPos) {
          view.dispatch({ effects: closePanel.of() })
          return false // Let default backspace handle it
        }

        return false // Let default backspace handle it
      },
    },
  ])
}

// Helper to get panel state from view
export function getPanelState(view: EditorView): PanelState {
  return view.state.field(panelState)
}

// Helper to open a panel
export function triggerPanel(view: EditorView, type: PanelType, mode?: string) {
  const cursorPos = view.state.selection.main.head
  view.dispatch({
    effects: openPanel.of({ type, triggerPos: cursorPos, mode }),
  })
}

// Helper to close panel
export function dismissPanel(view: EditorView) {
  view.dispatch({ effects: closePanel.of() })
}

// Create the full extension
export function inlinePanels(callbacks: PanelCallbacks): Extension {
  return [
    panelState,
    createPanelKeymap(callbacks),
  ]
}
