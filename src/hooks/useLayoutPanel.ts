/**
 * useLayoutPanel Hook
 *
 * Manages inline layout panel state for the editor.
 * Triggered by: ver, hor, grid keywords or double-click on layout properties.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'

export interface LayoutPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  triggerPos: number
  /** Range to replace when editing existing layout */
  replaceRange: { from: number; to: number } | null
  /** Initial code for the picker (when editing existing layout) */
  initialCode: string
  /** String content like "Hello World" to preserve */
  stringContent: string
  /** Typography properties to preserve */
  typographyCode: string
  /** Other non-layout, non-typography properties to preserve */
  preservedCode: string
  /** The component name (for reconstruction) */
  componentName: string
}

const initialState: LayoutPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  replaceRange: null,
  initialCode: '',
  stringContent: '',
  typographyCode: '',
  preservedCode: '',
  componentName: '',
}

// Layout keywords that trigger the picker (including long forms)
// Longer words first to ensure correct matching
// This list is used for typing triggers (keyword + space opens panel)
export const LAYOUT_TRIGGERS = [
  // Direction
  'vertical', 'horizontal', 'ver', 'hor', 'grid', 'stacked',
  // Alignment - all forms
  'hor-center', 'ver-center',
  'center', 'cen',
  'hor-l', 'hor-cen', 'hor-r',
  'ver-t', 'ver-cen', 'ver-b',
  'left', 'right', 'top', 'bottom',
  // Sizing
  'width', 'height', 'size', 'w', 'h',
  'w-min', 'w-max', 'h-min', 'h-max',
  // Spacing
  'padding', 'pad', 'p', 'margin', 'mar', 'm',
  'gap', 'g',
  // Distribution
  'spread', 'between', 'wrap',
]

// All layout-related properties (for double-click detection)
export const LAYOUT_PROPERTIES = [
  // Direction
  'ver', 'hor', 'grid', 'vertical', 'horizontal', 'stacked',
  // Alignment - all forms
  'cen', 'center',
  'left', 'right', 'top', 'bottom',
  'hor-l', 'hor-cen', 'hor-r', 'hor-center',
  'ver-t', 'ver-cen', 'ver-b', 'ver-center',
  // Gap
  'gap', 'g',
  // Distribution
  'spread', 'between', 'wrap',
  // Size shorthand
  'size',
  // Size modes
  'w-min', 'w-max', 'h-min', 'h-max',
  // Size values
  'w', 'h', 'width', 'height',
  // Padding/Margin
  'pad', 'padding', 'p', 'mar', 'margin', 'm',
  // Background color
  'bg', 'background',
]

// ============================================================================
// Property-Aware Parsing
// ============================================================================

export interface ParsedLineProperties {
  componentName: string
  componentNameEnd: number // Position after component name
  dimensionShorthand: { width?: number; height?: number }
  layoutProperties: Array<{ key: string; value?: string; raw: string }>
  typographyProperties: Array<{ key: string; value?: string; raw: string }>
  otherProperties: Array<{ key: string; value?: string; raw: string }>
  /** The text content like "Hello World" */
  stringContent: string
  /** Combined layout code for the panel */
  layoutCode: string
  /** Combined typography code */
  typographyCode: string
  /** Combined other properties to preserve */
  preservedCode: string
  // Legacy alias
  nonLayoutProperties: Array<{ key: string; value?: string; raw: string }>
}

/**
 * Check if a property key is layout-related.
 */
function isLayoutProperty(key: string): boolean {
  const layoutKeys = new Set([
    // Direction
    'ver', 'hor', 'vertical', 'horizontal', 'grid', 'stacked',
    // Alignment - all forms
    'cen', 'center',
    'left', 'right', 'top', 'bottom',
    'hor-l', 'hor-cen', 'hor-r', 'hor-center',
    'ver-t', 'ver-cen', 'ver-b', 'ver-center',
    // Gap
    'gap', 'g',
    // Distribution
    'spread', 'between', 'wrap',
    // Size shorthand
    'size',
    // Size modes
    'w-min', 'w-max', 'h-min', 'h-max',
    // Size values
    'w', 'h', 'width', 'height',
    // Padding/Margin
    'pad', 'padding', 'p', 'mar', 'margin', 'm',
    // Background color (handled by layout panel)
    'bg', 'background',
  ])
  return layoutKeys.has(key.toLowerCase())
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
    // Common font weights as standalone keywords
    'thin', 'light', 'normal', 'medium', 'semibold', 'bold', 'extrabold', 'black',
  ])
  return typographyKeys.has(key.toLowerCase())
}

/**
 * Parse a line into structured properties.
 * Handles dimension shorthand, layout properties, typography properties, and other properties.
 */
export function parseLineProperties(lineText: string): ParsedLineProperties {
  const result: ParsedLineProperties = {
    componentName: '',
    componentNameEnd: 0,
    dimensionShorthand: {},
    layoutProperties: [],
    typographyProperties: [],
    otherProperties: [],
    stringContent: '',
    layoutCode: '',
    typographyCode: '',
    preservedCode: '',
    nonLayoutProperties: [], // Legacy alias, will be set at end
  }

  // Skip leading whitespace (indentation)
  const trimmedStart = lineText.match(/^(\s*)/)
  const indent = trimmedStart ? trimmedStart[1].length : 0
  const content = lineText.slice(indent)

  if (!content) return result

  // Extract component name (first identifier)
  const componentMatch = content.match(/^([A-Za-z_][A-Za-z0-9_-]*):?/)
  if (!componentMatch) return result

  result.componentName = componentMatch[1]
  result.componentNameEnd = indent + componentMatch[0].length

  // Get the rest of the line after component name
  let rest = content.slice(componentMatch[0].length).trim()

  // Check for dimension shorthand: first 1-2 bare numbers
  // Pattern: number followed by comma/space/property or end
  const dimensionPattern = /^(\d+(?:\.\d+)?(?:%)?)\s*,?\s*(\d+(?:\.\d+)?(?:%)?)?\s*,?\s*/
  const dimMatch = rest.match(dimensionPattern)

  if (dimMatch) {
    // Check if these are actually dimension shorthand (not part of a property)
    // They are dimension shorthand if they appear before any keyword
    const beforeMatch = rest.slice(0, dimMatch.index || 0)
    if (!beforeMatch.trim()) {
      // First number is width
      if (dimMatch[1]) {
        const widthVal = dimMatch[1]
        result.dimensionShorthand.width = widthVal.includes('%')
          ? parseFloat(widthVal)
          : parseInt(widthVal, 10)
        // Add to layout properties
        result.layoutProperties.push({
          key: 'w',
          value: widthVal,
          raw: `w ${widthVal}`,
        })
      }
      // Second number is height
      if (dimMatch[2]) {
        const heightVal = dimMatch[2]
        result.dimensionShorthand.height = heightVal.includes('%')
          ? parseFloat(heightVal)
          : parseInt(heightVal, 10)
        result.layoutProperties.push({
          key: 'h',
          value: heightVal,
          raw: `h ${heightVal}`,
        })
      }
      rest = rest.slice(dimMatch[0].length)
    }
  }

  // Parse remaining properties
  // First split by comma, then handle space-separated tokens within each part
  const commaParts = splitByComma(rest)

  for (const part of commaParts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Tokenize each comma-separated part by spaces (respecting quoted strings)
    const spaceTokens = tokenizeBySpace(trimmed)

    let i = 0
    while (i < spaceTokens.length) {
      const token = spaceTokens[i]

      // Check if it's a string (quoted) - capture as stringContent (only first one)
      if (token.startsWith('"') || token.startsWith("'")) {
        if (!result.stringContent) {
          result.stringContent = token
        } else {
          // Additional strings go to otherProperties
          result.otherProperties.push({ key: '', value: token, raw: token })
        }
        i++
        continue
      }

      // Check if it starts with # (color) - typically typography color
      if (token.startsWith('#')) {
        // Standalone hex color is likely typography color
        result.typographyProperties.push({ key: 'col', value: token, raw: token })
        i++
        continue
      }

      // Check if it's an identifier
      const keyMatch = token.match(/^([A-Za-z_][A-Za-z0-9_-]*)/)
      if (!keyMatch) {
        // Unknown token - preserve
        result.otherProperties.push({ key: '', value: token, raw: token })
        i++
        continue
      }

      const key = keyMatch[1]

      // Collect the value: could be in same token or following tokens
      let valueTokens: string[] = []
      let rawParts = [token]

      // Check if there's a value in the same token (e.g., "pad" vs "pad16" - unlikely, but handle)
      const inlineValue = token.slice(key.length).trim()
      if (inlineValue) {
        valueTokens.push(inlineValue)
      }

      // For properties that take values, peek ahead for number/color values
      const propsWithValues = new Set(['w', 'h', 'width', 'height', 'gap', 'g', 'pad', 'padding', 'mar', 'margin', 'grid', 'bg', 'background', 'col', 'color', 'bor', 'border', 'rad', 'radius', 'size', 'shadow', 'o', 'opacity', 'z', 'weight', 'line', 'font', 'boc', 'border-color'])

      if (propsWithValues.has(key.toLowerCase())) {
        // Collect following value tokens (numbers, colors, keywords)
        while (i + 1 < spaceTokens.length) {
          const nextToken = spaceTokens[i + 1]
          // Stop if next token is a known property keyword
          if (isLayoutProperty(nextToken) || isTypographyProperty(nextToken) || isKnownPropertyKey(nextToken)) {
            break
          }
          // Include numbers, percentages, hex colors, and style values
          if (/^[\d#]/.test(nextToken) || /^\d+%$/.test(nextToken) || isStyleValue(nextToken)) {
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
      } else {
        result.otherProperties.push({ key, value, raw })
      }

      i++
    }
  }

  // Build combined code strings
  result.layoutCode = result.layoutProperties.map(p => p.raw).join(', ')
  result.typographyCode = result.typographyProperties.map(p => p.raw).join(', ')
  result.preservedCode = result.otherProperties.map(p => p.raw).join(', ')

  // Legacy alias: combine typography + other as nonLayoutProperties
  result.nonLayoutProperties = [...result.typographyProperties, ...result.otherProperties]

  return result
}

/**
 * Split a string by commas, respecting quoted strings.
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

  if (current) {
    result.push(current)
  }

  return result
}

/**
 * Tokenize a string by spaces, respecting quoted strings.
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

  if (current) {
    result.push(current)
  }

  return result
}

/**
 * Check if a token is a known property key (non-layout).
 */
function isKnownPropertyKey(token: string): boolean {
  const nonLayoutKeys = new Set([
    // Colors
    'col', 'color', 'bg', 'background', 'boc', 'border-color',
    // Border
    'bor', 'border', 'rad', 'radius',
    // Typography
    'size', 'weight', 'line', 'font', 'align', 'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
    // Visuals
    'opacity', 'o', 'shadow', 'cursor', 'z', 'hidden', 'visible', 'disabled', 'rotate', 'rot', 'translate',
    // Also check layout properties
    ...LAYOUT_PROPERTIES,
  ])
  return nonLayoutKeys.has(token.toLowerCase())
}

/**
 * Check if a token is a style value (not a property key).
 */
function isStyleValue(token: string): boolean {
  const lower = token.toLowerCase()

  // Common style values
  const styleValues = new Set([
    // Border styles
    'solid', 'dashed', 'dotted', 'none',
    // Shadow sizes
    'sm', 'md', 'lg', 'xl',
    // Font weights
    'bold', 'normal', 'light', 'semibold',
    // Cursors
    'pointer', 'default', 'text', 'move', 'not-allowed',
    // Text align
    'left', 'right', 'center', 'justify',
  ])

  if (styleValues.has(lower)) return true

  // CSS named colors
  const cssColors = new Set([
    'black', 'silver', 'gray', 'grey', 'white', 'maroon', 'red', 'purple', 'fuchsia',
    'green', 'lime', 'olive', 'yellow', 'navy', 'blue', 'teal', 'aqua', 'orange',
    'aliceblue', 'antiquewhite', 'aquamarine', 'azure', 'beige', 'bisque', 'blanchedalmond',
    'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral',
    'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod',
    'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta', 'darkolivegreen',
    'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue',
    'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
    'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
    'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'greenyellow', 'honeydew', 'hotpink',
    'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen',
    'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray',
    'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon', 'lightseagreen', 'lightskyblue',
    'lightslategray', 'lightslategrey', 'lightsteelblue', 'lightyellow', 'limegreen', 'linen',
    'magenta', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen',
    'mediumslateblue', 'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue',
    'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'oldlace', 'olivedrab', 'orangered',
    'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip',
    'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'rosybrown', 'royalblue', 'saddlebrown',
    'salmon', 'sandybrown', 'seagreen', 'seashell', 'sienna', 'skyblue', 'slateblue', 'slategray',
    'slategrey', 'snow', 'springgreen', 'steelblue', 'tan', 'thistle', 'tomato', 'turquoise',
    'violet', 'wheat', 'whitesmoke', 'yellowgreen', 'transparent',
  ])

  return cssColors.has(lower)
}

export function useLayoutPanel(editorRef: React.RefObject<EditorView | null>) {
  const [state, setState] = useState<LayoutPanelState>(initialState)
  const { returnFocus } = usePanelPosition(editorRef)

  // Ref to access current state in closures
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Open the layout panel at the current cursor position.
   * Uses property-aware parsing to correctly identify layout vs non-layout properties.
   * @param triggerKeyword - The keyword that triggered opening (ver, hor, grid)
   */
  const open = useCallback((triggerKeyword?: string) => {
    if (stateRef.current.isOpen) {
      return
    }

    const view = editorRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    // Parse the line to extract layout and non-layout properties
    const line = view.state.doc.lineAt(cursorPos)
    const parsed = parseLineProperties(line.text)

    // Calculate positions relative to line start
    const lineFrom = line.from

    // Replace from after component name to end of line
    // This allows us to reconstruct with layout + preserved props
    const triggerPos = lineFrom + parsed.componentNameEnd
    const endPos = line.to

    // Use parsed layout code, or fallback to trigger keyword
    const initialCode = parsed.layoutCode || triggerKeyword || ''

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      triggerPos,
      replaceRange: { from: triggerPos, to: endPos },
      initialCode,
      stringContent: parsed.stringContent,
      typographyCode: parsed.typographyCode,
      preservedCode: parsed.preservedCode,
      componentName: parsed.componentName,
    })
  }, [editorRef])

  /**
   * Open the layout panel for editing existing layout properties (e.g., double-click).
   * Uses property-aware parsing to correctly separate layout and non-layout properties.
   * @param _code - The existing layout code (deprecated, now parsed from line)
   * @param from - Start position of the code
   * @param _to - End position of the code (deprecated, now calculated from line)
   */
  const openForEdit = useCallback((_code: string, from: number, _to: number) => {
    if (stateRef.current.isOpen) {
      return
    }

    const view = editorRef.current
    if (!view) return

    const coords = view.coordsAtPos(from)
    if (!coords) return

    // Parse the full line to get proper separation of properties
    const line = view.state.doc.lineAt(from)
    const parsed = parseLineProperties(line.text)

    const lineFrom = line.from
    const triggerPos = lineFrom + parsed.componentNameEnd
    const endPos = line.to

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      triggerPos,
      replaceRange: { from: triggerPos, to: endPos },
      initialCode: parsed.layoutCode,
      stringContent: parsed.stringContent,
      typographyCode: parsed.typographyCode,
      preservedCode: parsed.preservedCode,
      componentName: parsed.componentName,
    })
  }, [editorRef])

  /**
   * Close the layout panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      replaceRange: null,
      preservedCode: '',
      componentName: '',
    }))
    returnFocus()
  }, [returnFocus])

  /**
   * Handle layout code selection from the panel.
   * Combines layout code with preserved non-layout properties.
   * Output order: layoutCode, stringContent, typographyCode, preservedCode (other)
   */
  const selectLayout = useCallback((code: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, replaceRange, stringContent, typographyCode, preservedCode } = stateRef.current
    const cursorPos = view.state.selection.main.head

    // Determine what to replace
    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : cursorPos

    // Build final code in correct order: layout, string, typography, other
    const parts: string[] = []
    if (code) parts.push(code)
    if (stringContent) parts.push(stringContent)
    if (typographyCode) parts.push(typographyCode)
    if (preservedCode) parts.push(preservedCode)

    const finalCode = ' ' + parts.join(', ')

    view.dispatch({
      changes: { from, to, insert: finalCode },
      selection: { anchor: from + finalCode.length },
    })

    close()
  }, [editorRef, close])

  /**
   * Update the code in the editor without closing the panel (for live sync).
   * Combines layout code with preserved non-layout properties.
   * Output order: layoutCode, stringContent, typographyCode, preservedCode (other)
   * Updates the replaceRange to track the new code position.
   */
  const updateCode = useCallback((code: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, replaceRange, stringContent, typographyCode, preservedCode } = stateRef.current

    // Determine what to replace
    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : view.state.selection.main.head

    // Build final code in correct order: layout, string, typography, other
    const parts: string[] = []
    if (code) parts.push(code)
    if (stringContent) parts.push(stringContent)
    if (typographyCode) parts.push(typographyCode)
    if (preservedCode) parts.push(preservedCode)

    const finalCode = ' ' + parts.join(', ')

    view.dispatch({
      changes: { from, to, insert: finalCode },
      selection: { anchor: from + finalCode.length },
    })

    // Update replaceRange to track the new code position
    setState(prev => ({
      ...prev,
      replaceRange: { from, to: from + finalCode.length },
    }))
  }, [editorRef])

  /**
   * Get current state ref (for use in closures).
   */
  const getStateRef = useCallback(() => stateRef, [])

  return {
    state,
    setState,
    stateRef,
    open,
    openForEdit,
    close,
    selectLayout,
    updateCode,
    getStateRef,
  }
}

/**
 * Check if text ends with a layout trigger keyword.
 * Returns the keyword if found, null otherwise.
 */
export function getLayoutTrigger(text: string): string | null {
  const trimmed = text.trimEnd()
  for (const trigger of LAYOUT_TRIGGERS) {
    if (trimmed.endsWith(trigger)) {
      // Make sure it's a word boundary (not part of a larger word)
      const before = trimmed.slice(0, -trigger.length)
      if (before === '' || /[\s,]$/.test(before)) {
        return trigger
      }
    }
  }
  return null
}

/**
 * Find layout properties in a line of code.
 * Returns the range of all layout properties from the start of layout to end.
 */
export function findLayoutRange(lineText: string, lineFrom: number): { from: number; to: number; code: string } | null {
  // Find first layout property
  let firstIndex = -1
  let lastIndex = -1

  for (const prop of LAYOUT_PROPERTIES) {
    const regex = new RegExp(`\\b${prop}\\b`, 'g')
    let match
    while ((match = regex.exec(lineText)) !== null) {
      if (firstIndex === -1 || match.index < firstIndex) {
        firstIndex = match.index
      }
      const endIndex = match.index + match[0].length
      if (endIndex > lastIndex) {
        lastIndex = endIndex
      }
    }
  }

  if (firstIndex === -1) return null

  // Extend to include values after properties (numbers, etc.)
  // Look for the next non-layout content or end of significant content
  const remaining = lineText.slice(lastIndex)
  const valueMatch = remaining.match(/^[\s,]*(\d+)?/)
  if (valueMatch) {
    lastIndex += valueMatch[0].length
  }

  // Trim trailing commas and spaces
  let code = lineText.slice(firstIndex, lastIndex)
  code = code.replace(/[\s,]+$/, '')

  return {
    from: lineFrom + firstIndex,
    to: lineFrom + firstIndex + code.length,
    code,
  }
}
