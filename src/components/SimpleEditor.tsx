/**
 * SimpleEditor - Basic CodeMirror editor with optional picker support
 *
 * A lightweight editor that can optionally include color, icon, and token pickers.
 * Use enablePickers prop to enable picker functionality.
 */
import { useRef, useEffect, forwardRef, useImperativeHandle, useCallback, useMemo, useState } from 'react'
import { EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createMinimalExtensions, TRIGGER_DELAY_MS, type DoubleClickPickerConfig } from '../editor'
import { usePickerState } from '../hooks/usePickerState'
import { useColorPanel } from '../hooks/useColorPanel'
import { InlineColorPanel } from './InlineColorPanel'
import { LazyIconPicker } from './LazyIconPicker'
import { TokenPicker } from './TokenPicker'
import { PickerErrorBoundary } from './picker'
import { isInsideString } from '../editor/utils'
import type { ComponentTemplate } from '../parser/parser'
import type { ValuePickerType } from '../data/dsl-properties'

// Pattern for property context before $ (e.g., "bg $" → propertyContext = "bg")
const REGEX_PROPERTY_CONTEXT = /\b([a-z][-a-z]*)\s+$/i

export interface SimpleEditorRef {
  getEditorView(): EditorView | null
  focus(): void
  refreshDecorations(): void
}

interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  highlightLine?: number
  designTokens?: Map<string, unknown>
  componentRegistry?: Map<string, ComponentTemplate>
  /** Enable picker support (color, icon, token pickers) */
  enablePickers?: boolean
  /** Token code for TokenPicker (raw DSL code containing token definitions) */
  tokensCode?: string
  /** Called when EditorView is created or destroyed (for diagnostics) */
  onEditorViewChange?: (view: EditorView | null) => void
}

export const SimpleEditor = forwardRef<SimpleEditorRef, SimpleEditorProps>(function SimpleEditor(
  { value, onChange, designTokens, componentRegistry, enablePickers = false, tokensCode = '', onEditorViewChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  const designTokensRef = useRef(designTokens)
  const componentRegistryRef = useRef(componentRegistry)
  // Store initial value to avoid re-creating editor on value changes
  const initialValueRef = useRef(value)

  // Update refs in effect to avoid lint warnings about updating during render
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    designTokensRef.current = designTokens
  }, [designTokens])

  useEffect(() => {
    componentRegistryRef.current = componentRegistry
  }, [componentRegistry])

  // Picker state (only used when enablePickers is true)
  const colorPanel = useColorPanel(viewRef)
  const colorPanelRef = useRef(colorPanel)

  useEffect(() => {
    colorPanelRef.current = colorPanel
  }, [colorPanel])

  const picker = usePickerState(viewRef)
  const pickerRef = useRef(picker)

  useEffect(() => {
    pickerRef.current = picker
  }, [picker])

  // Local state for swatch-triggered color panel
  const [swatchColorSelectedIndex, setSwatchColorSelectedIndex] = useState(0)

  // Extract picker state for rendering (only when enabled)
  const {
    colorPickerOpen,
    colorPickerPosition,
    iconPickerOpen,
    iconPickerPosition,
    tokenPickerOpen,
    tokenPickerPosition,
    tokenPickerPropertyContext,
    closePicker,
  } = picker

  // Check if any picker is open (for autocomplete suppression)
  const isPickerOpenRef = useRef(false)

  useEffect(() => {
    isPickerOpenRef.current = colorPanel.state.isOpen || colorPickerOpen || iconPickerOpen || tokenPickerOpen
  }, [colorPanel.state.isOpen, colorPickerOpen, iconPickerOpen, tokenPickerOpen])

  // Value picker callback - triggered by autocomplete after typing # or selecting color/icon property
  const handleValuePickerNeeded = useCallback((pickerType: ValuePickerType, property?: string) => {
    if (!enablePickers) return

    if (pickerType === 'color') {
      colorPanelRef.current.open()
    } else if (pickerType === 'icon') {
      pickerRef.current.openPicker('icon')
    } else if (pickerType === 'token') {
      pickerRef.current.openPicker('token', { propertyContext: property })
    }
  }, [enablePickers])

  // Insert handler for pickers
  const createInsertHandler = useCallback(
    (precedingChars: string[] = []) =>
      (insertValue: string) => {
        const view = viewRef.current
        if (!view) return

        const pos = view.state.selection.main.head
        const charBefore = pos > 0 ? view.state.doc.sliceString(pos - 1, pos) : ''

        let from = pos
        if (precedingChars.includes(charBefore)) {
          from = pos - 1
        } else if (charBefore && !/\s/.test(charBefore)) {
          insertValue = ' ' + insertValue
        }

        view.dispatch({
          changes: { from, to: pos, insert: insertValue },
          selection: { anchor: from + insertValue.length },
        })
        view.focus()
      },
    []
  )

  const insertIcon = useMemo(() => createInsertHandler(['?']), [createInsertHandler])
  const insertToken = useMemo(() => createInsertHandler(['?', '$']), [createInsertHandler])

  // Replace all occurrences of a value with a new value
  const replaceAllOccurrences = useCallback((oldValue: string, newValue: string, propertyContext?: string) => {
    const view = viewRef.current
    if (!view) return

    const doc = view.state.doc.toString()
    const changes: Array<{ from: number; to: number; insert: string }> = []

    // Build regex pattern based on property context
    // If propertyContext is set, only replace values after that property
    let pattern: RegExp
    if (propertyContext) {
      // Match: property + whitespace + value (with word boundaries)
      // e.g., "pad 16" or "bg #3B82F6" or "col $primary"
      const escapedValue = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const escapedProp = propertyContext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`\\b${escapedProp}\\s+${escapedValue}\\b`, 'g')
    } else {
      // No context - just replace the exact value
      const escapedValue = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`\\b${escapedValue}\\b`, 'g')
    }

    // Find all matches
    let match
    while ((match = pattern.exec(doc)) !== null) {
      if (propertyContext) {
        // The match includes "prop value", we only want to replace "value"
        const fullMatch = match[0]
        const valueStart = match.index + fullMatch.lastIndexOf(oldValue)
        changes.push({
          from: valueStart,
          to: valueStart + oldValue.length,
          insert: newValue,
        })
      } else {
        changes.push({
          from: match.index,
          to: match.index + oldValue.length,
          insert: newValue,
        })
      }
    }

    if (changes.length > 0) {
      // Sort changes in reverse order to avoid offset issues
      changes.sort((a, b) => b.from - a.from)
      view.dispatch({ changes })
    }
  }, [])

  // Double-click picker config - opens appropriate picker when double-clicking values
  const doubleClickPickerConfig = useMemo<DoubleClickPickerConfig | undefined>(() => {
    if (!enablePickers) return undefined

    return {
      onColorDoubleClick: (color, from, to, propertyContext, replaceAll) => {
        // Open color picker, with replace-all support only when Alt is held
        pickerRef.current.openPicker('color', {
          replaceRange: { from, to },
          currentColor: color,
          propertyContext,
          // Only set replace-all when Alt key is held
          replaceAllValue: replaceAll ? color : undefined,
          replaceAllProperty: replaceAll ? propertyContext : undefined,
        })
      },
      onIconDoubleClick: (iconName, from, to) => {
        pickerRef.current.openPicker('icon', { replaceRange: { from, to } })
      },
      onFontDoubleClick: (fontName, from, to) => {
        // Font picker not implemented yet
      },
      onTokenDoubleClick: (tokenName, from, to, propertyContext, replaceAll) => {
        // Open token picker, with replace-all support only when Alt is held
        pickerRef.current.openPicker('token', {
          replaceRange: { from, to },
          propertyContext,
          // Only set replace-all when Alt key is held
          replaceAllValue: replaceAll ? tokenName : undefined,
          replaceAllProperty: replaceAll ? propertyContext : undefined,
        })
      },
    }
  }, [enablePickers])

  useImperativeHandle(ref, () => ({
    getEditorView: () => viewRef.current,
    focus: () => viewRef.current?.focus(),
    refreshDecorations: () => {
      // No-op for now
    },
  }))

  // Create trigger extension for # and $ characters
  const createTriggerExtension = useCallback((): Extension => {
    // Store pending trigger timeouts for cleanup
    const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>()

    return EditorView.updateListener.of((update) => {
      if (!update.docChanged) return

      const cursorPos = update.state.selection.main.head
      if (cursorPos === 0) return

      // Get the character before cursor
      const charBefore = update.state.doc.sliceString(cursorPos - 1, cursorPos)

      // Only process potential trigger characters
      if (charBefore !== '#' && charBefore !== '$') return

      // Get text before cursor on current line
      const line = update.state.doc.lineAt(cursorPos)
      const textBefore = line.text.slice(0, cursorPos - line.from)

      // Don't trigger inside strings
      if (isInsideString(textBefore)) return

      // Don't trigger if a picker is already open
      if (isPickerOpenRef.current) return

      // Handle trigger characters
      if (charBefore === '#') {
        // Schedule color panel open
        const timeoutId = setTimeout(() => {
          pendingTimeouts.delete(timeoutId)
          colorPanelRef.current.open()
        }, TRIGGER_DELAY_MS)
        pendingTimeouts.add(timeoutId)
      } else if (charBefore === '$') {
        // Find property context (e.g., "bg " before "$")
        const textBeforeDollar = textBefore.slice(0, -1)
        const match = textBeforeDollar.match(REGEX_PROPERTY_CONTEXT)
        const propertyContext = match ? match[1] : undefined

        // Schedule token picker open
        const timeoutId = setTimeout(() => {
          pendingTimeouts.delete(timeoutId)
          pickerRef.current.openPicker('token', { propertyContext })
        }, TRIGGER_DELAY_MS)
        pendingTimeouts.add(timeoutId)
      }
    })
  }, [])

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    // Create a getter that accesses the current tokens via ref
    // This allows tokens to update without recreating the editor
    const getDesignTokens = () => designTokensRef.current ?? new Map()

    // Create a getter for user-defined component names
    const getUserDefinedComponents = () => {
      const registry = componentRegistryRef.current
      if (!registry) return []
      return Array.from(registry.keys())
    }

    const extensions: Extension[] = [
      ...createMinimalExtensions({
        getDesignTokens,
        getUserDefinedComponents,
        // Only wire picker callback if pickers are enabled
        onValuePickerNeeded: enablePickers ? handleValuePickerNeeded : undefined,
        isAutocompleteSuppressed: enablePickers ? () => isPickerOpenRef.current : undefined,
        // Double-click to open picker
        doubleClickPickerConfig,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
    ]

    // Add trigger extension if pickers are enabled
    if (enablePickers) {
      extensions.push(createTriggerExtension())
    }

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view
    onEditorViewChange?.(view)

    return () => {
      view.destroy()
      viewRef.current = null
      onEditorViewChange?.(null)
    }
  }, [enablePickers, handleValuePickerNeeded, createTriggerExtension, doubleClickPickerConfig, onEditorViewChange]) // Recreate editor if enablePickers changes

  // Update content when value changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#0D0D0D',
        position: 'relative',
      }}
    >
      {/* Pickers - only rendered when enablePickers is true */}
      {enablePickers && (
        <PickerErrorBoundary>
          {/* Color panel triggered by # */}
          {colorPanel.state.isOpen && (
            <InlineColorPanel
              isOpen={true}
              position={colorPanel.state.position}
              onClose={colorPanel.close}
              onSelect={colorPanel.selectColor}
              filter={colorPanel.state.filter}
              selectedIndex={colorPanel.state.selectedIndex}
              onSelectedIndexChange={colorPanel.setSelectedIndex}
              onSelectedValueChange={colorPanel.setSelectedValue}
              editorCode={tokensCode}
              propertyContext={colorPanel.state.propertyContext}
            />
          )}

          {/* Color picker triggered by swatch click or double-click */}
          {colorPickerOpen && (
            <InlineColorPanel
              isOpen={true}
              position={colorPickerPosition}
              onClose={closePicker}
              onSelect={(pickerValue) => {
                const ctx = picker.getContext()
                if (ctx.replaceAllValue) {
                  // Replace all occurrences
                  replaceAllOccurrences(ctx.replaceAllValue, pickerValue, ctx.replaceAllProperty)
                } else {
                  // Normal single replace
                  picker.insertAtCursor(pickerValue, { replaceRange: ctx.replaceRange ?? undefined })
                }
                closePicker()
              }}
              filter=""
              selectedIndex={swatchColorSelectedIndex}
              onSelectedIndexChange={setSwatchColorSelectedIndex}
              initialColor={picker.getContext().currentColor}
              editorCode={tokensCode}
              propertyContext={picker.getContext().propertyContext}
            />
          )}

          {/* Icon picker */}
          {iconPickerOpen && (
            <LazyIconPicker
              isOpen={true}
              position={iconPickerPosition}
              onClose={closePicker}
              onSelect={(iconValue) => {
                insertIcon(iconValue)
                closePicker()
              }}
            />
          )}

          {/* Token picker */}
          {tokenPickerOpen && (
            <TokenPicker
              isOpen={true}
              position={tokenPickerPosition}
              onClose={closePicker}
              onSelect={(tokenValue) => {
                const ctx = picker.getContext()
                if (ctx.replaceAllValue) {
                  // Replace all occurrences
                  replaceAllOccurrences(ctx.replaceAllValue, tokenValue, ctx.replaceAllProperty)
                } else {
                  // Normal single insert
                  insertToken(tokenValue)
                }
                closePicker()
              }}
              tokensCode={tokensCode}
              propertyContext={tokenPickerPropertyContext}
            />
          )}
        </PickerErrorBoundary>
      )}
    </div>
  )
})
