/**
 * PromptPanel Component
 *
 * CodeMirror-based editor panel with inline pickers and AI integration.
 * Supports color, font, icon, and token pickers plus drag & drop for images.
 */
import { useRef, useState, useEffect, useCallback, forwardRef, useImperativeHandle, memo, useMemo } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createEditorExtensions, type KeymapCallbacks, createNLModeEnterKeymap, requestDecorationRefresh, setTranslatingLines } from '../editor'
import type { ValuePickerType } from '../data/dsl-properties'
import { InlineColorPanel } from './InlineColorPanel'
import { InlineIconPanel } from './InlineIconPanel'
import { InlineFontPanel } from './InlineFontPanel'
import { InlineLayoutPanel } from './InlineLayoutPanel'
import { InlineTypographyPanel } from './InlineTypographyPanel'
import { InlineBorderPanel } from './InlineBorderPanel'
import { InlineAiPanel } from './InlineAiPanel'
import { CommandPalette } from './CommandPalette'
import { TokenPicker } from './TokenPicker'
import { PickerErrorBoundary } from './picker'
import { colors } from '../theme'
import type { TabType } from '../validation'
import { usePickerState } from '../hooks/usePickerState'
import { useColorPanel } from '../hooks/useColorPanel'
import { useInlinePanel } from '../hooks/useInlinePanel'
import { useLayoutPanel } from '../hooks/useLayoutPanel'
import { useTypographyPanel } from '../hooks/useTypographyPanel'
import { useBorderPanel } from '../hooks/useBorderPanel'
import { useComponentPanel } from '../hooks/useComponentPanel'
// Component Property Panels
import { TabbedPropertyPanel } from './TabbedPropertyPanel'
import { DefaultPropertyPanel } from './DefaultPropertyPanel'
import { TextPropertyPanel } from './TextPropertyPanel'
import { InputPropertyPanel } from './InputPropertyPanel'
import { ImagePropertyPanel } from './ImagePropertyPanel'
import { useAiPanel } from '../hooks/useAiPanel'
import { useImageDragDrop } from '../hooks/useImageDragDrop'
import { useEditorTriggers } from '../hooks/useEditorTriggers'
import { searchIcons } from '../data/icon-synonyms'
import type { PreviewOverride } from '../hooks/useCodeParsing'
import type { LineStatus } from '../services/nl-translation'
import { logger } from '../services/logger'
import * as LucideIcons from 'lucide-react'

// Get all icon names for counting filtered results
// Filter: PascalCase names, exclude "Icon" suffix duplicates, exclude utilities
const allIconNames = Object.keys(LucideIcons).filter(
  key =>
    /^[A-Z]/.test(key) &&
    !key.endsWith('Icon') &&
    key !== 'Icon' &&
    !!(LucideIcons as Record<string, unknown>)[key]
)

/** Cursor position information */
export interface CursorPosition {
  line: number    // 0-indexed
  column: number  // 0-indexed
}

interface PromptPanelProps {
  value: string
  onChange: (value: string) => void
  selectionPrefix?: string
  highlightLine?: number
  tab?: TabType
  getOtherTabCode?: () => string
  tokensCode?: string
  /** Components code for AI context */
  componentsCode?: string
  /** Layout code for AI context */
  layoutCode?: string
  designTokens?: Map<string, unknown>
  autoCompleteMode?: 'always' | 'delay' | 'off'
  onPreviewChange?: (override: PreviewOverride | null) => void
  /** @deprecated Use onCursorChange instead */
  onCursorLineChange?: (line: number) => void
  /** Called when cursor position changes (line and column, both 0-indexed) */
  onCursorChange?: (pos: CursorPosition) => void
  // NL Mode props (derived from API key presence)
  /** Whether NL mode is enabled (true when API key exists) */
  nlModeEnabled?: boolean
  /** Callback when Enter is pressed in NL mode */
  onNlTranslate?: (lineIndex: number, content: string, allLines: string[]) => void
  /** Status of line translations */
  nlTranslations?: Map<number, LineStatus>
  // Picker Mode props
  /** Whether picker mode is enabled (autocomplete suggestions) */
  pickerModeEnabled?: boolean
  // Shorthand expansion props
  /** Whether to expand shorthand to long form (e.g., p → padding). Default: true */
  expandShorthand?: boolean
  // AI generation status callback
  /** Called when AI generation state changes (for footer indicator) */
  onAiGenerating?: (isGenerating: boolean, progress?: { currentStep: number; totalSteps: number; currentComponent: string }) => void
  // Data Tab generation callback
  /** Called when AI generates Data Tab content (for data-driven apps) */
  onDataCodeGenerated?: (code: string) => void
  // Token mode (project setting)
  /** Token mode for picker panels (project-specific setting) */
  useTokenMode?: boolean
  /** Callback when token mode changes */
  onTokenModeChange?: (mode: boolean) => void
}

export interface PromptPanelRef {
  /** Navigate to a line. If select=true (default), selects the line content. If false, places cursor at start. */
  goToLine: (line: number, select?: boolean) => void
  refreshDecorations: () => void
  /** Open the AI assistant panel at current cursor position */
  openAiPanel: () => void
  /** Get the CodeMirror EditorView (for extraction utilities) */
  getEditorView: () => EditorView | null
  /** Open the layout picker panel at current cursor position */
  openLayoutPanel: () => void
  /** Open the typography picker panel at current cursor position */
  openTypographyPanel: () => void
  /** Open the icon picker panel at current cursor position */
  openIconPanel: () => void
  /** Open the border picker panel at current cursor position */
  openBorderPanel: () => void
}

export const PromptPanel = memo(forwardRef<PromptPanelRef, PromptPanelProps>(
  function PromptPanel({
    value,
    onChange,
    selectionPrefix,
    highlightLine,
    tab,
    tokensCode = '',
    componentsCode = '',
    layoutCode = '',
    designTokens,
    autoCompleteMode = 'always',
    onPreviewChange,
    onCursorLineChange,
    onCursorChange,
    nlModeEnabled = false,
    onNlTranslate,
    nlTranslations,
    pickerModeEnabled = true,
    expandShorthand = true,
    onAiGenerating,
    onDataCodeGenerated,
    useTokenMode,
    onTokenModeChange,
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorView | null>(null)
    const isInternalChange = useRef(false)
    const [editorError, setEditorError] = useState<Error | null>(null)
    // Track when editor is mounted (triggers translating lines effect)
    const [editorMounted, setEditorMounted] = useState(false)

    // Refs for values needed in editor callbacks
    const designTokensRef = useRef(designTokens)
    designTokensRef.current = designTokens
    const onCursorLineChangeRef = useRef(onCursorLineChange)
    onCursorLineChangeRef.current = onCursorLineChange
    const onCursorChangeRef = useRef(onCursorChange)
    onCursorChangeRef.current = onCursorChange
    const lastCursorPosRef = useRef<{ line: number; column: number }>({ line: -1, column: -1 })

    // Shorthand expansion ref
    const expandShorthandRef = useRef(expandShorthand)
    expandShorthandRef.current = expandShorthand

    // NL mode refs
    const nlModeEnabledRef = useRef(nlModeEnabled)
    nlModeEnabledRef.current = nlModeEnabled
    const onNlTranslateRef = useRef(onNlTranslate)
    onNlTranslateRef.current = onNlTranslate

    // Picker mode ref
    const pickerModeEnabledRef = useRef(pickerModeEnabled)
    pickerModeEnabledRef.current = pickerModeEnabled

    // Refs for callback functions (to avoid recreating editor on callback changes)
    // These are placeholder no-op functions that get replaced at runtime
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const callbackRefs = useRef({
      openColorPicker: () => {},
      openCommandPalette: ((query?: string) => {}) as (query?: string) => void,
      openFontPicker: () => {},
      openIconPicker: () => {},
      openTokenPicker: ((ctx?: string) => {}) as (ctx?: string) => void,
      handleValuePickerNeeded: ((type: ValuePickerType) => {}) as (type: ValuePickerType) => void,
    })
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // Callback after panel selection - intentionally empty
    // We DON'T want to auto-trigger autocomplete after selecting a value
    // User should press space first to get the next suggestion
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleAfterPanelSelect = useCallback((_type: 'icon' | 'font' | 'token' | 'value', _view: EditorView) => {
      // No-op: Let user press space to continue
    }, [])

    // Panel hooks
    const colorPanel = useColorPanel(editorRef)
    const iconPanel = useInlinePanel({ editorRef, onAfterSelect: handleAfterPanelSelect })
    const fontPanel = useInlinePanel({ editorRef, onAfterSelect: handleAfterPanelSelect })
    const layoutPanel = useLayoutPanel(editorRef)
    const typographyPanel = useTypographyPanel(editorRef)
    const borderPanel = useBorderPanel()
    const componentPanel = useComponentPanel(editorRef)
    const picker = usePickerState(editorRef)
    const aiPanel = useAiPanel(editorRef, { tokensCode, componentsCode, layoutCode, expandShorthand, onDataCodeGenerated })

    // Notify parent when AI generation state changes (for footer indicator)
    useEffect(() => {
      onAiGenerating?.(aiPanel.state.isGenerating, aiPanel.state.generationProgress)
    }, [aiPanel.state.isGenerating, aiPanel.state.generationProgress, onAiGenerating])

    // Ref for color panel setState (needed for keymap closures)
    const colorPanelSetStateRef = useRef(colorPanel.setState)
    colorPanelSetStateRef.current = colorPanel.setState

    // Ref for icon panel setState (needed for keymap closures)
    const iconPanelSetStateRef = useRef(iconPanel.setState)
    iconPanelSetStateRef.current = iconPanel.setState

    // Ref for font panel setState (needed for keymap closures)
    const fontPanelSetStateRef = useRef(fontPanel.setState)
    fontPanelSetStateRef.current = fontPanel.setState

    const {
      colorPickerOpen, colorPickerPosition,
      commandPaletteOpen, commandPalettePosition, commandPaletteQuery,
      tokenPickerOpen, tokenPickerPosition, tokenPickerPropertyContext,
      openPicker, closePicker,
    } = picker

    // Helper to count filtered icons (for keymap navigation bounds)
    const getIconItemCount = useCallback(() => {
      const filter = iconPanel.state.filter.replace(/^["']/, '')
      if (filter) {
        return Math.min(searchIcons(allIconNames, filter).length, 36)
      }
      return 36 // Popular icons count
    }, [iconPanel.state.filter])

    // Helper to count filtered fonts (for keymap navigation bounds)
    const getFontItemCount = useCallback(() => {
      // Max fonts shown is 20 (defined in InlineFontPanel)
      return 20
    }, [])

    // Local state for swatch-triggered color panel
    const [swatchColorSelectedIndex, setSwatchColorSelectedIndex] = useState(0)

    // Live preview: emit preview override when picker selection changes
    useEffect(() => {
      if (!onPreviewChange) return

      // Check if color panel is open and has a selected value
      if (colorPanel.state.isOpen && colorPanel.selectedValueRef.current) {
        const { triggerPos } = colorPanel.state
        const view = editorRef.current
        if (view) {
          const cursorPos = view.state.selection.main.head
          onPreviewChange({
            from: triggerPos,
            to: cursorPos,
            value: colorPanel.selectedValueRef.current,
          })
        }
        return
      }

      // Check if icon panel is open and has a selected value
      if (iconPanel.state.isOpen && iconPanel.selectedValueRef.current) {
        const { triggerPos } = iconPanel.state
        const view = editorRef.current
        if (view) {
          const cursorPos = view.state.selection.main.head
          onPreviewChange({
            from: triggerPos,
            to: cursorPos,
            value: iconPanel.selectedValueRef.current,
          })
        }
        return
      }

      // Check if font panel is open and has a selected value
      if (fontPanel.state.isOpen && fontPanel.selectedValueRef.current) {
        const { triggerPos } = fontPanel.state
        const view = editorRef.current
        if (view) {
          const cursorPos = view.state.selection.main.head
          onPreviewChange({
            from: triggerPos,
            to: cursorPos,
            value: fontPanel.selectedValueRef.current,
          })
        }
        return
      }

      // No picker open or no selection - clear preview
      onPreviewChange(null)
    }, [
      onPreviewChange,
      colorPanel.state.isOpen,
      colorPanel.state.selectedIndex,
      colorPanel.state.selectedValue,
      colorPanel.state.triggerPos,
      iconPanel.state.isOpen,
      iconPanel.state.selectedIndex,
      iconPanel.state.triggerPos,
      fontPanel.state.isOpen,
      fontPanel.state.selectedIndex,
      fontPanel.state.triggerPos,
    ])

    // Ref for swatch click handler
    const swatchClickRef = useRef<((start: number, end: number, color: string) => void) | null>(null)

    // Image drag & drop
    useImageDragDrop({ containerRef, editorRef })

    // Track the last value we reported via onChange to detect external vs internal changes
    const lastReportedValueRef = useRef<string>(value)

    // Update lastReportedValueRef when onChange is called
    const wrappedOnChange = useCallback((newValue: string) => {
      lastReportedValueRef.current = newValue
      onChange(newValue)
    }, [onChange])

    // Trigger handling
    const triggerConfig = useMemo(() => ({
      onChange: wrappedOnChange,
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
      // Icon panel
      getIconPanelState: () => iconPanel.stateRef.current,
      closeIconPanel: iconPanel.close,
      updateIconPanelFilter: iconPanel.updateFilter,
      openIconPanel: () => iconPanel.open('icon'),
      // Font panel
      getFontPanelState: () => fontPanel.stateRef.current,
      closeFontPanel: fontPanel.close,
      updateFontPanelFilter: fontPanel.updateFilter,
      // Layout panel
      getLayoutPanelState: () => layoutPanel.stateRef.current,
      openLayoutPanel: layoutPanel.open,
      // Typography panel
      getTypographyPanelState: () => typographyPanel.stateRef.current,
      openTypographyPanel: typographyPanel.open,
      // Border panel
      getBorderPanelState: () => borderPanel.state,
      openBorderPanel: (trigger?: string) => {
        const view = editorRef.current
        if (!view) return
        const pos = view.state.selection.main.head
        borderPanel.open(view, pos)
      },
      // Component panel (triggered by ComponentName + space)
      getComponentPanelState: () => componentPanel.state,
      openComponentPanel: componentPanel.open,
      closeComponentPanel: componentPanel.close,
    }), [wrappedOnChange, colorPanel, openPicker, iconPanel, fontPanel, layoutPanel, typographyPanel, borderPanel, componentPanel])

    const {
      triggerExtension,
      clearTriggers,
    } = useEditorTriggers(triggerConfig)

    // Navigation - optionally select the line or just place cursor at start
    const goToLine = useCallback((line: number, select: boolean = true) => {
      const view = editorRef.current
      if (!view) return

      const doc = view.state.doc
      if (line >= doc.lines) return

      const lineInfo = doc.line(line + 1)
      view.dispatch({
        selection: select
          ? { anchor: lineInfo.from, head: lineInfo.to }
          : { anchor: lineInfo.from },
        scrollIntoView: true,
      })
      view.focus()
    }, [])

    // Refresh decorations (syntax highlighting) - call after external code changes
    const refreshDecorations = useCallback(() => {
      const view = editorRef.current
      if (view) {
        requestDecorationRefresh(view)
      }
    }, [])

    // Get editor view for external access
    const getEditorView = useCallback(() => editorRef.current, [])

    useImperativeHandle(ref, () => ({
      goToLine,
      refreshDecorations,
      openAiPanel: aiPanel.open,
      getEditorView,
      openLayoutPanel: layoutPanel.open,
      openTypographyPanel: typographyPanel.open,
      openIconPanel: () => iconPanel.open('icon'),
      openBorderPanel: () => {
        const view = editorRef.current
        if (!view) return
        const pos = view.state.selection.main.head
        borderPanel.open(view, pos)
      },
    }), [goToLine, refreshDecorations, aiPanel.open, getEditorView, layoutPanel.open, typographyPanel.open, iconPanel, borderPanel])

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
    const insertValue = createInsertHandler(['/', '$'])

    // Value picker callback for autocomplete
    const handleValuePickerNeeded = useCallback((pickerType: ValuePickerType) => {
      switch (pickerType) {
        case 'color':
          colorPanel.open()
          break
        case 'font':
          fontPanel.open('font')
          break
        case 'icon':
          iconPanel.open('icon')
          break
      }
    }, [colorPanel, fontPanel, iconPanel])

    // Swatch click handler - opens color picker to replace existing color
    swatchClickRef.current = useCallback((start: number, end: number, color: string) => {
      const view = editorRef.current
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

    // Keep callback refs updated
    callbackRefs.current = {
      openColorPicker: colorPanel.open,
      openCommandPalette: (query = '') => openPicker('command', { query }),
      openFontPicker: () => fontPanel.open('font'),
      openIconPicker: () => iconPanel.open('icon'),
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
          getExpandShorthand: () => expandShorthandRef.current,
        },
        panelKeymapConfig: {
          getColorPanelState: () => colorPanel.stateRef.current,
          setColorPanelState: (fn) => colorPanelSetStateRef.current(fn),
          getSelectedValue: () => colorPanel.selectedValueRef.current,
          // Icon panel config
          getIconPanelState: () => iconPanel.stateRef.current,
          setIconPanelState: (fn) => iconPanelSetStateRef.current(fn),
          getIconSelectedValue: () => iconPanel.selectedValueRef.current,
          getIconItemCount,
          // Font panel config
          getFontPanelState: () => fontPanel.stateRef.current,
          setFontPanelState: (fn) => fontPanelSetStateRef.current(fn),
          getFontSelectedValue: () => fontPanel.selectedValueRef.current,
          getFontItemCount,
        },
        autocompleteOptions: {
          onValuePickerNeeded: (type: ValuePickerType) => callbackRefs.current.handleValuePickerNeeded(type),
          getDesignTokens: () => designTokensRef.current ?? new Map(),
          // Suppress autocomplete when picker mode is off or inline panel (font, icon) is open
          isAutocompleteSuppressed: () =>
            !pickerModeEnabledRef.current ||
            iconPanel.stateRef.current.isOpen ||
            fontPanel.stateRef.current.isOpen,
          // Pass through expand shorthand setting for autocomplete labels
          getExpandShorthand: () => expandShorthandRef.current,
        },
        // Color swatches disabled - causing UI issues (jumping/blocking)
        // colorSwatchConfig: {
        //   onSwatchClick: (s, e, c) => swatchClickRef.current?.(s, e, c),
        //   getDesignTokens: () => designTokensRef.current ?? new Map(),
        // },
        // Double-click picker - open picker when double-clicking on color/icon/font
        doubleClickPickerConfig: {
          onColorDoubleClick: (color, from, to) => {
            const view = editorRef.current
            if (!view) return
            view.dispatch({ selection: { anchor: to } })
            openPicker('color', { currentColor: color, replaceRange: { from, to } })
          },
          onIconDoubleClick: (iconName, from, to) => {
            const view = editorRef.current
            if (!view) return
            view.dispatch({ selection: { anchor: to } })
            iconPanel.open('icon', { replaceRange: { from, to } })
          },
          onFontDoubleClick: (fontName, from, to) => {
            const view = editorRef.current
            if (!view) return
            view.dispatch({ selection: { anchor: to } })
            fontPanel.open('font', { replaceRange: { from, to } })
          },
          onLayoutDoubleClick: (code, from, to) => {
            const view = editorRef.current
            if (!view) return
            view.dispatch({ selection: { anchor: to } })
            layoutPanel.openForEdit(code, from, to)
          },
          onTypographyDoubleClick: (code, from, to) => {
            const view = editorRef.current
            if (!view) return
            view.dispatch({ selection: { anchor: to } })
            typographyPanel.openForEdit(code, from, to)
          },
          onComponentDoubleClick: (componentName, pickerType, lineFrom, lineTo) => {
            componentPanel.openForLine(componentName, pickerType, lineFrom, lineTo)
          },
        },
      })

      // Add trigger extension
      extensions.push(triggerExtension)

      // Add NL mode keymap (must be added BEFORE other Enter keymaps to take precedence)
      extensions.unshift(createNLModeEnterKeymap({
        isEnabled: () => nlModeEnabledRef.current,
        onTranslate: (lineIndex, content, allLines) => {
          onNlTranslateRef.current?.(lineIndex, content, allLines)
        },
      }))

      // Add cursor position tracking extension
      extensions.push(
        EditorView.updateListener.of((update) => {
          if (update.selectionSet || update.docChanged) {
            const head = update.state.selection.main.head
            const lineInfo = update.state.doc.lineAt(head)
            const line = lineInfo.number - 1 // 0-indexed
            const column = head - lineInfo.from // 0-indexed column within line

            // Check if position changed
            const lastPos = lastCursorPosRef.current
            if (line !== lastPos.line || column !== lastPos.column) {
              lastCursorPosRef.current = { line, column }

              // Call both callbacks for backward compatibility
              if (line !== lastPos.line) {
                onCursorLineChangeRef.current?.(line)
              }
              onCursorChangeRef.current?.({ line, column })
            }
          }
        })
      )

      let view: EditorView | null = null
      try {
        const state = EditorState.create({ doc: value, extensions })
        view = new EditorView({ state, parent: containerRef.current })
        editorRef.current = view
        setEditorMounted(true)
        setEditorError(null)
      } catch (error) {
        logger.ui.error('Editor initialization failed', error)
        setEditorError(error instanceof Error ? error : new Error('Editor initialization failed'))
        return
      }

      return () => {
        view?.destroy()
        editorRef.current = null
        setEditorMounted(false)
        clearTriggers()
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab])

    // Sync external value changes while preserving cursor position
    // Only sync if the change is truly external (not from our own onChange)
    useEffect(() => {
      const view = editorRef.current
      if (!view) return

      const currentValue = view.state.doc.toString()

      // Skip if editor already has this value
      if (currentValue === value) return

      // Skip if this value came from our own onChange (internal change)
      // This prevents race conditions where we overwrite user's typing
      if (value === lastReportedValueRef.current) return

      // This is a true external change (AI generation, undo, tab switch, etc.)
      isInternalChange.current = true
      // Preserve cursor position - clamp to new document length
      const cursor = view.state.selection.main
      const newAnchor = Math.min(cursor.anchor, value.length)
      const newHead = Math.min(cursor.head, value.length)
      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: value },
        selection: { anchor: newAnchor, head: newHead }
      })
      lastReportedValueRef.current = value
      isInternalChange.current = false
    }, [value])

    // Auto-scroll to highlighted line
    useEffect(() => {
      if (highlightLine !== undefined && highlightLine >= 0) {
        goToLine(highlightLine)
      }
    }, [highlightLine, goToLine])

    // Update CodeMirror line decorations for translating lines
    // Depends on editorMounted to re-run when editor becomes available
    useEffect(() => {
      const view = editorRef.current
      if (!view) return

      // Collect lines that are currently translating
      const translatingLineSet = new Set<number>()
      if (nlTranslations) {
        nlTranslations.forEach((status, lineIndex) => {
          if (status === 'translating') {
            translatingLineSet.add(lineIndex)
          }
        })
      }

      // Dispatch effect to update line decorations
      view.dispatch({
        effects: setTranslatingLines.of(translatingLineSet),
      })
    }, [nlTranslations, editorMounted])

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
              minHeight: 0,
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
          onCodeChange={colorPanel.updateCode}
          position={colorPanel.state.position}
          filter={colorPanel.state.filter}
          selectedIndex={colorPanel.state.selectedIndex}
          onSelectedIndexChange={colorPanel.setSelectedIndex}
          onSelectedValueChange={colorPanel.setSelectedValue}
          useTokenMode={useTokenMode}
          editorCode={tokensCode}
        />

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
            initialColor={picker.getContext().currentColor ?? undefined}
            useTokenMode={useTokenMode}
            editorCode={tokensCode}
          />
        )}

        {/* Command Palette - disabled, steals focus from editor */}
        {/* TODO: Rebuild as InlineCommandPalette */}
        {/* <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={closePicker}
          onSelect={insertCommand}
          position={commandPalettePosition}
          initialQuery={commandPaletteQuery}
        /> */}

        {/* Inline Font Panel */}
        <InlineFontPanel
          isOpen={fontPanel.state.isOpen}
          onClose={fontPanel.close}
          onSelect={fontPanel.selectValue}
          position={fontPanel.state.position}
          filter={fontPanel.state.filter}
          selectedIndex={fontPanel.state.selectedIndex}
          onSelectedIndexChange={fontPanel.setSelectedIndex}
          onSelectedValueChange={fontPanel.setSelectedValue}
        />

        {/* Inline Icon Panel */}
        <InlineIconPanel
          isOpen={iconPanel.state.isOpen}
          onClose={iconPanel.close}
          onSelect={iconPanel.selectValue}
          onCodeChange={iconPanel.updateCode}
          position={iconPanel.state.position}
          filter={iconPanel.state.filter}
          selectedIndex={iconPanel.state.selectedIndex}
          onSelectedIndexChange={iconPanel.setSelectedIndex}
          onSelectedValueChange={iconPanel.setSelectedValue}
          iconLibrary={iconPanel.state.iconLibrary}
          onLibraryChange={iconPanel.setIconLibrary}
          editorCode={tokensCode}
        />

        {/* Inline Layout Panel */}
        <InlineLayoutPanel
          isOpen={layoutPanel.state.isOpen}
          onClose={layoutPanel.close}
          onSelect={layoutPanel.selectLayout}
          onCodeChange={layoutPanel.updateCode}
          position={layoutPanel.state.position}
          initialCode={layoutPanel.state.initialCode}
          editorCode={tokensCode}
        />

        {/* Inline Typography Panel */}
        <InlineTypographyPanel
          isOpen={typographyPanel.state.isOpen}
          onClose={typographyPanel.close}
          onSelect={typographyPanel.selectTypography}
          onCodeChange={typographyPanel.updateCode}
          position={typographyPanel.state.position}
          initialCode={typographyPanel.state.initialCode}
          editorCode={tokensCode}
        />

        {/* Inline Border Panel */}
        <InlineBorderPanel
          isOpen={borderPanel.state.isOpen}
          onClose={borderPanel.close}
          onSelect={borderPanel.handleSelect}
          onCodeChange={borderPanel.handleCodeChange}
          position={borderPanel.state.position}
          initialCode={borderPanel.state.initialCode}
          editorCode={tokensCode}
        />

        {/* Component Property Panels - rendered based on pickerType */}
        {componentPanel.state.pickerType === 'button' && (
          <TabbedPropertyPanel
            isOpen={componentPanel.state.isOpen}
            position={componentPanel.state.position}
            lineContent={componentPanel.state.lineContent}
            onCodeChange={componentPanel.updateCode}
            onClose={componentPanel.close}
            editorCode={tokensCode}
            useTokenMode={useTokenMode}
            onTokenModeChange={onTokenModeChange}
          />
        )}
        {componentPanel.state.pickerType === 'default' && (
          <DefaultPropertyPanel
            isOpen={componentPanel.state.isOpen}
            position={componentPanel.state.position}
            lineContent={componentPanel.state.lineContent}
            onCodeChange={componentPanel.updateCode}
            onClose={componentPanel.close}
            editorCode={tokensCode}
          />
        )}
        {componentPanel.state.pickerType === 'text' && (
          <TextPropertyPanel
            isOpen={componentPanel.state.isOpen}
            position={componentPanel.state.position}
            lineContent={componentPanel.state.lineContent}
            onCodeChange={componentPanel.updateCode}
            onClose={componentPanel.close}
            editorCode={tokensCode}
          />
        )}
        {componentPanel.state.pickerType === 'input' && (
          <InputPropertyPanel
            isOpen={componentPanel.state.isOpen}
            position={componentPanel.state.position}
            lineContent={componentPanel.state.lineContent}
            onCodeChange={componentPanel.updateCode}
            onClose={componentPanel.close}
            editorCode={tokensCode}
          />
        )}
        {componentPanel.state.pickerType === 'image' && (
          <ImagePropertyPanel
            isOpen={componentPanel.state.isOpen}
            position={componentPanel.state.position}
            lineContent={componentPanel.state.lineContent}
            onCodeChange={componentPanel.updateCode}
            onClose={componentPanel.close}
            editorCode={tokensCode}
          />
        )}
        {componentPanel.state.pickerType === 'icon' && (
          <InlineIconPanel
            isOpen={componentPanel.state.isOpen}
            onClose={componentPanel.close}
            onSelect={(iconCode) => {
              // Update the line with the full icon code (name + options)
              const line = componentPanel.state.lineContent
              const match = line.match(/^(\s*(?:\w+:)?\s*\w+\s*)(.*)$/)
              if (match) {
                const [, prefix] = match
                componentPanel.updateCode(`${prefix}${iconCode}`)
              }
              componentPanel.close()
            }}
            onCodeChange={(iconCode) => {
              // Live update the line with the icon code
              const line = componentPanel.state.lineContent
              const match = line.match(/^(\s*(?:\w+:)?\s*\w+\s*)(.*)$/)
              if (match) {
                const [, prefix] = match
                componentPanel.updateCode(`${prefix}${iconCode}`)
              }
            }}
            position={componentPanel.state.position}
            filter=""
            selectedIndex={iconPanel.state.selectedIndex}
            onSelectedIndexChange={iconPanel.setSelectedIndex}
            onSelectedValueChange={iconPanel.setSelectedValue}
            iconLibrary={iconPanel.state.iconLibrary}
            onLibraryChange={iconPanel.setIconLibrary}
            editorCode={tokensCode}
            showTabs={true}
            availableTabs={['icon']}
          />
        )}

        {/* Token Picker - disabled, steals focus from editor */}
        {/* TODO: Rebuild as InlineTokenPicker */}
        {/* <PickerErrorBoundary onClose={closePicker} pickerName="TokenPicker">
          <TokenPicker
            isOpen={tokenPickerOpen}
            onClose={closePicker}
            onSelect={insertValue}
            position={tokenPickerPosition}
            tokensCode={tokensCode}
            propertyContext={tokenPickerPropertyContext}
          />
        </PickerErrorBoundary> */}

        {/* AI Assistant Panel */}
        <InlineAiPanel
          isOpen={aiPanel.state.isOpen}
          onClose={aiPanel.close}
          onSubmit={aiPanel.generate}
          position={aiPanel.state.position}
          isGenerating={aiPanel.state.isGenerating}
          selectedText={aiPanel.state.selectedText}
        />
      </div>
    )
  }
))
