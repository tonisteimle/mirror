/**
 * Property-Primitive Matrix Tests
 *
 * Systematic tests verifying that each property works correctly
 * on all applicable primitives.
 *
 * Organization:
 * - Universal properties: work on all primitives
 * - Container properties: Frame and semantic containers
 * - Text properties: Text, Button, Link, H1-H6
 * - Specific properties: Icon, Image, Input, etc.
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// ============================================================================
// Helper Functions
// ============================================================================

function getElement(nodeId: string): HTMLElement | null {
  return document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
}

function getComputedStyleValue(nodeId: string, cssProperty: string): string {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return ''
  return window.getComputedStyle(element)[cssProperty as keyof CSSStyleDeclaration] as string
}

// ============================================================================
// Primitive Lists
// ============================================================================

// All basic primitives (excluding Zag components)
const ALL_PRIMITIVES = [
  'Frame',
  'Text',
  'Button',
  'Input',
  'Textarea',
  'Label',
  'Image',
  'Icon',
  'Link',
  'Divider',
  'Spacer',
] as const

// Container primitives that support layout properties
const CONTAINER_PRIMITIVES = [
  'Frame',
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
] as const

// Text primitives that support typography
const TEXT_PRIMITIVES = ['Text', 'Button', 'Link', 'Label', 'H1', 'H2', 'H3'] as const

// Semantic container primitives
const SEMANTIC_PRIMITIVES = [
  'Header',
  'Nav',
  'Main',
  'Section',
  'Article',
  'Aside',
  'Footer',
] as const

// Heading primitives
const HEADING_PRIMITIVES = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'] as const

// ============================================================================
// SIZING PROPERTIES - All Primitives
// ============================================================================

export const sizingMatrixTests: TestCase[] = describe('Sizing on All Primitives', [
  // Width tests
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `w (width) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", w 100`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", w 100`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", w 100`
            : `${primitive} "Test", w 100`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const width = getComputedStyleValue('node-1', 'width')
        api.assert.ok(width === '100px', `${primitive} w 100 should be 100px, got ${width}`)
      }
    )
  ),

  // Height tests (excluding Textarea and Spacer which have special behavior)
  ...ALL_PRIMITIVES.filter(p => p !== 'Textarea' && p !== 'Spacer').map(primitive =>
    testWithSetup(
      `h (height) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", h 50`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", h 50`
          : primitive === 'Input'
            ? `${primitive} placeholder "test", h 50`
            : `${primitive} "Test", h 50`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const height = getComputedStyleValue('node-1', 'height')
        api.assert.ok(height === '50px', `${primitive} h 50 should be 50px, got ${height}`)
      }
    )
  ),

  // Textarea height (min-height 80px by default in browsers)
  testWithSetup(
    'h (height) on Textarea',
    'Textarea placeholder "test", h 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const height = getComputedStyleValue('node-1', 'height')
      api.assert.ok(height === '100px', `Textarea h 100 should be 100px, got ${height}`)
    }
  ),

  // Spacer height - In horizontal layout, h is cross-axis and should work
  testWithSetup(
    'h (height) on Spacer',
    'Frame hor, gap 8\n  Text "A"\n  Spacer h 30, w 10, bg #333\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      // In horizontal layout, height is on cross-axis
      const height = getComputedStyleValue('node-3', 'height')
      api.assert.ok(height === '30px', `Spacer h 30 should be 30px, got ${height}`)
    }
  ),
])

// ============================================================================
// SPACING PROPERTIES - All Primitives
// ============================================================================

export const spacingMatrixTests: TestCase[] = describe('Spacing on All Primitives', [
  // Padding tests
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `pad (padding) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", pad 16`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", pad 16`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", pad 16`
            : `${primitive} "Test", pad 16`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const padding = getComputedStyleValue('node-1', 'padding')
        api.assert.ok(padding === '16px', `${primitive} pad 16 should be 16px, got ${padding}`)
      }
    )
  ),

  // Margin tests
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `mar (margin) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", mar 12`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", mar 12`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", mar 12`
            : `${primitive} "Test", mar 12`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const margin = getComputedStyleValue('node-1', 'margin')
        api.assert.ok(margin === '12px', `${primitive} mar 12 should be 12px, got ${margin}`)
      }
    )
  ),
])

// ============================================================================
// COLOR PROPERTIES - All Primitives
// ============================================================================

export const colorMatrixTests: TestCase[] = describe('Color on All Primitives', [
  // Background tests
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `bg (background) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", bg #ff0000`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", bg #ff0000`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", bg #ff0000`
            : `${primitive} "Test", bg #ff0000`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const bg = getComputedStyleValue('node-1', 'backgroundColor')
        // RGB(255, 0, 0) = #ff0000
        api.assert.ok(
          bg.includes('255') && bg.includes('0'),
          `${primitive} bg #ff0000 should be red, got ${bg}`
        )
      }
    )
  ),

  // Text color tests (mainly for text elements)
  ...TEXT_PRIMITIVES.map(primitive =>
    testWithSetup(
      `col (color) on ${primitive}`,
      `${primitive} "Test", col #00ff00`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const color = getComputedStyleValue('node-1', 'color')
        // RGB(0, 255, 0) = #00ff00
        api.assert.ok(
          color.includes('0') && color.includes('255'),
          `${primitive} col #00ff00 should be green, got ${color}`
        )
      }
    )
  ),
])

// ============================================================================
// BORDER PROPERTIES - All Primitives
// ============================================================================

export const borderMatrixTests: TestCase[] = describe('Border on All Primitives', [
  // Border width tests
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `bor (border) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", bor 2, boc #333`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", bor 2, boc #333`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", bor 2, boc #333`
            : `${primitive} "Test", bor 2, boc #333`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const borderWidth = getComputedStyleValue('node-1', 'borderTopWidth')
        api.assert.ok(borderWidth === '2px', `${primitive} bor 2 should be 2px, got ${borderWidth}`)
      }
    )
  ),

  // Border radius tests
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `rad (radius) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", rad 8`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", rad 8`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", rad 8`
            : `${primitive} "Test", rad 8`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const radius = getComputedStyleValue('node-1', 'borderRadius')
        api.assert.ok(radius === '8px', `${primitive} rad 8 should be 8px, got ${radius}`)
      }
    )
  ),
])

// ============================================================================
// LAYOUT PROPERTIES - Container Primitives Only
// ============================================================================

export const layoutMatrixTests: TestCase[] = describe('Layout on Container Primitives', [
  // Horizontal layout
  ...CONTAINER_PRIMITIVES.map(primitive =>
    testWithSetup(
      `hor (horizontal) on ${primitive}`,
      `${primitive} hor, gap 8\n  Text "A"\n  Text "B"`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const flexDir = getComputedStyleValue('node-1', 'flexDirection')
        api.assert.ok(flexDir === 'row', `${primitive} hor should be row, got ${flexDir}`)
      }
    )
  ),

  // Gap
  ...CONTAINER_PRIMITIVES.map(primitive =>
    testWithSetup(
      `gap on ${primitive}`,
      `${primitive} gap 16\n  Text "A"\n  Text "B"`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const gap = getComputedStyleValue('node-1', 'gap')
        api.assert.ok(gap === '16px', `${primitive} gap 16 should be 16px, got ${gap}`)
      }
    )
  ),

  // Center
  ...CONTAINER_PRIMITIVES.map(primitive =>
    testWithSetup(
      `center on ${primitive}`,
      `${primitive} center, w 200, h 100\n  Text "Centered"`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const justifyContent = getComputedStyleValue('node-1', 'justifyContent')
        const alignItems = getComputedStyleValue('node-1', 'alignItems')
        api.assert.ok(
          justifyContent === 'center' && alignItems === 'center',
          `${primitive} center should center content, got jc=${justifyContent}, ai=${alignItems}`
        )
      }
    )
  ),

  // Wrap
  ...CONTAINER_PRIMITIVES.map(primitive =>
    testWithSetup(
      `wrap on ${primitive}`,
      `${primitive} hor, wrap, w 100\n  Text "A"\n  Text "B"\n  Text "C"`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const flexWrap = getComputedStyleValue('node-1', 'flexWrap')
        api.assert.ok(flexWrap === 'wrap', `${primitive} wrap should be wrap, got ${flexWrap}`)
      }
    )
  ),
])

// ============================================================================
// TYPOGRAPHY PROPERTIES - Text Primitives Only
// ============================================================================

export const typographyMatrixTests: TestCase[] = describe('Typography on Text Primitives', [
  // Font size
  ...TEXT_PRIMITIVES.map(primitive =>
    testWithSetup(
      `fs (font-size) on ${primitive}`,
      `${primitive} "Test", fs 24`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const fontSize = getComputedStyleValue('node-1', 'fontSize')
        api.assert.ok(fontSize === '24px', `${primitive} fs 24 should be 24px, got ${fontSize}`)
      }
    )
  ),

  // Font weight
  ...TEXT_PRIMITIVES.map(primitive =>
    testWithSetup(
      `weight bold on ${primitive}`,
      `${primitive} "Test", weight bold`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const fontWeight = getComputedStyleValue('node-1', 'fontWeight')
        api.assert.ok(
          fontWeight === '700',
          `${primitive} weight bold should be 700, got ${fontWeight}`
        )
      }
    )
  ),

  // Italic
  ...TEXT_PRIMITIVES.map(primitive =>
    testWithSetup(`italic on ${primitive}`, `${primitive} "Test", italic`, async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const fontStyle = getComputedStyleValue('node-1', 'fontStyle')
      api.assert.ok(
        fontStyle === 'italic',
        `${primitive} italic should be italic, got ${fontStyle}`
      )
    })
  ),

  // Underline
  ...TEXT_PRIMITIVES.map(primitive =>
    testWithSetup(
      `underline on ${primitive}`,
      `${primitive} "Test", underline`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const textDecoration = getComputedStyleValue('node-1', 'textDecorationLine')
        api.assert.ok(
          textDecoration.includes('underline'),
          `${primitive} underline should include underline, got ${textDecoration}`
        )
      }
    )
  ),

  // Uppercase
  ...TEXT_PRIMITIVES.map(primitive =>
    testWithSetup(
      `uppercase on ${primitive}`,
      `${primitive} "Test", uppercase`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const textTransform = getComputedStyleValue('node-1', 'textTransform')
        api.assert.ok(
          textTransform === 'uppercase',
          `${primitive} uppercase should be uppercase, got ${textTransform}`
        )
      }
    )
  ),
])

// ============================================================================
// HEADING TYPOGRAPHY - H1-H6
// ============================================================================

export const headingMatrixTests: TestCase[] = describe('Typography on Headings', [
  // Font size on headings
  ...HEADING_PRIMITIVES.map(primitive =>
    testWithSetup(
      `fs (font-size) on ${primitive}`,
      `${primitive} "Test", fs 32`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const fontSize = getComputedStyleValue('node-1', 'fontSize')
        api.assert.ok(fontSize === '32px', `${primitive} fs 32 should be 32px, got ${fontSize}`)
      }
    )
  ),

  // Color on headings
  ...HEADING_PRIMITIVES.map(primitive =>
    testWithSetup(
      `col (color) on ${primitive}`,
      `${primitive} "Test", col #2271C1`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const color = getComputedStyleValue('node-1', 'color')
        // rgb(34, 113, 193) = #2271C1
        api.assert.ok(
          color.includes('34') && color.includes('113'),
          `${primitive} col should be blue, got ${color}`
        )
      }
    )
  ),
])

// ============================================================================
// SEMANTIC CONTAINERS - Layout Properties
// ============================================================================

export const semanticMatrixTests: TestCase[] = describe('Layout on Semantic Containers', [
  // Gap on semantic elements
  ...SEMANTIC_PRIMITIVES.map(primitive =>
    testWithSetup(
      `gap on ${primitive}`,
      `${primitive} gap 20\n  Text "Content 1"\n  Text "Content 2"`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const gap = getComputedStyleValue('node-1', 'gap')
        api.assert.ok(gap === '20px', `${primitive} gap 20 should be 20px, got ${gap}`)
      }
    )
  ),

  // Padding on semantic elements
  ...SEMANTIC_PRIMITIVES.map(primitive =>
    testWithSetup(
      `pad on ${primitive}`,
      `${primitive} pad 24\n  Text "Content"`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const padding = getComputedStyleValue('node-1', 'padding')
        api.assert.ok(padding === '24px', `${primitive} pad 24 should be 24px, got ${padding}`)
      }
    )
  ),

  // Background on semantic elements
  ...SEMANTIC_PRIMITIVES.map(primitive =>
    testWithSetup(
      `bg on ${primitive}`,
      `${primitive} bg #1a1a1a\n  Text "Content", col white`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const bg = getComputedStyleValue('node-1', 'backgroundColor')
        // rgb(26, 26, 26) = #1a1a1a
        api.assert.ok(bg.includes('26'), `${primitive} bg should be dark, got ${bg}`)
      }
    )
  ),
])

// ============================================================================
// EFFECT PROPERTIES - All Primitives
// ============================================================================

export const effectMatrixTests: TestCase[] = describe('Effects on All Primitives', [
  // Opacity
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `opacity on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", opacity 0.5`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", opacity 0.5`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", opacity 0.5`
            : `${primitive} "Test", opacity 0.5`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const opacity = getComputedStyleValue('node-1', 'opacity')
        api.assert.ok(opacity === '0.5', `${primitive} opacity 0.5 should be 0.5, got ${opacity}`)
      }
    )
  ),

  // Shadow
  ...ALL_PRIMITIVES.filter(p => p !== 'Divider' && p !== 'Spacer').map(primitive =>
    testWithSetup(
      `shadow md on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", shadow md`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", shadow md`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", shadow md`
            : `${primitive} "Test", shadow md`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const shadow = getComputedStyleValue('node-1', 'boxShadow')
        api.assert.ok(
          shadow !== 'none' && shadow !== '',
          `${primitive} shadow md should have shadow, got ${shadow}`
        )
      }
    )
  ),

  // Cursor pointer
  ...ALL_PRIMITIVES.filter(p => p !== 'Divider' && p !== 'Spacer').map(primitive =>
    testWithSetup(
      `cursor pointer on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", cursor pointer`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", cursor pointer`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", cursor pointer`
            : `${primitive} "Test", cursor pointer`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const cursor = getComputedStyleValue('node-1', 'cursor')
        api.assert.ok(
          cursor === 'pointer',
          `${primitive} cursor pointer should be pointer, got ${cursor}`
        )
      }
    )
  ),
])

// ============================================================================
// TRANSFORM PROPERTIES - All Primitives
// ============================================================================

export const transformMatrixTests: TestCase[] = describe('Transform on All Primitives', [
  // Rotate
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `rotate on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", rotate 45`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", rotate 45`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", rotate 45`
            : `${primitive} "Test", rotate 45`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const transform = getComputedStyleValue('node-1', 'transform')
        api.assert.ok(
          transform.includes('matrix') || transform.includes('rotate'),
          `${primitive} rotate 45 should have transform, got ${transform}`
        )
      }
    )
  ),

  // Scale
  ...ALL_PRIMITIVES.map(primitive =>
    testWithSetup(
      `scale on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", scale 1.5`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", scale 1.5`
          : primitive === 'Input' || primitive === 'Textarea'
            ? `${primitive} placeholder "test", scale 1.5`
            : `${primitive} "Test", scale 1.5`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const transform = getComputedStyleValue('node-1', 'transform')
        api.assert.ok(
          transform.includes('matrix') || transform.includes('scale'),
          `${primitive} scale 1.5 should have transform, got ${transform}`
        )
      }
    )
  ),
])

// ============================================================================
// ICON-SPECIFIC PROPERTIES
// ============================================================================

export const iconMatrixTests: TestCase[] = describe('Icon-specific Properties', [
  testWithSetup('is (icon-size) on Icon', `Icon "check", is 32`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const width = getComputedStyleValue('node-1', 'width')
    const height = getComputedStyleValue('node-1', 'height')
    api.assert.ok(
      width === '32px' && height === '32px',
      `Icon is 32 should be 32px, got ${width}x${height}`
    )
  }),

  testWithSetup('ic (icon-color) on Icon', `Icon "check", ic #10b981`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const color = getComputedStyleValue('node-1', 'color')
    // rgb(16, 185, 129) = #10b981
    api.assert.ok(
      color.includes('16') && color.includes('185'),
      `Icon ic should be green, got ${color}`
    )
  }),

  testWithSetup('fill on Icon', `Icon "heart", fill`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const element = getElement('node-1')
    // fill is handled via data attribute or specific rendering
    api.assert.ok(element !== null, 'Icon with fill should render')
  }),
])

// ============================================================================
// IMAGE-SPECIFIC PROPERTIES
// ============================================================================

export const imageMatrixTests: TestCase[] = describe('Image-specific Properties', [
  testWithSetup(
    'src on Image',
    `Image src "https://via.placeholder.com/100"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const element = getElement('node-1') as HTMLImageElement
      api.assert.ok(element !== null, 'Image should render')
      api.assert.ok(
        element.src.includes('placeholder'),
        `Image src should be set, got ${element.src}`
      )
    }
  ),

  testWithSetup('w and h on Image', `Image src "test.jpg", w 200, h 150`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const width = getComputedStyleValue('node-1', 'width')
    const height = getComputedStyleValue('node-1', 'height')
    api.assert.ok(width === '200px', `Image w should be 200px, got ${width}`)
    api.assert.ok(height === '150px', `Image h should be 150px, got ${height}`)
  }),

  testWithSetup('rad on Image', `Image src "test.jpg", rad 50`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const radius = getComputedStyleValue('node-1', 'borderRadius')
    api.assert.ok(radius === '50px', `Image rad should be 50px, got ${radius}`)
  }),
])

// ============================================================================
// LINK-SPECIFIC PROPERTIES
// ============================================================================

export const linkMatrixTests: TestCase[] = describe('Link-specific Properties', [
  testWithSetup(
    'href on Link',
    `Link "Click me", href "https://example.com"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const element = getElement('node-1') as HTMLAnchorElement
      api.assert.ok(element !== null, 'Link should render')
      api.assert.ok(
        element.href.includes('example.com'),
        `Link href should be set, got ${element.href}`
      )
    }
  ),

  testWithSetup('col on Link', `Link "Click me", href "#", col #2271C1`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const color = getComputedStyleValue('node-1', 'color')
    api.assert.ok(
      color.includes('34') && color.includes('113'),
      `Link col should be blue, got ${color}`
    )
  }),
])

// ============================================================================
// INPUT-SPECIFIC PROPERTIES
// ============================================================================

export const inputMatrixTests: TestCase[] = describe('Input-specific Properties', [
  testWithSetup(
    'placeholder on Input',
    `Input placeholder "Enter text..."`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const element = getElement('node-1') as HTMLInputElement
      api.assert.ok(element !== null, 'Input should render')
      api.assert.ok(
        element.placeholder === 'Enter text...',
        `Input placeholder should be set, got ${element.placeholder}`
      )
    }
  ),

  testWithSetup(
    'placeholder on Textarea',
    `Textarea placeholder "Enter message..."`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const element = getElement('node-1') as HTMLTextAreaElement
      api.assert.ok(element !== null, 'Textarea should render')
      api.assert.ok(
        element.placeholder === 'Enter message...',
        `Textarea placeholder should be set, got ${element.placeholder}`
      )
    }
  ),

  testWithSetup(
    'w and h on Input',
    `Input placeholder "test", w 300, h 40`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const width = getComputedStyleValue('node-1', 'width')
      const height = getComputedStyleValue('node-1', 'height')
      api.assert.ok(width === '300px', `Input w should be 300px, got ${width}`)
      api.assert.ok(height === '40px', `Input h should be 40px, got ${height}`)
    }
  ),

  testWithSetup(
    'bg and col on Input',
    `Input placeholder "test", bg #1a1a1a, col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const bg = getComputedStyleValue('node-1', 'backgroundColor')
      const color = getComputedStyleValue('node-1', 'color')
      api.assert.ok(bg.includes('26'), `Input bg should be dark, got ${bg}`)
      api.assert.ok(color.includes('255'), `Input col should be white, got ${color}`)
    }
  ),
])

// ============================================================================
// DIVIDER AND SPACER PROPERTIES
// ============================================================================

export const dividerSpacerMatrixTests: TestCase[] = describe('Divider and Spacer Properties', [
  testWithSetup('Divider with color', `Divider boc #333`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const element = getElement('node-1')
    api.assert.ok(element !== null, 'Divider should render')
  }),

  testWithSetup(
    'Spacer with height',
    `Frame hor, gap 8\n  Text "A"\n  Spacer h 40, w 10, bg #333\n  Text "B"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const height = getComputedStyleValue('node-3', 'height')
      api.assert.ok(height === '40px', `Spacer h should be 40px, got ${height}`)
    }
  ),

  testWithSetup('Spacer with width', `Spacer w 100`, async (api: TestAPI) => {
    await api.utils.waitForCompile()
    const width = getComputedStyleValue('node-1', 'width')
    api.assert.ok(width === '100px', `Spacer w should be 100px, got ${width}`)
  }),
])

// ============================================================================
// POSITION PROPERTIES - All Primitives
// ============================================================================

export const positionMatrixTests: TestCase[] = describe('Position on All Primitives', [
  // Absolute positioning
  ...ALL_PRIMITIVES.slice(0, 5).map(primitive =>
    testWithSetup(
      `absolute on ${primitive}`,
      primitive === 'Icon'
        ? `Frame w 200, h 100\n  ${primitive} "check", absolute`
        : primitive === 'Image'
          ? `Frame w 200, h 100\n  ${primitive} src "test.jpg", absolute`
          : primitive === 'Input'
            ? `Frame w 200, h 100\n  ${primitive} placeholder "test", absolute`
            : `Frame w 200, h 100\n  ${primitive} "Test", absolute`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const position = getComputedStyleValue('node-2', 'position')
        api.assert.ok(
          position === 'absolute',
          `${primitive} absolute should be absolute, got ${position}`
        )
      }
    )
  ),

  // Z-index
  ...ALL_PRIMITIVES.slice(0, 5).map(primitive =>
    testWithSetup(
      `z (z-index) on ${primitive}`,
      primitive === 'Icon'
        ? `${primitive} "check", z 10`
        : primitive === 'Image'
          ? `${primitive} src "test.jpg", z 10`
          : primitive === 'Input'
            ? `${primitive} placeholder "test", z 10`
            : `${primitive} "Test", z 10`,
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        const zIndex = getComputedStyleValue('node-1', 'zIndex')
        api.assert.ok(zIndex === '10', `${primitive} z 10 should be 10, got ${zIndex}`)
      }
    )
  ),
])

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const allPrimitiveMatrixTests: TestCase[] = [
  ...sizingMatrixTests,
  ...spacingMatrixTests,
  ...colorMatrixTests,
  ...borderMatrixTests,
  ...layoutMatrixTests,
  ...typographyMatrixTests,
  ...headingMatrixTests,
  ...semanticMatrixTests,
  ...effectMatrixTests,
  ...transformMatrixTests,
  ...iconMatrixTests,
  ...imageMatrixTests,
  ...linkMatrixTests,
  ...inputMatrixTests,
  ...dividerSpacerMatrixTests,
  ...positionMatrixTests,
]
