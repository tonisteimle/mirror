/**
 * Test that `pos` property is correctly detected as absolute layout
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectLayout, isAbsoluteLayoutContainer } from '../../../src/studio/utils/layout-detection'

describe('pos property layout detection', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.setAttribute('data-mirror-id', 'test-node')
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should detect container with data-layout="absolute" as absolute', () => {
    container.style.position = 'relative'
    container.dataset.layout = 'absolute'

    const layout = detectLayout(container)
    expect(layout.type).toBe('absolute')
    expect(isAbsoluteLayoutContainer(container)).toBe(true)
  })

  it('should detect container with pos property (legacy: data-layout="pos") as absolute', () => {
    container.style.position = 'relative'
    container.dataset.layout = 'pos'

    const layout = detectLayout(container)
    expect(layout.type).toBe('absolute')
    expect(isAbsoluteLayoutContainer(container)).toBe(true)
  })

  it('should use AbsoluteDropStrategy for pos containers', () => {
    const { createDefaultRegistry } = require('../../../src/studio/drop-strategies/registry')
    const registry = createDefaultRegistry()

    container.style.position = 'relative'
    container.dataset.layout = 'absolute'

    const strategy = registry.getStrategy(container)
    expect(strategy).toBeDefined()
    expect(strategy.type).toBe('absolute')
  })
})
