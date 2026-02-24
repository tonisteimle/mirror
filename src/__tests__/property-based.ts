/**
 * Property-Based Testing Utilities for Mirror
 *
 * Uses fast-check to generate random inputs and verify invariants.
 * Great for finding edge cases the parser might not handle.
 */

import * as fc from 'fast-check'
import { parse } from '../parser/parser'

// =============================================================================
// Arbitraries (Random Value Generators)
// =============================================================================

/**
 * Random valid Mirror component names.
 */
export const componentName = fc.constantFrom(
  'Box', 'Button', 'Text', 'Icon', 'Input', 'Image',
  'Container', 'Card', 'Header', 'Footer', 'Nav',
  'Row', 'Column', 'Grid', 'Stack', 'Flex'
)

/**
 * Random valid property names.
 */
export const propertyName = fc.constantFrom(
  'bg', 'col', 'pad', 'margin', 'gap', 'rad',
  'width', 'height', 'opacity', 'z', 'shadow',
  'border', 'font', 'align', 'justify'
)

// Helper for hex digit
const hexDigit = fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F')

/**
 * Random hex colors.
 */
export const hexColor = fc.array(hexDigit, { minLength: 6, maxLength: 6 })
  .map(chars => `#${chars.join('')}`)

/**
 * Random short hex colors.
 */
export const shortHexColor = fc.array(hexDigit, { minLength: 3, maxLength: 3 })
  .map(chars => `#${chars.join('')}`)

/**
 * Random pixel values (reasonable range).
 */
export const pixelValue = fc.integer({ min: 0, max: 9999 })

/**
 * Random percentage values.
 */
export const percentValue = fc.integer({ min: 0, max: 100 }).map(n => `${n}%`)

/**
 * Random spacing values.
 */
export const spacingValue = fc.oneof(
  pixelValue,
  fc.constantFrom('auto', 'full', 'hug')
)

/**
 * Random dimension keywords.
 */
export const dimensionKeyword = fc.constantFrom('hug', 'full', 'auto')

// Helper for lowercase letters
const lowerLetter = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split(''))

/**
 * Random valid token names.
 */
export const tokenName = fc.array(lowerLetter, { minLength: 3, maxLength: 12 })
  .map(chars => `$${chars.join('')}`)

// Helper for safe string characters
const safeChar = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(''))

/**
 * Random string content (safe characters).
 */
export const stringContent = fc.array(safeChar, { minLength: 1, maxLength: 30 })
  .map(chars => chars.join(''))

// =============================================================================
// Mirror Code Generators
// =============================================================================

/**
 * Generate a simple component line.
 */
export const simpleComponent = fc.record({
  name: componentName,
}).map(({ name }) => name)

/**
 * Generate a component with background color.
 */
export const componentWithBg = fc.record({
  name: componentName,
  color: hexColor,
}).map(({ name, color }) => `${name} bg ${color}`)

/**
 * Generate a component with padding.
 */
export const componentWithPad = fc.record({
  name: componentName,
  pad: pixelValue,
}).map(({ name, pad }) => `${name} pad ${pad}`)

/**
 * Generate a component with multiple properties.
 */
export const componentWithProps = fc.record({
  name: componentName,
  bg: fc.option(hexColor, { nil: undefined }),
  pad: fc.option(pixelValue, { nil: undefined }),
  rad: fc.option(pixelValue, { nil: undefined }),
  col: fc.option(hexColor, { nil: undefined }),
}).map(({ name, bg, pad, rad, col }) => {
  const props: string[] = []
  if (bg) props.push(`bg ${bg}`)
  if (pad !== undefined) props.push(`pad ${pad}`)
  if (rad !== undefined) props.push(`rad ${rad}`)
  if (col) props.push(`col ${col}`)
  return props.length > 0 ? `${name} ${props.join(', ')}` : name
})

/**
 * Generate a token definition.
 */
export const tokenDefinition = fc.record({
  name: tokenName,
  value: fc.oneof(hexColor, pixelValue.map(String)),
}).map(({ name, value }) => `${name}: ${value}`)

/**
 * Generate valid Mirror code (simple).
 */
export const validMirrorCode = fc.oneof(
  simpleComponent,
  componentWithBg,
  componentWithPad,
  componentWithProps
)

/**
 * Generate a nested component structure.
 */
export const nestedComponents = fc.record({
  parent: componentName,
  childCount: fc.integer({ min: 1, max: 5 }),
}).chain(({ parent, childCount }) =>
  fc.array(componentWithProps, { minLength: childCount, maxLength: childCount })
    .map(children => `${parent}\n${children.map(c => `  ${c}`).join('\n')}`)
)

// =============================================================================
// Parser Property Checks
// =============================================================================

/**
 * Check that the parser never throws (even on garbage input).
 */
export function parserNeverThrows(input: string): boolean {
  try {
    parse(input)
    return true
  } catch {
    return false
  }
}

/**
 * Check that valid code parses without errors.
 */
export function validCodeParsesClean(code: string): boolean {
  const result = parse(code)
  return result.errors.length === 0
}

/**
 * Check that parsed nodes have expected structure.
 */
export function parsedNodesHaveNames(code: string): boolean {
  const result = parse(code)
  return result.nodes.every(node => typeof node.name === 'string' && node.name.length > 0)
}

// =============================================================================
// Pre-built Property Tests
// =============================================================================

/**
 * Run a property test that parser never crashes.
 */
export function testParserNeverCrashes(numRuns = 1000) {
  fc.assert(
    fc.property(fc.string(), (input) => parserNeverThrows(input)),
    { numRuns }
  )
}

/**
 * Run a property test that valid code parses cleanly.
 */
export function testValidCodeParses(numRuns = 100) {
  fc.assert(
    fc.property(validMirrorCode, (code) => validCodeParsesClean(code)),
    { numRuns }
  )
}

/**
 * Run a property test that all parsed nodes have names.
 */
export function testParsedNodesHaveNames(numRuns = 100) {
  fc.assert(
    fc.property(validMirrorCode, (code) => parsedNodesHaveNames(code)),
    { numRuns }
  )
}

// =============================================================================
// Re-export fast-check for custom tests
// =============================================================================

export { fc }
