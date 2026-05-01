/**
 * Project — Token & Component Files
 */

import type { TestSuite, TestAPI } from '../../types'
import { TOKENS_FILE, COMPONENTS_FILE } from './_fixtures'

// =============================================================================
// Token & Component Tests
// =============================================================================

export const tokenComponentTests: TestSuite = [
  {
    name: 'Project: Inline tokens work',
    run: async (api: TestAPI) => {
      // Test tokens defined inline (not from external file)
      await api.editor.setCode(`primary.bg: #2271C1
text.col: white

Frame bg $primary, pad 16, rad 8
  Text "Token Test", col $text`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Check that element exists
      api.assert.exists('node-1')

      // Check that token was applied (primary color)
      const frame = api.preview.inspect('node-1')
      api.assert.ok(
        frame?.styles.backgroundColor === 'rgb(34, 113, 193)',
        `Should have primary bg color, got ${frame?.styles.backgroundColor}`
      )
    },
  },

  {
    name: 'Project: Inline components inherit from primitives',
    run: async (api: TestAPI) => {
      // Test components defined inline (not from external file)
      await api.editor.setCode(`// Tokens
primary.bg: #2271C1

// Components
Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Button: bg $primary, col white, pad 12 24, rad 6

// Layout
PrimaryBtn "Click Me"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Should render as button
      const btn = api.preview.inspect('node-1')
      api.assert.ok(
        btn?.tagName === 'button',
        `PrimaryBtn should render as button, got ${btn?.tagName}`
      )
      api.assert.ok(
        btn?.styles.cursor === 'pointer',
        `Should have pointer cursor, got ${btn?.styles.cursor}`
      )
    },
  },

  {
    name: 'Project: Nested components work',
    run: async (api: TestAPI) => {
      const files = api.panel.files

      await files.create('tokens.tok', TOKENS_FILE)
      await files.create('components.com', COMPONENTS_FILE)
      await api.utils.delay(200)

      // Use nested components
      await api.editor.setCode(`Card
  CardTitle "My Card"
  CardDesc "This is a description"
  PrimaryBtn "Action"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Check structure
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // CardTitle
      api.assert.exists('node-3') // CardDesc
      api.assert.exists('node-4') // PrimaryBtn

      const card = api.preview.inspect('node-1')
      api.assert.ok(card !== null, 'Card inspect should return info')
      api.assert.ok(
        card!.children.length >= 3,
        `Card should have children, got ${card!.children.length}`
      )

      await files.delete('components.com')
      await files.delete('tokens.tok')
    },
  },
]
