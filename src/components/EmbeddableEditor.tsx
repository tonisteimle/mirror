/**
 * EmbeddableEditor Component
 *
 * A full-featured, embeddable editor for documentation and tutorials.
 * Uses the real CodeMirror editor with syntax highlighting, pickers, and live preview.
 */

import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createEditorExtensions, type KeymapCallbacks } from '../editor'
import { parse } from '../parser/parser'
import { Preview } from './Preview'
import { InlineColorPanel } from './InlineColorPanel'
import { CommandPalette } from './CommandPalette'
import { FontPicker } from './FontPicker'
import { LazyIconPicker } from './LazyIconPicker'
import { TokenPicker } from './TokenPicker'
import { PickerErrorBoundary } from './picker'
import { colors } from '../theme'
import { usePickerState } from '../hooks/usePickerState'
import { useColorPanel } from '../hooks/useColorPanel'
import { useEditorTriggers } from '../hooks/useEditorTriggers'

// ============================================
// Types
// ============================================

export interface EmbeddableEditorProps {
  /** Initial Mirror code */
  initialCode: string
  /** Hidden prelude code (tokens, definitions) - parsed but not shown in editor */
  prelude?: string
  /** Height of the preview area (default: 200) */
  previewHeight?: number
  /** Whether the editor is read-only */
  readOnly?: boolean
}

// ============================================
// Styles
// ============================================

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  editorWrapper: {
    backgroundColor: colors.panel,
    position: 'relative' as const,
  },
  previewWrapper: {
    backgroundColor: colors.preview,
    color: '#fff',
    padding: '16px',
  },
  error: {
    padding: '12px 16px',
    fontSize: '12px',
    fontFamily: '"SF Mono", "Consolas", "Monaco", monospace',
    color: '#ef4444',
    backgroundColor: '#ef444415',
  },
  placeholder: {
    padding: '16px',
    color: '#666',
    fontSize: '13px',
    fontStyle: 'italic' as const,
  },
}

// ============================================
// Component
// ============================================

export const EmbeddableEditor = memo(function EmbeddableEditor({
  initialCode,
  prelude = '',
  previewHeight,
  readOnly = false,
}: EmbeddableEditorProps) {
  const [code, setCode] = useState(initialCode.trim())
  const [error, setError] = useState<string | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const editorViewRef = useRef<EditorView | null>(null)

  // Refs for callbacks to avoid recreating editor on every state change
  const keymapCallbacksRef = useRef<KeymapCallbacks | null>(null)
  const designTokensRef = useRef<Map<string, unknown>>(new Map())

  // Ref for swatch click handler (used by color swatch plugin)
  const swatchClickRef = useRef<((start: number, end: number, color: string) => void) | null>(null)

  // Panel hooks
  const colorPanel = useColorPanel(editorViewRef)
  const colorPanelRef = useRef(colorPanel)
  colorPanelRef.current = colorPanel // Update ref on each render

  const picker = usePickerState(editorViewRef)
  const pickerRef = useRef(picker)
  pickerRef.current = picker // Update ref on each render

  const {
    colorPickerOpen, colorPickerPosition,
    commandPaletteOpen, commandPalettePosition, commandPaletteQuery,
    fontPickerOpen, fontPickerPosition,
    iconPickerOpen, iconPickerPosition,
    tokenPickerOpen, tokenPickerPosition, tokenPickerPropertyContext,
    openPicker, closePicker,
  } = picker

  // Local state for swatch-triggered color panel
  const [swatchColorSelectedIndex, setSwatchColorSelectedIndex] = useState(0)

  // Parse design tokens from prelude
  const designTokens = useMemo(() => {
    if (!prelude) return new Map()
    try {
      const result = parse(prelude)
      return result.tokens || new Map()
    } catch {
      return new Map()
    }
  }, [prelude])

  // Trigger handling - use refs for stable config (prevents editor recreation)
  const triggerConfig = useMemo(() => ({
    onChange: setCode,
    getTriggerHandlers: () => ({
      openColorPanel: () => colorPanelRef.current.open(),
      openTokenPicker: (ctx?: string) => pickerRef.current.openPicker('token', { propertyContext: ctx }),
      openCommandPalette: (query?: string) => pickerRef.current.openPicker('command', { query }),
    }),
    getTriggerState: () => ({
      colorPanelOpen: colorPanelRef.current.state.isOpen,
    }),
    getColorPanelState: () => colorPanelRef.current.state,
    closeColorPanel: () => colorPanelRef.current.close(),
    updateColorPanelFilter: (f: string) => colorPanelRef.current.updateFilter(f),
  }), []) // Empty deps - all values accessed via refs

  const { triggerExtension } = useEditorTriggers(triggerConfig)

  // Insert handlers for pickers
  const createInsertHandler = useCallback(
    (precedingChars: string[] = []) =>
      (insertValue: string) => {
        const view = editorViewRef.current
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

  const insertCommand = useMemo(() => createInsertHandler(['?']), [createInsertHandler])
  const insertFont = useMemo(() => createInsertHandler(['?']), [createInsertHandler])
  const insertIcon = useMemo(() => createInsertHandler(['?']), [createInsertHandler])
  const insertToken = useMemo(() => createInsertHandler(['?', '$']), [createInsertHandler])

  // Swatch click handler - opens color picker to replace existing color
  swatchClickRef.current = useCallback((start: number, end: number, color: string) => {
    const view = editorViewRef.current
    if (!view) return

    // Move cursor to end of color value so picker position is correct
    view.dispatch({
      selection: { anchor: end }
    })

    // Open color picker with replaceRange in context
    openPicker('color', {
      currentColor: color,
      replaceRange: { from: start, to: end }
    })
  }, [openPicker])

  // Keymap callbacks - update ref on each render
  const keymapCallbacks: KeymapCallbacks = useMemo(() => ({
    openColorPicker: colorPanel.open,
    openCommandPalette: (query?: string) => openPicker('command', { query }),
    openFontPicker: () => openPicker('font'),
    openIconPicker: () => openPicker('icon'),
    openTokenPicker: (ctx?: string) => openPicker('token', { propertyContext: ctx }),
  }), [colorPanel.open, openPicker])
  keymapCallbacksRef.current = keymapCallbacks
  designTokensRef.current = designTokens

  // Parse and generate preview (prelude + visible code)
  const { nodes, registry } = useMemo(() => {
    try {
      const fullCode = prelude ? `${prelude.trim()}\n\n${code}` : code
      const result = parse(fullCode)
      const actualErrors = result.errors.filter(e => !e.startsWith('Warning:'))
      if (actualErrors.length > 0) {
        setError(actualErrors[0])
        return { nodes: [], registry: new Map() }
      }
      setError(null)
      return { nodes: result.nodes, registry: result.registry }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Parse error')
      return { nodes: [], registry: new Map() }
    }
  }, [code, prelude])

  // Initialize CodeMirror editor with full extensions
  // Uses refs for callbacks so editor doesn't recreate on every state change
  useEffect(() => {
    if (!editorContainerRef.current) return

    // Wrapper callbacks that read from refs - always get latest values
    const wrappedCallbacks: KeymapCallbacks = {
      openColorPicker: () => keymapCallbacksRef.current?.openColorPicker(),
      openCommandPalette: (q) => keymapCallbacksRef.current?.openCommandPalette(q),
      openFontPicker: () => keymapCallbacksRef.current?.openFontPicker(),
      openIconPicker: () => keymapCallbacksRef.current?.openIconPicker(),
      openTokenPicker: (ctx) => keymapCallbacksRef.current?.openTokenPicker(ctx),
    }

    const extensions = createEditorExtensions({
      keymapConfig: {
        callbacks: wrappedCallbacks,
      },
      panelKeymapConfig: {
        getColorPanelState: () => colorPanelRef.current.state,
        setColorPanelState: (s) => colorPanelRef.current.setState(s),
        getSelectedValue: () => colorPanelRef.current.getSelectedValue(),
      },
      autocompleteOptions: {
        getDesignTokens: () => designTokensRef.current,
      },
      // Color swatches disabled - causing UI issues
      // colorSwatchConfig: {
      //   onSwatchClick: (s, e, c) => swatchClickRef.current?.(s, e, c),
      //   getDesignTokens: () => designTokensRef.current,
      // },
    })

    const state = EditorState.create({
      doc: initialCode.trim(),
      extensions: [
        ...extensions,
        triggerExtension,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setCode(update.state.doc.toString())
          }
        }),
        EditorView.editable.of(!readOnly),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    })

    editorViewRef.current = view

    return () => {
      view.destroy()
      editorViewRef.current = null
    }
  // Note: triggerExtension is stable (empty deps in triggerConfig)
  // so we don't need it in deps - but keeping it is safe
  }, [initialCode, readOnly, triggerExtension])

  // Render preview
  const previewContent = useMemo(() => {
    if (error) {
      return <div style={styles.error}>{error}</div>
    }

    if (nodes.length === 0) {
      return <div style={styles.placeholder}>Start typing to see preview...</div>
    }

    return (
      <Preview
        nodes={nodes}
        registry={registry}
      />
    )
  }, [nodes, registry, error])

  return (
    <div style={styles.container}>
      <div
        ref={editorContainerRef}
        style={styles.editorWrapper}
      />
      <div style={{ ...styles.previewWrapper, ...(previewHeight ? { minHeight: `${previewHeight}px` } : {}) }}>
        {previewContent}
      </div>

      {/* Pickers */}
      <PickerErrorBoundary>
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
          />
        )}

        {/* Color picker triggered by swatch click */}
        {colorPickerOpen && (
          <InlineColorPanel
            isOpen={true}
            position={colorPickerPosition}
            onClose={closePicker}
            onSelect={(value) => {
              const ctx = picker.getContext()
              picker.insertAtCursor(value, { replaceRange: ctx.replaceRange ?? undefined })
              closePicker()
            }}
            filter=""
            selectedIndex={swatchColorSelectedIndex}
            onSelectedIndexChange={setSwatchColorSelectedIndex}
          />
        )}

        {commandPaletteOpen && (
          <CommandPalette
            isOpen={true}
            position={commandPalettePosition}
            onClose={closePicker}
            onSelect={(value) => {
              insertCommand(value)
              closePicker()
            }}
            initialQuery={commandPaletteQuery}
          />
        )}

        {fontPickerOpen && (
          <FontPicker
            isOpen={true}
            position={fontPickerPosition}
            onClose={closePicker}
            onSelect={(value) => {
              insertFont(value)
              closePicker()
            }}
          />
        )}

        {iconPickerOpen && (
          <LazyIconPicker
            isOpen={true}
            position={iconPickerPosition}
            onClose={closePicker}
            onSelect={(value) => {
              insertIcon(value)
              closePicker()
            }}
          />
        )}

        {tokenPickerOpen && (
          <TokenPicker
            isOpen={true}
            position={tokenPickerPosition}
            onClose={closePicker}
            onSelect={(value) => {
              insertToken(value)
              closePicker()
            }}
            tokensCode={prelude}
            propertyContext={tokenPickerPropertyContext}
          />
        )}
      </PickerErrorBoundary>
    </div>
  )
})

export default EmbeddableEditor
