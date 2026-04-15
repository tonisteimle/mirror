/**
 * Mirror Test Framework - Assertions
 *
 * Fluent assertion API for testing Mirror Studio.
 * Throws on failure with detailed messages.
 */

import type { AssertionAPI, AssertionResult, ComputedStyles } from './types'
import { PreviewInspector, normalizeColor } from './inspector'

// =============================================================================
// Assertion Error
// =============================================================================

export class AssertionError extends Error {
  constructor(
    message: string,
    public expected?: unknown,
    public actual?: unknown
  ) {
    super(message)
    this.name = 'AssertionError'
  }
}

// =============================================================================
// Assertion Collector
// =============================================================================

/**
 * Collects assertions during test run
 */
export class AssertionCollector {
  private results: AssertionResult[] = []
  private throwOnFail: boolean

  constructor(throwOnFail = true) {
    this.throwOnFail = throwOnFail
  }

  add(result: AssertionResult): void {
    this.results.push(result)
    if (!result.passed && this.throwOnFail) {
      throw new AssertionError(result.message, result.expected, result.actual)
    }
  }

  getResults(): AssertionResult[] {
    return [...this.results]
  }

  clear(): void {
    this.results = []
  }

  get passed(): boolean {
    return this.results.every(r => r.passed)
  }

  get failedCount(): number {
    return this.results.filter(r => !r.passed).length
  }
}

// =============================================================================
// Assertions Implementation
// =============================================================================

export class Assertions implements AssertionAPI {
  private inspector: PreviewInspector
  private collector: AssertionCollector
  private getCode: () => string
  private getSelection: () => string | null

  constructor(
    inspector: PreviewInspector,
    collector: AssertionCollector,
    getCode: () => string,
    getSelection: () => string | null
  ) {
    this.inspector = inspector
    this.collector = collector
    this.getCode = getCode
    this.getSelection = getSelection
  }

  /**
   * Assert condition is true
   */
  ok(condition: boolean, message = 'Expected condition to be true'): void {
    this.collector.add({
      passed: condition,
      message: condition ? 'Condition is true' : message,
      expected: true,
      actual: condition,
    })
  }

  /**
   * Assert values are equal
   */
  equals<T>(actual: T, expected: T, message?: string): void {
    const passed = this.deepEquals(actual, expected)
    this.collector.add({
      passed,
      message: message || (passed ? 'Values are equal' : `Expected ${expected}, got ${actual}`),
      expected,
      actual,
    })
  }

  /**
   * Assert string matches pattern
   */
  matches(actual: string, pattern: RegExp, message?: string): void {
    const passed = pattern.test(actual)
    this.collector.add({
      passed,
      message: message || (passed ? 'Pattern matched' : `Expected "${actual}" to match ${pattern}`),
      expected: pattern.toString(),
      actual,
    })
  }

  /**
   * Assert string contains substring
   */
  contains(actual: string, substring: string, message?: string): void {
    const passed = actual.includes(substring)
    this.collector.add({
      passed,
      message:
        message || (passed ? 'Substring found' : `Expected "${actual}" to contain "${substring}"`),
      expected: substring,
      actual,
    })
  }

  /**
   * Assert element has specific style
   */
  hasStyle(nodeId: string, property: keyof ComputedStyles, value: string): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: value,
        actual: null,
      })
      return
    }

    const actualValue = info.styles[property]
    let passed = false

    // Special handling for colors
    if (property === 'backgroundColor' || property === 'color' || property === 'borderColor') {
      passed = normalizeColor(actualValue) === normalizeColor(value)
    } else {
      // Normalize values (remove px for comparison if needed)
      passed =
        actualValue === value ||
        actualValue.replace(/px$/, '') === value.replace(/px$/, '') ||
        actualValue.toLowerCase() === value.toLowerCase()
    }

    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} has ${property}: ${value}`
        : `Expected ${nodeId}.${property} to be "${value}", got "${actualValue}"`,
      expected: value,
      actual: actualValue,
    })
  }

  /**
   * Assert element has text content
   */
  hasText(nodeId: string, text: string, options?: { exact?: boolean }): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: text,
        actual: null,
      })
      return
    }

    const exact = options?.exact ?? false
    const actualText = exact ? info.textContent : info.fullText
    const passed = exact ? actualText === text : actualText.includes(text)

    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} has text "${text}"`
        : `Expected ${nodeId} to have text "${text}", got "${actualText}"`,
      expected: text,
      actual: actualText,
    })
  }

  /**
   * Assert element exists in preview
   */
  exists(nodeId: string, message?: string): void {
    const exists = this.inspector.exists(nodeId)
    this.collector.add({
      passed: exists,
      message: message || (exists ? `Element ${nodeId} exists` : `Element ${nodeId} not found`),
      expected: true,
      actual: exists,
    })
  }

  /**
   * Assert element is visible
   */
  isVisible(nodeId: string, message?: string): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: true,
        actual: false,
      })
      return
    }

    this.collector.add({
      passed: info.visible,
      message:
        message || (info.visible ? `Element ${nodeId} is visible` : `Element ${nodeId} is hidden`),
      expected: true,
      actual: info.visible,
    })
  }

  /**
   * Assert element has specific number of children
   */
  hasChildren(nodeId: string, count: number): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: count,
        actual: null,
      })
      return
    }

    const passed = info.children.length === count
    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} has ${count} children`
        : `Expected ${nodeId} to have ${count} children, got ${info.children.length}`,
      expected: count,
      actual: info.children.length,
    })
  }

  /**
   * Assert element has attribute
   */
  hasAttribute(nodeId: string, attr: string, value?: string): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: value ?? true,
        actual: null,
      })
      return
    }

    const actualValue = info.attributes[attr] ?? info.dataAttributes[`data-${attr}`]
    const hasAttr = actualValue !== undefined

    if (value !== undefined) {
      const passed = actualValue === value
      this.collector.add({
        passed,
        message: passed
          ? `Element ${nodeId} has ${attr}="${value}"`
          : `Expected ${nodeId}.${attr} to be "${value}", got "${actualValue}"`,
        expected: value,
        actual: actualValue,
      })
    } else {
      this.collector.add({
        passed: hasAttr,
        message: hasAttr
          ? `Element ${nodeId} has attribute ${attr}`
          : `Element ${nodeId} missing attribute ${attr}`,
        expected: true,
        actual: hasAttr,
      })
    }
  }

  /**
   * Assert code contains pattern
   */
  codeContains(pattern: string | RegExp): void {
    const code = this.getCode()
    const passed = typeof pattern === 'string' ? code.includes(pattern) : pattern.test(code)

    this.collector.add({
      passed,
      message: passed
        ? `Code contains ${pattern}`
        : `Expected code to contain ${pattern}\nActual code:\n${code}`,
      expected: pattern.toString(),
      actual: code,
    })
  }

  /**
   * Assert code equals expected
   */
  codeEquals(expected: string): void {
    const actual = this.getCode()
    const passed = actual.trim() === expected.trim()

    this.collector.add({
      passed,
      message: passed ? 'Code matches expected' : `Code mismatch`,
      expected,
      actual,
      diff: passed ? undefined : this.createDiff(expected, actual),
    })
  }

  /**
   * Assert element is selected
   */
  isSelected(nodeId: string): void {
    const selection = this.getSelection()
    const passed = selection === nodeId

    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} is selected`
        : `Expected ${nodeId} to be selected, got ${selection}`,
      expected: nodeId,
      actual: selection,
    })
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  private deepEquals(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (typeof a !== typeof b) return false
    if (typeof a !== 'object' || a === null || b === null) return false

    const aKeys = Object.keys(a as object)
    const bKeys = Object.keys(b as object)

    if (aKeys.length !== bKeys.length) return false

    for (const key of aKeys) {
      if (!this.deepEquals((a as any)[key], (b as any)[key])) {
        return false
      }
    }

    return true
  }

  private createDiff(expected: string, actual: string): string {
    const expectedLines = expected.trim().split('\n')
    const actualLines = actual.trim().split('\n')
    const diff: string[] = []

    const maxLines = Math.max(expectedLines.length, actualLines.length)
    for (let i = 0; i < maxLines; i++) {
      const exp = expectedLines[i]
      const act = actualLines[i]

      if (exp === act) {
        diff.push(`  ${act}`)
      } else {
        if (exp !== undefined) diff.push(`- ${exp}`)
        if (act !== undefined) diff.push(`+ ${act}`)
      }
    }

    return diff.join('\n')
  }
}

// =============================================================================
// Fluent Element Assertions
// =============================================================================

/**
 * Fluent API for element-specific assertions
 */
export class ElementAssert {
  private inspector: PreviewInspector
  private collector: AssertionCollector
  private nodeId: string

  constructor(inspector: PreviewInspector, collector: AssertionCollector, nodeId: string) {
    this.inspector = inspector
    this.collector = collector
    this.nodeId = nodeId
  }

  /**
   * Assert element exists
   */
  exists(): this {
    const exists = this.inspector.exists(this.nodeId)
    this.collector.add({
      passed: exists,
      message: exists ? `Element ${this.nodeId} exists` : `Element ${this.nodeId} not found`,
      expected: true,
      actual: exists,
    })
    return this
  }

  /**
   * Assert element is visible
   */
  isVisible(): this {
    const info = this.inspector.inspect(this.nodeId)
    const visible = info?.visible ?? false
    this.collector.add({
      passed: visible,
      message: visible
        ? `Element ${this.nodeId} is visible`
        : `Element ${this.nodeId} is not visible`,
      expected: true,
      actual: visible,
    })
    return this
  }

  /**
   * Assert element has text
   */
  hasText(text: string): this {
    const info = this.inspector.inspect(this.nodeId)
    const actualText = info?.fullText ?? ''
    const passed = actualText.includes(text)
    this.collector.add({
      passed,
      message: passed
        ? `Element has text "${text}"`
        : `Expected text "${text}", got "${actualText}"`,
      expected: text,
      actual: actualText,
    })
    return this
  }

  /**
   * Assert element has background color
   */
  hasBackground(color: string): this {
    const info = this.inspector.inspect(this.nodeId)
    const actual = info?.styles.backgroundColor ?? ''
    const passed = normalizeColor(actual) === normalizeColor(color)
    this.collector.add({
      passed,
      message: passed
        ? `Element has background ${color}`
        : `Expected background ${color}, got ${actual}`,
      expected: color,
      actual,
    })
    return this
  }

  /**
   * Assert element has text color
   */
  hasColor(color: string): this {
    const info = this.inspector.inspect(this.nodeId)
    const actual = info?.styles.color ?? ''
    const passed = normalizeColor(actual) === normalizeColor(color)
    this.collector.add({
      passed,
      message: passed ? `Element has color ${color}` : `Expected color ${color}, got ${actual}`,
      expected: color,
      actual,
    })
    return this
  }

  /**
   * Assert element has specific style
   */
  hasStyle(property: keyof ComputedStyles, value: string): this {
    const info = this.inspector.inspect(this.nodeId)
    const actual = info?.styles[property] ?? ''
    const passed = actual === value || actual.includes(value)
    this.collector.add({
      passed,
      message: passed
        ? `Element has ${property}: ${value}`
        : `Expected ${property}: ${value}, got ${actual}`,
      expected: value,
      actual,
    })
    return this
  }

  /**
   * Assert element has children count
   */
  hasChildCount(count: number): this {
    const info = this.inspector.inspect(this.nodeId)
    const actual = info?.children.length ?? 0
    const passed = actual === count
    this.collector.add({
      passed,
      message: passed
        ? `Element has ${count} children`
        : `Expected ${count} children, got ${actual}`,
      expected: count,
      actual,
    })
    return this
  }
}
