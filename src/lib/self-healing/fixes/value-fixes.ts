/**
 * Value Fixes
 *
 * Phase 5: Fix value-related issues (ranges, duplicates, formatting).
 */

import type { Fix } from '../types'

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Clamp opacity values to valid range (0-1).
 */
export function fixOpacityRange(code: string): string {
  return code.replace(
    /\b(opacity|opa|o)\s+(\d+(?:\.\d+)?)/gi,
    (match, prop, value) => {
      const num = parseFloat(value)
      if (num > 1) {
        // If > 1, assume it's a percentage (e.g., 50 means 0.5)
        if (num <= 100) {
          return `${prop} ${(num / 100).toFixed(2).replace(/\.?0+$/, '')}`
        }
        return `${prop} 1`
      }
      if (num < 0) {
        return `${prop} 0`
      }
      return match
    }
  )
}

/**
 * Fix negative values where not allowed (radius, padding, gap, etc.).
 */
export function fixNegativeValues(code: string): string {
  const positiveOnlyProps = [
    'radius', 'rad',
    'padding', 'pad', 'p',
    'gap', 'g',
    'width', 'w', 'height', 'h',
    'min-width', 'minw', 'max-width', 'maxw',
    'min-height', 'minh', 'max-height', 'maxh',
    'size', 'font-size', 'fs',
    'border', 'bor',
    'icon-size', 'is',
  ]

  let result = code
  for (const prop of positiveOnlyProps) {
    const pattern = new RegExp(`\\b(${prop})\\s+(-)(\\d+(?:\\.\\d+)?)`, 'gi')
    result = result.replace(pattern, '$1 $3')
  }

  return result
}

/**
 * Remove duplicate properties on the same line (keep last).
 */
export function removeDuplicateProperties(code: string): string {
  return code.split('\n').map(line => {
    // Skip lines that are just strings or comments
    if (/^\s*"/.test(line) || /^\s*\/\//.test(line)) {
      return line
    }

    const indent = line.match(/^(\s*)/)?.[1] ?? ''
    const content = line.slice(indent.length)

    // Extract component name and rest
    const componentMatch = content.match(/^([A-Z][a-zA-Z0-9]*:?\s*)(.*)$/)
    if (!componentMatch) return line

    const [, componentPart, propsPart] = componentMatch

    // Track seen properties
    const seenProps = new Map<string, string>()
    const tokens: string[] = []
    let current = ''
    let inString = false

    // Tokenize the properties part
    for (let i = 0; i < propsPart.length; i++) {
      const char = propsPart[i]
      if (char === '"' && (i === 0 || propsPart[i - 1] !== '\\')) {
        inString = !inString
        current += char
      } else if (!inString && (char === ' ' || char === ',')) {
        if (current.trim()) {
          tokens.push(current.trim())
        }
        if (char === ',') tokens.push(',')
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim()) tokens.push(current.trim())

    // Rebuild with duplicates removed
    const result: string[] = []
    const propPattern = /^([a-z][a-z-]*)/i

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token === ',') {
        result.push(token)
        continue
      }

      const propMatch = token.match(propPattern)
      if (propMatch) {
        const propName = propMatch[1].toLowerCase()
        // Check if this prop has a value following
        let fullProp = token
        let j = i + 1

        // Skip comma if present
        if (tokens[j] === ',') j++

        // Check if next token is a value (starts with #, $, digit, or ")
        if (j < tokens.length && /^[#$\d"]/.test(tokens[j])) {
          // This is a property with value
          seenProps.set(propName, `${token} ${tokens[j]}`)
          i = j
          continue
        } else {
          // Boolean property or property without value
          seenProps.set(propName, token)
        }
      } else {
        // Not a property, just add it
        result.push(token)
      }
    }

    // Add unique properties
    const props = Array.from(seenProps.values())
    const allParts = [...props, ...result].filter(p => p !== ',')

    return indent + componentPart + allParts.join(' ')
  }).join('\n')
}

/**
 * Remove trailing commas at end of lines.
 */
export function removeTrailingCommas(code: string): string {
  return code.split('\n').map(line => {
    // Don't modify lines that are just strings
    if (/^\s*".*"\s*$/.test(line)) return line

    // Remove trailing comma (with optional whitespace)
    return line.replace(/,\s*$/, '')
  }).join('\n')
}

/**
 * Fix percentage written as word.
 */
export function fixPercentageWord(code: string): string {
  return code
    .replace(/(\d+)\s+percent\b/gi, '$1%')
    .replace(/(\d+)\s+prozent\b/gi, '$1%')
}

/**
 * Remove excessive empty lines (3+ → 1).
 */
export function removeExcessiveEmptyLines(code: string): string {
  return code.replace(/\n{3,}/g, '\n\n')
}

/**
 * Fix component names starting with lowercase.
 */
export function fixComponentCasing(code: string): string {
  const builtInComponents = [
    'box', 'text', 'button', 'input', 'image', 'icon', 'link',
    'container', 'card', 'stack', 'row', 'column', 'grid',
    'textarea', 'segment', 'divider', 'spacer', 'header', 'footer',
    'sidebar', 'nav', 'section', 'article', 'list'
  ]

  return code.split('\n').map(line => {
    const indent = line.match(/^(\s*)/)?.[1] ?? ''
    let content = line.slice(indent.length)

    // Check if line starts with a lowercase component name
    for (const comp of builtInComponents) {
      const pattern = new RegExp(`^(${comp})(?=\\s|:|$)`, 'i')
      const match = content.match(pattern)
      if (match && match[1].toLowerCase() === match[1]) {
        // It's lowercase, capitalize it
        const capitalized = match[1].charAt(0).toUpperCase() + match[1].slice(1)
        content = content.replace(pattern, capitalized)
        break
      }
    }

    return indent + content
  }).join('\n')
}

/**
 * Remove colon after event names.
 */
export function fixEventColon(code: string): string {
  const events = [
    'onclick', 'onchange', 'oninput', 'onfocus', 'onblur',
    'onhover', 'onkeydown', 'onkeyup', 'onload', 'onclick-outside'
  ]

  let result = code
  for (const event of events) {
    // Remove colon after event (but not if followed by space and valid syntax)
    const pattern = new RegExp(`\\b(${event}):\\s*(?=[a-z])`, 'gi')
    result = result.replace(pattern, '$1 ')
  }

  return result
}

// =============================================================================
// Exported Fixes
// =============================================================================

export const valueFixes: Fix[] = [
  {
    name: 'fixOpacityRange',
    fn: fixOpacityRange,
    phase: 'value',
    description: 'Clamp opacity values to 0-1 range',
  },
  {
    name: 'fixNegativeValues',
    fn: fixNegativeValues,
    phase: 'value',
    description: 'Remove negative sign from properties that require positive values',
  },
  {
    name: 'removeTrailingCommas',
    fn: removeTrailingCommas,
    phase: 'value',
    description: 'Remove trailing commas at end of lines',
  },
  {
    name: 'fixPercentageWord',
    fn: fixPercentageWord,
    phase: 'value',
    description: 'Convert "percent" word to % symbol',
  },
  {
    name: 'removeExcessiveEmptyLines',
    fn: removeExcessiveEmptyLines,
    phase: 'value',
    description: 'Reduce 3+ empty lines to single empty line',
  },
  {
    name: 'fixComponentCasing',
    fn: fixComponentCasing,
    phase: 'value',
    description: 'Capitalize component names',
  },
  {
    name: 'fixEventColon',
    fn: fixEventColon,
    phase: 'value',
    description: 'Remove colon after event names',
  },
  {
    name: 'removeDuplicateProperties',
    fn: removeDuplicateProperties,
    phase: 'value',
    description: 'Remove duplicate properties (keep last)',
  },
]
