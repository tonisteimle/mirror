/**
 * Structural Fixes
 *
 * Phase 4: Fix code structure issues.
 */

import type { Fix } from '../types'

// =============================================================================
// Fix Functions
// =============================================================================

/**
 * Remove curly braces around property blocks.
 * e.g., Button { bg #333 } → Button bg #333
 * Only removes braces on single lines, preserves multi-line structure and indentation.
 */
export function removeCurlyBraces(code: string): string {
  // Only remove braces on single-line patterns, preserve indentation and newlines
  return code.split('\n').map(line => {
    // Preserve leading whitespace
    const leadingWhitespace = line.match(/^(\s*)/)?.[1] || ''
    const content = line.slice(leadingWhitespace.length)
    // Remove { content } on same line
    const fixed = content.replace(/\s*\{([^{}\n]*)\}\s*/g, ' $1 ').replace(/ +/g, ' ').trim()
    return leadingWhitespace + fixed
  }).join('\n')
}

/**
 * Convert semicolons to commas and remove trailing ones.
 */
export function fixSemicolons(code: string): string {
  return code
    .replace(/;/g, ',')
    .replace(/,\s*$/gm, '')
}

/**
 * Convert HTML tags to Mirror components.
 */
export function convertHtmlTags(code: string): string {
  let result = code

  // Convert common HTML tags to Mirror
  result = result.replace(/<div[^>]*>([^<]*)<\/div>/gi, 'Box "$1"')
  result = result.replace(/<span[^>]*>([^<]*)<\/span>/gi, 'Text "$1"')
  result = result.replace(/<p[^>]*>([^<]*)<\/p>/gi, 'Text "$1"')
  result = result.replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, 'Title "$1"')
  result = result.replace(/<a[^>]*>([^<]*)<\/a>/gi, 'Link "$1"')
  result = result.replace(/<img[^>]*>/gi, 'Image')
  result = result.replace(/<button[^>]*>([^<]*)<\/button>/gi, 'Button "$1"')
  result = result.replace(/<input[^>]*>/gi, 'Input')
  result = result.replace(/<textarea[^>]*>([^<]*)<\/textarea>/gi, 'Textarea "$1"')

  // Remove any remaining HTML-like tags
  result = result.replace(/<\/?[a-z][^>]*>/gi, '')

  return result
}

/**
 * Fix single quotes to double quotes.
 */
export function fixQuotes(code: string): string {
  // Convert single quotes to double quotes
  let result = code.replace(/'([^']+)'/g, '"$1"')
  // Convert backticks to double quotes
  result = result.replace(/`([^`]+)`/g, '"$1"')
  return result
}

/**
 * Fix Icon name="x" syntax to Icon "x".
 * Common mistake from HTML/React habits.
 */
export function fixIconNameAttribute(code: string): string {
  let result = code
  // Icon name="search" → Icon "search"
  result = result.replace(/\bIcon\s+name\s*=\s*"([^"]+)"/gi, 'Icon "$1"')
  // Icon name='search' → Icon "search"
  result = result.replace(/\bIcon\s+name\s*=\s*'([^']+)'/gi, 'Icon "$1"')
  // Icon name search → Icon "search" (without quotes)
  result = result.replace(/\bIcon\s+name\s+([a-z][a-z0-9-]*)\b/gi, 'Icon "$1"')
  return result
}

/**
 * Fix CSS flex shorthand to Mirror width full.
 * flex: 1 or flex 1 → width full
 */
export function fixFlexShorthand(code: string): string {
  let result = code
  // flex: 1 → width full
  result = result.replace(/\bflex\s*:\s*1\b/gi, 'width full')
  // flex 1 → width full
  result = result.replace(/\bflex\s+1\b/gi, 'width full')
  return result
}

/**
 * Fix hover/state inline comma syntax.
 * hover , bg #444 → hover bg #444
 * state selected , bg #333 → state selected bg #333
 */
export function fixStateInlineComma(code: string): string {
  // Remove comma after hover/focus/active/disabled and state keywords
  return code
    .replace(/\b(hover|focus|active|disabled)\s*,\s+/gi, '$1 ')
    .replace(/\b(state\s+\w+)\s*,\s+/gi, '$1 ')
}

/**
 * Remove CSS class syntax (.className) from components.
 * Button.primary bg #333 → Button bg #333
 */
export function removeCssClassSyntax(code: string): string {
  return code.replace(/\b([A-Z][a-zA-Z0-9]*)\.[a-zA-Z][a-zA-Z0-9-]*/g, '$1')
}

/**
 * Convert CSS margin shorthands (mt, mb, ml, mr, mx, my) to Mirror syntax.
 */
export function fixMarginShorthands(code: string): string {
  let result = code
  // mt 24 → margin top 24
  result = result.replace(/\bmt\s+(\d+)/gi, 'margin top $1')
  // mb 24 → margin bottom 24
  result = result.replace(/\bmb\s+(\d+)/gi, 'margin bottom $1')
  // ml 24 → margin left 24
  result = result.replace(/\bml\s+(\d+)/gi, 'margin left $1')
  // mr 24 → margin right 24
  result = result.replace(/\bmr\s+(\d+)/gi, 'margin right $1')
  // mx 24 → margin 0 24 (horizontal)
  result = result.replace(/\bmx\s+(\d+)/gi, 'margin 0 $1')
  // my 24 → margin 24 0 (vertical)
  result = result.replace(/\bmy\s+(\d+)/gi, 'margin $1 0')
  return result
}

/**
 * Convert CSS padding shorthands (pt, pb, pl, pr, px, py) to Mirror syntax.
 */
export function fixPaddingShorthands(code: string): string {
  let result = code
  // pt 24 → pad top 24
  result = result.replace(/\bpt\s+(\d+)/gi, 'pad top $1')
  // pb 24 → pad bottom 24
  result = result.replace(/\bpb\s+(\d+)/gi, 'pad bottom $1')
  // pl 24 → pad left 24
  result = result.replace(/\bpl\s+(\d+)/gi, 'pad left $1')
  // pr 24 → pad right 24
  result = result.replace(/\bpr\s+(\d+)/gi, 'pad right $1')
  // px 24 → pad 0 24 (horizontal)
  result = result.replace(/\bpx\s+(\d+)/gi, 'pad 0 $1')
  // py 24 → pad 24 0 (vertical)
  result = result.replace(/\bpy\s+(\d+)/gi, 'pad $1 0')
  return result
}

/**
 * Convert non-existent components to their Mirror equivalents.
 */
export function fixUnknownComponents(code: string): string {
  const componentMap: Record<string, string> = {
    'Form': 'Box',
    'Div': 'Box',
    'Span': 'Text',
    'P': 'Text',
    'H1': 'Title',
    'H2': 'Title',
    'H3': 'Title',
    'H4': 'Text',
    'H5': 'Text',
    'H6': 'Text',
    'Img': 'Image',
    'A': 'Link',
    'Ul': 'Box',
    'Ol': 'Box',
    'Li': 'Box',
    'Nav': 'Box',
    'Header': 'Box',
    'Footer': 'Box',
    'Main': 'Box',
    'Section': 'Box',
    'Article': 'Box',
    'Aside': 'Box',
    'Label': 'Text',
    // Layout containers
    'Stack': 'Box',
    'VStack': 'Box',
    'HStack': 'Box',
    'Flex': 'Box',
    'Grid': 'Box',
    'Container': 'Box',
    'View': 'Box',
    'Frame': 'Box',
    // React Native
    'ScrollView': 'Box',
    'SafeAreaView': 'Box',
    'TouchableOpacity': 'Box',
    'Pressable': 'Box',
  }

  let result = code
  for (const [from, to] of Object.entries(componentMap)) {
    const pattern = new RegExp(`^(\\s*)${from}(?=\\s|:|$)`, 'gm')
    result = result.replace(pattern, `$1${to}`)
  }
  return result
}

/**
 * Fix text content on separate line.
 */
export function fixTextOnSeparateLine(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    if (nextLine && /^\s+".+"$/.test(nextLine) && !line.includes('"')) {
      const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0

      if (nextIndent > currentIndent) {
        const stringContent = nextLine.trim()
        result.push(line + ' ' + stringContent)
        i++
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix dash prefix on single elements (should only be used for list items).
 */
export function fixSingleDashElement(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (/^-\s+\w/.test(line)) {
      const prevLine = lines[i - 1] || ''
      const nextLine = lines[i + 1] || ''
      const hasSiblingDash = /^-\s/.test(prevLine) || /^-\s/.test(nextLine)

      if (!hasSiblingDash) {
        result.push(line.replace(/^-\s+/, ''))
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix dimension shorthand in component definitions.
 */
export function fixDimensionShorthandInDefinition(code: string): string {
  return code.replace(
    /^(\s*)([A-Z][a-zA-Z0-9]*:\s+)(\d+(?:\.\d+)?(?:%)?)\s+(\d+(?:\.\d+)?(?:%)?)\s+(.*)$/gm,
    (match, indent, namePart, num1, num2, rest) => {
      if (!rest || /^[a-z]/.test(rest)) {
        return `${indent}${namePart}width ${num1} height ${num2} ${rest}`.trimEnd()
      }
      return match
    }
  ).replace(
    /^(\s*)([A-Z][a-zA-Z0-9]*:\s+)(\d+(?:\.\d+)?(?:%)?)\s+([a-z][a-zA-Z-]*)(.*)$/gm,
    (match, indent, namePart, num, propName, rest) => {
      if (propName && !['px', 'em', 'rem', 'vh', 'vw'].includes(propName)) {
        return `${indent}${namePart}width ${num} ${propName}${rest}`
      }
      return match
    }
  )
}

/**
 * Fix component definition and usage on same line.
 */
export function fixDefinitionAndUsageOnSameLine(code: string): string {
  return code.replace(
    /^(\s*)([A-Z][a-zA-Z]+):\s*((?:[a-z][a-zA-Z-]*\s+[^\s]+\s*)+)\s([A-Z][a-zA-Z]+)\s+(.+)$/gm,
    (match, indent, defName, defProps, useName, useRest) => {
      if (defName === useName) {
        return `${indent}${defName} ${defProps.trim()} ${useRest.trim()}`
      }
      return match
    }
  )
}

/**
 * Fix duplicate element names by converting to list items.
 */
export function fixDuplicateElementNames(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  const seenAtIndent = new Map<number, Map<string, number[]>>()

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const indentMatch = line.match(/^(\s*)/)
    const indent = indentMatch?.[1].length ?? 0

    const componentMatch = line.match(/^(\s*)([A-Z][a-zA-Z]*)(?:\s|$)/)
    if (componentMatch && !line.trim().startsWith('-')) {
      const componentName = componentMatch[2]

      if (!seenAtIndent.has(indent)) {
        seenAtIndent.set(indent, new Map())
      }
      const names = seenAtIndent.get(indent)!

      if (!names.has(componentName)) {
        names.set(componentName, [])
      }
      names.get(componentName)!.push(i)
    }
  }

  const duplicateLines = new Set<number>()
  for (const [, names] of Array.from(seenAtIndent)) {
    for (const [, lineNums] of Array.from(names)) {
      if (lineNums.length > 1) {
        lineNums.forEach(n => duplicateLines.add(n))
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (duplicateLines.has(i) && !line.trim().startsWith('-')) {
      const indentMatch = line.match(/^(\s*)(.*)$/)
      if (indentMatch) {
        result.push(`${indentMatch[1]}- ${indentMatch[2]}`)
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix property name and value split across lines.
 */
export function fixSplitPropertyLines(code: string): string {
  const propertyNames = [
    'border-color', 'boc', 'background', 'bg', 'color', 'col',
    'border', 'bor', 'padding', 'pad', 'margin', 'mar',
    'radius', 'rad', 'width', 'w', 'height', 'h',
    'opacity', 'opa', 'gap', 'size', 'weight', 'font',
    'min-width', 'max-width', 'min-height', 'max-height',
    'vertical', 'ver', 'horizontal', 'hor', 'center', 'cen',
    'between', 'wrap', 'grow', 'fill', 'shrink', 'stacked',
  ]

  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1]

    const trimmed = line.trim()
    if (nextLine && propertyNames.includes(trimmed)) {
      const nextTrimmed = nextLine.trim()
      if (/^(\$|#|\d)/.test(nextTrimmed)) {
        const indent = line.match(/^(\s*)/)?.[1] ?? ''
        result.push(`${indent}${trimmed} ${nextTrimmed}`)
        i++
        continue
      }
    }
    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix orphaned layout keywords on their own lines.
 */
export function fixOrphanedLayoutKeywords(code: string): string {
  const orphanedKeywords = new Set([
    'vertical', 'ver', 'horizontal', 'hor',
    'center', 'cen', 'between', 'wrap',
    'grow', 'fill', 'shrink', 'stacked',
    'gap', 'padding', 'pad', 'p', 'margin', 'mar', 'm',
    'background', 'bg', 'color', 'col',
    'radius', 'rad', 'border', 'bor',
    'width', 'w', 'height', 'h',
  ])

  const lines = code.split('\n')
  const result: string[] = []

  const findParentIndex = (currentIndent: number): number => {
    for (let j = result.length - 1; j >= 0; j--) {
      const lineIndent = result[j].match(/^(\s*)/)?.[1].length ?? 0
      if (lineIndent < currentIndent) {
        const firstWord = result[j].trim().split(/\s+/)[0]
        if (/^[A-Z]/.test(firstWord) || firstWord.endsWith(':')) {
          return j
        }
      }
    }
    return -1
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prevLine = result[result.length - 1]

    const trimmed = line.trim()
    const firstWord = trimmed.split(/\s+/)[0]

    if (/^[A-Z]/.test(firstWord) || firstWord.startsWith('$') || firstWord === 'state' ||
        firstWord === 'if' || firstWord === 'else' || firstWord === 'each' ||
        firstWord === 'events' || firstWord.startsWith('-') || firstWord.startsWith('"')) {
      result.push(line)
      continue
    }

    if (prevLine && orphanedKeywords.has(firstWord)) {
      const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
      const prevIndent = prevLine.match(/^(\s*)/)?.[1].length ?? 0

      const prevTrimmed = prevLine.trim()
      const prevFirstWord = prevTrimmed.split(/\s+/)[0]
      if (prevFirstWord === 'state') {
        result.push(line)
        continue
      }

      if (currentIndent > prevIndent) {
        result[result.length - 1] = prevLine + ' ' + trimmed
        continue
      }

      if (currentIndent === prevIndent || currentIndent < prevIndent) {
        const parentIdx = findParentIndex(currentIndent)
        if (parentIdx >= 0) {
          result[parentIdx] = result[parentIdx] + ' ' + trimmed
          continue
        }
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Fix orphaned numbers on their own lines.
 */
export function fixOrphanedNumbers(code: string): string {
  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!/^\d+$/.test(trimmed)) {
      result.push(line)
      continue
    }

    if (result.length > 0) {
      const prevLine = result[result.length - 1]
      const prevTrimmed = prevLine.trim()

      const propertyPattern = /\b(border|radius|padding|margin|gap|width|height|size|opacity|weight|border-color)$/i
      const partialValuePattern = /(border|radius)\s+\d+$/

      if (propertyPattern.test(prevTrimmed) || partialValuePattern.test(prevTrimmed)) {
        result[result.length - 1] = prevLine + ' ' + trimmed
        continue
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Remove HTML input type attributes that aren't Mirror properties.
 * e.g., type email, type password, type text → (removed)
 */
export function removeHtmlInputTypes(code: string): string {
  // Remove type="..." or type '...' or type ...
  let result = code
  // type="email" or type='password'
  result = result.replace(/\btype\s*=\s*["']([^"']+)["']/gi, '')
  // type email, type password (without quotes)
  result = result.replace(/\btype\s+(email|password|text|number|tel|url|search|date|time|datetime-local|month|week|file|hidden|submit|reset|button|checkbox|radio)\b/gi, '')
  // Clean up double spaces
  result = result.replace(/  +/g, ' ')
  return result
}

/**
 * Remove boolean true values from properties.
 * e.g., center true → center, disabled true → disabled
 */
export function removeBooleanTrue(code: string): string {
  const booleanProps = [
    'center', 'cen', 'vertical', 'ver', 'horizontal', 'hor',
    'spread', 'wrap', 'stacked', 'hidden', 'visible', 'disabled',
    'italic', 'underline', 'truncate', 'uppercase', 'lowercase',
    'fill', 'grow', 'shrink', 'clip', 'scroll',
  ]

  let result = code
  for (const prop of booleanProps) {
    // prop true → prop (with word boundary check)
    const pattern = new RegExp(`\\b(${prop})\\s+true\\b`, 'gi')
    result = result.replace(pattern, '$1')
  }
  return result
}

/**
 * Remove unsupported animation names.
 * e.g., shake, wiggle → (removed)
 */
export function removeUnsupportedAnimations(code: string): string {
  const unsupported = ['shake', 'wiggle', 'swing', 'tada', 'flash', 'rubberBand', 'jello', 'heartBeat']
  let result = code
  for (const anim of unsupported) {
    // animate shake → (remove entire property)
    result = result.replace(new RegExp(`\\banimate\\s+${anim}\\b[^,\\n]*,?\\s*`, 'gi'), '')
    // Just "shake" at end of line
    result = result.replace(new RegExp(`\\b${anim}\\b(?=\\s*$|\\s*,)`, 'gim'), '')
  }
  // Clean up trailing commas and spaces
  result = result.replace(/,\s*$/gm, '')
  result = result.replace(/  +/g, ' ')
  return result
}

/**
 * Fix border shorthand with lowercase hex.
 * e.g., border 1 #ddd → bor 1 #DDDDDD
 */
export function fixBorderShorthand(code: string): string {
  return code.replace(
    /\b(border|bor)\s+(\d+)\s+#([a-fA-F0-9]{3,6})/gi,
    (_, prop, width, hex) => {
      // Expand 3-char hex to 6-char
      let fullHex = hex.toUpperCase()
      if (fullHex.length === 3) {
        fullHex = fullHex[0] + fullHex[0] + fullHex[1] + fullHex[1] + fullHex[2] + fullHex[2]
      }
      return `bor ${width} #${fullHex}`
    }
  )
}

/**
 * Fix display property values.
 * display flex → hor, display none → hidden
 */
export function fixDisplayProperty(code: string): string {
  let result = code
  // display: flex or display flex → hor
  result = result.replace(/\bdisplay\s*:?\s*flex\b/gi, 'hor')
  // display: none → hidden
  result = result.replace(/\bdisplay\s*:?\s*none\b/gi, 'hidden')
  // display: block or inline-block → (remove, default behavior)
  result = result.replace(/\bdisplay\s*:?\s*(block|inline-block|inline)\b/gi, '')
  // display: grid → grid (already a Mirror keyword)
  result = result.replace(/\bdisplay\s*:?\s*grid\b/gi, 'grid')
  return result
}

/**
 * Fix position property to remove unsupported values.
 * position: absolute, position: fixed etc. → (removed)
 */
export function removePositionProperty(code: string): string {
  // Mirror doesn't support CSS positioning - remove it
  return code.replace(/\bposition\s*:?\s*(absolute|fixed|relative|sticky|static)\b[,;]?\s*/gi, '')
}

/**
 * Fix overflow property.
 * overflow: hidden → clip, overflow: scroll/auto → scroll
 */
export function fixOverflowProperty(code: string): string {
  let result = code
  result = result.replace(/\boverflow\s*:?\s*hidden\b/gi, 'clip')
  result = result.replace(/\boverflow\s*:?\s*(scroll|auto)\b/gi, 'scroll')
  result = result.replace(/\boverflow\s*:?\s*visible\b/gi, '')
  return result
}

/**
 * Remove CSS z-index with very large values.
 * z-index: 9999 → z 10
 */
export function fixZIndex(code: string): string {
  return code.replace(/\bz-index\s*:?\s*(\d+)/gi, (_, val) => {
    const num = parseInt(val, 10)
    // Normalize to reasonable range (1-100)
    if (num > 100) return 'z 10'
    if (num > 10) return `z ${Math.min(num, 100)}`
    return `z ${num}`
  })
}

/**
 * Fix cursor property.
 * cursor: pointer → cursor pointer
 */
export function fixCursorProperty(code: string): string {
  return code.replace(/\bcursor\s*:\s*/gi, 'cursor ')
}

// =============================================================================
// Exported Fixes
// =============================================================================

export const structuralFixes: Fix[] = [
  {
    name: 'removeCurlyBraces',
    fn: removeCurlyBraces,
    phase: 'structural',
    description: 'Remove curly braces around property blocks',
  },
  {
    name: 'fixSemicolons',
    fn: fixSemicolons,
    phase: 'structural',
    description: 'Convert semicolons to commas',
  },
  {
    name: 'convertHtmlTags',
    fn: convertHtmlTags,
    phase: 'structural',
    description: 'Convert HTML tags to Mirror components',
  },
  {
    name: 'fixQuotes',
    fn: fixQuotes,
    phase: 'structural',
    description: 'Convert single quotes and backticks to double quotes',
  },
  {
    name: 'fixIconNameAttribute',
    fn: fixIconNameAttribute,
    phase: 'structural',
    description: 'Convert Icon name="x" to Icon "x"',
  },
  {
    name: 'fixFlexShorthand',
    fn: fixFlexShorthand,
    phase: 'structural',
    description: 'Convert flex 1 to width full',
  },
  {
    name: 'fixOrphanedLayoutKeywords',
    fn: fixOrphanedLayoutKeywords,
    phase: 'structural',
    description: 'Merge orphaned layout keywords with parent component',
  },
  {
    name: 'fixSplitPropertyLines',
    fn: fixSplitPropertyLines,
    phase: 'structural',
    description: 'Merge property names and values split across lines',
  },
  {
    name: 'fixOrphanedNumbers',
    fn: fixOrphanedNumbers,
    phase: 'structural',
    description: 'Merge orphaned numbers with previous property',
  },
  {
    name: 'fixDimensionShorthandInDefinition',
    fn: fixDimensionShorthandInDefinition,
    phase: 'structural',
    description: 'Expand dimension shorthand in component definitions',
  },
  {
    name: 'fixDefinitionAndUsageOnSameLine',
    fn: fixDefinitionAndUsageOnSameLine,
    phase: 'structural',
    description: 'Merge component definition and usage on same line',
  },
  {
    name: 'fixDuplicateElementNames',
    fn: fixDuplicateElementNames,
    phase: 'structural',
    description: 'Add dash prefix to duplicate element names',
  },
  {
    name: 'fixTextOnSeparateLine',
    fn: fixTextOnSeparateLine,
    phase: 'structural',
    description: 'Merge text content from separate line',
  },
  {
    name: 'fixSingleDashElement',
    fn: fixSingleDashElement,
    phase: 'structural',
    description: 'Remove dash prefix from single elements',
  },
  {
    name: 'fixStateInlineComma',
    fn: fixStateInlineComma,
    phase: 'structural',
    description: 'Remove comma after hover/state keywords',
  },
  {
    name: 'removeCssClassSyntax',
    fn: removeCssClassSyntax,
    phase: 'structural',
    description: 'Remove CSS class syntax (.className) from components',
  },
  {
    name: 'fixMarginShorthands',
    fn: fixMarginShorthands,
    phase: 'structural',
    description: 'Convert CSS margin shorthands (mt, mb, ml, mr) to Mirror',
  },
  {
    name: 'fixPaddingShorthands',
    fn: fixPaddingShorthands,
    phase: 'structural',
    description: 'Convert CSS padding shorthands (pt, pb, pl, pr) to Mirror',
  },
  {
    name: 'fixUnknownComponents',
    fn: fixUnknownComponents,
    phase: 'structural',
    description: 'Convert non-Mirror components to equivalents',
  },
  {
    name: 'removeHtmlInputTypes',
    fn: removeHtmlInputTypes,
    phase: 'structural',
    description: 'Remove HTML input type attributes',
  },
  {
    name: 'removeBooleanTrue',
    fn: removeBooleanTrue,
    phase: 'structural',
    description: 'Remove boolean true from property values',
  },
  {
    name: 'removeUnsupportedAnimations',
    fn: removeUnsupportedAnimations,
    phase: 'structural',
    description: 'Remove unsupported animation names',
  },
  {
    name: 'fixBorderShorthand',
    fn: fixBorderShorthand,
    phase: 'structural',
    description: 'Normalize border shorthand with hex colors',
  },
  {
    name: 'fixDisplayProperty',
    fn: fixDisplayProperty,
    phase: 'structural',
    description: 'Convert CSS display values to Mirror equivalents',
  },
  {
    name: 'removePositionProperty',
    fn: removePositionProperty,
    phase: 'structural',
    description: 'Remove CSS position property',
  },
  {
    name: 'fixOverflowProperty',
    fn: fixOverflowProperty,
    phase: 'structural',
    description: 'Convert CSS overflow to Mirror equivalents',
  },
  {
    name: 'fixZIndex',
    fn: fixZIndex,
    phase: 'structural',
    description: 'Normalize z-index values',
  },
  {
    name: 'fixCursorProperty',
    fn: fixCursorProperty,
    phase: 'structural',
    description: 'Fix cursor property syntax',
  },
]
