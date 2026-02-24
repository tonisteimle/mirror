/**
 * CSS Cleanup Fixes
 *
 * Phase 0: Remove CSS artifacts that LLMs often include.
 */

import type { Fix } from '../types'

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Remove CSS !important declarations.
 */
export function removeImportant(code: string): string {
  return code.replace(/\s*!important/gi, '')
}

/**
 * Fix CSS transition/animation syntax.
 * Mirror handles transitions automatically, so remove them.
 */
export function removeCssTransitions(code: string): string {
  return code.replace(/\btransition\s+[^"\n]+(?=\s|$|")/gi, '')
}

/**
 * Remove CSS calc() expressions - simplify to first number.
 */
export function removeCalcExpressions(code: string): string {
  return code.replace(/calc\s*\((?:[^()]+|\([^()]*\))*\)/gi, (match) => {
    const numMatch = match.match(/(\d+)(?:px|%)?/)
    if (numMatch) {
      return numMatch[1]
    }
    return 'full'
  })
}

/**
 * Fix CSS "none" values that Mirror doesn't understand.
 */
export function fixCssNoneValues(code: string): string {
  return code.split('\n').map(line => {
    const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? ''
    let content = line.slice(leadingWhitespace.length)

    content = content.replace(/\bborder\s+none\b/gi, 'border 0')
    content = content.replace(/\boutline\s+none\b/gi, '')
    content = content.replace(/\bbox-shadow\s+none\b/gi, '')
    content = content.replace(/  +/g, ' ').trim()

    return leadingWhitespace + content
  }).join('\n')
}

/**
 * Convert CSS property names to Mirror shortcuts.
 * e.g., background-color: → bg, font-size: → fs
 */
export function convertCssPropertyNames(code: string): string {
  const cssToMirror: Record<string, string> = {
    'background-color': 'bg',
    'background': 'bg',
    'color': 'col',
    'font-size': 'fs',
    'font-weight': 'weight',
    'font-family': 'font',
    'border-radius': 'rad',
    'border-color': 'boc',
    'border-width': 'bor',
    'line-height': 'line',
    'text-align': 'align',
    'box-shadow': 'shadow',
    'padding': 'pad',
    'padding-left': 'pad left',
    'padding-right': 'pad right',
    'padding-top': 'pad top',
    'padding-bottom': 'pad bottom',
    'margin': 'margin',
    'gap': 'gap',
    'opacity': 'opacity',
    'width': 'width',
    'height': 'height',
    'radius': 'rad',
  }

  let result = code
  for (const [cssName, mirrorName] of Object.entries(cssToMirror)) {
    // Match: property-name: value or property-name value
    const pattern = new RegExp(`\\b${cssName}\\s*:\\s*`, 'gi')
    result = result.replace(pattern, `${mirrorName} `)
  }
  return result
}

/**
 * Convert camelCase CSS properties to Mirror shortcuts.
 * e.g., backgroundColor → bg, fontSize → fs
 */
export function convertCamelCaseProperties(code: string): string {
  const camelToMirror: Record<string, string> = {
    'backgroundColor': 'bg',
    'borderRadius': 'rad',
    'borderColor': 'boc',
    'borderWidth': 'bor',
    'fontSize': 'fs',
    'fontWeight': 'weight',
    'fontFamily': 'font',
    'lineHeight': 'line',
    'textAlign': 'align',
    'boxShadow': 'shadow',
    'paddingLeft': 'pad left',
    'paddingRight': 'pad right',
    'paddingTop': 'pad top',
    'paddingBottom': 'pad bottom',
    'marginLeft': 'margin left',
    'marginRight': 'margin right',
    'marginTop': 'margin top',
    'marginBottom': 'margin bottom',
    'minWidth': 'min-width',
    'maxWidth': 'max-width',
    'minHeight': 'min-height',
    'maxHeight': 'max-height',
    'flexDirection': '', // Remove, Mirror uses hor/ver
    'alignItems': '', // Remove
    'justifyContent': '', // Remove
    'flexGrow': 'width full', // flex-grow: 1 → width full
    'flexShrink': '', // Remove
  }

  let result = code
  for (const [camel, mirror] of Object.entries(camelToMirror)) {
    if (mirror) {
      // Replace camelCase property with Mirror equivalent
      const pattern = new RegExp(`\\b${camel}\\s*[=:]\\s*`, 'gi')
      result = result.replace(pattern, `${mirror} `)
    } else {
      // Remove the property entirely (with its value)
      const pattern = new RegExp(`\\b${camel}\\s*[=:]\\s*[^,;\\n]+[,;]?\\s*`, 'gi')
      result = result.replace(pattern, '')
    }
  }
  return result
}

/**
 * Remove colons after property names (CSS-style).
 */
export function removePropertyColons(code: string): string {
  const props = [
    'padding', 'pad', 'p',
    'margin', 'mar', 'm',
    'background', 'bg',
    'color', 'col', 'c',
    'border', 'bor',
    'border-color', 'boc',
    'radius', 'rad',
    'width', 'w',
    'height', 'h',
    'gap', 'g',
    'opacity', 'opa', 'o',
    'size', 'weight', 'font', 'line',
    'src', 'fit', 'shadow',
    'min-width', 'max-width', 'min-height', 'max-height',
    'minw', 'maxw', 'minh', 'maxh'
  ]

  let result = code
  for (const prop of props) {
    const pattern = new RegExp(`(\\s)(${prop}):\\s*(?=\\S)`, 'gi')
    result = result.replace(pattern, '$1$2 ')
  }

  return result
}

/**
 * Remove px suffix from numeric values.
 */
export function removePxSuffix(code: string): string {
  const parts: string[] = []
  let current = ''
  let inString = false

  for (let i = 0; i < code.length; i++) {
    const char = code[i]
    if (char === '"' && (i === 0 || code[i - 1] !== '\\')) {
      if (inString) {
        parts.push(current + char)
        current = ''
        inString = false
      } else {
        parts.push(current)
        current = char
        inString = true
      }
    } else {
      current += char
    }
  }
  parts.push(current)

  return parts.map((part, i) => {
    if (i % 2 === 1) return part
    // Match px followed by whitespace, end, quote, semicolon, or comma
    return part.replace(/(\d+)px(?=\s|$|"|;|,)/g, '$1')
  }).join('')
}

/**
 * Convert 100% width/height to full.
 */
export function convertPercentageToFull(code: string): string {
  let result = code
  result = result.replace(/\b(width|height)\s+100\s*%/gi, '$1 full')
  result = result.replace(/\b(width)\s+100vw\b/gi, '$1 full')
  result = result.replace(/\b(height)\s+100vh\b/gi, '$1 full')
  return result
}

/**
 * Remove CSS units (em, rem, vh, vw) where not supported.
 */
export function removeUnsupportedUnits(code: string): string {
  let result = code

  // Convert rem to px (assuming 1rem = 16px)
  result = result.replace(/(\d+(?:\.\d+)?)\s*rem(?=\s|$|")/gi, (_, val) => {
    return String(Math.round(parseFloat(val) * 16))
  })

  // Convert em to px
  result = result.replace(/(\d+(?:\.\d+)?)\s*em(?=\s|$|")/gi, (_, val) => {
    return String(Math.round(parseFloat(val) * 16))
  })

  // Convert vh/vw to percentage
  result = result.replace(/(\d+)\s*vh(?=\s|$|")/gi, '$1%')
  result = result.replace(/(\d+)\s*vw(?=\s|$|")/gi, '$1%')

  return result
}

// =============================================================================
// Exported Fixes
// =============================================================================

export const cssCleanupFixes: Fix[] = [
  {
    name: 'removeImportant',
    fn: removeImportant,
    phase: 'css-cleanup',
    description: 'Remove CSS !important declarations',
  },
  {
    name: 'removeCssTransitions',
    fn: removeCssTransitions,
    phase: 'css-cleanup',
    description: 'Remove CSS transition properties',
  },
  {
    name: 'removeCalcExpressions',
    fn: removeCalcExpressions,
    phase: 'css-cleanup',
    description: 'Simplify CSS calc() expressions',
  },
  {
    name: 'fixCssNoneValues',
    fn: fixCssNoneValues,
    phase: 'css-cleanup',
    description: 'Convert CSS none values to Mirror equivalents',
  },
  {
    name: 'convertCssPropertyNames',
    fn: convertCssPropertyNames,
    phase: 'css-cleanup',
    description: 'Convert CSS property names to Mirror shortcuts',
  },
  {
    name: 'convertCamelCaseProperties',
    fn: convertCamelCaseProperties,
    phase: 'css-cleanup',
    description: 'Convert camelCase CSS properties to Mirror shortcuts',
  },
  {
    name: 'removePropertyColons',
    fn: removePropertyColons,
    phase: 'css-cleanup',
    description: 'Remove CSS-style colons after property names',
  },
  {
    name: 'removePxSuffix',
    fn: removePxSuffix,
    phase: 'css-cleanup',
    description: 'Remove px suffix from numeric values',
  },
  {
    name: 'convertPercentageToFull',
    fn: convertPercentageToFull,
    phase: 'css-cleanup',
    description: 'Convert 100% width/height to full',
  },
  {
    name: 'removeUnsupportedUnits',
    fn: removeUnsupportedUnits,
    phase: 'css-cleanup',
    description: 'Convert CSS units (em, rem, vh, vw) to supported formats',
  },
]
