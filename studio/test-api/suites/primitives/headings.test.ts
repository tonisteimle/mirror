/**
 * Heading Primitives Tests
 *
 * Tests for: H1, H2, H3, H4, H5, H6
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to assert heading tag name with proper null checking
function assertHeading(api: TestAPI, nodeId: string, expectedTag: string, name: string): void {
  api.assert.exists(nodeId)
  const info = api.preview.inspect(nodeId)
  api.assert.ok(info !== null, `${name} inspect should return info`)
  api.assert.ok(
    info!.tagName === expectedTag,
    `${name} should be ${expectedTag} element, got: ${info!.tagName}`
  )
}

export const headingPrimitives: TestCase[] = describe('Headings', [
  testWithSetup('H1 renders as h1', 'H1 "Title"', async (api: TestAPI) => {
    assertHeading(api, 'node-1', 'h1', 'H1')
    api.assert.hasText('node-1', 'Title')
  }),

  testWithSetup('H2 renders as h2', 'H2 "Subtitle"', async (api: TestAPI) => {
    assertHeading(api, 'node-1', 'h2', 'H2')
  }),

  testWithSetup('H3 renders as h3', 'H3 "Section"', async (api: TestAPI) => {
    assertHeading(api, 'node-1', 'h3', 'H3')
  }),

  testWithSetup('H4 renders as h4', 'H4 "Subsection"', async (api: TestAPI) => {
    assertHeading(api, 'node-1', 'h4', 'H4')
  }),

  testWithSetup('H5 renders as h5', 'H5 "Minor"', async (api: TestAPI) => {
    assertHeading(api, 'node-1', 'h5', 'H5')
  }),

  testWithSetup('H6 renders as h6', 'H6 "Smallest"', async (api: TestAPI) => {
    assertHeading(api, 'node-1', 'h6', 'H6')
  }),
])
