/**
 * Semantic HTML Primitives Tests
 *
 * Tests for: Header, Nav, Main, Section, Article, Aside, Footer
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const semanticPrimitives: TestCase[] = describe('Semantic HTML', [
  testWithSetup('Header renders as header', 'Header', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'header', 'Header should be header element')
  }),

  testWithSetup('Nav renders as nav', 'Nav', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'nav', 'Nav should be nav element')
  }),

  testWithSetup('Main renders as main', 'Main', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'main', 'Main should be main element')
  }),

  testWithSetup('Section renders as section', 'Section', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'section', 'Section should be section element')
  }),

  testWithSetup('Article renders as article', 'Article', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'article', 'Article should be article element')
  }),

  testWithSetup('Aside renders as aside', 'Aside', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'aside', 'Aside should be aside element')
  }),

  testWithSetup('Footer renders as footer', 'Footer', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'footer', 'Footer should be footer element')
  }),
])
