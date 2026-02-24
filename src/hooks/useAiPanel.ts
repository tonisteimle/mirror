/**
 * useAiPanel Hook
 *
 * Manages inline AI panel state for the editor.
 * Handles AI-powered code generation within the editor context.
 * Automatically detects complex prompts and uses stepwise generation.
 * Supports Data Tab generation for data-driven apps.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { generateMirrorCodeWithOptions } from '../lib/ai'
import { classifyComplexity } from '../lib/complexity-classifier'
import { generatePlan } from '../lib/plan-generator'
import { generateStepwise, type StepProgress } from '../lib/stepwise-generator'
import { transformCode } from '../editor/shorthand-expansion'
import { logger } from '../services/logger'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'

/**
 * Extract the component block at the cursor position.
 * Returns the full component definition including all children.
 *
 * @param code - Full editor code
 * @param cursorLine - 1-based line number where cursor is
 * @returns Component block and its start line, or null if not in a component
 */
function extractComponentAtCursor(code: string, cursorLine: number): {
  block: string
  startLine: number
  componentName: string
} | null {
  const lines = code.split('\n')
  if (cursorLine < 1 || cursorLine > lines.length) return null

  // Helper to get indent of a line
  const getIndent = (line: string) => line.match(/^(\s*)/)?.[1].length || 0

  // Start at cursor line (0-based)
  let currentLine = cursorLine - 1

  // Skip empty/comment lines to find the actual content line
  while (currentLine >= 0) {
    const trimmed = lines[currentLine].trim()
    if (trimmed && !trimmed.startsWith('//')) break
    currentLine--
  }
  if (currentLine < 0) return null

  // Get the indent of the current content line
  let currentIndent = getIndent(lines[currentLine])

  // Walk UP to find the root component (line with indent 0)
  let definitionLine = currentLine
  while (definitionLine > 0 && currentIndent > 0) {
    const prevLineIdx = definitionLine - 1
    const prevLine = lines[prevLineIdx]
    const prevTrimmed = prevLine.trim()

    // Skip empty lines and comments when walking up
    if (!prevTrimmed || prevTrimmed.startsWith('//')) {
      definitionLine--
      continue
    }

    const prevIndent = getIndent(prevLine)

    // If previous line has less indent, it's the parent - move up
    if (prevIndent < currentIndent) {
      definitionLine = prevLineIdx
      currentIndent = prevIndent
    } else {
      // Same or more indent - it's a sibling or nested, keep walking up
      definitionLine--
    }
  }

  // Ensure we're at a component line (starts with capital letter)
  const defLine = lines[definitionLine]
  const nameMatch = defLine.trim().match(/^([A-Z][a-zA-Z0-9]*)/)
  if (!nameMatch) return null

  const componentName = nameMatch[1]
  const definitionIndent = getIndent(defLine)

  // Find the end of the component block (next non-empty line at same or lower indent)
  let endLine = definitionLine + 1
  while (endLine < lines.length) {
    const line = lines[endLine]
    const trimmed = line.trim()

    // Skip empty lines
    if (!trimmed) {
      endLine++
      continue
    }

    // Skip comments
    if (trimmed.startsWith('//')) {
      endLine++
      continue
    }

    // If we hit a line at same or lower indent, stop
    const indent = getIndent(line)
    if (indent <= definitionIndent) {
      break
    }

    endLine++
  }

  // Extract the block (trim trailing empty lines)
  while (endLine > definitionLine && !lines[endLine - 1].trim()) {
    endLine--
  }
  const block = lines.slice(definitionLine, endLine).join('\n')

  return {
    block,
    startLine: definitionLine + 1, // 1-based
    componentName
  }
}

/**
 * Parse generated code for Data Tab and Layout Tab markers.
 * Returns split code if markers found, otherwise returns all as layoutCode.
 */
function parseGeneratedCode(code: string): { dataCode: string | null; layoutCode: string } {
  const dataMarker = '// === DATA TAB ==='
  const layoutMarker = '// === LAYOUT TAB ==='

  const dataIndex = code.indexOf(dataMarker)
  const layoutIndex = code.indexOf(layoutMarker)

  // No markers found - return all as layout
  if (dataIndex === -1 && layoutIndex === -1) {
    return { dataCode: null, layoutCode: code }
  }

  // Extract Data Tab content if marker found
  let dataCode: string | null = null
  let layoutCode = code

  if (dataIndex !== -1) {
    const dataStart = dataIndex + dataMarker.length
    const dataEnd = layoutIndex !== -1 ? layoutIndex : code.length
    dataCode = code.slice(dataStart, dataEnd).trim()
  }

  // Extract Layout Tab content if marker found
  if (layoutIndex !== -1) {
    layoutCode = code.slice(layoutIndex + layoutMarker.length).trim()
  } else if (dataIndex !== -1) {
    // Only Data Tab marker, no Layout - should not happen but handle gracefully
    layoutCode = ''
  }

  return { dataCode, layoutCode }
}

export interface AiPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  triggerPos: number
  isGenerating: boolean
  /** Selected text when panel was opened (if any) */
  selectedText: string
  /** Selection range for replacement */
  selectionRange: { from: number; to: number } | null
  /** Component block range for replacement (when cursor is inside a component) */
  componentRange: { from: number; to: number } | null
  /** Progress for stepwise generation (complex prompts) */
  generationProgress?: StepProgress
}

const initialState: AiPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  isGenerating: false,
  selectedText: '',
  selectionRange: null,
  componentRange: null,
  generationProgress: undefined,
}

interface UseAiPanelOptions {
  tokensCode?: string
  componentsCode?: string
  layoutCode?: string
  /** Whether to expand shorthand to long form (e.g., p → padding). Default: true */
  expandShorthand?: boolean
  /** Callback when Data Tab content is generated (for data-driven apps) */
  onDataCodeGenerated?: (code: string) => void
}

export function useAiPanel(
  editorRef: React.RefObject<EditorView | null>,
  options: UseAiPanelOptions = {}
) {
  const [state, setState] = useState<AiPanelState>(initialState)
  const { getCursorPos, returnFocus } = usePanelPosition(editorRef)

  // Keep code refs so we can access them in generate()
  const tokensCodeRef = useRef(options.tokensCode)
  tokensCodeRef.current = options.tokensCode
  const componentsCodeRef = useRef(options.componentsCode)
  componentsCodeRef.current = options.componentsCode
  const layoutCodeRef = useRef(options.layoutCode)
  layoutCodeRef.current = options.layoutCode
  const onDataCodeGeneratedRef = useRef(options.onDataCodeGenerated)
  onDataCodeGeneratedRef.current = options.onDataCodeGenerated
  const expandShorthandRef = useRef(options.expandShorthand ?? true)
  expandShorthandRef.current = options.expandShorthand ?? true

  // Ref to access current state in closures
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Open the AI panel at the current cursor position.
   * If text is selected, captures it for context.
   */
  const open = useCallback(() => {
    const view = editorRef.current
    if (!view) return

    const selection = view.state.selection.main
    const hasSelection = selection.from !== selection.to
    const selectedText = hasSelection
      ? view.state.doc.sliceString(selection.from, selection.to)
      : ''

    // Position panel at end of selection (or cursor)
    const positionAt = hasSelection ? selection.to : selection.head
    const coords = view.coordsAtPos(positionAt)
    if (!coords) return

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      triggerPos: positionAt,
      isGenerating: false,
      selectedText,
      selectionRange: hasSelection ? { from: selection.from, to: selection.to } : null,
      componentRange: null,
      generationProgress: undefined,
    })
  }, [editorRef])

  /**
   * Close the AI panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, isGenerating: false, generationProgress: undefined, componentRange: null }))
    returnFocus()
  }, [returnFocus])

  /**
   * Insert generated code into the editor
   */
  const insertCode = useCallback((code: string) => {
    logger.ai.debug('insertCode called', { codeLength: code?.length, hasView: Boolean(editorRef.current) })
    const view = editorRef.current
    if (!view || !code) {
      logger.ai.warn('insertCode early return', { hasView: Boolean(view), hasCode: Boolean(code) })
      return
    }

    const { triggerPos, selectedText, selectionRange, componentRange } = stateRef.current
    const hasSelection = Boolean(selectedText && selectionRange)
    const hasComponentContext = Boolean(componentRange)

    let finalCode = code.trim()
    let insertFrom: number
    let indentedCode: string

    if (hasSelection && selectionRange) {
      // Replace selection with generated code
      const firstLine = view.state.doc.lineAt(selectionRange.from)
      const indentMatch = firstLine.text.match(/^(\s*)/)
      const baseIndent = indentMatch ? indentMatch[1] : ''

      indentedCode = finalCode
        .split('\n')
        .map((l: string, i: number) => {
          if (i === 0) return l
          const lineIndent = l.match(/^(\s*)/)?.[1] || ''
          return baseIndent + l.substring(Math.min(lineIndent.length, 2))
        })
        .join('\n')

      insertFrom = selectionRange.from
      view.dispatch({
        changes: { from: selectionRange.from, to: selectionRange.to, insert: indentedCode },
      })
    } else if (hasComponentContext && componentRange) {
      // Replace entire component block
      const firstLine = view.state.doc.lineAt(componentRange.from)
      const indentMatch = firstLine.text.match(/^(\s*)/)
      const baseIndent = indentMatch ? indentMatch[1] : ''

      // Find the minimum indentation in the generated code (to normalize)
      const codeLines = finalCode.split('\n')
      const firstLineIndent = codeLines[0].match(/^(\s*)/)?.[1].length || 0

      // Apply base indent while preserving relative indentation
      indentedCode = codeLines
        .map((l: string, i: number) => {
          if (!l.trim()) return '' // Empty lines stay empty
          const lineIndent = l.match(/^(\s*)/)?.[1].length || 0
          const relativeIndent = Math.max(0, lineIndent - firstLineIndent)
          return baseIndent + '  '.repeat(relativeIndent / 2) + l.trimStart()
        })
        .join('\n')

      insertFrom = componentRange.from
      view.dispatch({
        changes: { from: componentRange.from, to: componentRange.to, insert: indentedCode },
      })

      logger.ai.debug('Component block replaced', {
        from: componentRange.from,
        to: componentRange.to,
        newCodeLength: indentedCode.length
      })
    } else {
      // Insert at cursor position
      const line = view.state.doc.lineAt(triggerPos)
      const lineText = line.text
      const cursorColumn = triggerPos - line.from
      const textBeforeCursor = lineText.substring(0, cursorColumn)

      // If the code starts with the same text as before cursor, remove it
      const trimmedBefore = textBeforeCursor.trim()
      if (trimmedBefore && finalCode.startsWith(trimmedBefore)) {
        finalCode = finalCode.substring(trimmedBefore.length).trimStart()
      }

      // Get indentation for multi-line responses
      const indentMatch = lineText.match(/^(\s*)/)
      const indent = indentMatch ? indentMatch[1] : ''

      indentedCode = finalCode
        .split('\n')
        .map((l: string, i: number) => i === 0 ? l : indent + l)
        .join('\n')

      insertFrom = triggerPos
      view.dispatch({
        changes: { from: triggerPos, to: triggerPos, insert: indentedCode },
      })
    }

    // Position cursor on the next line after the inserted code
    setTimeout(() => {
      const currentView = editorRef.current
      if (!currentView) return

      const doc = currentView.state.doc
      const insertedLines = indentedCode.split('\n').length
      const insertLine = doc.lineAt(insertFrom)
      const targetLineNumber = insertLine.number + insertedLines

      // If target line doesn't exist, create a new line
      if (targetLineNumber > doc.lines) {
        currentView.dispatch({
          changes: { from: doc.length, to: doc.length, insert: '\n' },
          selection: { anchor: doc.length + 1 },
          scrollIntoView: true,
        })
      } else {
        const targetLine = doc.line(targetLineNumber)
        currentView.dispatch({
          selection: { anchor: targetLine.from },
          scrollIntoView: true,
        })
      }
      currentView.focus()
    }, 10)
  }, [editorRef])

  /**
   * Handle AI generation.
   * Automatically detects complex prompts and uses stepwise generation.
   */
  const generate = useCallback(async (prompt: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, selectedText, selectionRange } = stateRef.current
    const hasSelection = Boolean(selectedText && selectionRange)

    // Show generating state
    setState(prev => ({ ...prev, isGenerating: true, generationProgress: undefined }))

    const context = {
      tokensCode: tokensCodeRef.current,
      componentsCode: componentsCodeRef.current,
      layoutCode: layoutCodeRef.current,
    }

    try {
      // Check if this is a complex prompt (only for non-selection prompts)
      const complexity = !hasSelection ? classifyComplexity(prompt) : { isComplex: false }

      if (complexity.isComplex) {
        // Complex prompt: use stepwise generation
        logger.ai.debug('Complex prompt detected, using stepwise generation', {
          confidence: (complexity as { confidence: number }).confidence,
          reasons: (complexity as { reasons: string[] }).reasons,
        })

        // Generate plan
        setState(prev => ({
          ...prev,
          generationProgress: { currentStep: 0, totalSteps: 1, currentComponent: 'Planning...' }
        }))

        const plan = await generatePlan(prompt)

        // Generate stepwise
        const code = await generateStepwise(plan, context, (progress) => {
          setState(prev => ({ ...prev, generationProgress: progress }))
        })

        // Parse for Data Tab markers (complex prompts may generate data-driven apps)
        const parsed = parseGeneratedCode(code)
        if (parsed.dataCode && onDataCodeGeneratedRef.current) {
          logger.ai.info('Data Tab content generated', { dataCodeLength: parsed.dataCode.length })
          onDataCodeGeneratedRef.current(parsed.dataCode)
        }
        // Transform to match current short/long mode
        const normalizedCode = expandShorthandRef.current
          ? parsed.layoutCode
          : transformCode(parsed.layoutCode, false)
        insertCode(normalizedCode)
      } else {
        // Simple prompt: direct generation
        let contextPrompt: string

        if (hasSelection) {
          contextPrompt = `MARKIERTER CODE:
\`\`\`
${selectedText}
\`\`\`

AUFGABE: ${prompt}

WICHTIG:
- Wenn du den Code modifizieren sollst, gib den vollständigen modifizierten Code aus
- Wenn eine Frage gestellt wird, generiere eine hilfreiche Antwort als Kommentar (// ...)
- Behalte die Struktur und Einrückung bei`
        } else {
          const line = view.state.doc.lineAt(triggerPos)
          const lineText = line.text
          const cursorColumn = triggerPos - line.from
          const textBeforeCursor = lineText.substring(0, cursorColumn)
          const textAfterCursor = lineText.substring(cursorColumn)

          // Try to extract the component block at cursor position
          const fullCode = view.state.doc.toString()
          const cursorLineNumber = view.state.doc.lineAt(triggerPos).number
          const componentContext = extractComponentAtCursor(fullCode, cursorLineNumber)

          if (componentContext) {
            // Calculate the range for replacement
            const startLine = view.state.doc.line(componentContext.startLine)
            const blockLines = componentContext.block.split('\n').length
            const endLineNum = Math.min(componentContext.startLine + blockLines - 1, view.state.doc.lines)
            const endLine = view.state.doc.line(endLineNum)
            const componentRange = { from: startLine.from, to: endLine.to }

            // Store component range in state for insertCode
            setState(prev => ({ ...prev, componentRange }))

            // We're inside a component - provide full component context
            contextPrompt = `KOMPONENTE (Cursor in Zeile ${cursorLineNumber - componentContext.startLine + 1}):
\`\`\`
${componentContext.block}
\`\`\`

AUFGABE: ${prompt}

WICHTIG:
- Gib die VOLLSTÄNDIGE modifizierte Komponente aus
- Behalte alle existierenden Properties und Kinder bei
- Füge nur die nötigen Änderungen hinzu`
          } else {
            // Fallback: just cursor line context
            contextPrompt = `KONTEXT: Cursor steht in dieser Zeile nach "${textBeforeCursor.trim()}"${textAfterCursor.trim() ? ` und vor "${textAfterCursor.trim()}"` : ''}.

AUFGABE: ${prompt}

WICHTIG: Generiere NUR den Code-Teil der an der Cursor-Position eingefügt werden soll. Keine Wiederholung der existierenden Zeile. Wenn es eine Ergänzung zur aktuellen Property ist, gib nur den fehlenden Wert/Teil aus.`
          }
        }

        // Force JS Builder pipeline - Intent Pipeline is broken for AI Panel prompts
        const generated = await generateMirrorCodeWithOptions(contextPrompt, {
          ...context,
          forcePipeline: 'js-builder'
        })

        logger.ai.debug('AI Panel generation result', {
          hasCode: Boolean(generated.code),
          codeLength: generated.code?.length,
          codePreview: generated.code?.slice(0, 100)
        })

        if (generated.code) {
          // Parse for Data Tab markers (simple prompts can also generate data-driven content)
          const parsed = parseGeneratedCode(generated.code)
          logger.ai.debug('Parsed code', {
            hasDataCode: Boolean(parsed.dataCode),
            layoutCodeLength: parsed.layoutCode.length,
            layoutCodePreview: parsed.layoutCode.slice(0, 100)
          })
          if (parsed.dataCode && onDataCodeGeneratedRef.current) {
            logger.ai.info('Data Tab content generated', { dataCodeLength: parsed.dataCode.length })
            onDataCodeGeneratedRef.current(parsed.dataCode)
          }
          // Transform to match current short/long mode
          const normalizedCode = expandShorthandRef.current
            ? parsed.layoutCode
            : transformCode(parsed.layoutCode, false)
          insertCode(normalizedCode)
        } else {
          logger.ai.warn('AI Panel: No code generated')
        }
      }
    } catch (err) {
      logger.ai.error('Generation error', err)
    } finally {
      close()
    }
  }, [editorRef, close, insertCode])

  /**
   * Get state ref for use in closures.
   */
  const getStateRef = useCallback(() => stateRef, [])

  return {
    state,
    stateRef,
    open,
    close,
    generate,
    getStateRef,
  }
}
