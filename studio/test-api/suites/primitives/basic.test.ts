/**
 * Basic Primitives Tests
 *
 * Tests for: Frame, Text, Button, Input, Textarea, Image, Icon, Link, Divider, Spacer, Label
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Helper to inspect with null check
function inspectStrict(api: TestAPI, nodeId: string, elementName: string) {
  const info = api.preview.inspect(nodeId)
  api.assert.ok(info !== null, `${elementName} inspect should return info`)
  return info!
}

export const basicPrimitives: TestCase[] = describe('Basic Primitives', [
  // Frame
  testWithSetup('Frame renders as flex column div', 'Frame', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Frame')
    api.assert.ok(info.tagName === 'div', `Frame should be div, got: ${info.tagName}`)
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
    const info = inspectStrict(api, 'node-1', 'Text')
    api.assert.ok(info.tagName === 'span', `Text should be span, got: ${info.tagName}`)
    api.assert.hasText('node-1', 'Hello World')
  }),

  testWithSetup('Text with special characters', 'Text "Ümläüt & Spëcîål"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasText('node-1', 'Ümläüt & Spëcîål')
  }),

  // Button
  testWithSetup('Button renders as button element', 'Button "Click"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Button')
    api.assert.ok(
      info.tagName === 'button',
      `Button should be button element, got: ${info.tagName}`
    )
    api.assert.hasText('node-1', 'Click')
    api.assert.ok(
      info.interactive === true,
      `Button should be interactive, got: ${info.interactive}`
    )
  }),

  // Input
  testWithSetup('Input renders as input element', 'Input', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Input')
    api.assert.ok(info.tagName === 'input', `Input should be input element, got: ${info.tagName}`)
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
      const info = inspectStrict(api, 'node-1', 'Textarea')
      api.assert.ok(
        info.tagName === 'textarea',
        `Textarea should be textarea element, got: ${info.tagName}`
      )
      api.assert.hasAttribute('node-1', 'placeholder', 'Message')
    }
  ),

  // Image
  testWithSetup('Image renders as img', 'Image src "test.jpg"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Image')
    api.assert.ok(info.tagName === 'img', `Image should be img element, got: ${info.tagName}`)
  }),

  testWithSetup('Image alias Img works', 'Img src "photo.png"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Img')
    api.assert.ok(info.tagName === 'img', `Img should be img element, got: ${info.tagName}`)
  }),

  // Icon
  testWithSetup('Icon renders with SVG', 'Icon "check"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    await api.utils.delay(300) // Wait for SVG to load (increased from 100ms for reliability)
    const info = inspectStrict(api, 'node-1', 'Icon')
    api.assert.ok(info !== null, 'Icon should render')

    // Icon should contain an SVG element
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Icon element should exist')
    const svg = element.querySelector('svg')
    api.assert.ok(svg !== null, 'Icon should contain SVG element')
  }),

  testWithSetup('Icon with size', 'Icon "star", is 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
    await api.utils.delay(100) // Wait for SVG to load
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Icon element should exist')
    const svg = element.querySelector('svg')
    api.assert.ok(svg !== null, 'Icon should contain SVG element')

    // Validate size is approximately 24px
    const svgRect = svg!.getBoundingClientRect()
    api.assert.ok(
      Math.abs(svgRect.width - 24) < 4,
      `Icon width should be ~24px, got ${svgRect.width}px`
    )
    api.assert.ok(
      Math.abs(svgRect.height - 24) < 4,
      `Icon height should be ~24px, got ${svgRect.height}px`
    )
  }),

  testWithSetup('Icon with color', 'Icon "heart", ic #ef4444', async (api: TestAPI) => {
    api.assert.exists('node-1')
    await api.utils.delay(100) // Wait for SVG to load
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Icon element should exist')
    const svg = element.querySelector('svg')
    api.assert.ok(svg !== null, 'Icon should contain SVG element')

    // Validate stroke or fill color is #ef4444 (rgb(239, 68, 68))
    const stroke = window.getComputedStyle(svg!).stroke
    const color = window.getComputedStyle(svg!).color
    api.assert.ok(
      stroke.includes('239, 68, 68') ||
        color.includes('239, 68, 68') ||
        stroke.includes('ef4444') ||
        color.includes('ef4444'),
      `Icon color should be #ef4444, got stroke="${stroke}", color="${color}"`
    )
  }),

  testWithSetup('Icon with fill', 'Icon "heart", ic #ef4444, fill', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(element !== null, 'Icon element should exist')
    const svg = element.querySelector('svg')
    api.assert.ok(svg !== null, 'Icon should contain SVG element')

    // Check that fill is set (not just stroke)
    const fill = window.getComputedStyle(svg!).fill
    api.assert.ok(
      fill !== 'none' && fill !== '',
      `Icon with fill should have fill property set, got "${fill}"`
    )
  }),

  testWithSetup('Icon default size', 'Icon "check"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    const svg = element.querySelector('svg')
    api.assert.ok(svg !== null, 'Icon should contain SVG element')

    // Default icon size should be reasonable (typically 16-24px)
    const svgRect = svg!.getBoundingClientRect()
    api.assert.ok(
      svgRect.width >= 14 && svgRect.width <= 26,
      `Default icon size should be 16-24px, got ${svgRect.width}px`
    )
  }),

  // Link
  testWithSetup(
    'Link renders as anchor',
    'Link "Click here", href "/page"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const info = inspectStrict(api, 'node-1', 'Link')
      api.assert.ok(info.tagName === 'a', `Link should be anchor element, got: ${info.tagName}`)
      api.assert.hasText('node-1', 'Click here')
    }
  ),

  // Divider
  testWithSetup('Divider renders as hr', 'Divider', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Divider')
    api.assert.ok(info.tagName === 'hr', `Divider should be hr element, got: ${info.tagName}`)
  }),

  // Spacer
  testSkip('Spacer renders as div', 'Frame\n  Spacer h 20, w 100', async (api: TestAPI) => {
    api.assert.exists('node-2')
    const info = inspectStrict(api, 'node-2', 'Spacer')
    api.assert.ok(info.tagName === 'div', `Spacer should be div, got: ${info.tagName}`)
    api.assert.hasStyle('node-2', 'height', '20px')
    api.assert.hasStyle('node-2', 'width', '100px')
  }),

  // Label
  testWithSetup('Label renders as label', 'Label "Name:"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    const info = inspectStrict(api, 'node-1', 'Label')
    api.assert.ok(info.tagName === 'label', `Label should be label element, got: ${info.tagName}`)
  }),
])
