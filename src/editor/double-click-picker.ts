/**
 * Double-click Picker Extension
 *
 * Opens the appropriate picker (color, icon, font) when double-clicking on a value.
 * - Double-click on #RRGGBB → Color Picker
 * - Double-click on "icon-name" after icon keyword → Icon Picker
 * - Double-click on "font-name" after font keyword → Font Picker
 */

import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { LAYOUT_PROPERTIES, findLayoutRange } from '../hooks/useLayoutPanel'
import { TYPOGRAPHY_PROPERTIES, parseTypographyProperties } from '../hooks/useTypographyPanel'
import { getPickerForType, type PickerType } from '../hooks/useEditorTriggers'

export interface DoubleClickPickerConfig {
  /** Called when double-clicking a color value. replaceAll=true when Alt is held */
  onColorDoubleClick: (color: string, from: number, to: number, propertyContext?: string, replaceAll?: boolean) => void
  /** Called when double-clicking an icon name */
  onIconDoubleClick: (iconName: string, from: number, to: number) => void
  /** Called when double-clicking a font name */
  onFontDoubleClick: (fontName: string, from: number, to: number) => void
  /** Called when double-clicking a token reference ($xxx). replaceAll=true when Alt is held */
  onTokenDoubleClick?: (tokenName: string, from: number, to: number, propertyContext?: string, replaceAll?: boolean) => void
  /** Called when double-clicking a layout property (optional) */
  onLayoutDoubleClick?: (code: string, from: number, to: number) => void
  /** Called when double-clicking a typography property (optional) */
  onTypographyDoubleClick?: (code: string, from: number, to: number) => void
  /** Called when double-clicking a component name/type (optional) */
  onComponentDoubleClick?: (componentName: string, pickerType: PickerType, lineFrom: number, lineTo: number) => void
}

// Regex patterns for detecting value types
const COLOR_PATTERN = /#[0-9A-Fa-f]{3,8}\b/
const TOKEN_PATTERN = /^\$[a-zA-Z][\w.-]*$/
const NUMBER_PATTERN = /^-?\d+$/
const STRING_PATTERN = /"([^"]*)"/

// Known color properties for context detection
const COLOR_PROPERTIES = new Set(['bg', 'col', 'color', 'background', 'boc', 'border-color'])

// Known number/spacing properties for context detection
const NUMBER_PROPERTIES = new Set([
  'pad', 'padding', 'mar', 'margin', 'gap', 'g',
  'rad', 'radius', 'width', 'w', 'height', 'h',
  'size', 'min-width', 'minw', 'max-width', 'maxw',
  'min-height', 'minh', 'max-height', 'maxh',
  'font-size', 'fs', 'icon-size', 'is', 'line',
  'z', 'opacity', 'o', 'rotate', 'rot'
])

/**
 * Find the token at the given position in the document.
 * Returns the token text, start and end positions, and the line content.
 */
function getTokenAtPosition(view: EditorView, pos: number): {
  text: string
  from: number
  to: number
  lineText: string
  lineFrom: number
} | null {
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text
  const lineFrom = line.from
  const posInLine = pos - lineFrom

  // Find word/token boundaries around cursor
  let from = posInLine
  let to = posInLine

  // Expand left - include # for colors and " for strings
  while (from > 0 && /[^\s,]/.test(lineText[from - 1])) {
    from--
  }

  // Expand right
  while (to < lineText.length && /[^\s,]/.test(lineText[to])) {
    to++
  }

  if (from === to) return null

  const text = lineText.slice(from, to)
  return {
    text,
    from: lineFrom + from,
    to: lineFrom + to,
    lineText,
    lineFrom,
  }
}

/**
 * Check if position is inside a string and return the string content and range.
 */
function getStringAtPosition(view: EditorView, pos: number): {
  content: string
  from: number
  to: number
  lineText: string
  stringStart: number  // Position in line where string starts
} | null {
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text
  const posInLine = pos - line.from

  // Find all strings in the line
  const stringRegex = /"([^"]*)"/g
  let match

  while ((match = stringRegex.exec(lineText)) !== null) {
    const stringStart = match.index
    const stringEnd = match.index + match[0].length

    // Check if position is inside this string (including quotes)
    if (posInLine >= stringStart && posInLine <= stringEnd) {
      return {
        content: match[1],
        from: line.from + stringStart,
        to: line.from + stringEnd,
        lineText,
        stringStart,
      }
    }
  }

  return null
}

/**
 * Check if a string is preceded by 'icon' keyword.
 */
function isIconString(lineText: string, stringStart: number): boolean {
  const textBefore = lineText.slice(0, stringStart).trimEnd()
  return /\bicon\s*$/.test(textBefore)
}

/**
 * Check if a string is preceded by 'font' keyword.
 */
function isFontString(lineText: string, stringStart: number): boolean {
  const textBefore = lineText.slice(0, stringStart).trimEnd()
  return /\bfont\s*$/.test(textBefore)
}

/**
 * Create the double-click picker extension.
 */
export function createDoubleClickPickerExtension(config: DoubleClickPickerConfig): Extension {
  return EditorView.domEventHandlers({
    dblclick: (event, view) => {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) return false

      // Check if clicking inside a string
      const stringInfo = getStringAtPosition(view, pos)
      if (stringInfo) {
        // Check if it's an icon string
        if (isIconString(stringInfo.lineText, stringInfo.stringStart)) {
          event.preventDefault()
          config.onIconDoubleClick(stringInfo.content, stringInfo.from, stringInfo.to)
          return true
        }

        // Check if it's a font string
        if (isFontString(stringInfo.lineText, stringInfo.stringStart)) {
          event.preventDefault()
          config.onFontDoubleClick(stringInfo.content, stringInfo.from, stringInfo.to)
          return true
        }

        return false
      }

      // Check if clicking on a color
      const token = getTokenAtPosition(view, pos)
      if (token && COLOR_PATTERN.test(token.text)) {
        event.preventDefault()
        // Detect property context from text before the color
        const textBefore = token.lineText.slice(0, token.from - token.lineFrom)
        const propMatch = textBefore.match(/\b(\w+)\s*$/)
        const propertyContext = propMatch ? propMatch[1] : undefined
        config.onColorDoubleClick(token.text, token.from, token.to, propertyContext, event.altKey)
        return true
      }

      // Check if clicking on a token reference ($xxx)
      if (token && TOKEN_PATTERN.test(token.text) && config.onTokenDoubleClick) {
        event.preventDefault()
        // Detect property context from text before the token
        const textBefore = token.lineText.slice(0, token.from - token.lineFrom)
        const propMatch = textBefore.match(/\b(\w+)\s*$/)
        const propertyContext = propMatch ? propMatch[1] : undefined
        config.onTokenDoubleClick(token.text, token.from, token.to, propertyContext, event.altKey)
        return true
      }

      // Check if clicking on a number (spacing value)
      if (token && NUMBER_PATTERN.test(token.text) && config.onTokenDoubleClick) {
        // Detect property context from text before the number
        const textBefore = token.lineText.slice(0, token.from - token.lineFrom)
        const propMatch = textBefore.match(/\b([\w-]+)\s+(?:[\w-]+\s+)*$/)
        const propertyContext = propMatch ? propMatch[1] : undefined

        // Only trigger for known number properties
        if (propertyContext && NUMBER_PROPERTIES.has(propertyContext)) {
          event.preventDefault()
          config.onTokenDoubleClick(token.text, token.from, token.to, propertyContext, event.altKey)
          return true
        }
      }

      // Check if clicking on a layout property
      if (token && config.onLayoutDoubleClick) {
        // Check if the token is a layout property
        const isLayoutProp = LAYOUT_PROPERTIES.some(prop =>
          token.text === prop || token.text.startsWith(prop + '-')
        )
        if (isLayoutProp) {
          // Find the full layout range on this line
          const layoutRange = findLayoutRange(token.lineText, token.lineFrom)
          if (layoutRange) {
            event.preventDefault()
            config.onLayoutDoubleClick(layoutRange.code, layoutRange.from, layoutRange.to)
            return true
          }
        }
      }

      // Check if clicking on a typography property
      if (token && config.onTypographyDoubleClick) {
        // Check if the token is a typography property
        const isTypoProp = TYPOGRAPHY_PROPERTIES.some(prop =>
          token.text.toLowerCase() === prop || token.text.toLowerCase().startsWith(prop)
        )
        if (isTypoProp) {
          // Parse the line to find typography code
          const parsed = parseTypographyProperties(token.lineText)
          if (parsed.typographyCode) {
            const from = token.lineFrom + parsed.componentNameEnd
            const to = token.lineFrom + token.lineText.length
            event.preventDefault()
            config.onTypographyDoubleClick(parsed.typographyCode, from, to)
            return true
          }
        }
      }

      // Check if clicking on a component name/type
      if (token && config.onComponentDoubleClick) {
        const lineText = token.lineText
        const line = view.state.doc.lineAt(pos)

        // Pattern 1: Component name at line start (e.g., "Button", "Card", "MyComponent")
        const lineStartMatch = lineText.match(/^\s*([A-Z][a-zA-Z0-9]*)(?:\s|$)/)
        if (lineStartMatch) {
          const componentName = lineStartMatch[1]
          const posInLine = pos - line.from
          const nameStart = lineText.indexOf(componentName)
          const nameEnd = nameStart + componentName.length

          // Check if click is on the component name
          if (posInLine >= nameStart && posInLine <= nameEnd) {
            const pickerType = getPickerForType(componentName) || 'default'
            event.preventDefault()
            config.onComponentDoubleClick(componentName, pickerType, line.from, line.to)
            return true
          }
        }

        // Pattern 2: "as Type" pattern (e.g., "Email as Input")
        const asTypeMatch = lineText.match(/\bas\s+([A-Z][a-zA-Z0-9]*)/)
        if (asTypeMatch) {
          const typeName = asTypeMatch[1]
          const posInLine = pos - line.from
          const typeStart = lineText.indexOf('as ' + typeName) + 3 // Skip "as "
          const typeEnd = typeStart + typeName.length

          // Check if click is on the type name
          if (posInLine >= typeStart && posInLine <= typeEnd) {
            const pickerType = getPickerForType(typeName) || 'default'
            event.preventDefault()
            config.onComponentDoubleClick(typeName, pickerType, line.from, line.to)
            return true
          }
        }
      }

      return false
    },
  })
}
