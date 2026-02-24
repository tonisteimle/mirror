/**
 * useTypographyPanel Hook
 *
 * Manages inline typography panel state for the editor.
 * Triggered by: font, size, weight, text keywords or double-click on typography properties.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'

export interface TypographyPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  triggerPos: number
  /** Range to replace when editing existing typography */
  replaceRange: { from: number; to: number } | null
  /** Initial code for the picker (when editing existing typography) */
  initialCode: string
  /** Layout properties to preserve (come before string) */
  layoutCode: string
  /** String content like "Hello World" to preserve */
  stringContent: string
  /** Other non-layout, non-typography properties to preserve */
  preservedCode: string
  /** The component name (for reconstruction) */
  componentName: string
}

const initialState: TypographyPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  replaceRange: null,
  initialCode: '',
  layoutCode: '',
  stringContent: '',
  preservedCode: '',
  componentName: '',
}

// Typography keywords that trigger the picker
// Note: 'font' is NOT included - it opens the font picker instead
export const TYPOGRAPHY_TRIGGERS = [
  'size', 'weight', 'line', 'typo',
]

// All typography-related properties
export const TYPOGRAPHY_PROPERTIES = [
  'font', 'text-size', 'ts', 'font-size', 'fs', 'size', 'weight', 'line', 'col', 'color',
  'italic', 'underline', 'uppercase', 'lowercase', 'truncate',
  'text-align', 'align',
]

// ============================================================================
// Typography-Aware Parsing
// ============================================================================

export interface ParsedTypographyProperties {
  componentName: string
  componentNameEnd: number
  layoutProperties: Array<{ key: string; value?: string; raw: string }>
  typographyProperties: Array<{ key: string; value?: string; raw: string }>
  otherProperties: Array<{ key: string; value?: string; raw: string }>
  stringContent: string  // The text content like "Hello World"
  layoutCode: string
  typographyCode: string
  preservedCode: string  // Other non-layout, non-typography properties
  // Legacy alias
  nonTypographyProperties: Array<{ key: string; value?: string; raw: string }>
}

/**
 * Check if a property key is typography-related.
 */
function isTypographyProperty(key: string): boolean {
  const typographyKeys = new Set([
    'font', 'text-size', 'ts', 'font-size', 'fs', 'size', 'weight', 'line',
    'col', 'color',
    'italic', 'underline', 'uppercase', 'lowercase', 'truncate',
    'text-align', 'align',
  ])
  return typographyKeys.has(key.toLowerCase())
}

/**
 * Check if a property key is layout-related.
 */
function isLayoutProperty(key: string): boolean {
  const layoutKeys = new Set([
    // Direction
    'ver', 'hor', 'vertical', 'horizontal', 'grid', 'stacked',
    // Alignment
    'cen', 'center',
    'hor-l', 'hor-cen', 'hor-r',
    'ver-t', 'ver-cen', 'ver-b',
    // Gap
    'gap', 'g',
    // Distribution
    'between', 'wrap',
    // Size modes
    'w-min', 'w-max', 'h-min', 'h-max',
    // Size values
    'w', 'h', 'width', 'height',
    // Padding/Margin
    'pad', 'padding', 'mar', 'margin',
    // Background color (handled by layout panel)
    'bg', 'background',
  ])
  return layoutKeys.has(key.toLowerCase())
}

/**
 * Check if a token is a typography value (font name, weight, etc).
 */
function isTypographyValue(token: string): boolean {
  const lower = token.toLowerCase()

  // Font weights
  const weights = new Set(['thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black'])
  if (weights.has(lower)) return true

  // Font styles
  const styles = new Set(['italic', 'underline', 'uppercase', 'lowercase'])
  if (styles.has(lower)) return true

  // Text align
  const aligns = new Set(['left', 'center', 'right', 'justify'])
  if (aligns.has(lower)) return true

  // Common font names (without quotes)
  const fonts = new Set([
    'inter', 'roboto', 'arial', 'helvetica', 'verdana', 'georgia', 'times',
    'courier', 'monaco', 'monospace', 'sans-serif', 'serif', 'system-ui',
  ])
  if (fonts.has(lower)) return true

  return false
}

/**
 * Check if a token is a CSS color.
 */
function isCssColor(token: string): boolean {
  // Hex colors
  if (/^#[0-9a-fA-F]{3,8}$/.test(token)) return true

  // Named colors (subset)
  const cssColors = new Set([
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'gray', 'grey', 'transparent', 'inherit', 'currentColor',
  ])
  return cssColors.has(token.toLowerCase())
}

/**
 * Split by comma, respecting quoted strings.
 */
function splitByComma(text: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if ((char === '"' || char === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuote = false
      }
      current += char
    } else if (char === ',' && !inQuote) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) result.push(current)
  return result
}

/**
 * Tokenize by space, respecting quoted strings.
 */
function tokenizeBySpace(text: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuote = false
  let quoteChar = ''

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if ((char === '"' || char === "'") && (i === 0 || text[i - 1] !== '\\')) {
      if (!inQuote) {
        inQuote = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuote = false
      }
      current += char
    } else if (char === ' ' && !inQuote) {
      if (current) {
        result.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }
  if (current) result.push(current)
  return result
}

/**
 * Parse a line into layout, typography, and other properties.
 */
export function parseTypographyProperties(lineText: string): ParsedTypographyProperties {
  const result: ParsedTypographyProperties = {
    componentName: '',
    componentNameEnd: 0,
    layoutProperties: [],
    typographyProperties: [],
    otherProperties: [],
    stringContent: '',
    layoutCode: '',
    typographyCode: '',
    preservedCode: '',
    nonTypographyProperties: [], // Legacy alias
  }

  const trimmedStart = lineText.match(/^(\s*)/)
  const indent = trimmedStart ? trimmedStart[1].length : 0
  const content = lineText.slice(indent)

  if (!content) return result

  const componentMatch = content.match(/^([A-Za-z_][A-Za-z0-9_-]*):?/)
  if (!componentMatch) return result

  result.componentName = componentMatch[1]
  result.componentNameEnd = indent + componentMatch[0].length

  let rest = content.slice(componentMatch[0].length).trim()

  // Parse properties
  const commaParts = splitByComma(rest)

  for (const part of commaParts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const spaceTokens = tokenizeBySpace(trimmed)
    let i = 0

    while (i < spaceTokens.length) {
      const token = spaceTokens[i]

      // Quoted string - this is the text content
      if (token.startsWith('"') || token.startsWith("'")) {
        // Only capture the first standalone string as content
        if (!result.stringContent) {
          result.stringContent = token
        } else {
          // Additional strings go to other
          result.otherProperties.push({ key: '', value: token, raw: token })
        }
        i++
        continue
      }

      // Check if identifier
      const keyMatch = token.match(/^([A-Za-z_][A-Za-z0-9_-]*)/)
      if (!keyMatch) {
        // Could be a number or color
        if (/^\d/.test(token) || token.startsWith('#')) {
          result.otherProperties.push({ key: '', value: token, raw: token })
        }
        i++
        continue
      }

      const key = keyMatch[1]
      let valueTokens: string[] = []
      let rawParts = [token]

      const inlineValue = token.slice(key.length).trim()
      if (inlineValue) valueTokens.push(inlineValue)

      // Properties that take values
      const propsWithValues = new Set(['font', 'size', 'weight', 'line', 'col', 'color', 'align', 'w', 'h', 'width', 'height', 'gap', 'g', 'pad', 'padding', 'mar', 'margin', 'grid', 'bg', 'background'])

      if (propsWithValues.has(key.toLowerCase())) {
        while (i + 1 < spaceTokens.length) {
          const nextToken = spaceTokens[i + 1]
          if (isTypographyProperty(nextToken) || isLayoutProperty(nextToken) || isKnownPropertyKey(nextToken)) break
          if (/^[\d#]/.test(nextToken) || isTypographyValue(nextToken) || isCssColor(nextToken) || nextToken.startsWith('"') || nextToken.startsWith("'") || /^\d+%$/.test(nextToken)) {
            valueTokens.push(nextToken)
            rawParts.push(nextToken)
            i++
          } else {
            break
          }
        }
      }

      const value = valueTokens.join(' ')
      const raw = rawParts.join(' ')

      if (isLayoutProperty(key)) {
        result.layoutProperties.push({ key, value, raw })
      } else if (isTypographyProperty(key)) {
        result.typographyProperties.push({ key, value, raw })
      } else if (!TYPOGRAPHY_TRIGGERS.includes(key.toLowerCase())) {
        // Exclude trigger keywords like 'typo' from preserved properties
        result.otherProperties.push({ key, value, raw })
      }

      i++
    }
  }

  result.layoutCode = result.layoutProperties.map(p => p.raw).join(', ')
  result.typographyCode = result.typographyProperties.map(p => p.raw).join(', ')
  result.preservedCode = result.otherProperties.map(p => p.raw).join(', ')

  // Legacy alias: combine layout + other as nonTypographyProperties
  result.nonTypographyProperties = [...result.layoutProperties, ...result.otherProperties]

  return result
}

/**
 * Check if a token is a known non-typography property key.
 */
function isKnownPropertyKey(token: string): boolean {
  const keys = new Set([
    // Layout
    'ver', 'hor', 'vertical', 'horizontal', 'grid', 'stacked',
    'cen', 'center', 'gap', 'g', 'between', 'wrap',
    'w', 'h', 'width', 'height', 'w-min', 'w-max', 'h-min', 'h-max',
    'pad', 'padding', 'mar', 'margin',
    // Visual
    'bg', 'background', 'bor', 'border', 'rad', 'radius',
    'opacity', 'o', 'shadow', 'cursor', 'z',
    // Typography (to detect boundaries)
    ...TYPOGRAPHY_PROPERTIES,
  ])
  return keys.has(token.toLowerCase())
}

// ============================================================================
// Hook
// ============================================================================

export function useTypographyPanel(editorRef: React.RefObject<EditorView | null>) {
  const [state, setState] = useState<TypographyPanelState>(initialState)
  const { returnFocus } = usePanelPosition(editorRef)

  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Open the typography panel at the current cursor position.
   */
  const open = useCallback((triggerKeyword?: string) => {
    if (stateRef.current.isOpen) return

    const view = editorRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    const line = view.state.doc.lineAt(cursorPos)
    const parsed = parseTypographyProperties(line.text)

    const lineFrom = line.from
    const triggerPos = lineFrom + parsed.componentNameEnd
    const endPos = line.to

    const initialCode = parsed.typographyCode || triggerKeyword || ''

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      triggerPos,
      replaceRange: { from: triggerPos, to: endPos },
      initialCode,
      layoutCode: parsed.layoutCode,
      stringContent: parsed.stringContent,
      preservedCode: parsed.preservedCode,
      componentName: parsed.componentName,
    })
  }, [editorRef])

  /**
   * Open for editing existing typography properties.
   */
  const openForEdit = useCallback((_code: string, from: number, _to: number) => {
    if (stateRef.current.isOpen) return

    const view = editorRef.current
    if (!view) return

    const coords = view.coordsAtPos(from)
    if (!coords) return

    const line = view.state.doc.lineAt(from)
    const parsed = parseTypographyProperties(line.text)

    const lineFrom = line.from
    const triggerPos = lineFrom + parsed.componentNameEnd
    const endPos = line.to

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      triggerPos,
      replaceRange: { from: triggerPos, to: endPos },
      initialCode: parsed.typographyCode,
      layoutCode: parsed.layoutCode,
      stringContent: parsed.stringContent,
      preservedCode: parsed.preservedCode,
      componentName: parsed.componentName,
    })
  }, [editorRef])

  /**
   * Close the panel.
   */
  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      replaceRange: null,
      layoutCode: '',
      stringContent: '',
      preservedCode: '',
      componentName: '',
    }))
    returnFocus()
  }, [returnFocus])

  /**
   * Select typography code and close.
   * Output order: layoutCode, stringContent, typographyCode, preservedCode (other)
   */
  const selectTypography = useCallback((code: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, replaceRange, layoutCode, stringContent, preservedCode } = stateRef.current
    const cursorPos = view.state.selection.main.head

    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : cursorPos

    // Build final code in correct order: layout, string, typography, other
    const parts: string[] = []
    if (layoutCode) parts.push(layoutCode)
    if (stringContent) parts.push(stringContent)
    if (code) parts.push(code)
    if (preservedCode) parts.push(preservedCode)

    const finalCode = ' ' + parts.join(', ')

    view.dispatch({
      changes: { from, to, insert: finalCode },
      selection: { anchor: from + finalCode.length },
    })

    close()
  }, [editorRef, close])

  /**
   * Update code live without closing.
   * Output order: layoutCode, stringContent, typographyCode, preservedCode (other)
   */
  const updateCode = useCallback((code: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, replaceRange, layoutCode, stringContent, preservedCode } = stateRef.current

    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : view.state.selection.main.head

    // Build final code in correct order: layout, string, typography, other
    const parts: string[] = []
    if (layoutCode) parts.push(layoutCode)
    if (stringContent) parts.push(stringContent)
    if (code) parts.push(code)
    if (preservedCode) parts.push(preservedCode)

    const finalCode = ' ' + parts.join(', ')

    view.dispatch({
      changes: { from, to, insert: finalCode },
      selection: { anchor: from + finalCode.length },
    })

    setState(prev => ({
      ...prev,
      replaceRange: { from, to: from + finalCode.length },
    }))
  }, [editorRef])

  const getStateRef = useCallback(() => stateRef, [])

  return {
    state,
    setState,
    stateRef,
    open,
    openForEdit,
    close,
    selectTypography,
    updateCode,
    getStateRef,
  }
}

/**
 * Check if text ends with a typography trigger keyword.
 */
export function getTypographyTrigger(text: string): string | null {
  const trimmed = text.trimEnd()
  for (const trigger of TYPOGRAPHY_TRIGGERS) {
    if (trimmed.endsWith(trigger)) {
      const before = trimmed.slice(0, -trigger.length)
      if (before === '' || /[\s,]$/.test(before)) {
        return trigger
      }
    }
  }
  return null
}
