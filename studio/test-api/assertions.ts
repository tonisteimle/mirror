/**
 * Mirror Test Framework - Assertions
 *
 * Fluent assertion API for testing Mirror Studio.
 * Throws on failure with detailed messages.
 */

import type { AssertionAPI, AssertionResult, ComputedStyles } from './types'
import { PreviewInspector, normalizeColor, colorsMatchWithTolerance } from './inspector'

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
   * Assert condition is true.
   * THROWS on failure (AssertionCollector default), enabling TS narrowing.
   */
  ok(condition: unknown, message = 'Expected condition to be true'): asserts condition {
    this.collector.add({
      passed: !!condition,
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
   * Alias for equals (for compatibility)
   */
  equal<T>(actual: T, expected: T, message?: string): void {
    this.equals(actual, expected, message)
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

    // Handle undefined/null values
    if (actualValue === undefined || actualValue === null) {
      passed = false
    } else if (
      property === 'backgroundColor' ||
      property === 'color' ||
      property === 'borderColor'
    ) {
      // Special handling for colors - use tolerance for minor browser rendering differences
      passed = colorsMatchWithTolerance(actualValue, value, 5)
    } else {
      // Normalize values (remove px for comparison if needed)
      const actualStr = String(actualValue)
      const expectedStr = String(value)
      passed =
        actualStr === expectedStr ||
        actualStr.replace(/px$/, '') === expectedStr.replace(/px$/, '') ||
        actualStr.toLowerCase() === expectedStr.toLowerCase()
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
   * Assert element has style with numeric tolerance
   * Useful for dimensions that may vary slightly due to browser rendering
   */
  hasStyleApprox(
    nodeId: string,
    property: keyof ComputedStyles,
    value: number,
    tolerance: number
  ): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: `${value} ±${tolerance}`,
        actual: null,
      })
      return
    }

    const actualValue = info.styles[property]
    // Extract numeric value from CSS value (e.g., "100px" -> 100)
    const numericMatch = actualValue?.match(/^(-?\d+(?:\.\d+)?)/)?.[1]
    const actualNumeric = numericMatch ? parseFloat(numericMatch) : NaN

    const passed = !isNaN(actualNumeric) && Math.abs(actualNumeric - value) <= tolerance

    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} has ${property}: ${actualNumeric} (within ±${tolerance} of ${value})`
        : `Expected ${nodeId}.${property} to be ${value} ±${tolerance}, got "${actualValue}" (${actualNumeric})`,
      expected: `${value} ±${tolerance}`,
      actual: actualValue,
    })
  }

  /**
   * Assert element has multiple styles at once
   * More efficient than calling hasStyle multiple times
   */
  hasStyles(nodeId: string, styles: Partial<Record<keyof ComputedStyles, string>>): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: JSON.stringify(styles),
        actual: null,
      })
      return
    }

    const failures: Array<{ property: string; expected: string; actual: string }> = []

    for (const [property, expectedValue] of Object.entries(styles)) {
      const actualValue = info.styles[property as keyof ComputedStyles]
      let matches = false

      if (property === 'backgroundColor' || property === 'color' || property === 'borderColor') {
        matches = colorsMatchWithTolerance(actualValue, expectedValue, 5)
      } else {
        const actualStr = String(actualValue ?? '')
        const expectedStr = String(expectedValue)
        matches =
          actualStr === expectedStr ||
          actualStr.replace(/px$/, '') === expectedStr.replace(/px$/, '') ||
          actualStr.toLowerCase() === expectedStr.toLowerCase()
      }

      if (!matches) {
        failures.push({
          property,
          expected: expectedValue,
          actual: actualValue ?? 'undefined',
        })
      }
    }

    const passed = failures.length === 0
    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} has all expected styles`
        : `Element ${nodeId} style mismatches: ${failures.map(f => `${f.property}: expected "${f.expected}", got "${f.actual}"`).join('; ')}`,
      expected: JSON.stringify(styles),
      actual: JSON.stringify(
        Object.fromEntries(
          Object.keys(styles).map(k => [k, info.styles[k as keyof ComputedStyles]])
        )
      ),
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
   * Assert element is hidden (display: none, visibility: hidden, or opacity: 0)
   */
  isHidden(nodeId: string, message?: string): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      // Element not found - technically hidden, but maybe not what we want
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found (cannot verify hidden state)`,
        expected: false,
        actual: null,
      })
      return
    }

    const hidden = !info.visible
    this.collector.add({
      passed: hidden,
      message:
        message ||
        (hidden ? `Element ${nodeId} is hidden` : `Element ${nodeId} is visible (expected hidden)`),
      expected: false, // visible should be false
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
   * Assert code does NOT contain pattern
   */
  codeNotContains(pattern: string | RegExp): void {
    const code = this.getCode()
    const contains = typeof pattern === 'string' ? code.includes(pattern) : pattern.test(code)
    const passed = !contains

    this.collector.add({
      passed,
      message: passed
        ? `Code does not contain ${pattern}`
        : `Expected code to NOT contain ${pattern}, but it does`,
      expected: `Not: ${pattern.toString()}`,
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
  // Focus & Animation Assertions
  // =============================================================================

  /**
   * Assert element has focus
   */
  hasFocus(nodeId: string, message?: string): void {
    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: true,
        actual: null,
      })
      return
    }

    const hasFocus = document.activeElement === element
    this.collector.add({
      passed: hasFocus,
      message:
        message ||
        (hasFocus
          ? `Element ${nodeId} has focus`
          : `Element ${nodeId} does not have focus (active: ${document.activeElement?.getAttribute('data-mirror-id') || document.activeElement?.tagName || 'none'})`),
      expected: true,
      actual: hasFocus,
    })
  }

  /**
   * Assert element can receive focus (is focusable)
   */
  isFocusable(nodeId: string, message?: string): void {
    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: true,
        actual: null,
      })
      return
    }

    // Check if element is natively focusable or has tabindex
    const tagName = element.tagName.toLowerCase()
    const nativelyFocusable = ['button', 'input', 'textarea', 'select', 'a'].includes(tagName)
    const hasTabIndex = element.hasAttribute('tabindex')
    const tabIndexValue = element.getAttribute('tabindex')
    const isDisabled = element.hasAttribute('disabled')

    // Element is focusable if:
    // - It's natively focusable and not disabled, OR
    // - It has tabindex >= 0
    const isFocusable =
      (nativelyFocusable && !isDisabled) || (hasTabIndex && tabIndexValue !== '-1')

    this.collector.add({
      passed: isFocusable,
      message:
        message ||
        (isFocusable
          ? `Element ${nodeId} is focusable`
          : `Element ${nodeId} is not focusable (tag: ${tagName}, tabindex: ${tabIndexValue || 'none'}, disabled: ${isDisabled})`),
      expected: true,
      actual: isFocusable,
    })
  }

  /**
   * Assert element is currently animating
   * Checks if the element has any CSS animation running
   */
  isAnimating(nodeId: string, message?: string): void {
    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: true,
        actual: null,
      })
      return
    }

    const computedStyle = getComputedStyle(element)
    const animationName = computedStyle.animationName
    const animationPlayState = computedStyle.animationPlayState
    const animationDuration = computedStyle.animationDuration

    // Check if animation is defined and running
    const hasAnimation = animationName !== 'none' && animationName !== ''
    const isRunning = animationPlayState === 'running'
    const hasDuration = animationDuration !== '0s' && animationDuration !== ''

    const isAnimating = hasAnimation && isRunning && hasDuration

    this.collector.add({
      passed: isAnimating,
      message:
        message ||
        (isAnimating
          ? `Element ${nodeId} is animating (${animationName})`
          : `Element ${nodeId} is not animating (name: ${animationName}, state: ${animationPlayState}, duration: ${animationDuration})`),
      expected: true,
      actual: isAnimating,
    })
  }

  /**
   * Assert element has specific animation
   */
  hasAnimation(nodeId: string, animationName: string, message?: string): void {
    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: animationName,
        actual: null,
      })
      return
    }

    const computedStyle = getComputedStyle(element)
    const actualAnimation = computedStyle.animationName

    // Animation name may be a list (e.g., "spin, pulse"), check if it includes the expected one
    const animationList = actualAnimation.split(',').map(a => a.trim())
    const hasAnimation = animationList.some(a => a === animationName || a.includes(animationName))

    this.collector.add({
      passed: hasAnimation,
      message:
        message ||
        (hasAnimation
          ? `Element ${nodeId} has animation "${animationName}"`
          : `Element ${nodeId} does not have animation "${animationName}" (has: "${actualAnimation}")`),
      expected: animationName,
      actual: actualAnimation,
    })
  }

  // =============================================================================
  // Node-specific Code Assertions
  // =============================================================================

  /**
   * Get the source map from studio state
   */
  private getSourceMap(): any {
    return (window as any).__studio?.state?.get()?.sourceMap
  }

  /**
   * Assert a specific node has a property in its code line
   */
  nodeHasProperty(nodeId: string, property: string, value?: string): void {
    const sourceMap = this.getSourceMap()
    if (!sourceMap) {
      this.collector.add({
        passed: false,
        message: 'No source map available - ensure code is compiled',
        expected: `${property}${value !== undefined ? ` ${value}` : ''}`,
        actual: null,
      })
      return
    }

    const node = sourceMap.getNodeById?.(nodeId) || sourceMap.nodeMap?.get?.(nodeId)
    if (!node) {
      this.collector.add({
        passed: false,
        message: `Node ${nodeId} not found in source map`,
        expected: `${property}${value !== undefined ? ` ${value}` : ''}`,
        actual: null,
      })
      return
    }

    const code = this.getCode()
    const lines = code.split('\n')
    const lineIndex = (node.position?.line ?? node.line) - 1
    const line = lines[lineIndex] || ''

    // Build pattern: match property with optional value
    let pattern: RegExp
    if (value !== undefined) {
      // Escape special regex characters in value
      const escapedValue = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      pattern = new RegExp(`\\b${property}\\s+${escapedValue}\\b`)
    } else {
      pattern = new RegExp(`\\b${property}\\b`)
    }

    const passed = pattern.test(line)
    this.collector.add({
      passed,
      message: passed
        ? `Node ${nodeId} has property ${property}${value !== undefined ? ` ${value}` : ''}`
        : `Node ${nodeId} missing property ${property} on line ${lineIndex + 1}: "${line.trim()}"`,
      expected: `${property}${value !== undefined ? ` ${value}` : ''}`,
      actual: line.trim(),
    })
  }

  /**
   * Assert a specific line contains pattern
   */
  lineContains(lineNumber: number, pattern: string | RegExp): void {
    const code = this.getCode()
    const lines = code.split('\n')
    const line = lines[lineNumber - 1] || ''

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    const passed = regex.test(line)

    this.collector.add({
      passed,
      message: passed
        ? `Line ${lineNumber} contains ${pattern}`
        : `Line ${lineNumber} does not contain ${pattern}`,
      expected: pattern.toString(),
      actual: line,
    })
  }

  /**
   * Assert a specific line does NOT contain pattern
   */
  lineNotContains(lineNumber: number, pattern: string | RegExp): void {
    const code = this.getCode()
    const lines = code.split('\n')
    const line = lines[lineNumber - 1] || ''

    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    const contains = regex.test(line)
    const passed = !contains

    this.collector.add({
      passed,
      message: passed
        ? `Line ${lineNumber} does not contain ${pattern}`
        : `Line ${lineNumber} unexpectedly contains ${pattern}`,
      expected: `NOT: ${pattern.toString()}`,
      actual: line,
    })
  }

  /**
   * Assert the exact code line of a node (trimmed comparison)
   */
  nodeLineEquals(nodeId: string, expected: string): void {
    const sourceMap = this.getSourceMap()
    if (!sourceMap) {
      this.collector.add({
        passed: false,
        message: 'No source map available',
        expected,
        actual: null,
      })
      return
    }

    const node = sourceMap.getNodeById?.(nodeId) || sourceMap.nodeMap?.get?.(nodeId)
    if (!node) {
      this.collector.add({
        passed: false,
        message: `Node ${nodeId} not found in source map`,
        expected,
        actual: null,
      })
      return
    }

    const code = this.getCode()
    const lines = code.split('\n')
    const lineIndex = (node.position?.line ?? node.line) - 1
    const line = lines[lineIndex] || ''

    const passed = line.trim() === expected.trim()
    this.collector.add({
      passed,
      message: passed ? `Node ${nodeId} line matches expected` : `Node ${nodeId} line mismatch`,
      expected: expected.trim(),
      actual: line.trim(),
    })
  }

  // =============================================================================
  // Side Effect Checks
  // =============================================================================

  /**
   * Snapshot current code for later comparison
   */
  snapshotCode(): string {
    return this.getCode()
  }

  /**
   * Assert only specific lines changed since snapshot
   */
  onlyLinesChanged(snapshot: string, allowedLines: number[]): void {
    const before = snapshot.split('\n')
    const after = this.getCode().split('\n')

    const changedLines: number[] = []
    const maxLines = Math.max(before.length, after.length)

    for (let i = 0; i < maxLines; i++) {
      if (before[i] !== after[i]) {
        changedLines.push(i + 1) // 1-indexed
      }
    }

    const unexpectedChanges = changedLines.filter(line => !allowedLines.includes(line))
    const passed = unexpectedChanges.length === 0

    this.collector.add({
      passed,
      message: passed
        ? `Only lines ${allowedLines.join(', ')} changed as expected`
        : `Unexpected changes on lines: ${unexpectedChanges.join(', ')}`,
      expected: `Changes only on lines ${allowedLines.join(', ')}`,
      actual:
        changedLines.length > 0 ? `Changes on lines ${changedLines.join(', ')}` : 'No changes',
    })
  }

  /**
   * Assert code unchanged except for specific line
   */
  codeUnchangedExcept(snapshot: string, changedLine: number): void {
    this.onlyLinesChanged(snapshot, [changedLine])
  }

  // =============================================================================
  // Visual Validations
  // =============================================================================

  /**
   * Assert element has specific icon
   */
  hasIcon(nodeId: string, iconName: string): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: iconName,
        actual: null,
      })
      return
    }

    // Check various ways icon might be specified
    const dataIcon = info.dataAttributes['data-icon']
    const useHref = info.attributes['href'] || ''

    // Also check for SVG content with the icon name
    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
    const svgUse = element?.querySelector('use')
    const svgHref = svgUse?.getAttribute('href') || svgUse?.getAttribute('xlink:href') || ''

    // Check if any of these contain the icon name
    const found =
      dataIcon === iconName ||
      useHref.includes(iconName) ||
      svgHref.includes(iconName) ||
      info.fullText === iconName

    this.collector.add({
      passed: found,
      message: found
        ? `Element ${nodeId} has icon "${iconName}"`
        : `Expected icon "${iconName}", found "${dataIcon || svgHref || 'none'}"`,
      expected: iconName,
      actual: dataIcon || svgHref || info.fullText || 'none',
    })
  }

  /**
   * Assert icon has specific color
   */
  hasIconColor(nodeId: string, color: string): void {
    // Icons typically use 'color' CSS property (currentColor for SVG)
    this.hasStyle(nodeId, 'color', color)
  }

  /**
   * Assert image has specific src
   */
  hasImageSrc(nodeId: string, src: string): void {
    const info = this.inspector.inspect(nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${nodeId} not found`,
        expected: src,
        actual: null,
      })
      return
    }

    const actualSrc = info.attributes['src'] || ''
    // Allow partial match for URLs (handles relative vs absolute)
    const passed = actualSrc === src || actualSrc.endsWith(src) || actualSrc.includes(src)

    this.collector.add({
      passed,
      message: passed
        ? `Element ${nodeId} has src "${src}"`
        : `Expected src "${src}", got "${actualSrc}"`,
      expected: src,
      actual: actualSrc,
    })
  }

  // =============================================================================
  // Structure Validations
  // =============================================================================

  /**
   * Assert element is child of parent
   */
  isChildOf(childId: string, parentId: string): void {
    const childInfo = this.inspector.inspect(childId)
    if (!childInfo) {
      this.collector.add({
        passed: false,
        message: `Child element ${childId} not found`,
        expected: parentId,
        actual: null,
      })
      return
    }

    const passed = childInfo.parent === parentId
    this.collector.add({
      passed,
      message: passed
        ? `${childId} is child of ${parentId}`
        : `${childId} is not child of ${parentId} (actual parent: ${childInfo.parent || 'none'})`,
      expected: parentId,
      actual: childInfo.parent,
    })
  }

  /**
   * Assert nodeA comes before nodeB in sibling order
   */
  isSiblingBefore(nodeA: string, nodeB: string): void {
    const infoA = this.inspector.inspect(nodeA)
    const infoB = this.inspector.inspect(nodeB)

    if (!infoA) {
      this.collector.add({
        passed: false,
        message: `Node ${nodeA} not found`,
        expected: `${nodeA} before ${nodeB}`,
        actual: null,
      })
      return
    }

    if (!infoB) {
      this.collector.add({
        passed: false,
        message: `Node ${nodeB} not found`,
        expected: `${nodeA} before ${nodeB}`,
        actual: null,
      })
      return
    }

    if (infoA.parent !== infoB.parent) {
      this.collector.add({
        passed: false,
        message: `Nodes ${nodeA} and ${nodeB} are not siblings (different parents)`,
        expected: `${nodeA} before ${nodeB}`,
        actual: `${nodeA} parent: ${infoA.parent}, ${nodeB} parent: ${infoB.parent}`,
      })
      return
    }

    // Get parent to check child order
    const parentInfo = infoA.parent ? this.inspector.inspect(infoA.parent) : null
    if (!parentInfo) {
      this.collector.add({
        passed: false,
        message: 'Parent not found',
        expected: `${nodeA} before ${nodeB}`,
        actual: null,
      })
      return
    }

    const indexA = parentInfo.children.indexOf(nodeA)
    const indexB = parentInfo.children.indexOf(nodeB)
    const passed = indexA < indexB && indexA !== -1 && indexB !== -1

    this.collector.add({
      passed,
      message: passed
        ? `${nodeA} (index ${indexA}) comes before ${nodeB} (index ${indexB})`
        : `${nodeA} (index ${indexA}) does NOT come before ${nodeB} (index ${indexB})`,
      expected: `${nodeA} before ${nodeB}`,
      actual: `${nodeA} at index ${indexA}, ${nodeB} at index ${indexB}`,
    })
  }

  /**
   * Assert tree structure matches expectation
   */
  hasStructure(rootId: string, expected: import('./types').StructureExpectation): void {
    const rootInfo = this.inspector.inspect(rootId)
    if (!rootInfo) {
      this.collector.add({
        passed: false,
        message: `Root element ${rootId} not found`,
        expected: JSON.stringify(expected),
        actual: null,
      })
      return
    }

    // Check tag if specified
    if (expected.tag && rootInfo.tagName !== expected.tag.toLowerCase()) {
      this.collector.add({
        passed: false,
        message: `Element ${rootId} has wrong tag`,
        expected: expected.tag,
        actual: rootInfo.tagName,
      })
      return
    }

    // Check children if specified
    if (expected.children) {
      const actualChildren = rootInfo.children
      if (actualChildren.length !== expected.children.length) {
        this.collector.add({
          passed: false,
          message: `Element ${rootId} has wrong number of children`,
          expected: expected.children.length,
          actual: actualChildren.length,
        })
        return
      }

      // Recursively check each child
      for (let i = 0; i < expected.children.length; i++) {
        const expectedChild = expected.children[i]
        const actualChildId = actualChildren[i]

        if (typeof expectedChild === 'string') {
          // Just check node ID
          if (expectedChild !== actualChildId) {
            this.collector.add({
              passed: false,
              message: `Child ${i} of ${rootId} should be ${expectedChild}`,
              expected: expectedChild,
              actual: actualChildId,
            })
            return
          }
        } else {
          // Recursive structure check
          this.hasStructure(actualChildId, expectedChild)
          // If previous check failed, return early
          if (!this.collector.passed) return
        }
      }
    }

    this.collector.add({
      passed: true,
      message: `Element ${rootId} matches expected structure`,
      expected: JSON.stringify(expected),
      actual: 'matches',
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

  /**
   * Assert element has specific icon
   */
  hasIcon(iconName: string): this {
    const info = this.inspector.inspect(this.nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: iconName,
        actual: null,
      })
      return this
    }

    const dataIcon = info.dataAttributes['data-icon']
    const element = document.querySelector(`[data-mirror-id="${this.nodeId}"]`)
    const svgUse = element?.querySelector('use')
    const svgHref = svgUse?.getAttribute('href') || svgUse?.getAttribute('xlink:href') || ''

    const found = dataIcon === iconName || svgHref.includes(iconName) || info.fullText === iconName

    this.collector.add({
      passed: found,
      message: found
        ? `Element has icon "${iconName}"`
        : `Expected icon "${iconName}", found "${dataIcon || svgHref || 'none'}"`,
      expected: iconName,
      actual: dataIcon || svgHref || 'none',
    })
    return this
  }

  /**
   * Assert icon has specific color
   */
  hasIconColor(color: string): this {
    return this.hasStyle('color', color)
  }

  /**
   * Assert image has specific src
   */
  hasImageSrc(src: string): this {
    const info = this.inspector.inspect(this.nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: src,
        actual: null,
      })
      return this
    }

    const actualSrc = info.attributes['src'] || ''
    const passed = actualSrc === src || actualSrc.endsWith(src) || actualSrc.includes(src)

    this.collector.add({
      passed,
      message: passed ? `Element has src "${src}"` : `Expected src "${src}", got "${actualSrc}"`,
      expected: src,
      actual: actualSrc,
    })
    return this
  }

  /**
   * Assert element is child of parent
   */
  isChildOf(parentId: string): this {
    const info = this.inspector.inspect(this.nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: parentId,
        actual: null,
      })
      return this
    }

    const passed = info.parent === parentId
    this.collector.add({
      passed,
      message: passed
        ? `Element is child of ${parentId}`
        : `Element is not child of ${parentId} (actual parent: ${info.parent || 'none'})`,
      expected: parentId,
      actual: info.parent,
    })
    return this
  }

  /**
   * Assert element comes before another sibling
   */
  isBefore(siblingId: string): this {
    const info = this.inspector.inspect(this.nodeId)
    const siblingInfo = this.inspector.inspect(siblingId)

    if (!info || !siblingInfo) {
      this.collector.add({
        passed: false,
        message: !info ? `Element ${this.nodeId} not found` : `Sibling ${siblingId} not found`,
        expected: `${this.nodeId} before ${siblingId}`,
        actual: null,
      })
      return this
    }

    if (info.parent !== siblingInfo.parent) {
      this.collector.add({
        passed: false,
        message: 'Elements are not siblings',
        expected: `${this.nodeId} before ${siblingId}`,
        actual: `Different parents: ${info.parent} vs ${siblingInfo.parent}`,
      })
      return this
    }

    const parentInfo = info.parent ? this.inspector.inspect(info.parent) : null
    if (!parentInfo) {
      this.collector.add({
        passed: false,
        message: 'Parent not found',
        expected: `${this.nodeId} before ${siblingId}`,
        actual: null,
      })
      return this
    }

    const myIndex = parentInfo.children.indexOf(this.nodeId)
    const siblingIndex = parentInfo.children.indexOf(siblingId)
    const passed = myIndex < siblingIndex && myIndex !== -1 && siblingIndex !== -1

    this.collector.add({
      passed,
      message: passed
        ? `Element comes before ${siblingId}`
        : `Element (${myIndex}) does not come before ${siblingId} (${siblingIndex})`,
      expected: `index < ${siblingIndex}`,
      actual: myIndex,
    })
    return this
  }

  /**
   * Assert element has attribute
   */
  hasAttribute(attr: string, value?: string): this {
    const info = this.inspector.inspect(this.nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: value ?? true,
        actual: null,
      })
      return this
    }

    const actualValue = info.attributes[attr] ?? info.dataAttributes[`data-${attr}`]
    const hasAttr = actualValue !== undefined

    if (value !== undefined) {
      const passed = actualValue === value
      this.collector.add({
        passed,
        message: passed
          ? `Element has ${attr}="${value}"`
          : `Expected ${attr}="${value}", got "${actualValue}"`,
        expected: value,
        actual: actualValue,
      })
    } else {
      this.collector.add({
        passed: hasAttr,
        message: hasAttr ? `Element has attribute ${attr}` : `Element missing attribute ${attr}`,
        expected: true,
        actual: hasAttr,
      })
    }
    return this
  }

  /**
   * Assert element is hidden
   */
  isHidden(): this {
    const info = this.inspector.inspect(this.nodeId)
    const hidden = info ? !info.visible : true
    this.collector.add({
      passed: hidden,
      message: hidden
        ? `Element ${this.nodeId} is hidden`
        : `Element ${this.nodeId} is visible (expected hidden)`,
      expected: false,
      actual: info?.visible ?? null,
    })
    return this
  }

  /**
   * Assert element has style with numeric tolerance
   */
  hasStyleApprox(property: keyof ComputedStyles, value: number, tolerance: number): this {
    const info = this.inspector.inspect(this.nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: `${value} ±${tolerance}`,
        actual: null,
      })
      return this
    }

    const actualValue = info.styles[property]
    const numericMatch = actualValue?.match(/^(-?\d+(?:\.\d+)?)/)?.[1]
    const actualNumeric = numericMatch ? parseFloat(numericMatch) : NaN
    const passed = !isNaN(actualNumeric) && Math.abs(actualNumeric - value) <= tolerance

    this.collector.add({
      passed,
      message: passed
        ? `Element has ${property}: ${actualNumeric} (within ±${tolerance} of ${value})`
        : `Expected ${property}: ${value} ±${tolerance}, got "${actualValue}"`,
      expected: `${value} ±${tolerance}`,
      actual: actualValue,
    })
    return this
  }

  /**
   * Assert element has multiple styles at once
   */
  hasStyles(styles: Partial<Record<keyof ComputedStyles, string>>): this {
    const info = this.inspector.inspect(this.nodeId)
    if (!info) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: JSON.stringify(styles),
        actual: null,
      })
      return this
    }

    const failures: string[] = []
    for (const [property, expected] of Object.entries(styles)) {
      const actual = info.styles[property as keyof ComputedStyles]
      if (actual !== expected && !actual?.includes(expected)) {
        failures.push(`${property}: expected "${expected}", got "${actual}"`)
      }
    }

    const passed = failures.length === 0
    this.collector.add({
      passed,
      message: passed
        ? `Element has all expected styles`
        : `Style mismatches: ${failures.join('; ')}`,
      expected: JSON.stringify(styles),
      actual: JSON.stringify(
        Object.fromEntries(
          Object.keys(styles).map(k => [k, info.styles[k as keyof ComputedStyles]])
        )
      ),
    })
    return this
  }

  /**
   * Assert element has focus
   */
  hasFocus(): this {
    const element = document.querySelector(
      `[data-mirror-id="${this.nodeId}"]`
    ) as HTMLElement | null
    const hasFocus = element ? document.activeElement === element : false
    this.collector.add({
      passed: hasFocus,
      message: hasFocus
        ? `Element ${this.nodeId} has focus`
        : `Element ${this.nodeId} does not have focus`,
      expected: true,
      actual: hasFocus,
    })
    return this
  }

  /**
   * Assert element can receive focus
   */
  isFocusable(): this {
    const element = document.querySelector(
      `[data-mirror-id="${this.nodeId}"]`
    ) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: true,
        actual: null,
      })
      return this
    }

    const tagName = element.tagName.toLowerCase()
    const nativelyFocusable = ['button', 'input', 'textarea', 'select', 'a'].includes(tagName)
    const hasTabIndex = element.hasAttribute('tabindex')
    const tabIndexValue = element.getAttribute('tabindex')
    const isDisabled = element.hasAttribute('disabled')

    const isFocusable =
      (nativelyFocusable && !isDisabled) || (hasTabIndex && tabIndexValue !== '-1')

    this.collector.add({
      passed: isFocusable,
      message: isFocusable
        ? `Element ${this.nodeId} is focusable`
        : `Element ${this.nodeId} is not focusable`,
      expected: true,
      actual: isFocusable,
    })
    return this
  }

  /**
   * Assert element is currently animating
   */
  isAnimating(): this {
    const element = document.querySelector(
      `[data-mirror-id="${this.nodeId}"]`
    ) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: true,
        actual: null,
      })
      return this
    }

    const computedStyle = getComputedStyle(element)
    const animationName = computedStyle.animationName
    const animationPlayState = computedStyle.animationPlayState
    const animationDuration = computedStyle.animationDuration

    const hasAnimation = animationName !== 'none' && animationName !== ''
    const isRunning = animationPlayState === 'running'
    const hasDuration = animationDuration !== '0s' && animationDuration !== ''
    const isAnimating = hasAnimation && isRunning && hasDuration

    this.collector.add({
      passed: isAnimating,
      message: isAnimating
        ? `Element ${this.nodeId} is animating (${animationName})`
        : `Element ${this.nodeId} is not animating`,
      expected: true,
      actual: isAnimating,
    })
    return this
  }

  /**
   * Assert element has specific animation
   */
  hasAnimation(animationName: string): this {
    const element = document.querySelector(
      `[data-mirror-id="${this.nodeId}"]`
    ) as HTMLElement | null
    if (!element) {
      this.collector.add({
        passed: false,
        message: `Element ${this.nodeId} not found`,
        expected: animationName,
        actual: null,
      })
      return this
    }

    const computedStyle = getComputedStyle(element)
    const actualAnimation = computedStyle.animationName
    const animationList = actualAnimation.split(',').map(a => a.trim())
    const hasAnimation = animationList.some(a => a === animationName || a.includes(animationName))

    this.collector.add({
      passed: hasAnimation,
      message: hasAnimation
        ? `Element has animation "${animationName}"`
        : `Element does not have animation "${animationName}" (has: "${actualAnimation}")`,
      expected: animationName,
      actual: actualAnimation,
    })
    return this
  }
}
