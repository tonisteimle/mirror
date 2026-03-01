/**
 * Edge Case Arbitraries for Mirror DSL
 *
 * Generates edge cases that might break the parser:
 * - Unicode strings
 * - Extreme values
 * - Empty content
 * - Deep nesting
 * - Long lines
 * - Special characters
 */

import * as fc from 'fast-check'
import { componentName, anyComponentName } from './primitives'

// =============================================================================
// Unicode String Generators
// =============================================================================

/** Unicode characters (safe subset) */
const unicodeChar = fc.oneof(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  fc.constantFrom(...'0123456789'.split('')),
  fc.constantFrom(' ', '-', '_', '.', ',', '!', '?'),
  // Common accented characters
  fc.constantFrom('á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü'),
  fc.constantFrom('ä', 'ö', 'ß', 'ç', 'ê', 'î', 'ô'),
  // Common symbols
  fc.constantFrom('©', '®', '™', '°', '€', '£', '¥'),
  // Emojis (safe subset)
  fc.constantFrom('😀', '👍', '❤️', '✓', '★', '→', '←')
)

/** Unicode string */
export const unicodeString = fc.array(unicodeChar, { minLength: 1, maxLength: 30 })
  .map(chars => chars.join(''))
  .map(s => s.trim() || 'Text') // Ensure non-empty

/** Component with unicode text */
export const componentWithUnicode = fc.record({
  name: componentName,
  text: unicodeString
}).map(({ name, text }) => `${name} "${text}"`)

// =============================================================================
// Extreme Value Generators
// =============================================================================

/** Zero values */
export const zeroValue = fc.constantFrom(
  'Box pad 0',
  'Box gap 0',
  'Box rad 0',
  'Box opacity 0',
  'Box w 0',
  'Box h 0',
  'Box z 0'
)

/** Very large values */
export const largeValue = fc.record({
  property: fc.constantFrom('pad', 'gap', 'w', 'h', 'rad'),
  value: fc.integer({ min: 5000, max: 9999 })
}).map(({ property, value }) => `Box ${property} ${value}`)

/** Negative values (where allowed) */
export const negativeValue = fc.record({
  property: fc.constantFrom('z', 'margin', 'rotate'),
  value: fc.integer({ min: -1000, max: -1 })
}).map(({ property, value }) => `Box ${property} ${value}`)

/** Decimal values */
export const decimalValue = fc.record({
  property: fc.constantFrom('opacity', 'line', 'scale'),
  value: fc.double({ min: 0, max: 10, noNaN: true })
}).map(({ property, value }) => `Box ${property} ${value.toFixed(3)}`)

/** Percentage edge cases */
export const percentageEdgeCases = fc.constantFrom(
  'Box w 0%',
  'Box w 100%',
  'Box h 50%',
  'Box w 200%' // Potentially valid but unusual
)

// =============================================================================
// Empty/Minimal Content
// =============================================================================

/** Just component name */
export const bareComponent = componentName

/** Empty string content */
export const emptyStringContent = componentName.map(name => `${name} ""`)

/** Whitespace-only indented children */
export const whitespaceChildren = componentName.map(name =>
  `${name}\n  \n  `
)

// =============================================================================
// Deep Nesting
// =============================================================================

/** Deep nesting generator */
export function deeplyNestedComponent(depth: number): fc.Arbitrary<string> {
  return fc.constant(depth).map(d => {
    let code = ''
    let indent = ''
    for (let i = 0; i < d; i++) {
      code += `${indent}Box\n`
      indent += '  '
    }
    code += `${indent}Text "Deep"`
    return code
  })
}

/** Varying depth nesting */
export const varyingDepthNesting = fc.integer({ min: 5, max: 20 })
  .chain(depth => deeplyNestedComponent(depth))

/** Wide nesting (many siblings) */
export const wideNesting = fc.integer({ min: 10, max: 50 })
  .map(count => {
    let code = 'Container\n'
    for (let i = 0; i < count; i++) {
      code += `  Item "${i}"\n`
    }
    return code.trimEnd()
  })

// =============================================================================
// Long Lines
// =============================================================================

/** Very long property list */
export const longPropertyList = fc.integer({ min: 10, max: 20 })
  .map(count => {
    const props = []
    for (let i = 0; i < count; i++) {
      props.push(`pad ${i}`)
    }
    return `Box ${props.join(', ')}`
  })

/** Very long string */
export const longString = fc.integer({ min: 100, max: 500 })
  .map(length => {
    const text = 'a'.repeat(length)
    return `Text "${text}"`
  })

/** Many comma-separated values */
export const manyCommaValues = fc.integer({ min: 5, max: 15 })
  .map(count => {
    const values = Array.from({ length: count }, (_, i) => `#${(i * 111111).toString(16).slice(0, 6).padStart(6, '0')}`)
    return `Box bg ${values[0]}, col ${values[1] || '#FFF'}`
  })

// =============================================================================
// Special Characters in Strings
// =============================================================================

/** String with escaped quotes */
export const escapedQuotes = fc.constantFrom(
  'Text "He said hello"',
  'Text "It is working"',
  'Text "Line1 Line2"'
)

/** String with special characters */
export const specialCharString = fc.constantFrom(
  'Text "Hello & Goodbye"',
  'Text "50% off!"',
  'Text "Price: $100"',
  'Text "email@example.com"',
  'Text "path/to/file"',
  'Text "C:\\\\Users\\\\Name"',
  'Text "<script>alert(1)</script>"',  // Should be escaped
  'Text "SELECT * FROM users"'
)

// =============================================================================
// Boundary Cases
// =============================================================================

/** Single character names */
export const singleCharComponent = fc.constantFrom('A', 'B', 'X', 'Z')
  .map(c => `${c} pad 8`)

/** Very long component name */
export const longComponentName = fc.constant('A'.repeat(50) + ': pad 8')

/** Mixed case variations */
export const mixedCaseComponent = fc.constantFrom(
  'BOX pad 8',      // All caps (should fail or normalize)
  'box pad 8',      // All lowercase (should fail)
  'bOx pad 8',      // Mixed (should fail)
  'Box pad 8',      // Correct
  'BOx pad 8'       // Partial (should fail)
)

// =============================================================================
// Malformed Input (for error recovery testing)
// =============================================================================

/** Missing values */
export const missingValue = fc.constantFrom(
  'Box pad',         // Missing pad value
  'Box bg',          // Missing color
  'Box rad',         // Missing radius
  'Box w'            // Missing width
)

/** Extra values */
export const extraValues = fc.constantFrom(
  'Box pad 8 16 24 32 40',  // Too many padding values
  'Box bg #FFF #000',        // Two colors
  'Box rad 8 8 8 8 8'        // Too many radius values
)

/** Invalid syntax */
export const invalidSyntax = fc.constantFrom(
  'Box pad=8',        // Wrong assignment syntax
  'Box {pad: 8}',     // JSON-style
  'Box.pad 8',        // Dot notation
  '<Box pad="8"/>',   // JSX-style
  'Box(pad=8)'        // Function-style
)

/** Incomplete blocks */
export const incompleteBlock = fc.constantFrom(
  'if $condition',         // Missing body
  'each $item in $items',  // Missing body
  'Box\n  hover',          // Missing hover body
  'events'                  // Missing event handlers
)

// =============================================================================
// Combined Generators
// =============================================================================

/** Any edge case value */
export const anyEdgeCaseValue = fc.oneof(
  zeroValue,
  largeValue,
  negativeValue,
  decimalValue,
  percentageEdgeCases
)

/** Any string edge case */
export const anyStringEdgeCase = fc.oneof(
  componentWithUnicode,
  emptyStringContent,
  longString,
  escapedQuotes,
  specialCharString
)

/** Any structural edge case */
export const anyStructuralEdgeCase = fc.oneof(
  varyingDepthNesting,
  wideNesting,
  longPropertyList
)

/** All edge cases (for parser robustness testing) */
export const anyEdgeCase = fc.oneof(
  anyEdgeCaseValue,
  anyStringEdgeCase,
  anyStructuralEdgeCase,
  bareComponent,
  whitespaceChildren
)

/** Malformed inputs (should trigger error recovery) */
export const anyMalformedInput = fc.oneof(
  missingValue,
  extraValues,
  invalidSyntax,
  incompleteBlock
)
