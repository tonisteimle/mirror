/**
 * Render-Utilities für Mirror Dokumentations-Tests
 */

import { render } from '@testing-library/react'
import { generateReactElement } from '../../../generator/react-generator'
import { PreviewProviders } from '../../../generator/preview-providers'
import { parse } from '../../../parser/parser'
import React from 'react'

export type ParseResult = ReturnType<typeof parse>

/**
 * Rendert Mirror-Code zu React-Elementen mit allen nötigen Providern
 */
export function renderMirror(ast: ParseResult) {
  const elements = generateReactElement(ast.nodes || [], {})
  return render(
    React.createElement(PreviewProviders, null, elements)
  )
}

/**
 * Parst und rendert Mirror-Code in einem Schritt
 */
export function parseAndRender(code: string) {
  const ast = parse(code)
  const renderResult = renderMirror(ast)
  return { ast, ...renderResult }
}

/**
 * Findet das styled Element für ein Text-Element
 *
 * Manche Komponenten haben Text in <span>, andere direkt im <div>.
 * Diese Funktion findet das Element mit den Styles.
 */
export function getStyledElement(textElement: HTMLElement): HTMLElement {
  // Wenn das Element selbst data-id hat, ist es das styled Element
  if (textElement.getAttribute('data-id')) {
    return textElement
  }
  // Sonst ist es das Parent
  return textElement.parentElement || textElement
}

/**
 * Findet ein Element by Text und gibt das styled Element zurück
 */
export function getStyledElementByText(
  container: HTMLElement,
  text: string
): HTMLElement | null {
  const allElements = container.querySelectorAll('*')
  for (const el of allElements) {
    if (el.textContent === text || el.textContent?.includes(text)) {
      return getStyledElement(el as HTMLElement)
    }
  }
  return null
}
