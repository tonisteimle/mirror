/**
 * Icon Trigger - Editor Extension for Icon Picker
 *
 * Triggers the IconPicker when typing space after an Icon component.
 * Handles keyboard navigation and icon insertion.
 */

import { EditorView, ViewUpdate } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import { IconPicker, getGlobalIconPicker, setGlobalIconPickerCallback } from '../pickers'

export interface IconTriggerState {
  isOpen: boolean
  startPos: number | null
  picker: IconPicker | null
}

// Module state
const triggerState: IconTriggerState = {
  isOpen: false,
  startPos: null,
  picker: null,
}

// Component primitives map - tracks which components are icon types
let componentPrimitives: Map<string, string> = new Map()

/**
 * Set component primitives map
 * This map tracks componentName -> primitive (e.g., "Logo" -> "icon")
 */
export function setComponentPrimitives(primitives: Map<string, string>): void {
  componentPrimitives = primitives
}

/**
 * Get component primitives map
 */
export function getComponentPrimitives(): Map<string, string> {
  return componentPrimitives
}

/**
 * Show the icon picker at specified coordinates
 */
export function showIconPicker(x: number, y: number, startPos: number, view: EditorView): void {
  if (triggerState.isOpen) return

  triggerState.picker = getGlobalIconPicker()
  triggerState.startPos = startPos
  triggerState.isOpen = true

  // Set callback to insert selected icon
  setGlobalIconPickerCallback((iconName: string) => {
    insertIcon(iconName, view)
  })

  // Preload Lucide icons
  triggerState.picker.loadLucideIcons()

  // Show picker at position
  triggerState.picker.showAt(x, y)
}

/**
 * Hide the icon picker
 */
export function hideIconPicker(): void {
  if (!triggerState.isOpen || !triggerState.picker) return

  triggerState.picker.hide()
  triggerState.isOpen = false
  triggerState.startPos = null
}

/**
 * Check if icon picker is open
 */
export function isIconPickerOpen(): boolean {
  return triggerState.isOpen
}

/**
 * Insert selected icon into the editor
 */
function insertIcon(name: string, view: EditorView): void {
  if (triggerState.startPos === null) return

  const cursorPos = view.state.selection.main.head
  const insertText = `"${name}"`

  view.dispatch({
    changes: { from: triggerState.startPos, to: cursorPos, insert: insertText },
    selection: { anchor: triggerState.startPos + insertText.length },
    annotations: Transaction.userEvent.of('input.icon'),
  })

  hideIconPicker()
  view.focus()
}

/**
 * Filter icons based on typed text
 */
function filterIcons(text: string): void {
  if (!triggerState.picker) return
  triggerState.picker.filter(text)
}

/**
 * Navigate icon selection
 */
function navigateIcons(direction: 'up' | 'down' | 'left' | 'right'): void {
  if (!triggerState.picker) return
  triggerState.picker.navigate(direction)
}

/**
 * Select currently highlighted icon
 */
function selectCurrentIcon(view: EditorView): void {
  if (!triggerState.picker) return

  const index = triggerState.picker.getSelectedIndex()
  const icons = triggerState.picker.getFilteredIcons()

  if (icons[index]) {
    triggerState.picker.addToRecent(icons[index].name)
    insertIcon(icons[index].name, view)
  }
}

/**
 * Cancel icon selection and clean up typed text
 */
function cancelIconSelection(view: EditorView): void {
  if (triggerState.startPos !== null) {
    const cursorPos = view.state.selection.main.head
    view.dispatch({
      changes: { from: triggerState.startPos, to: cursorPos, insert: '' },
      selection: { anchor: triggerState.startPos },
    })
  }
  hideIconPicker()
}

/**
 * Editor extension that triggers icon picker on space after icon component
 */
export const iconTriggerExtension = EditorView.updateListener.of((update: ViewUpdate) => {
  if (!update.docChanged) return

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    const insertedText = inserted.toString()

    // Check for space after component name
    if (insertedText === ' ' && !triggerState.isOpen) {
      const line = update.view.state.doc.lineAt(fromB)
      const textBefore = line.text.slice(0, fromB - line.from)

      // Match component name at end of line (allowing trailing spaces)
      const match = textBefore.match(/\b([A-Z][a-zA-Z0-9]*)\s*$/)
      if (match) {
        const componentName = match[1]

        // Check if component is an icon type:
        // 1. Component name is exactly "Icon"
        // 2. Component name ends with "Icon" (e.g., "AppIcon", "NavIcon")
        // 3. Component has primitive "icon" in componentPrimitives
        const isIconComponent =
          componentName === 'Icon' ||
          componentName.endsWith('Icon') ||
          componentPrimitives.get(componentName) === 'icon'

        if (isIconComponent) {
          const coords = update.view.coordsAtPos(fromB)
          if (coords) {
            showIconPicker(coords.left, coords.bottom + 4, fromB + 1, update.view)
            return
          }
        }
      }
    }

    // Filter icons while typing
    if (triggerState.isOpen && triggerState.startPos !== null) {
      const cursorPos = fromB + insertedText.length
      const typedText = update.view.state.doc.sliceString(triggerState.startPos, cursorPos)

      // Close on space (user doesn't want to pick)
      if (insertedText === ' ') {
        hideIconPicker()
        return
      }

      filterIcons(typedText)
    }
  })
})

/**
 * Keyboard handler extension for icon picker
 */
export const iconKeyboardExtension = EditorView.domEventHandlers({
  keydown: (event: KeyboardEvent, view: EditorView) => {
    if (!triggerState.isOpen) return false

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        navigateIcons('down')
        return true

      case 'ArrowUp':
        event.preventDefault()
        navigateIcons('up')
        return true

      case 'ArrowRight':
        event.preventDefault()
        navigateIcons('right')
        return true

      case 'ArrowLeft':
        event.preventDefault()
        navigateIcons('left')
        return true

      case 'Enter':
        event.preventDefault()
        selectCurrentIcon(view)
        return true

      case 'Escape':
        event.preventDefault()
        cancelIconSelection(view)
        return true

      case 'Backspace': {
        // Check if we should close (backspace past start)
        const cursorPos = view.state.selection.main.head
        if (triggerState.startPos !== null && cursorPos <= triggerState.startPos) {
          hideIconPicker()
        }
        return false // Let editor handle it
      }
    }

    return false
  },
})

/**
 * Combined icon picker extensions
 */
export const iconPickerExtensions = [iconTriggerExtension, iconKeyboardExtension]

/**
 * Close icon picker on click outside
 */
export function setupIconPickerClickOutside(): void {
  document.addEventListener('mousedown', (e: MouseEvent) => {
    if (!triggerState.isOpen) return

    const picker = triggerState.picker
    if (!picker) return

    const pickerElement = document.querySelector('.icon-picker')
    if (pickerElement && !pickerElement.contains(e.target as Node)) {
      hideIconPicker()
    }
  })
}
