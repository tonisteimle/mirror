/**
 * Primitives Test Suite
 *
 * Tests all primitive elements render correctly.
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Basic Primitives
// =============================================================================

export const basicPrimitives: TestCase[] = describe('Basic Primitives', [
  // Frame
  testWithSetup('Frame renders as flex column div', 'Frame', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'div', 'Frame should be div')
    api.assert.hasStyle('node-1', 'display', 'flex')
    api.assert.hasStyle('node-1', 'flexDirection', 'column')
  }),

  testWithSetup('Frame alias Box works', 'Box gap 8', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'gap', '8px')
  }),

  // Text
  testWithSetup('Text renders as span', 'Text "Hello World"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'span', 'Text should be span')
    api.assert.hasText('node-1', 'Hello World')
  }),

  testWithSetup('Text with special characters', 'Text "Ümläüt & Spëcîål"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasText('node-1', 'Ümläüt & Spëcîål')
  }),

  // Button
  testWithSetup('Button renders as button element', 'Button "Click"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'button', 'Button should be button element')
    api.assert.hasText('node-1', 'Click')
    api.assert.ok(info?.interactive === true, 'Button should be interactive')
  }),

  // Input
  testWithSetup('Input renders as input element', 'Input', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'input', 'Input should be input element')
  }),

  testWithSetup(
    'Input with placeholder',
    'Input placeholder "Enter email"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasAttribute('node-1', 'placeholder', 'Enter email')
    }
  ),

  // Textarea
  testWithSetup(
    'Textarea renders as textarea',
    'Textarea placeholder "Message"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info?.tagName === 'textarea', 'Textarea should be textarea element')
      api.assert.hasAttribute('node-1', 'placeholder', 'Message')
    }
  ),

  // Image
  testWithSetup('Image renders as img', 'Image src "test.jpg"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'img', 'Image should be img element')
  }),

  testWithSetup('Image alias Img works', 'Img src "photo.png"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'img', 'Img should be img element')
  }),

  // Icon
  testWithSetup('Icon renders', 'Icon "check"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Icons are spans containing SVG
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Icon should render')
  }),

  testWithSetup('Icon with size', 'Icon "star", is 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    // Icon size is applied to width/height
  }),

  testWithSetup('Icon with color', 'Icon "heart", ic #ef4444', async (api: TestAPI) => {
    api.assert.exists('node-1')
  }),

  // Link
  testWithSetup(
    'Link renders as anchor',
    'Link "Click here", href "/page"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = api.preview.inspect('node-1')
      api.assert.ok(info?.tagName === 'a', 'Link should be anchor element')
      api.assert.hasText('node-1', 'Click here')
    }
  ),

  // Divider
  testWithSetup('Divider renders as hr', 'Divider', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'hr', 'Divider should be hr element')
  }),

  // Spacer - TODO: Spacer height behavior needs investigation
  testSkip('Spacer renders as div', 'Frame\n  Spacer h 20, w 100', async (api: TestAPI) => {
    // Spacer is node-2 (Frame=1, Spacer=2)
    api.assert.exists('node-2')
    const info = api.preview.inspect('node-2')
    api.assert.ok(info?.tagName === 'div', 'Spacer should be div')
    api.assert.hasStyle('node-2', 'height', '20px')
    api.assert.hasStyle('node-2', 'width', '100px')
  }),

  // Label
  testWithSetup('Label renders as label', 'Label "Name:"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info?.tagName === 'label', 'Label should be label element')
  }),
])

// =============================================================================
// Semantic HTML Primitives
// =============================================================================

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

// =============================================================================
// Heading Primitives
// =============================================================================

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

// =============================================================================
// Export All
// =============================================================================

export const allPrimitivesTests: TestCase[] = [
  ...basicPrimitives,
  ...semanticPrimitives,
  ...headingPrimitives,
]
