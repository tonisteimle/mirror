/**
 * Compiler Verification — Primitives
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 9. Primitives Verification
// =============================================================================

export const primitivesTests: TestCase[] = describe('Primitives', [
  testWithSetup(
    'All basic primitives render correctly',
    `Frame gap 8, pad 16, bg #1a1a1a
  Text "Hello", col white
  Button "Click", bg #2271C1, col white
  Input placeholder "Type..."
  Textarea placeholder "Long text...", h 80
  Icon "star", ic #f59e0b, is 24
  Divider
  Spacer h 20
  Link "More", href "#", col #2271C1`,
    async (api: TestAPI) => {
      // Text
      const text = api.preview.inspect('node-2')
      api.assert.ok(text?.tagName === 'span', `Text should be span, got ${text?.tagName}`)

      // Button
      const btn = api.preview.inspect('node-3')
      api.assert.ok(btn?.tagName === 'button', `Button should be button, got ${btn?.tagName}`)

      // Input
      const input = api.preview.inspect('node-4')
      api.assert.ok(input?.tagName === 'input', `Input should be input, got ${input?.tagName}`)

      // Textarea
      const textarea = api.preview.inspect('node-5')
      api.assert.ok(textarea, 'textarea should exist')
      api.assert.ok(
        textarea?.tagName === 'textarea',
        `Textarea should be textarea, got ${textarea?.tagName}`
      )

      // Link
      const link = api.preview.inspect('node-9')
      api.assert.ok(link?.tagName === 'a', `Link should be a, got ${link?.tagName}`)
    }
  ),

  testWithSetup(
    'Image with src',
    `Image src "https://via.placeholder.com/100", w 100, h 100, rad 8`,
    async (api: TestAPI) => {
      const img = api.preview.inspect('node-1')
      api.assert.ok(img?.tagName === 'img', `Should be img, got ${img?.tagName}`)
      api.assert.ok(img?.attributes.src?.includes('placeholder'), 'Should have src')
    }
  ),

  testWithSetup(
    'Semantic HTML elements',
    `Header pad 16, bg #1a1a1a
  Text "Site Title", col white, fs 24

Nav hor, gap 16, pad 8, bg #222
  Link "Home", href "#"
  Link "About", href "#"

Main pad 24
  Section pad 16
    H1 "Welcome", col white
    Text "Content here", col #888

Footer pad 16, bg #1a1a1a, center
  Text "© 2024", col #666`,
    async (api: TestAPI) => {
      const header = api.preview.inspect('node-1')
      api.assert.ok(header?.tagName === 'header', `Header should be header, got ${header?.tagName}`)

      const nav = api.preview.inspect('node-3')
      api.assert.ok(nav?.tagName === 'nav', `Nav should be nav, got ${nav?.tagName}`)

      const main = api.preview.inspect('node-6')
      api.assert.ok(main?.tagName === 'main', `Main should be main, got ${main?.tagName}`)

      const section = api.preview.inspect('node-7')
      api.assert.ok(section, 'section should exist')
      api.assert.ok(
        section?.tagName === 'section',
        `Section should be section, got ${section?.tagName}`
      )

      const h1 = api.preview.inspect('node-8')
      api.assert.ok(h1?.tagName === 'h1', `H1 should be h1, got ${h1?.tagName}`)

      const footer = api.preview.inspect('node-10')
      api.assert.ok(footer?.tagName === 'footer', `Footer should be footer, got ${footer?.tagName}`)
    }
  ),
])
