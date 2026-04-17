/**
 * Basic Primitives Tests
 *
 * Tests for: Frame, Text, Button, Input, Textarea, Image, Icon, Link, Divider, Spacer, Label
 */

import { testWithSetup, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

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
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Icon should render')
  }),

  testWithSetup('Icon with size', 'Icon "star", is 24', async (api: TestAPI) => {
    api.assert.exists('node-1')
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

  // Spacer
  testSkip('Spacer renders as div', 'Frame\n  Spacer h 20, w 100', async (api: TestAPI) => {
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
