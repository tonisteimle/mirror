/**
 * Tutorial Test Utilities
 *
 * Rendert Mirror-Code MIT Runtime, sodass Events funktionieren.
 */

import { parse } from '../../../compiler/parser'
import { generateDOM } from '../../../compiler/backends/dom'

/**
 * Rendert Mirror-Code und gibt UI-Objekt zurück.
 * Inkludiert die Runtime, sodass Events funktionieren.
 */
export function renderWithRuntime(code: string, container: HTMLElement): {
  root: HTMLElement
  elements: Record<string, HTMLElement>
  update: () => void
} {
  const ast = parse(code)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }

  let domCode = generateDOM(ast)

  // Remove 'export' keyword for eval
  domCode = domCode.replace(/^export\s+function/gm, 'function')

  // Execute the code
  const fn = new Function(domCode + '\nreturn createUI();')
  const ui = fn()

  container.appendChild(ui.root)

  return {
    root: ui.root as HTMLElement,
    elements: ui.elements || {},
    update: ui.update || (() => {})
  }
}

/**
 * Simuliert einen Click-Event auf ein Element
 */
export function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

/**
 * Simuliert einen Hover-Event (mouseenter)
 */
export function hover(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
}

/**
 * Simuliert Focus
 */
export function focus(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
}

/**
 * Holt den aktuellen State eines Elements
 */
export function getState(el: HTMLElement): string {
  return el.dataset.state || 'default'
}

/**
 * Prüft ob ein Element einen bestimmten Style hat
 */
export function hasStyle(el: HTMLElement, prop: string, value: string): boolean {
  const style = el.style.getPropertyValue(prop) || (el.style as any)[prop]
  return style === value
}

/**
 * Wartet N Millisekunden (für Animationen)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
