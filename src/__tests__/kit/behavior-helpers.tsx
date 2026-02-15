/**
 * Behavior Test Helpers
 *
 * Utilities for testing interactive behavior with events and state changes.
 */
import React from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { parse } from '../../parser/parser'
import { generateReactElement } from '../../generator/react-generator'
import { PreviewProviders } from '../../generator/preview-providers'

/**
 * Render DSL with full interactive providers.
 * Use this when testing behavior/events/state changes.
 */
export function renderInteractive(dsl: string): RenderResult {
  const result = parse(dsl)
  const elements = generateReactElement(result.nodes)

  return render(
    <PreviewProviders
      registry={result.registry}
      tokens={result.tokens}
    >
      {elements}
    </PreviewProviders>
  )
}

/**
 * Render DSL and return both render result and parse result.
 */
export function renderInteractiveWithContext(dsl: string) {
  const parseResult = parse(dsl)
  const elements = generateReactElement(parseResult.nodes)

  const renderResult = render(
    <PreviewProviders
      registry={parseResult.registry}
      tokens={parseResult.tokens}
    >
      {elements}
    </PreviewProviders>
  )

  return {
    ...renderResult,
    parseResult,
  }
}

/**
 * Helper to find an element by its DSL className.
 */
export function findByDSLClass(
  container: HTMLElement,
  className: string
): HTMLElement | null {
  return container.querySelector(`.${className}`)
}

/**
 * Helper to find all elements by DSL className.
 */
export function findAllByDSLClass(
  container: HTMLElement,
  className: string
): HTMLElement[] {
  return Array.from(container.querySelectorAll(`.${className}`))
}

/**
 * Helper to check if an element has a data attribute.
 */
export function hasDataAttr(
  element: HTMLElement,
  attr: string,
  value?: string
): boolean {
  const dataKey = attr.startsWith('data-') ? attr : `data-${attr}`
  const attrValue = element.getAttribute(dataKey)
  if (value !== undefined) {
    return attrValue === value
  }
  return attrValue !== null
}

/**
 * Helper to check element visibility via computed styles.
 */
export function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/**
 * Helper to get computed style value.
 */
export function getComputedStyleValue(
  element: HTMLElement,
  property: string
): string {
  return window.getComputedStyle(element).getPropertyValue(property)
}

/**
 * Wait for state change after an action.
 * Useful when behavior state updates are async.
 */
export async function waitForStateChange(
  element: HTMLElement,
  dataAttr: string,
  expectedValue: string,
  timeout = 1000
): Promise<void> {
  const startTime = Date.now()
  const dataKey = dataAttr.startsWith('data-') ? dataAttr : `data-${dataAttr}`

  return new Promise((resolve, reject) => {
    const check = () => {
      if (element.getAttribute(dataKey) === expectedValue) {
        resolve()
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for ${dataKey}="${expectedValue}"`))
      } else {
        requestAnimationFrame(check)
      }
    }
    check()
  })
}
