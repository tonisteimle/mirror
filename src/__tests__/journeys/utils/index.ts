/**
 * Journey Test Utilities
 *
 * Erweiterte Test-Utilities für User Journey Tests,
 * die inkrementelles UI-Building simulieren.
 */

// Re-export from central test-utils
export { parse, parseAndRender, getParseErrors, getSyntaxWarnings, colorsMatch } from '../../test-utils'

// Journey-spezifische Utilities
import { parse, parseAndRender, getParseErrors, colorsMatch } from '../../test-utils'
import { screen, fireEvent } from '@testing-library/react'

// ============================================================
// Types
// ============================================================

export type JourneyStep = {
  name: string
  code: string
  description?: string
}

export type ValidationResult = {
  parseSuccess: boolean
  renderSuccess: boolean
  errors: string[]
}

export type ElementQuery = {
  container: HTMLElement
  element: HTMLElement | null
  elements: NodeListOf<Element>
}

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Validiert einen Journey-Schritt vollständig
 */
export function validateStep(code: string): ValidationResult {
  const errors: string[] = []

  // 1. Parser-Validierung
  let parseResult
  try {
    parseResult = parse(code)
    const parseErrors = getParseErrors(parseResult)
    if (parseErrors.length > 0) {
      errors.push(...parseErrors.map(e => `Parse: ${e.message}`))
    }
  } catch (e) {
    errors.push(`Parse crash: ${e}`)
    return { parseSuccess: false, renderSuccess: false, errors }
  }

  // 2. Render-Validierung
  try {
    parseAndRender(code)
  } catch (e) {
    errors.push(`Render: ${e}`)
    return { parseSuccess: true, renderSuccess: false, errors }
  }

  return {
    parseSuccess: true,
    renderSuccess: errors.length === 0,
    errors,
  }
}

/**
 * Validiert und rendert - wirft bei Fehlern
 */
export function validateAndRender(code: string) {
  const result = validateStep(code)
  if (!result.parseSuccess || !result.renderSuccess) {
    throw new Error(`Validation failed:\n${result.errors.join('\n')}`)
  }
  return parseAndRender(code)
}

// ============================================================
// Element Query Helpers
// ============================================================

/**
 * Findet Element(e) mit data-id Prefix
 */
export function queryByDataId(
  prefix: string,
  container?: HTMLElement
): ElementQuery {
  const root = container || document.body
  const elements = root.querySelectorAll(`[data-id^="${prefix}"]`)
  return {
    container: root as HTMLElement,
    element: elements[0] as HTMLElement | null,
    elements,
  }
}

/**
 * Prüft ob ein Element mit data-id existiert
 */
export function hasElement(dataIdPrefix: string, container?: HTMLElement): boolean {
  return queryByDataId(dataIdPrefix, container).element !== null
}

/**
 * Zählt Elemente mit data-id Prefix
 */
export function countElements(dataIdPrefix: string, container?: HTMLElement): number {
  return queryByDataId(dataIdPrefix, container).elements.length
}

/**
 * Prüft ob ein Element mit bestimmtem Text existiert
 */
export function hasVisibleText(text: string | RegExp): boolean {
  try {
    const element = screen.queryByText(text)
    return element !== null
  } catch {
    return false
  }
}

/**
 * Findet alle Elemente mit Text (für Duplikate)
 */
export function queryAllByText(text: string): HTMLElement[] {
  try {
    return screen.queryAllByText(text) as HTMLElement[]
  } catch {
    return []
  }
}

// ============================================================
// Style Helpers
// ============================================================

/**
 * Holt CSS-Property eines Elements
 */
export function getStyle(
  dataId: string,
  property: keyof CSSStyleDeclaration,
  container?: HTMLElement
): string | null {
  const { element } = queryByDataId(dataId, container)
  if (!element) return null
  return element.style[property] as string
}

/**
 * Prüft mehrere CSS-Properties auf einmal
 */
export function checkStyles(
  dataId: string,
  expectedStyles: Record<string, string>,
  container?: HTMLElement
): { pass: boolean; failures: string[] } {
  const failures: string[] = []
  const { element } = queryByDataId(dataId, container)

  if (!element) {
    return { pass: false, failures: [`Element ${dataId} not found`] }
  }

  for (const [prop, expected] of Object.entries(expectedStyles)) {
    const actual = element.style[prop as any]
    if (actual !== expected) {
      failures.push(`${prop}: expected "${expected}", got "${actual}"`)
    }
  }

  return { pass: failures.length === 0, failures }
}

/**
 * Prüft ob Farbe übereinstimmt (normalisiert)
 */
export function hasBackgroundColor(
  dataId: string,
  expectedColor: string,
  container?: HTMLElement
): boolean {
  const bg = getStyle(dataId, 'backgroundColor', container)
  if (!bg) return false
  return colorsMatch(bg, expectedColor)
}

/**
 * Prüft ob Element bestimmte Flex-Direction hat
 */
export function hasFlexDirection(
  dataId: string,
  direction: 'row' | 'column',
  container?: HTMLElement
): boolean {
  return getStyle(dataId, 'flexDirection', container) === direction
}

// ============================================================
// Interaction Helpers
// ============================================================

/**
 * Führt Click auf Element mit data-id aus
 */
export function clickElement(dataId: string, container?: HTMLElement): boolean {
  const { element } = queryByDataId(dataId, container)
  if (!element) return false
  fireEvent.click(element)
  return true
}

/**
 * Führt Click auf Element mit Text aus
 */
export function clickByText(text: string): boolean {
  try {
    const element = screen.getByText(text)
    const clickTarget = element.closest('[data-id]') || element
    fireEvent.click(clickTarget)
    return true
  } catch {
    return false
  }
}

/**
 * Führt Hover auf Element aus
 */
export function hoverElement(dataId: string, container?: HTMLElement): boolean {
  const { element } = queryByDataId(dataId, container)
  if (!element) return false
  fireEvent.mouseEnter(element)
  return true
}

/**
 * Beendet Hover auf Element
 */
export function unhoverElement(dataId: string, container?: HTMLElement): boolean {
  const { element } = queryByDataId(dataId, container)
  if (!element) return false
  fireEvent.mouseLeave(element)
  return true
}

/**
 * Simuliert Hover und prüft Style-Änderung
 */
export function testHoverStyle(
  dataId: string,
  property: keyof CSSStyleDeclaration,
  expectedValue: string,
  container?: HTMLElement
): boolean {
  hoverElement(dataId, container)
  const value = getStyle(dataId, property, container)
  unhoverElement(dataId, container)
  return value === expectedValue
}

/**
 * Tippt in ein Input-Feld
 */
export function typeInInput(dataId: string, text: string, container?: HTMLElement): boolean {
  const { element } = queryByDataId(dataId, container)
  if (!element || !(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return false
  }
  fireEvent.change(element, { target: { value: text } })
  return true
}

/**
 * Fokussiert ein Element
 */
export function focusElement(dataId: string, container?: HTMLElement): boolean {
  const { element } = queryByDataId(dataId, container)
  if (!element) return false
  fireEvent.focus(element)
  return true
}

// ============================================================
// Incremental Code Builder
// ============================================================

/**
 * Builder für inkrementellen Code-Aufbau
 */
export class CodeBuilder {
  private lines: string[] = []
  private tokens: string[] = []
  private definitions: string[] = []
  private instances: string[] = []

  addToken(name: string, value: string): this {
    this.tokens.push(`$${name}: ${value}`)
    return this
  }

  addDefinition(def: string): this {
    this.definitions.push(def)
    return this
  }

  addInstance(inst: string): this {
    this.instances.push(inst)
    return this
  }

  addLine(line: string): this {
    this.lines.push(line)
    return this
  }

  build(): string {
    const parts: string[] = []
    if (this.tokens.length) parts.push(this.tokens.join('\n'))
    if (this.definitions.length) parts.push(this.definitions.join('\n\n'))
    if (this.instances.length) parts.push(this.instances.join('\n'))
    if (this.lines.length) parts.push(this.lines.join('\n'))
    return parts.join('\n\n')
  }

  clone(): CodeBuilder {
    const copy = new CodeBuilder()
    copy.tokens = [...this.tokens]
    copy.definitions = [...this.definitions]
    copy.instances = [...this.instances]
    copy.lines = [...this.lines]
    return copy
  }
}

// ============================================================
// Journey Report
// ============================================================

/**
 * Erstellt einen Journey-Report
 */
export function createJourneyReport(
  steps: Array<{ name: string; passed: boolean; errors: string[] }>
): string {
  const total = steps.length
  const passed = steps.filter(s => s.passed).length
  const failed = total - passed

  let report = `\n=== JOURNEY REPORT ===\n`
  report += `Total: ${total} | Passed: ${passed} | Failed: ${failed}\n\n`

  steps.forEach((step, i) => {
    const icon = step.passed ? '✓' : '✗'
    report += `${icon} Step ${i + 1}: ${step.name}\n`
    if (step.errors.length > 0) {
      step.errors.forEach(e => {
        report += `    - ${e}\n`
      })
    }
  })

  return report
}

// ============================================================
// Test Assertion Helpers
// ============================================================

/**
 * Assertion: Element existiert
 */
export function expectElement(dataId: string, container?: HTMLElement): void {
  const { element } = queryByDataId(dataId, container)
  if (!element) {
    throw new Error(`Expected element with data-id="${dataId}" to exist`)
  }
}

/**
 * Assertion: Element-Count
 */
export function expectElementCount(
  dataId: string,
  count: number,
  container?: HTMLElement
): void {
  const actual = countElements(dataId, container)
  if (actual !== count) {
    throw new Error(`Expected ${count} elements with data-id="${dataId}", found ${actual}`)
  }
}

/**
 * Assertion: Style-Check
 */
export function expectStyle(
  dataId: string,
  property: keyof CSSStyleDeclaration,
  expected: string,
  container?: HTMLElement
): void {
  const actual = getStyle(dataId, property, container)
  if (actual !== expected) {
    throw new Error(`Expected ${dataId}.${String(property)} to be "${expected}", got "${actual}"`)
  }
}
