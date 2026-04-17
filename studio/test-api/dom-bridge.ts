/**
 * DOM Test Bridge
 *
 * Maps Mirror DSL properties to actual DOM validation.
 * Provides a declarative, professional API for testing rendered output.
 *
 * Usage:
 *   const bridge = new DOMBridge(api.preview)
 *
 *   bridge.verify('node-1', {
 *     tag: 'div',
 *     bg: '#2271C1',
 *     pad: 16,
 *     gap: 12,
 *     hor: true,
 *     children: 3,
 *     text: 'Hello'
 *   })
 */

import type { PreviewAPI, ElementInfo, ComputedStyles } from './types'

// =============================================================================
// Types
// =============================================================================

export interface DOMExpectation {
  // Element
  tag?: string
  exists?: boolean
  visible?: boolean

  // Text
  text?: string
  textContains?: string

  // Children
  children?: number | string[] // count or array of nodeIds
  childTags?: string[] // expected tag names of children

  // Layout
  hor?: boolean
  ver?: boolean
  wrap?: boolean
  center?: boolean
  spread?: boolean

  // Alignment
  justifyContent?: string
  alignItems?: string

  // Dimensions
  w?: number | 'full' | 'auto'
  h?: number | 'full' | 'auto'
  minw?: number
  maxw?: number
  minh?: number
  maxh?: number

  // Spacing
  pad?: number | [number, number] | [number, number, number, number]
  gap?: number
  mar?: number | [number, number] | [number, number, number, number]

  // Colors
  bg?: string
  col?: string
  boc?: string

  // Border
  bor?: number
  rad?: number

  // Typography
  fs?: number
  weight?: string | number
  italic?: boolean
  uppercase?: boolean
  underline?: boolean

  // Effects
  shadow?: boolean
  opacity?: number

  // Attributes
  placeholder?: string
  href?: string
  src?: string

  // Custom style check
  style?: Partial<ComputedStyles>
}

export interface VerifyResult {
  passed: boolean
  nodeId: string
  failures: VerifyFailure[]
}

export interface VerifyFailure {
  property: string
  expected: string
  actual: string
  message: string
}

// =============================================================================
// Color Utilities
// =============================================================================

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Handle shorthand (#fff -> #ffffff)
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3]
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return null

  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  }
}

function parseRgb(rgb: string): { r: number; g: number; b: number } | null {
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return null

  return {
    r: parseInt(match[1]),
    g: parseInt(match[2]),
    b: parseInt(match[3]),
  }
}

function colorsEqual(actual: string, expected: string): boolean {
  // Handle 'transparent', 'none', etc
  if (actual === expected) return true
  if (actual === 'rgba(0, 0, 0, 0)' && expected === 'transparent') return true

  // Parse both colors
  const actualRgb = parseRgb(actual)
  const expectedRgb = expected.startsWith('#') ? hexToRgb(expected) : parseRgb(expected)

  if (!actualRgb || !expectedRgb) return false

  return (
    actualRgb.r === expectedRgb.r && actualRgb.g === expectedRgb.g && actualRgb.b === expectedRgb.b
  )
}

function formatColor(color: string): string {
  const rgb = parseRgb(color)
  if (rgb) {
    const hex = '#' + [rgb.r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('')
    return `${color} (${hex})`
  }
  return color
}

// =============================================================================
// DOM Bridge
// =============================================================================

export class DOMBridge {
  constructor(private preview: PreviewAPI) {}

  /**
   * Verify an element matches expectations
   */
  verify(nodeId: string, expect: DOMExpectation): VerifyResult {
    const failures: VerifyFailure[] = []
    const element = this.preview.inspect(nodeId)

    // Check existence first
    if (expect.exists === false) {
      if (element !== null) {
        failures.push({
          property: 'exists',
          expected: 'false',
          actual: 'true',
          message: `Element ${nodeId} should not exist`,
        })
      }
      return { passed: failures.length === 0, nodeId, failures }
    }

    if (!element) {
      failures.push({
        property: 'exists',
        expected: 'true',
        actual: 'false',
        message: `Element ${nodeId} does not exist`,
      })
      return { passed: false, nodeId, failures }
    }

    const styles = element.styles

    // --- Tag ---
    if (expect.tag) {
      const actual = element.tagName.toLowerCase()
      const expected = expect.tag.toLowerCase()
      if (actual !== expected) {
        failures.push({
          property: 'tag',
          expected,
          actual,
          message: `Expected <${expected}>, got <${actual}>`,
        })
      }
    }

    // --- Visibility ---
    if (expect.visible !== undefined) {
      const isVisible =
        element.visible && styles.display !== 'none' && styles.visibility !== 'hidden'
      if (isVisible !== expect.visible) {
        failures.push({
          property: 'visible',
          expected: String(expect.visible),
          actual: String(isVisible),
          message: expect.visible ? 'Element should be visible' : 'Element should be hidden',
        })
      }
    }

    // --- Text ---
    if (expect.text !== undefined) {
      const actual = element.fullText.trim()
      if (actual !== expect.text) {
        failures.push({
          property: 'text',
          expected: expect.text,
          actual,
          message: `Text mismatch`,
        })
      }
    }

    if (expect.textContains !== undefined) {
      if (!element.fullText.includes(expect.textContains)) {
        failures.push({
          property: 'textContains',
          expected: expect.textContains,
          actual: element.fullText,
          message: `Text should contain "${expect.textContains}"`,
        })
      }
    }

    // --- Children ---
    if (expect.children !== undefined) {
      const childCount = element.children.length
      if (typeof expect.children === 'number') {
        if (childCount !== expect.children) {
          failures.push({
            property: 'children',
            expected: String(expect.children),
            actual: String(childCount),
            message: `Expected ${expect.children} children, got ${childCount}`,
          })
        }
      } else {
        // Array of nodeIds
        const expectedIds = expect.children
        if (childCount !== expectedIds.length) {
          failures.push({
            property: 'children',
            expected: expectedIds.join(', '),
            actual: element.children.join(', '),
            message: `Children mismatch`,
          })
        }
      }
    }

    if (expect.childTags) {
      const actualTags = element.children.map(id => {
        const child = this.preview.inspect(id)
        return child?.tagName.toLowerCase() || 'unknown'
      })
      const expectedTags = expect.childTags.map(t => t.toLowerCase())

      if (JSON.stringify(actualTags) !== JSON.stringify(expectedTags)) {
        failures.push({
          property: 'childTags',
          expected: expectedTags.join(', '),
          actual: actualTags.join(', '),
          message: `Child tags mismatch`,
        })
      }
    }

    // --- Layout Direction ---
    if (expect.hor !== undefined) {
      const isHorizontal = styles.flexDirection === 'row'
      if (isHorizontal !== expect.hor) {
        failures.push({
          property: 'hor',
          expected: expect.hor ? 'row' : 'column',
          actual: styles.flexDirection,
          message: expect.hor ? 'Should be horizontal (row)' : 'Should not be horizontal',
        })
      }
    }

    if (expect.ver !== undefined) {
      const isVertical = styles.flexDirection === 'column'
      if (isVertical !== expect.ver) {
        failures.push({
          property: 'ver',
          expected: expect.ver ? 'column' : 'row',
          actual: styles.flexDirection,
          message: expect.ver ? 'Should be vertical (column)' : 'Should not be vertical',
        })
      }
    }

    if (expect.wrap !== undefined) {
      const hasWrap = styles.flexWrap === 'wrap'
      if (hasWrap !== expect.wrap) {
        failures.push({
          property: 'wrap',
          expected: expect.wrap ? 'wrap' : 'nowrap',
          actual: styles.flexWrap,
          message: expect.wrap ? 'Should wrap' : 'Should not wrap',
        })
      }
    }

    // --- Alignment ---
    if (expect.center) {
      const isCentered = styles.justifyContent === 'center' && styles.alignItems === 'center'
      if (!isCentered) {
        failures.push({
          property: 'center',
          expected: 'justify-content: center, align-items: center',
          actual: `justify-content: ${styles.justifyContent}, align-items: ${styles.alignItems}`,
          message: 'Should be centered',
        })
      }
    }

    if (expect.spread) {
      if (styles.justifyContent !== 'space-between') {
        failures.push({
          property: 'spread',
          expected: 'space-between',
          actual: styles.justifyContent,
          message: 'Should have space-between',
        })
      }
    }

    if (expect.justifyContent) {
      if (styles.justifyContent !== expect.justifyContent) {
        failures.push({
          property: 'justifyContent',
          expected: expect.justifyContent,
          actual: styles.justifyContent,
          message: 'justify-content mismatch',
        })
      }
    }

    if (expect.alignItems) {
      if (styles.alignItems !== expect.alignItems) {
        failures.push({
          property: 'alignItems',
          expected: expect.alignItems,
          actual: styles.alignItems,
          message: 'align-items mismatch',
        })
      }
    }

    // --- Dimensions ---
    if (expect.w !== undefined) {
      const expected = expect.w === 'full' ? '100%' : expect.w === 'auto' ? 'auto' : `${expect.w}px`
      if (styles.width !== expected) {
        failures.push({
          property: 'w',
          expected,
          actual: styles.width,
          message: `Width mismatch`,
        })
      }
    }

    if (expect.h !== undefined) {
      const expected = expect.h === 'full' ? '100%' : expect.h === 'auto' ? 'auto' : `${expect.h}px`
      if (styles.height !== expected) {
        failures.push({
          property: 'h',
          expected,
          actual: styles.height,
          message: `Height mismatch`,
        })
      }
    }

    // --- Spacing: Padding ---
    if (expect.pad !== undefined) {
      const padValue = expect.pad
      if (typeof padValue === 'number') {
        // Single value - all sides
        const expected = `${padValue}px`
        const actual = styles.padding
        // Check if all sides match
        const allSidesMatch =
          styles.paddingTop === expected &&
          styles.paddingRight === expected &&
          styles.paddingBottom === expected &&
          styles.paddingLeft === expected

        if (!allSidesMatch && actual !== expected) {
          failures.push({
            property: 'pad',
            expected,
            actual: `${styles.paddingTop} ${styles.paddingRight} ${styles.paddingBottom} ${styles.paddingLeft}`,
            message: `Padding mismatch`,
          })
        }
      } else if (padValue.length === 2) {
        // [vertical, horizontal]
        const [v, h] = padValue
        if (styles.paddingTop !== `${v}px` || styles.paddingBottom !== `${v}px`) {
          failures.push({
            property: 'pad (vertical)',
            expected: `${v}px`,
            actual: `top: ${styles.paddingTop}, bottom: ${styles.paddingBottom}`,
            message: `Vertical padding mismatch`,
          })
        }
        if (styles.paddingLeft !== `${h}px` || styles.paddingRight !== `${h}px`) {
          failures.push({
            property: 'pad (horizontal)',
            expected: `${h}px`,
            actual: `left: ${styles.paddingLeft}, right: ${styles.paddingRight}`,
            message: `Horizontal padding mismatch`,
          })
        }
      }
    }

    // --- Spacing: Gap ---
    if (expect.gap !== undefined) {
      const expected = `${expect.gap}px`
      if (styles.gap !== expected) {
        failures.push({
          property: 'gap',
          expected,
          actual: styles.gap,
          message: `Gap mismatch`,
        })
      }
    }

    // --- Colors ---
    if (expect.bg !== undefined) {
      if (!colorsEqual(styles.backgroundColor, expect.bg)) {
        failures.push({
          property: 'bg',
          expected: expect.bg,
          actual: formatColor(styles.backgroundColor),
          message: `Background color mismatch`,
        })
      }
    }

    if (expect.col !== undefined) {
      if (!colorsEqual(styles.color, expect.col)) {
        failures.push({
          property: 'col',
          expected: expect.col,
          actual: formatColor(styles.color),
          message: `Text color mismatch`,
        })
      }
    }

    if (expect.boc !== undefined) {
      if (!colorsEqual(styles.borderColor, expect.boc)) {
        failures.push({
          property: 'boc',
          expected: expect.boc,
          actual: formatColor(styles.borderColor),
          message: `Border color mismatch`,
        })
      }
    }

    // --- Border ---
    if (expect.bor !== undefined) {
      const expected = `${expect.bor}px`
      if (styles.borderWidth !== expected) {
        failures.push({
          property: 'bor',
          expected,
          actual: styles.borderWidth,
          message: `Border width mismatch`,
        })
      }
    }

    if (expect.rad !== undefined) {
      const expected = `${expect.rad}px`
      if (styles.borderRadius !== expected) {
        failures.push({
          property: 'rad',
          expected,
          actual: styles.borderRadius,
          message: `Border radius mismatch`,
        })
      }
    }

    // --- Typography ---
    if (expect.fs !== undefined) {
      const expected = `${expect.fs}px`
      if (styles.fontSize !== expected) {
        failures.push({
          property: 'fs',
          expected,
          actual: styles.fontSize,
          message: `Font size mismatch`,
        })
      }
    }

    if (expect.weight !== undefined) {
      const expected = String(expect.weight)
      const normalizedExpected =
        expected === 'bold' ? '700' : expected === 'normal' ? '400' : expected
      const normalizedActual =
        styles.fontWeight === 'bold'
          ? '700'
          : styles.fontWeight === 'normal'
            ? '400'
            : styles.fontWeight

      if (normalizedActual !== normalizedExpected) {
        failures.push({
          property: 'weight',
          expected,
          actual: styles.fontWeight,
          message: `Font weight mismatch`,
        })
      }
    }

    if (expect.italic) {
      if (styles.fontStyle !== 'italic') {
        failures.push({
          property: 'italic',
          expected: 'italic',
          actual: styles.fontStyle,
          message: `Should be italic`,
        })
      }
    }

    if (expect.uppercase) {
      if (styles.textTransform !== 'uppercase') {
        failures.push({
          property: 'uppercase',
          expected: 'uppercase',
          actual: styles.textTransform,
          message: `Should be uppercase`,
        })
      }
    }

    if (expect.underline) {
      if (!styles.textDecoration.includes('underline')) {
        failures.push({
          property: 'underline',
          expected: 'underline',
          actual: styles.textDecoration,
          message: `Should be underlined`,
        })
      }
    }

    // --- Effects ---
    if (expect.shadow) {
      const hasShadow = styles.boxShadow !== 'none' && styles.boxShadow !== ''
      if (!hasShadow) {
        failures.push({
          property: 'shadow',
          expected: 'has shadow',
          actual: styles.boxShadow || 'none',
          message: `Should have shadow`,
        })
      }
    }

    if (expect.opacity !== undefined) {
      const actual = parseFloat(styles.opacity)
      if (Math.abs(actual - expect.opacity) > 0.01) {
        failures.push({
          property: 'opacity',
          expected: String(expect.opacity),
          actual: styles.opacity,
          message: `Opacity mismatch`,
        })
      }
    }

    // --- Attributes ---
    if (expect.placeholder !== undefined) {
      const actual = element.attributes.placeholder || ''
      if (actual !== expect.placeholder) {
        failures.push({
          property: 'placeholder',
          expected: expect.placeholder,
          actual,
          message: `Placeholder mismatch`,
        })
      }
    }

    if (expect.href !== undefined) {
      const actual = element.attributes.href || ''
      if (actual !== expect.href) {
        failures.push({
          property: 'href',
          expected: expect.href,
          actual,
          message: `href mismatch`,
        })
      }
    }

    if (expect.src !== undefined) {
      const actual = element.attributes.src || ''
      if (!actual.includes(expect.src)) {
        failures.push({
          property: 'src',
          expected: expect.src,
          actual,
          message: `src mismatch`,
        })
      }
    }

    // --- Custom styles ---
    if (expect.style) {
      for (const [prop, expectedValue] of Object.entries(expect.style)) {
        const actualValue = styles[prop as keyof ComputedStyles]
        if (actualValue !== expectedValue) {
          failures.push({
            property: `style.${prop}`,
            expected: String(expectedValue),
            actual: String(actualValue),
            message: `Style ${prop} mismatch`,
          })
        }
      }
    }

    return {
      passed: failures.length === 0,
      nodeId,
      failures,
    }
  }

  /**
   * Verify and throw on failure
   */
  expect(nodeId: string, expectations: DOMExpectation): void {
    const result = this.verify(nodeId, expectations)

    if (!result.passed) {
      const messages = result.failures
        .map(f => `  • ${f.property}: expected ${f.expected}, got ${f.actual}`)
        .join('\n')

      throw new Error(`DOM verification failed for ${nodeId}:\n${messages}`)
    }
  }

  /**
   * Verify multiple elements
   */
  verifyAll(expectations: Record<string, DOMExpectation>): VerifyResult[] {
    return Object.entries(expectations).map(([nodeId, expect]) => this.verify(nodeId, expect))
  }

  /**
   * Verify a tree structure
   */
  verifyTree(rootId: string, tree: TreeExpectation): VerifyResult[] {
    const results: VerifyResult[] = []

    const verifyNode = (nodeId: string, node: TreeExpectation) => {
      const { children: childExpectations, ...expectations } = node

      // Verify this node
      results.push(this.verify(nodeId, expectations))

      // Verify children
      if (childExpectations) {
        const element = this.preview.inspect(nodeId)
        if (element) {
          childExpectations.forEach((childExpect, index) => {
            const childId = element.children[index]
            if (childId) {
              verifyNode(childId, childExpect)
            } else {
              results.push({
                passed: false,
                nodeId: `${nodeId}[${index}]`,
                failures: [
                  {
                    property: 'child',
                    expected: `child at index ${index}`,
                    actual: 'missing',
                    message: `Missing child at index ${index}`,
                  },
                ],
              })
            }
          })
        }
      }
    }

    verifyNode(rootId, tree)
    return results
  }
}

export interface TreeExpectation extends DOMExpectation {
  children?: TreeExpectation[]
}

// =============================================================================
// Factory function for use in tests
// =============================================================================

export function createDOMBridge(preview: PreviewAPI): DOMBridge {
  return new DOMBridge(preview)
}
