/**
 * Color Trigger - Editor Trigger for Color Picker
 *
 * Triggers the ColorPicker when:
 * 1. Typing '#' after color properties (bg, col, etc.)
 * 2. Double-clicking on existing hex colors
 *
 * Uses the new TriggerManager system with the beautiful Figma-style ColorPicker from app.js.
 */

import type { EditorView, ViewUpdate } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import type { TriggerConfig, TriggerContext } from './types'
import { getTriggerManager } from '../trigger-manager'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('ColorTrigger')

export const COLOR_HASH_TRIGGER_ID = 'color-hash'
export const COLOR_DOUBLECLICK_TRIGGER_ID = 'color-doubleclick'

// Context pattern for # trigger
// Matches: color property + space (e.g., "bg ", "col ")
// Also matches token definition with color suffix (e.g., "name.bg: " or legacy "$name.bg: ")
// Also matches simple token definition (e.g., "name: " or legacy "$name: ")
const COLOR_CONTEXT_PATTERN =
  /\b(bg|col|color|background|boc|border-color|hover-bg|hover-col|hover-boc)\s+$|\$?[\w-]+\.(bg|col|color|boc):\s*$|\$?[\w-]+:\s*$/

// Hex color pattern for double-click
const HEX_COLOR_PATTERN = /#[0-9A-Fa-f]{3,8}\b/

// State for color picker wrapper
interface ColorTriggerState {
  isHashTrigger: boolean
  selectedIndex: number
  currentContext: TriggerContext | null
  currentView: EditorView | null
  isOpen: boolean
}

let colorState: ColorTriggerState = {
  isHashTrigger: false,
  selectedIndex: 0,
  currentContext: null,
  currentView: null,
  isOpen: false,
}

// Color palette data (will be loaded from color picker module)
const SWATCH_COLUMNS = 13
const SWATCH_ROWS = 10

/**
 * Wrapper that implements the picker interface but uses the global showColorPicker from app.js
 */
class GlobalColorPickerWrapper {
  private isHashTrigger: boolean
  public readonly pickerType = 'color' as const

  constructor(isHashTrigger: boolean) {
    this.isHashTrigger = isHashTrigger
  }

  /**
   * Show the picker at position - calls the global showColorPicker from app.js
   */
  showAt(x: number, y: number): void {
    // Get context from the trigger manager's state (has correct startPos)
    const manager = getTriggerManager()
    const managerState = manager.getState()
    const context = managerState.context || colorState.currentContext
    const view = colorState.currentView

    if (!context || !view) {
      log.warn('No context or view available')
      return
    }

    // Update colorState with correct context from manager
    colorState.currentContext = context

    // Get initial color from existing value (for double-click on existing color)
    const initialColor = context.existingValue || null

    // Determine insert position and replace range
    const insertPos = context.startPos
    const replaceRange = context.replaceRange || null
    const hashStartPos = this.isHashTrigger ? context.startPos : null
    const property = context.property || 'bg'

    // Call the global showColorPicker from app.js
    // Pass null for callback so the Editor-mode logic in selectColor() handles insertion
    const showColorPicker = (window as any).showColorPicker
    if (typeof showColorPicker === 'function') {
      showColorPicker(
        x,
        y,
        insertPos,
        replaceRange,
        initialColor,
        this.isHashTrigger,
        hashStartPos,
        property,
        null // No callback - let selectColor() handle editor insertion directly
      )
      colorState.isOpen = true
    } else {
      log.warn('window.showColorPicker not available')
    }
  }

  /**
   * Hide the picker - calls the global hideColorPicker from app.js
   */
  hide(): void {
    const hideColorPicker = (window as any).hideColorPicker
    if (typeof hideColorPicker === 'function') {
      hideColorPicker()
    }
    colorState.isOpen = false
  }

  /**
   * Check if picker is visible
   */
  isVisible(): boolean {
    return colorState.isOpen
  }

  /**
   * Get the picker element (for click-outside detection)
   */
  getElement(): HTMLElement | null {
    return document.querySelector('.color-picker-popup') as HTMLElement
  }

  /**
   * Get the selected value - not used with global picker
   */
  getSelectedValue(): string {
    return ''
  }

  /**
   * Navigate - handled by the global picker's keyboard handlers
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): void {
    // The global color picker handles its own keyboard navigation
  }

  /**
   * Filter - not applicable to color picker
   */
  filter(text: string): void {
    // Color picker doesn't support filtering
  }
}

/**
 * Create the hash trigger configuration for color picker
 * Uses the beautiful Figma-style ColorPicker from app.js via GlobalColorPickerWrapper
 */
export function createColorHashTriggerConfig(): TriggerConfig {
  return {
    id: COLOR_HASH_TRIGGER_ID,
    trigger: {
      type: 'char',
      char: '#',
      contextPattern: COLOR_CONTEXT_PATTERN,
    },
    picker: () => {
      colorState.isHashTrigger = true
      colorState.selectedIndex = 45 // Default to blue-500 position

      return new GlobalColorPickerWrapper(true)
    },
    onSelect: (value: string, context: TriggerContext, view: EditorView) => {
      // Store context and view for the wrapper to use
      colorState.currentContext = context
      colorState.currentView = view
      insertColor(value, context, view, true)
    },
    liveFilter: false, // No live filter for color picker
    closeOnChars: [], // Let the global picker handle closing
    keyboard: {
      orientation: 'grid',
      columns: SWATCH_COLUMNS,
    },
    priority: 80,
    shouldActivate: (update: ViewUpdate, insertedText: string, context: TriggerContext) => {
      // Store context and view for the wrapper
      colorState.currentContext = context
      colorState.currentView = update.view
      return COLOR_CONTEXT_PATTERN.test(context.textBefore)
    },
    shouldClose: (update: ViewUpdate, insertedText: string, context: TriggerContext) => {
      // Let the global picker handle its own closing
      return false
    },
  }
}

/**
 * Create the double-click trigger configuration for editing existing colors
 * Uses the beautiful Figma-style ColorPicker from app.js via GlobalColorPickerWrapper
 */
export function createColorDoubleClickTriggerConfig(): TriggerConfig {
  return {
    id: COLOR_DOUBLECLICK_TRIGGER_ID,
    trigger: {
      type: 'doubleClick',
      pattern: HEX_COLOR_PATTERN,
    },
    picker: () => {
      colorState.isHashTrigger = false

      return new GlobalColorPickerWrapper(false)
    },
    onSelect: (value: string, context: TriggerContext, view: EditorView) => {
      // Store context and view for the wrapper to use
      colorState.currentContext = context
      colorState.currentView = view
      insertColor(value, context, view, false)
    },
    keyboard: {
      orientation: 'grid',
      columns: SWATCH_COLUMNS,
    },
    priority: 70,
  }
}

/**
 * Insert selected color into the editor
 */
function insertColor(
  value: string,
  context: TriggerContext,
  view: EditorView,
  isHashTrigger: boolean
): void {
  let from: number
  let to: number

  if (context.replaceRange) {
    // Replace existing color
    from = context.replaceRange.from
    to = context.replaceRange.to
  } else if (isHashTrigger) {
    // Hash trigger: replace from # position
    from = context.startPos
    to = view.state.selection.main.head
  } else {
    // Insert at cursor
    from = context.startPos
    to = context.startPos
  }

  view.dispatch({
    changes: { from, to, insert: value },
    selection: { anchor: from + value.length },
    annotations: Transaction.userEvent.of('input.color'),
  })

  view.focus()
}

/**
 * Navigate color swatches
 * Grid is row-major: index = row * SWATCH_COLUMNS + col
 */
export function navigateColorSwatches(direction: 'up' | 'down' | 'left' | 'right'): void {
  const totalSwatches = SWATCH_COLUMNS * SWATCH_ROWS
  const currentRow = Math.floor(colorState.selectedIndex / SWATCH_COLUMNS)
  const currentCol = colorState.selectedIndex % SWATCH_COLUMNS

  let newCol = currentCol
  let newRow = currentRow

  switch (direction) {
    case 'left':
      newCol = Math.max(0, currentCol - 1)
      break
    case 'right':
      newCol = Math.min(SWATCH_COLUMNS - 1, currentCol + 1)
      break
    case 'up':
      newRow = Math.max(0, currentRow - 1)
      break
    case 'down':
      newRow = Math.min(SWATCH_ROWS - 1, currentRow + 1)
      break
  }

  const newIndex = newRow * SWATCH_COLUMNS + newCol
  colorState.selectedIndex = Math.min(newIndex, totalSwatches - 1)
}

/**
 * Get the currently selected swatch index
 */
export function getSelectedSwatchIndex(): number {
  return colorState.selectedIndex
}

/**
 * Set the selected swatch index
 */
export function setSelectedSwatchIndex(index: number): void {
  colorState.selectedIndex = index
}

/**
 * Register the color triggers with the global trigger manager
 */
export function registerColorTriggers(): void {
  const manager = getTriggerManager()
  manager.register(createColorHashTriggerConfig())
  manager.register(createColorDoubleClickTriggerConfig())
}

/**
 * Unregister the color triggers
 */
export function unregisterColorTriggers(): void {
  const manager = getTriggerManager()
  manager.unregister(COLOR_HASH_TRIGGER_ID)
  manager.unregister(COLOR_DOUBLECLICK_TRIGGER_ID)
  colorState = {
    isHashTrigger: false,
    selectedIndex: 0,
    currentContext: null,
    currentView: null,
    isOpen: false,
  }
}

/**
 * Check if the hash trigger is active
 */
export function isHashTriggerActive(): boolean {
  return colorState.isHashTrigger
}

/**
 * Get the color context pattern
 */
export function getColorContextPattern(): RegExp {
  return COLOR_CONTEXT_PATTERN
}

/**
 * Get the hex color pattern
 */
export function getHexColorPattern(): RegExp {
  return HEX_COLOR_PATTERN
}
