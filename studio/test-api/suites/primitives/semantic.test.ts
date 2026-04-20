/**
 * Semantic HTML Primitives Tests
 *
 * Tests for: Header, Nav, Main, Section, Article, Aside, Footer
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to assert element tag name with proper null checking
function assertTagName(
  api: TestAPI,
  nodeId: string,
  expectedTag: string,
  elementName: string
): void {
  api.assert.exists(nodeId)
  const info = api.preview.inspect(nodeId)
  api.assert.ok(info !== null, `${elementName} inspect should return info`)
  api.assert.ok(
    info!.tagName === expectedTag,
    `${elementName} should be ${expectedTag} element, got: ${info!.tagName}`
  )
}

export const semanticPrimitives: TestCase[] = describe('Semantic HTML', [
  testWithSetup('Header renders as header', 'Header', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'header', 'Header')
  }),

  testWithSetup('Nav renders as nav', 'Nav', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'nav', 'Nav')
  }),

  testWithSetup('Main renders as main', 'Main', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'main', 'Main')
  }),

  testWithSetup('Section renders as section', 'Section', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'section', 'Section')
  }),

  testWithSetup('Article renders as article', 'Article', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'article', 'Article')
  }),

  testWithSetup('Aside renders as aside', 'Aside', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'aside', 'Aside')
  }),

  testWithSetup('Footer renders as footer', 'Footer', async (api: TestAPI) => {
    assertTagName(api, 'node-1', 'footer', 'Footer')
  }),
])
