/**
 * Test Utilities - Compilation Helpers
 *
 * Core functions for compiling and executing Mirror code in tests.
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM, toIR } from '../index'
import type { AST } from '../parser/ast'
import type { IRResult } from '../ir'
import type { DOMResult, MirrorAPI } from './types'

/**
 * Compiles Mirror code to JavaScript
 *
 * @param mirrorCode - Mirror source code
 * @returns Generated JavaScript code
 * @throws Error if parse errors occur
 */
export function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

/**
 * Parses Mirror code without generating output
 *
 * @param mirrorCode - Mirror source code
 * @returns AST (may contain errors)
 */
export function parseOnly(mirrorCode: string): AST {
  return parse(mirrorCode)
}

/**
 * Parses Mirror code and transforms to IR
 *
 * @param mirrorCode - Mirror source code
 * @returns IR result with nodes and source map
 * @throws Error if parse errors occur
 */
export function toIROnly(mirrorCode: string): IRResult {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return toIR(ast)
}

/**
 * Executes generated JavaScript code in JSDOM
 */
function executeInDOM(jsCode: string, data: Record<string, unknown> = {}): {
  dom: JSDOM
  root: HTMLElement
  api: MirrorAPI
} {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    runScripts: 'dangerously',
  })

  const { window } = dom
  const { document } = window

  // Remove 'export' keyword from generated code (JSDOM doesn't support ES modules)
  const executableCode = jsCode.replace(/^export /gm, '')

  // Wrap the generated code to make it executable
  const wrappedCode = `
    (function() {
      ${executableCode}
      window.__mirrorAPI = createUI(${JSON.stringify(data)});
      window.__mirrorRoot = window.__mirrorAPI.root;
    })();
  `

  const script = document.createElement('script')
  script.textContent = wrappedCode
  document.body.appendChild(script)

  return {
    dom,
    root: (window as any).__mirrorRoot,
    api: (window as any).__mirrorAPI,
  }
}

/**
 * Compiles and executes Mirror code in JSDOM
 *
 * @param mirrorCode - Mirror source code
 * @param data - Optional data to pass to the UI
 * @returns DOMResult with root element, API, and generated code
 *
 * @example
 * ```typescript
 * const { root } = compileAndExecute(`
 * Card as frame:
 *   pad 16, bg #1a1a23
 *
 * Card "Hello"
 * `)
 *
 * expect(root.style.padding).toBe('16px')
 * ```
 */
export function compileAndExecute(
  mirrorCode: string,
  data: Record<string, unknown> = {}
): DOMResult {
  const jsCode = compile(mirrorCode)
  const result = executeInDOM(jsCode, data)

  // root is the container, the first child is the actual element
  const container = result.root
  const root = container?.firstElementChild as HTMLElement

  // Extract styles from generated code (if any)
  const styleMatch = jsCode.match(/const styles = `([^`]*)`/)
  const styles = styleMatch ? styleMatch[1] : ''

  return {
    ...result,
    root,
    container,
    jsCode,
    styles,
  }
}

/**
 * Compiles Mirror code and returns only the generated JavaScript
 *
 * @param mirrorCode - Mirror source code
 * @returns Object with jsCode and parsed AST
 */
export function compileOnly(mirrorCode: string): { jsCode: string; ast: AST } {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  const jsCode = generateDOM(ast)
  return { jsCode, ast }
}

/**
 * Test helper for property testing
 *
 * @param name - Test name
 * @param mirrorProp - Mirror property string (e.g., "pad 16")
 * @param cssProp - Expected CSS property name
 * @param cssValue - Expected CSS value
 */
export function testProperty(
  mirrorProp: string,
  cssProp: string,
  cssValue: string
): { root: HTMLElement; actual: string } {
  const { root } = compileAndExecute(`Box as frame:\n  ${mirrorProp}\n\nBox`)
  const actual = root.style.getPropertyValue(cssProp) || (root.style as any)[cssProp]
  return { root, actual }
}
