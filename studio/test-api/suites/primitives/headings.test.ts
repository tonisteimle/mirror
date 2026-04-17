/**
 * Heading Primitives Tests
 *
 * Tests for: H1, H2, H3, H4, H5, H6
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const headingPrimitives: TestCase[] = describe('Headings', [
  testWithSetup('H1 renders as h1', 'H1 "Title"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'h1', 'H1 should be h1 element')
    api.assert.hasText('node-1', 'Title')
  }),

  testWithSetup('H2 renders as h2', 'H2 "Subtitle"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'h2', 'H2 should be h2 element')
  }),

  testWithSetup('H3 renders as h3', 'H3 "Section"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'h3', 'H3 should be h3 element')
  }),

  testWithSetup('H4 renders as h4', 'H4 "Subsection"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'h4', 'H4 should be h4 element')
  }),

  testWithSetup('H5 renders as h5', 'H5 "Minor"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'h5', 'H5 should be h5 element')
  }),

  testWithSetup('H6 renders as h6', 'H6 "Smallest"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'h6', 'H6 should be h6 element')
  }),
])
