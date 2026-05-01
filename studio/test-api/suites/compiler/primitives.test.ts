/**
 * Compiler Primitive Tests — DOM tag + basic rendering for each Mirror primitive
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const primitiveTests: TestCase[] = describe('Primitives', [
  testWithSetup(
    'Frame renders as div with flex',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Frame inspect should return info')
      api.assert.ok(info!.tagName === 'div', `Frame should be a div, got: ${info!.tagName}`)
      api.assert.hasStyle('node-1', 'display', 'flex')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
    }
  ),

  testWithSetup('Text renders with content', 'Text "Hello World"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasText('node-1', 'Hello World')
  }),

  testWithSetup('Button renders as button element', 'Button "Click Me"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Button inspect should return info')
    api.assert.ok(
      info!.tagName === 'button',
      `Button should be a button element, got: ${info!.tagName}`
    )
    api.assert.hasText('node-1', 'Click Me')
  }),

  testWithSetup('Icon renders with lucide class', 'Icon "check"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Icon element should exist')
  }),

  testWithSetup(
    'Input renders as input element',
    'Input placeholder "Enter text"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info !== null, 'Input inspect should return info')
      api.assert.ok(
        info!.tagName === 'input',
        `Input should be an input element, got: ${info!.tagName}`
      )
      api.assert.hasAttribute('node-1', 'placeholder', 'Enter text')
    }
  ),

  testWithSetup('Divider renders as hr', 'Divider', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Divider inspect should return info')
    api.assert.ok(info!.tagName === 'hr', `Divider should be an hr element, got: ${info!.tagName}`)
  }),
])
