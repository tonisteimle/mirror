import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view'
import { defaultKeymap, indentWithTab } from '@codemirror/commands'
import { dslTheme, dslHighlighter } from '../editor/dsl-syntax'
import { createEditorKeymaps, type KeymapCallbacks } from '../editor/keymaps'
import { dslAutocomplete } from '../editor/dsl-autocomplete'
import type { ValuePickerType } from '../data/dsl-properties'
import { InlineColorPanel } from './InlineColorPanel'
import { InlineAiPanel } from './InlineAiPanel'
import { CommandPalette } from './CommandPalette'
import { FontPicker } from './FontPicker'
import { LazyIconPicker } from './LazyIconPicker'
import { TokenPicker } from './TokenPicker'
import { colors } from '../theme'
import type { TabType } from '../validation'
import { usePickerState } from '../hooks/usePickerState'
import { generateDSLViaJSON } from '../lib/ai'

// Helper: Get image dimensions from a File
async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      resolve(null)
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}

// Helper: Save image file to public/media
// For now, stores in localStorage as data URL and returns filename
// TODO: Implement proper file system save via API
async function saveImageFile(file: File): Promise<string> {
  // Generate unique filename
  const ext = file.name.split('.').pop() || 'png'
  const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-')
  const timestamp = Date.now()
  const filename = `${baseName}-${timestamp}.${ext}`

  // Read file as data URL and store in localStorage
  // This is temporary - real implementation would save to public/media/
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })

  // Store in localStorage with prefix
  const mediaKey = `mirror-media:${filename}`
  try {
    localStorage.setItem(mediaKey, dataUrl)
  } catch {
    // localStorage might be full, just continue with filename
    console.warn('Could not save image to localStorage')
  }

  return filename
}

// Helper: Get stored image data URL from localStorage
export function getStoredImageUrl(filename: string): string | null {
  const mediaKey = `mirror-media:${filename}`
  return localStorage.getItem(mediaKey)
}

interface PromptPanelProps {
  value: string
  onChange: (value: string) => void
  selectionPrefix?: string
  highlightLine?: number  // 0-indexed line to highlight
  tab?: TabType  // Which tab this editor is for
  getOtherTabCode?: () => string  // Get code from the other tab for cross-validation
  tokensCode?: string  // Token definitions for font picker
  designTokens?: Map<string, unknown>  // Parsed design tokens for autocomplete
  autoCompleteMode?: 'always' | 'delay' | 'off'  // Autocomplete behavior (default: 'always')
  onOpenAiAssistant?: (position: { x: number; y: number }) => void  // Open AI assistant at position
}

export interface PromptPanelRef {
  goToLine: (line: number) => void
}

export const PromptPanel = forwardRef<PromptPanelRef, PromptPanelProps>(
  function PromptPanel({ value, onChange, selectionPrefix, highlightLine, tab, getOtherTabCode, tokensCode = '', designTokens, autoCompleteMode = 'always', onOpenAiAssistant }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<EditorView | null>(null)
    const isInternalChange = useRef(false)

    // Keep getOtherTabCode and tab in refs so the linter always gets the latest values
    const getOtherTabCodeRef = useRef(getOtherTabCode)
    getOtherTabCodeRef.current = getOtherTabCode
    const tabRef = useRef(tab)
    tabRef.current = tab
    const autoCompleteModeRef = useRef(autoCompleteMode)
    autoCompleteModeRef.current = autoCompleteMode
    const designTokensRef = useRef(designTokens)
    designTokensRef.current = designTokens

    // Ref for delay timeout (to cancel when user keeps typing)
    const autoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Inline panel state (for panels that keep focus in editor)
    const [colorPanelState, setColorPanelState] = useState({
      isOpen: false,
      position: { x: 0, y: 0 },
      filter: '',
      selectedIndex: 0,
      triggerPos: 0,
    })
    // Ref to access current state in closures
    const colorPanelRef = useRef(colorPanelState)
    colorPanelRef.current = colorPanelState
    // Ref for the currently selected value (set by InlineColorPanel)
    const colorPanelSelectedValueRef = useRef<string | null>(null)

    // Inline AI panel state
    const [aiPanelState, setAiPanelState] = useState({
      isOpen: false,
      position: { x: 0, y: 0 },
      triggerPos: 0,
      isGenerating: false,
    })
    const aiPanelRef = useRef(aiPanelState)
    aiPanelRef.current = aiPanelState

    // Consolidated picker state (replaces 45 individual useState calls)
    const picker = usePickerState(editorRef)

    // Destructure for backwards compatibility with existing code
    const {
      commandPaletteOpen, commandPalettePosition, commandPaletteQuery,
      fontPickerOpen, fontPickerPosition,
      iconPickerOpen, iconPickerPosition,
      tokenPickerOpen, tokenPickerPosition, tokenPickerPropertyContext,
      openPicker, closePicker,
    } = picker

    // Go to a specific line (0-indexed) and select it
    const goToLine = useCallback((line: number) => {
      const view = editorRef.current
      if (!view) return

      const doc = view.state.doc
      if (line >= doc.lines) return

      const lineInfo = doc.line(line + 1) // CodeMirror uses 1-indexed lines

      view.dispatch({
        selection: { anchor: lineInfo.from, head: lineInfo.to },
        scrollIntoView: true
      })
      view.focus()
    }, [])

    // Open inline color panel at cursor position
    const openColorPicker = useCallback(() => {
      // Don't reopen if already open - this prevents triggerPos from being overwritten
      if (colorPanelRef.current.isOpen) return

      const view = editorRef.current
      if (!view) return

      const cursorPos = view.state.selection.main.head
      const coords = view.coordsAtPos(cursorPos)
      if (!coords) return

      // Check if # was typed before cursor - if so, include it in triggerPos
      // so it gets replaced when color is selected
      let triggerPos = cursorPos
      if (cursorPos > 0) {
        const charBefore = view.state.doc.sliceString(cursorPos - 1, cursorPos)
        if (charBefore === '#') {
          triggerPos = cursorPos - 1
        }
      }

      setColorPanelState({
        isOpen: true,
        position: { x: coords.left, y: coords.bottom + 4 },
        filter: '',
        selectedIndex: 0,
        triggerPos,
      })
    }, [])

    // Close color panel
    const closeColorPanel = useCallback(() => {
      setColorPanelState(prev => ({ ...prev, isOpen: false }))
      editorRef.current?.focus()
    }, [])

    // Handle color selection from panel (mouse click)
    const handleColorSelect = useCallback((color: string) => {
      const view = editorRef.current
      if (!view) return

      // Use ref for current state (avoids stale closure)
      const { triggerPos } = colorPanelRef.current
      const cursorPos = view.state.selection.main.head

      // Ensure space before color if needed
      let insertText = color
      if (triggerPos > 0) {
        const charBefore = view.state.doc.sliceString(triggerPos - 1, triggerPos)
        if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
          insertText = ' ' + color
        }
      }

      view.dispatch({
        changes: { from: triggerPos, to: cursorPos, insert: insertText },
      })

      closeColorPanel()
    }, [closeColorPanel])

    // Open inline AI panel at cursor position
    const openAiPanel = useCallback(() => {
      const view = editorRef.current
      if (!view) return

      const cursorPos = view.state.selection.main.head
      const coords = view.coordsAtPos(cursorPos)
      if (!coords) return

      setAiPanelState({
        isOpen: true,
        position: { x: coords.left, y: coords.bottom + 4 },
        triggerPos: cursorPos,
        isGenerating: false,
      })
    }, [])

    // Close AI panel
    const closeAiPanel = useCallback(() => {
      setAiPanelState(prev => ({ ...prev, isOpen: false, isGenerating: false }))
      editorRef.current?.focus()
    }, [])

    // Handle AI generation and insert at cursor
    const handleAiGenerate = useCallback(async (prompt: string) => {
      const view = editorRef.current
      if (!view) return

      const { triggerPos } = aiPanelRef.current

      // Show generating state
      setAiPanelState(prev => ({ ...prev, isGenerating: true }))

      try {
        const generated = await generateDSLViaJSON(prompt)

        if (generated.layout) {
          // Get current line info for proper indentation
          const line = view.state.doc.lineAt(triggerPos)
          const lineText = line.text
          const indentMatch = lineText.match(/^(\s*)/)
          const indent = indentMatch ? indentMatch[1] : ''

          // Add indentation to each line of generated code
          const indentedCode = generated.layout
            .split('\n')
            .map((l, i) => i === 0 ? l : indent + l)
            .join('\n')

          // Remove the ? character and insert generated code
          const insertFrom = triggerPos > 0 &&
            view.state.doc.sliceString(triggerPos - 1, triggerPos) === '?'
            ? triggerPos - 1
            : triggerPos

          view.dispatch({
            changes: { from: insertFrom, to: triggerPos, insert: indentedCode },
          })
        }
      } catch (err) {
        console.error('[AI Generation Error]', err)
      } finally {
        closeAiPanel()
      }
    }, [closeAiPanel])

    // Factory for creating insert handlers that optionally remove preceding characters
    // and ensure proper spacing
    const createInsertHandler = useCallback(
      (precedingChars: string[] = []) =>
        (value: string) => {
          const view = editorRef.current
          if (!view) return

          const { from, to } = view.state.selection.main
          const doc = view.state.doc
          let insertFrom = from
          let insertValue = value

          if (from > 0) {
            const charBefore = doc.sliceString(from - 1, from)
            // Remove preceding trigger character if present
            if (precedingChars.includes(charBefore)) {
              insertFrom = from - 1
            } else if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
              // Add space if not already present
              insertValue = ' ' + value
            }
          }

          view.dispatch({
            changes: { from: insertFrom, to, insert: insertValue }
          })
          view.focus()
        },
      []
    )

    // Consolidated insert handlers using the factory
    const insertCommand = useCallback(createInsertHandler(['/']), [createInsertHandler])
    const insertFont = useCallback(createInsertHandler(['/']), [createInsertHandler])
    const insertIcon = useCallback(createInsertHandler(['/']), [createInsertHandler])
    const insertValue = useCallback(createInsertHandler(['/', '$']), [createInsertHandler])

    // Open command palette at cursor position
    const openCommandPalette = useCallback((initialQuery = '') => {
      openPicker('command', { query: initialQuery })
    }, [openPicker])

    // Open font picker at cursor position
    const openFontPicker = useCallback(() => {
      openPicker('font')
    }, [openPicker])

    // Open icon picker at cursor position
    const openIconPicker = useCallback(() => {
      openPicker('icon')
    }, [openPicker])


    // Open token picker at cursor position with optional property context
    const openTokenPicker = useCallback((propertyContext?: string) => {
      openPicker('token', { propertyContext })
    }, [openPicker])

    // Open AI assistant at cursor position
    const openAiAssistant = useCallback(() => {
      if (!onOpenAiAssistant) return
      const view = editorRef.current
      if (!view) return

      const cursorPos = view.state.selection.main.head
      const coords = view.coordsAtPos(cursorPos)
      if (!coords) return

      onOpenAiAssistant({ x: coords.left, y: coords.bottom + 4 })
    }, [onOpenAiAssistant])

    // Expose goToLine via ref
    useImperativeHandle(ref, () => ({
      goToLine
    }), [goToLine])

    // Initialize CodeMirror
    useEffect(() => {
      if (!containerRef.current) return

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged && !isInternalChange.current) {
          onChange(update.state.doc.toString())

          // Cancel pending autocomplete timeout when user types more
          if (autoCompleteTimeoutRef.current) {
            clearTimeout(autoCompleteTimeoutRef.current)
            autoCompleteTimeoutRef.current = null
          }

          // Detect # or $ typed - open appropriate picker
          // This works regardless of keyboard layout
          const cursorPos = update.state.selection.main.head
          if (cursorPos > 0) {
            const charBefore = update.state.doc.sliceString(cursorPos - 1, cursorPos)
            const line = update.state.doc.lineAt(cursorPos)
            const textBefore = line.text.slice(0, cursorPos - line.from)

            // Check if inside a string (don't trigger in strings)
            const quoteCount = (textBefore.match(/"/g) || []).length
            const insideString = quoteCount % 2 !== 0

            if (!insideString && !colorPanelRef.current.isOpen && !aiPanelRef.current.isOpen) {
              if (charBefore === '#') {
                // Open color picker when # is typed
                setTimeout(openColorPicker, 10)
              } else if (charBefore === '$') {
                // Open token picker when $ is typed
                // Find property context for filtering
                const match = textBefore.slice(0, -1).match(/\b(\w+)\s+(?:[a-z-]+\s+)*$/)
                const propertyContext = match ? match[1] : undefined
                setTimeout(() => openTokenPicker(propertyContext), 10)
              } else if (charBefore === '?') {
                // Open AI panel when ? is typed
                setTimeout(openAiPanel, 10)
              }
            }
          }

          // Update color panel filter if open
          const panelState = colorPanelRef.current
          if (panelState.isOpen) {
            const doc = update.state.doc

            // If cursor moved before trigger, close panel
            if (cursorPos < panelState.triggerPos) {
              setColorPanelState(prev => ({ ...prev, isOpen: false }))
              return
            }

            // Extract filter text (skip the # character if present)
            let filter = doc.sliceString(panelState.triggerPos, cursorPos)
            if (filter.startsWith('#')) {
              filter = filter.slice(1)
            }

            // If filter contains newline, close panel
            if (filter.includes('\n')) {
              setColorPanelState(prev => ({ ...prev, isOpen: false }))
              return
            }

            // If filter contains space, close panel (user finished typing hex)
            if (filter.includes(' ')) {
              setColorPanelState(prev => ({ ...prev, isOpen: false }))
              return
            }

            setColorPanelState(prev => ({ ...prev, filter, selectedIndex: 0 }))
          }
        }
      })

      // Create keymap callbacks
      const keymapCallbacks: KeymapCallbacks = {
        openColorPicker,
        openCommandPalette,
        openFontPicker,
        openIconPicker,
        openTokenPicker,
        openAiAssistant,
      }

      // Value picker callback for inline autocomplete
      const handleValuePickerNeeded = (picker: ValuePickerType) => {
        switch (picker) {
          case 'color':
            openColorPicker()
            break
          case 'font':
            openPicker('font')
            break
          case 'icon':
            openPicker('icon')
            break
        }
      }

      // Create all editor keymaps using the extracted module
      const editorKeymaps = createEditorKeymaps({
        callbacks: keymapCallbacks,
        getAutoCompleteMode: () => autoCompleteModeRef.current,
        getCurrentTab: () => tabRef.current,
        autoCompleteTimeoutRef,
      })

      // Panel navigation keymap (must be first to intercept keys when panel is open)
      const panelKeymap = keymap.of([
        {
          key: 'Escape',
          run: () => {
            if (colorPanelRef.current.isOpen) {
              setColorPanelState(prev => ({ ...prev, isOpen: false }))
              return true
            }
            return false
          },
        },
        {
          key: 'ArrowDown',
          run: () => {
            if (colorPanelRef.current.isOpen) {
              setColorPanelState(prev => ({ ...prev, selectedIndex: prev.selectedIndex + 1 }))
              return true
            }
            return false
          },
        },
        {
          key: 'ArrowUp',
          run: () => {
            if (colorPanelRef.current.isOpen) {
              setColorPanelState(prev => ({ ...prev, selectedIndex: Math.max(0, prev.selectedIndex - 1) }))
              return true
            }
            return false
          },
        },
        {
          key: 'Enter',
          run: (view) => {
            if (colorPanelRef.current.isOpen) {
              const { triggerPos } = colorPanelRef.current
              const cursorPos = view.state.selection.main.head

              // Read filter directly from document (more reliable than React state)
              let filter = view.state.doc.sliceString(triggerPos, cursorPos)
              if (filter.startsWith('#')) {
                filter = filter.slice(1)
              }

              // Determine the value to insert:
              // 1. If user typed a valid hex (3+ hex chars), use that
              // 2. Otherwise, use the selected value from the picker
              let selectedValue: string | null = null
              const isHexInput = /^[0-9a-fA-F]{1,8}$/.test(filter)
              if (isHexInput && filter.length >= 3) {
                selectedValue = '#' + filter.toUpperCase()
              } else {
                selectedValue = colorPanelSelectedValueRef.current
              }

              if (selectedValue) {
                // Ensure space before if needed
                let insertText = selectedValue
                if (triggerPos > 0) {
                  const charBefore = view.state.doc.sliceString(triggerPos - 1, triggerPos)
                  if (charBefore !== ' ' && charBefore !== '\n' && charBefore !== '\t') {
                    insertText = ' ' + selectedValue
                  }
                }

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

      // Build extensions array
      const extensions = [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        panelKeymap, // Panel navigation (must be first to intercept)
        dslAutocomplete({
          onValuePickerNeeded: handleValuePickerNeeded,
          getDesignTokens: () => designTokensRef.current ?? new Map(),
        }),
        ...editorKeymaps, // Custom keymaps (must come before defaultKeymap)
        keymap.of([...defaultKeymap, indentWithTab]),
        dslTheme,
        dslHighlighter,
        updateListener,
      ]

      // Linter disabled - too many false positives with state/actions/tokens
      // if (tab && getOtherTabCode) {
      //   extensions.push(
      //     lintGutter(),
      //     linter(createDSLLinter(tab, () => getOtherTabCodeRef.current?.() ?? ''), {
      //       delay: 300
      //     })
      //   )
      // }

      const state = EditorState.create({
        doc: value,
        extensions
      })

      const view = new EditorView({
        state,
        parent: containerRef.current
      })

      editorRef.current = view

      return () => {
        view.destroy()
        editorRef.current = null
        // Clean up any pending autocomplete timeout
        if (autoCompleteTimeoutRef.current) {
          clearTimeout(autoCompleteTimeoutRef.current)
          autoCompleteTimeoutRef.current = null
        }
      }
    }, [tab]) // Recreate editor when tab changes so linter is correctly configured

    // Update editor when value changes externally
    useEffect(() => {
      const view = editorRef.current
      if (!view) return

      const currentValue = view.state.doc.toString()
      if (currentValue !== value) {
        isInternalChange.current = true
        view.dispatch({
          changes: { from: 0, to: currentValue.length, insert: value }
        })
        isInternalChange.current = false
      }
    }, [value])

    // Auto-scroll to highlighted line when it changes
    useEffect(() => {
      if (highlightLine !== undefined && highlightLine >= 0) {
        goToLine(highlightLine)
      }
    }, [highlightLine, goToLine])

    // Drag & Drop handler for images
    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer?.types.includes('Files')) {
          e.dataTransfer.dropEffect = 'copy'
          container.style.outline = '2px dashed #3B82F6'
          container.style.outlineOffset = '-2px'
        }
      }

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault()
        container.style.outline = ''
        container.style.outlineOffset = ''
      }

      const handleDrop = async (e: DragEvent) => {
        e.preventDefault()
        container.style.outline = ''
        container.style.outlineOffset = ''

        const files = e.dataTransfer?.files
        if (!files || files.length === 0) return

        const view = editorRef.current
        if (!view) return

        const imageFiles = Array.from(files).filter(file =>
          file.type.startsWith('image/')
        )

        if (imageFiles.length === 0) return

        // Get current cursor position and indentation
        const cursorPos = view.state.selection.main.head
        const line = view.state.doc.lineAt(cursorPos)
        const lineText = line.text
        const indentMatch = lineText.match(/^(\s*)/)
        const indent = indentMatch ? indentMatch[1] : ''

        // Generate Image code for each file
        const imageCodeLines: string[] = []

        for (const file of imageFiles) {
          // Get image dimensions
          const dimensions = await getImageDimensions(file)

          // Save file to public/media (via API or localStorage for now)
          const filename = await saveImageFile(file)

          // Generate the Image line
          const widthHeight = dimensions ? ` ${dimensions.width} ${dimensions.height}` : ''
          imageCodeLines.push(`${indent}Image "${filename}"${widthHeight}`)
        }

        // Insert at cursor position
        const insertText = imageCodeLines.join('\n')

        // If cursor is at end of line, add newline before
        const needsNewlineBefore = cursorPos === line.to && lineText.trim() !== ''
        const needsNewlineAfter = cursorPos < view.state.doc.length

        const finalText = (needsNewlineBefore ? '\n' : '') + insertText + (needsNewlineAfter ? '\n' : '')

        view.dispatch({
          changes: { from: cursorPos, to: cursorPos, insert: finalText }
        })
        view.focus()
      }

      container.addEventListener('dragover', handleDragOver)
      container.addEventListener('dragleave', handleDragLeave)
      container.addEventListener('drop', handleDrop)

      return () => {
        container.removeEventListener('dragover', handleDragOver)
        container.removeEventListener('dragleave', handleDragLeave)
        container.removeEventListener('drop', handleDrop)
      }
    }, [])

    return (
      <div style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
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
        <div
          ref={containerRef}
          style={{
            flex: 1,
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: colors.panel,
          }}
        />

        {/* Inline Color Panel - Focus stays in editor */}
        <InlineColorPanel
          isOpen={colorPanelState.isOpen}
          onClose={closeColorPanel}
          onSelect={handleColorSelect}
          position={colorPanelState.position}
          filter={colorPanelState.filter}
          selectedIndex={colorPanelState.selectedIndex}
          onSelectedIndexChange={(idx) => setColorPanelState(prev => ({ ...prev, selectedIndex: idx }))}
          onSelectedValueChange={(value) => { colorPanelSelectedValueRef.current = value }}
        />

        {/* Command Palette (/) */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={closePicker}
          onSelect={insertCommand}
          position={commandPalettePosition}
          initialQuery={commandPaletteQuery}
        />

        {/* Font Picker (font /) */}
        <FontPicker
          isOpen={fontPickerOpen}
          onClose={closePicker}
          onSelect={insertFont}
          position={fontPickerPosition}
          tokens={tokensCode}
          defaultToTokens={tab !== 'tokens'}
        />

        {/* Icon Picker (icon /) - Lazy loaded to reduce bundle size */}
        <LazyIconPicker
          isOpen={iconPickerOpen}
          onClose={closePicker}
          onSelect={insertIcon}
          position={iconPickerPosition}
        />

        {/* Token Picker ($ trigger) */}
        <TokenPicker
          isOpen={tokenPickerOpen}
          onClose={closePicker}
          onSelect={insertValue}
          position={tokenPickerPosition}
          tokensCode={tokensCode}
          propertyContext={tokenPickerPropertyContext}
        />

        {/* Inline AI Panel (? trigger) */}
        <InlineAiPanel
          isOpen={aiPanelState.isOpen}
          onClose={closeAiPanel}
          onSubmit={handleAiGenerate}
          position={aiPanelState.position}
          isGenerating={aiPanelState.isGenerating}
        />

      </div>
    )
  }
)
