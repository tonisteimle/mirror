/**
 * Editor Setup Helpers
 *
 * Extracted from PromptPanel.tsx for testability and reusability.
 * Contains logic for creating editor listeners, keymaps, and extensions.
 */

import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { dslTheme, dslHighlighter } from './dsl-syntax'
import { createEditorKeymaps, type KeymapCallbacks } from './keymaps'
import { dslAutocomplete } from './dsl-autocomplete'
import { createPanelKeymap } from './panel-keymap'
import { createColorSwatchPlugin, type ColorSwatchConfig } from './color-swatches'
import { isInsideString, getCharBefore } from './utils'
import type { ValuePickerType } from '../data/dsl-properties'
import type { ColorPanelState } from '../hooks/useColorPanel'

/**
 * Configuration for the update listener.
 */
export interface UpdateListenerConfig {
  /** Ref to track internal changes */
  isInternalChange: React.MutableRefObject<boolean>
  /** Callback when document changes */
  onChange: (value: string) => void
  /** Ref for autocomplete timeout */
  autoCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  /** Get current color panel state */
  getColorPanelState: () => ColorPanelState
  /** Open color panel */
  openColorPanel: () => void
  /** Close color panel */
  closeColorPanel: () => void
  /** Update color panel filter */
  updateColorPanelFilter: (filter: string) => void
  /** Open picker with context */
  openPicker: (type: string, context?: Record<string, unknown>) => void
  /** Schedule a trigger with timeout */
  scheduleTrigger: (fn: () => void, delay: number) => void
}

/**
 * Creates the update listener extension for CodeMirror.
 * Handles document changes, trigger character detection, and color panel updates.
 */
export function createUpdateListener(config: UpdateListenerConfig) {
  const {
    isInternalChange,
    onChange,
    autoCompleteTimeoutRef,
    getColorPanelState,
    openColorPanel,
    closeColorPanel,
    updateColorPanelFilter,
    openPicker,
    scheduleTrigger,
  } = config

  return EditorView.updateListener.of((update) => {
    if (!update.docChanged || isInternalChange.current) return

    onChange(update.state.doc.toString())

    // Cancel pending autocomplete timeout
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current)
      autoCompleteTimeoutRef.current = null
    }

    // Detect trigger characters
    const cursorPos = update.state.selection.main.head
    if (cursorPos > 0) {
      const charBefore = getCharBefore(update.view, cursorPos)
      const line = update.state.doc.lineAt(cursorPos)
      const textBefore = line.text.slice(0, cursorPos - line.from)
      const colorPanelState = getColorPanelState()

      if (!isInsideString(textBefore) && !colorPanelState.isOpen) {
        handleTriggerCharacter(charBefore, textBefore, {
          openColorPanel,
          openPicker,
          scheduleTrigger,
        })
      }
    }

    // Update color panel filter if open
    const colorPanelState = getColorPanelState()
    if (colorPanelState.isOpen) {
      updateColorPanelState(update.state.doc, cursorPos, colorPanelState, {
        closeColorPanel,
        updateColorPanelFilter,
      })
    }
  })
}

/**
 * Handle trigger character detection.
 */
function handleTriggerCharacter(
  charBefore: string,
  textBefore: string,
  handlers: {
    openColorPanel: () => void
    openPicker: (type: string, context?: Record<string, unknown>) => void
    scheduleTrigger: (fn: () => void, delay: number) => void
  }
) {
  const { openColorPanel, openPicker, scheduleTrigger } = handlers

  switch (charBefore) {
    case '#':
      scheduleTrigger(openColorPanel, 10)
      break
    case '$': {
      const match = textBefore.slice(0, -1).match(/\b(\w+)\s+(?:[a-z-]+\s+)*$/)
      const propertyContext = match ? match[1] : undefined
      scheduleTrigger(() => openPicker('token', { propertyContext }), 10)
      break
    }
  }
}

/**
 * Update color panel state based on document changes.
 */
function updateColorPanelState(
  doc: { sliceString: (from: number, to: number) => string },
  cursorPos: number,
  colorPanelState: ColorPanelState,
  handlers: {
    closeColorPanel: () => void
    updateColorPanelFilter: (filter: string) => void
  }
) {
  const { closeColorPanel, updateColorPanelFilter } = handlers

  if (cursorPos < colorPanelState.triggerPos) {
    closeColorPanel()
    return
  }

  let filter = doc.sliceString(colorPanelState.triggerPos, cursorPos)
  if (filter.startsWith('#')) {
    filter = filter.slice(1)
  }

  if (filter.includes('\n') || filter.includes(' ')) {
    closeColorPanel()
    return
  }

  updateColorPanelFilter(filter)
}

/**
 * Configuration for editor extensions.
 */
export interface EditorExtensionsConfig {
  /** Tab type (for keymaps) */
  tab: string
  /** Keymap callbacks */
  keymapCallbacks: KeymapCallbacks
  /** Color panel state getter */
  getColorPanelState: () => ColorPanelState
  /** Color panel state setter */
  setColorPanelState: (fn: (prev: ColorPanelState) => ColorPanelState) => void
  /** Get selected color value */
  getSelectedValue: () => string | null
  /** Get design tokens */
  getDesignTokens: () => Map<string, unknown>
  /** Value picker callback */
  onValuePickerNeeded: (picker: ValuePickerType) => void
  /** Autocompletion mode getter */
  getAutoCompleteMode: () => 'always' | 'delay' | 'off'
  /** Current tab getter */
  getCurrentTab: () => string | undefined
  /** Autocomplete timeout ref */
  autoCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
  /** Update listener extension */
  updateListener: ReturnType<typeof EditorView.updateListener.of>
  /** Color swatch configuration (optional) */
  colorSwatchConfig?: ColorSwatchConfig
}

/**
 * Create all editor extensions.
 */
export function createEditorExtensions(config: EditorExtensionsConfig) {
  const {
    keymapCallbacks,
    getColorPanelState,
    setColorPanelState,
    getSelectedValue,
    getDesignTokens,
    onValuePickerNeeded,
    getAutoCompleteMode,
    getCurrentTab,
    autoCompleteTimeoutRef,
    updateListener,
    colorSwatchConfig,
  } = config

  // Create editor keymaps
  const editorKeymaps = createEditorKeymaps({
    callbacks: keymapCallbacks,
    getAutoCompleteMode,
    getCurrentTab,
    autoCompleteTimeoutRef,
  })

  // Panel navigation keymap
  const panelKeymap = createPanelKeymap({
    getColorPanelState,
    setColorPanelState: (fn) => {
      if (typeof fn === 'function') {
        setColorPanelState(fn)
      }
    },
    getSelectedValue,
  })

  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    panelKeymap,
    dslAutocomplete({
      onValuePickerNeeded,
      getDesignTokens,
    }),
    ...editorKeymaps,
    keymap.of([...defaultKeymap, indentWithTab]),
    dslTheme,
    dslHighlighter,
    updateListener,
  ]

  // Add color swatches if configured
  if (colorSwatchConfig) {
    extensions.push(createColorSwatchPlugin(colorSwatchConfig))
  }

  return extensions
}

/**
 * Create the CodeMirror editor instance.
 */
export function createEditor(
  container: HTMLElement,
  initialValue: string,
  extensions: ReturnType<typeof createEditorExtensions>
): EditorView {
  const state = EditorState.create({
    doc: initialValue,
    extensions,
  })

  return new EditorView({
    state,
    parent: container,
  })
}
