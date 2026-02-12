/**
 * PromptPanel Component
 *
 * CodeMirror-based editor panel with inline pickers and AI integration.
 * Supports color, font, icon, and token pickers plus drag & drop for images.
 */
import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, memo, useMemo } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createEditorExtensions, type KeymapCallbacks } from '../editor'
import type { ValuePickerType } from '../data/dsl-properties'
import { InlineColorPanel } from './InlineColorPanel'
import { CommandPalette } from './CommandPalette'
import { FontPicker } from './FontPicker'
import { LazyIconPicker } from './LazyIconPicker'
import { TokenPicker } from './TokenPicker'
import { PickerErrorBoundary } from './picker'
import { colors } from '../theme'
import type { TabType } from '../validation'
import { usePickerState } from '../hooks/usePickerState'
import { useColorPanel } from '../hooks/useColorPanel'
import { useImageDragDrop } from '../hooks/useImageDragDrop'
import { useEditorTriggers } from '../hooks/useEditorTriggers'

// Re-export for backwards compatibility
export { getStoredImageUrl } from '../utils/image-upload'

interface PromptPanelProps {
  value: string
  onChange: (value: string) => void
  selectionPrefix?: string
  highlightLine?: number
  tab?: TabType
  getOtherTabCode?: () => string
  tokensCode?: string
  designTokens?: Map<string, unknown>
  autoCompleteMode?: 'always' | 'delay' | 'off'
}

export interface PromptPanelRef {
  goToLine: (line: number) => void
}

export const PromptPanel = memo(forwardRef<PromptPanelRef, PromptPanelProps>(
  function PromptPanel({
    value,
    onChange,
    selectionPrefix,
    highlightLine,
    tab,
    tokensCode = '',
    designTokens,
    autoCompleteMode = 'always',
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorView | null>(null)
    const isInternalChange = useRef(false)
    const [editorError, setEditorError] = useState<Error | null>(null)

    // Refs for values needed in editor callbacks
    const autoCompleteModeRef = useRef(autoCompleteMode)
    autoCompleteModeRef.current = autoCompleteMode
    const designTokensRef = useRef(designTokens)
    designTokensRef.current = designTokens
    const tabRef = useRef(tab)
    tabRef.current = tab

    // Refs for callback functions (to avoid recreating editor on callback changes)
    const callbackRefs = useRef({
      openColorPicker: () => {},
      openCommandPalette: (_query?: string) => {},
      openFontPicker: () => {},
      openIconPicker: () => {},
      openTokenPicker: (_ctx?: string) => {},
      handleValuePickerNeeded: (_type: ValuePickerType) => {},
    })

    // Panel hooks
    const colorPanel = useColorPanel(editorRef)
    const picker = usePickerState(editorRef)

    // Ref for color panel setState (needed for keymap closures)
    const colorPanelSetStateRef = useRef(colorPanel.setState)
    colorPanelSetStateRef.current = colorPanel.setState
    const {
      commandPaletteOpen, commandPalettePosition, commandPaletteQuery,
      fontPickerOpen, fontPickerPosition,
      iconPickerOpen, iconPickerPosition,
      tokenPickerOpen, tokenPickerPosition, tokenPickerPropertyContext,
      openPicker, closePicker,
    } = picker

    // Image drag & drop
    useImageDragDrop({ containerRef, editorRef })

    // Trigger handling
    const triggerConfig = useMemo(() => ({
      onChange,
      getTriggerHandlers: () => ({
        openColorPanel: colorPanel.open,
        openTokenPicker: (ctx?: string) => openPicker('token', { propertyContext: ctx }),
        openCommandPalette: (query?: string) => openPicker('command', { query }),
      }),
      getTriggerState: () => ({
        colorPanelOpen: colorPanel.state.isOpen,
      }),
      getColorPanelState: () => colorPanel.state,
      closeColorPanel: colorPanel.close,
      updateColorPanelFilter: colorPanel.updateFilter,
    }), [onChange, colorPanel, openPicker])

    const {
      triggerExtension,
      clearTriggers,
      autoCompleteTimeoutRef,
    } = useEditorTriggers(triggerConfig)

    // Navigation
    const goToLine = useCallback((line: number) => {
      const view = editorRef.current
      if (!view) return

      const doc = view.state.doc
      if (line >= doc.lines) return

      const lineInfo = doc.line(line + 1)
      view.dispatch({
        selection: { anchor: lineInfo.from, head: lineInfo.to },
        scrollIntoView: true,
      })
      view.focus()
    }, [])

    useImperativeHandle(ref, () => ({ goToLine }), [goToLine])

    // Insert handlers for pickers
    const createInsertHandler = useCallback(
      (precedingChars: string[] = []) =>
        (insertValue: string) => {
          const view = editorRef.current
          if (!view) return

          const { from, to } = view.state.selection.main
          const doc = view.state.doc
          let insertFrom = from
          let finalValue = insertValue

          if (from > 0) {
            const charBefore = doc.sliceString(from - 1, from)
            if (precedingChars.includes(charBefore)) {
              insertFrom = from - 1
            } else if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
              finalValue = ' ' + insertValue
            }
          }

          view.dispatch({ changes: { from: insertFrom, to, insert: finalValue } })
          view.focus()
        },
      []
    )

    const insertCommand = createInsertHandler(['/'])
    const insertFont = createInsertHandler(['/'])
    const insertIcon = createInsertHandler(['/'])
    const insertValue = createInsertHandler(['/', '$'])

    // Value picker callback for autocomplete
    const handleValuePickerNeeded = useCallback((pickerType: ValuePickerType) => {
      switch (pickerType) {
        case 'color':
          colorPanel.open()
          break
        case 'font':
          openPicker('font')
          break
        case 'icon':
          openPicker('icon')
          break
      }
    }, [colorPanel, openPicker])

    // Keep callback refs updated
    callbackRefs.current = {
      openColorPicker: colorPanel.open,
      openCommandPalette: (query = '') => openPicker('command', { query }),
      openFontPicker: () => openPicker('font'),
      openIconPicker: () => openPicker('icon'),
      openTokenPicker: (ctx?: string) => openPicker('token', { propertyContext: ctx }),
      handleValuePickerNeeded,
    }

    // Initialize editor
    useEffect(() => {
      if (!containerRef.current) return

      // Use wrapper functions that delegate to refs (so callbacks stay current)
      const keymapCallbacks: KeymapCallbacks = {
        openColorPicker: () => callbackRefs.current.openColorPicker(),
        openCommandPalette: (query = '') => callbackRefs.current.openCommandPalette(query),
        openFontPicker: () => callbackRefs.current.openFontPicker(),
        openIconPicker: () => callbackRefs.current.openIconPicker(),
        openTokenPicker: (ctx?: string) => callbackRefs.current.openTokenPicker(ctx),
      }

      const extensions = createEditorExtensions({
        keymapConfig: {
          callbacks: keymapCallbacks,
          getAutoCompleteMode: () => autoCompleteModeRef.current,
          getCurrentTab: () => tabRef.current,
          autoCompleteTimeoutRef,
        },
        panelKeymapConfig: {
          getColorPanelState: () => colorPanel.stateRef.current,
          setColorPanelState: (fn) => colorPanelSetStateRef.current(fn),
          getSelectedValue: () => colorPanel.selectedValueRef.current,
        },
        autocompleteOptions: {
          onValuePickerNeeded: (type: ValuePickerType) => callbackRefs.current.handleValuePickerNeeded(type),
          getDesignTokens: () => designTokensRef.current ?? new Map(),
        },
      })

      // Add trigger extension
      extensions.push(triggerExtension)

      let view: EditorView | null = null
      try {
        const state = EditorState.create({ doc: value, extensions })
        view = new EditorView({ state, parent: containerRef.current })
        editorRef.current = view
        setEditorError(null)
      } catch (error) {
        console.error('[PromptPanel] Editor initialization failed:', error)
        setEditorError(error instanceof Error ? error : new Error('Editor initialization failed'))
        return
      }

      return () => {
        view?.destroy()
        editorRef.current = null
        clearTriggers()
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])

    // Sync external value changes
    useEffect(() => {
      const view = editorRef.current
      if (!view) return

      const currentValue = view.state.doc.toString()
      if (currentValue !== value) {
        isInternalChange.current = true
        view.dispatch({ changes: { from: 0, to: currentValue.length, insert: value } })
        isInternalChange.current = false
      }
    }, [value])

    // Auto-scroll to highlighted line
    useEffect(() => {
      if (highlightLine !== undefined && highlightLine >= 0) {
        goToLine(highlightLine)
      }
    }, [highlightLine, goToLine])

    return (
      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}>
        {selectionPrefix && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#10B981',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
          }}>
            <span style={{ fontWeight: 600 }}>{selectionPrefix.trim()}</span>
            <span style={{ color: '#D1FAE5' }}>← Kontext aktiv</span>
          </div>
        )}

        {editorError ? (
          <div style={{
            flex: 1,
            borderRadius: '8px',
            backgroundColor: colors.panel,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            gap: '12px',
          }}>
            <div style={{ fontSize: '14px', color: '#EF4444', fontWeight: 600 }}>
              Editor konnte nicht geladen werden
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted, textAlign: 'center' }}>
              {editorError.message}
            </div>
            <button
              onClick={() => setEditorError(null)}
              style={{
                padding: '6px 16px',
                fontSize: '12px',
                backgroundColor: colors.border,
                color: colors.text,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Erneut versuchen
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{
              flex: 1,
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: colors.panel,
            }}
          />
        )}

        {/* Inline Color Panel */}
        <InlineColorPanel
          isOpen={colorPanel.state.isOpen}
          onClose={colorPanel.close}
          onSelect={colorPanel.selectColor}
          position={colorPanel.state.position}
          filter={colorPanel.state.filter}
          selectedIndex={colorPanel.state.selectedIndex}
          onSelectedIndexChange={colorPanel.setSelectedIndex}
          onSelectedValueChange={colorPanel.setSelectedValue}
        />

        {/* Command Palette */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={closePicker}
          onSelect={insertCommand}
          position={commandPalettePosition}
          initialQuery={commandPaletteQuery}
        />

        {/* Font Picker */}
        <PickerErrorBoundary onClose={closePicker} pickerName="FontPicker">
          <FontPicker
            isOpen={fontPickerOpen}
            onClose={closePicker}
            onSelect={insertFont}
            position={fontPickerPosition}
            tokens={tokensCode}
            defaultToTokens={tab !== 'tokens'}
          />
        </PickerErrorBoundary>

        {/* Icon Picker - Lazy loaded */}
        <PickerErrorBoundary onClose={closePicker} pickerName="IconPicker">
          <LazyIconPicker
            isOpen={iconPickerOpen}
            onClose={closePicker}
            onSelect={insertIcon}
            position={iconPickerPosition}
          />
        </PickerErrorBoundary>

        {/* Token Picker */}
        <PickerErrorBoundary onClose={closePicker} pickerName="TokenPicker">
          <TokenPicker
            isOpen={tokenPickerOpen}
            onClose={closePicker}
            onSelect={insertValue}
            position={tokenPickerPosition}
            tokensCode={tokensCode}
            propertyContext={tokenPickerPropertyContext}
          />
        </PickerErrorBoundary>
      </div>
    )
  }
))
