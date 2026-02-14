/**
 * Color Swatches for CodeMirror
 *
 * Displays inline color swatches next to hex color values and design tokens.
 * Clicking a swatch opens the color picker for that value.
 */

import { WidgetType, Decoration, ViewPlugin, EditorView } from '@codemirror/view'
import type { DecorationSet } from '@codemirror/view'
import type { Range } from '@codemirror/state'

/** Configuration for the color swatch plugin */
export interface ColorSwatchConfig {
  /** Callback when a swatch is clicked */
  onSwatchClick: (start: number, end: number, color: string) => void
  /** Function to get current design tokens */
  getDesignTokens: () => Map<string, unknown>
}

/**
 * Widget that displays a small colored square.
 */
class ColorSwatchWidget extends WidgetType {
  private color: string
  private valueStart: number
  private valueEnd: number
  private onClick: (start: number, end: number, color: string) => void

  constructor(
    color: string,
    valueStart: number,
    valueEnd: number,
    onClick: (start: number, end: number, color: string) => void
  ) {
    super()
    this.color = color
    this.valueStart = valueStart
    this.valueEnd = valueEnd
    this.onClick = onClick
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'cm-color-swatch'
    span.style.cssText = `
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      background: ${this.color};
      border: 1px solid #666;
      cursor: pointer;
      margin-left: 4px;
      vertical-align: middle;
    `
    span.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.onClick(this.valueStart, this.valueEnd, this.color)
    }
    return span
  }

  eq(other: ColorSwatchWidget): boolean {
    return this.color === other.color && this.valueStart === other.valueStart
  }
}

/** Regex patterns for color detection */
const HEX_COLOR_REGEX = /#[0-9a-fA-F]{3,8}\b/g
const TOKEN_REGEX = /\$([a-zA-Z_][a-zA-Z0-9_.-]*)/g
const TOKEN_DEF_REGEX = /^\s*\$[a-zA-Z_][a-zA-Z0-9_.-]*\s*:/

/**
 * Check if a token value is a color.
 * Handles both direct hex values and nested color objects.
 */
function resolveTokenColor(tokenValue: unknown): string | null {
  if (typeof tokenValue === 'string') {
    // Direct hex value
    if (/^#[0-9a-fA-F]{3,8}$/.test(tokenValue)) {
      return tokenValue
    }
    return null
  }

  if (tokenValue && typeof tokenValue === 'object') {
    // Check for common color object patterns
    const obj = tokenValue as Record<string, unknown>

    // If it has a 'value' property that's a color
    if (typeof obj.value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(obj.value)) {
      return obj.value
    }

    // If it has a 'color' property
    if (typeof obj.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(obj.color)) {
      return obj.color
    }
  }

  return null
}

/**
 * Build decorations for visible color swatches.
 */
function buildDecorations(
  view: EditorView,
  config: ColorSwatchConfig
): DecorationSet {
  const decorations: Range<Decoration>[] = []
  const tokens = config.getDesignTokens()

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to)

    // Find hex colors (but skip those in token definitions)
    HEX_COLOR_REGEX.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = HEX_COLOR_REGEX.exec(text)) !== null) {
      const start = from + match.index
      const end = start + match[0].length
      const color = match[0]

      // Check if this hex color is part of a token definition line
      // If so, skip it (the token itself will show the swatch)
      const line = view.state.doc.lineAt(start)
      const lineText = line.text
      if (TOKEN_DEF_REGEX.test(lineText)) {
        continue
      }

      const widget = Decoration.widget({
        widget: new ColorSwatchWidget(color, start, end, config.onSwatchClick),
        side: 1, // After the color value
      })
      decorations.push(widget.range(end))
    }

    // Find design tokens
    TOKEN_REGEX.lastIndex = 0
    while ((match = TOKEN_REGEX.exec(text)) !== null) {
      const tokenName = match[1]
      const tokenValue = tokens.get(tokenName)
      const resolvedColor = resolveTokenColor(tokenValue)

      if (resolvedColor) {
        const start = from + match.index
        const end = start + match[0].length

        const widget = Decoration.widget({
          widget: new ColorSwatchWidget(resolvedColor, start, end, config.onSwatchClick),
          side: 1,
        })
        decorations.push(widget.range(end))
      }
    }
  }

  // Sort decorations by position
  decorations.sort((a, b) => a.from - b.from)

  return Decoration.set(decorations)
}

/**
 * Create a ViewPlugin that displays color swatches.
 */
export function createColorSwatchPlugin(config: ColorSwatchConfig) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, config)
      }

      update(update: { docChanged: boolean; viewportChanged: boolean; view: EditorView }) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, config)
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    }
  )
}
