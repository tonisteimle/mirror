/**
 * Basic Component Definition Tests (Mirror DSL `Name:` syntax)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const basicComponentTests: TestCase[] = describe('Basic Components', [
  testWithSetup(
    'Component definition applies styles',
    `Btn as Button: pad 10 20, rad 6, bg #2271C1, col white

Btn "Click me"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button' })

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Button should exist')
      api.assert.ok(
        el.style.backgroundColor === 'rgb(34, 113, 193)' ||
          el.style.background.includes('34, 113, 193'),
        'Should have blue background'
      )
    }
  ),

  testWithSetup(
    'Component with text content',
    `Label: fs 14, col #888, weight 500

Label "Username"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { textContains: 'Username' })
    }
  ),

  testWithSetup(
    'Multiple instances of same component',
    `Tag: pad 4 8, bg #333, col white, rad 4, fs 12

Frame hor, gap 8
  Tag "JavaScript"
  Tag "TypeScript"
  Tag "React"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      api.dom.expect('node-2', { textContains: 'JavaScript' })
      api.dom.expect('node-3', { textContains: 'TypeScript' })
      api.dom.expect('node-4', { textContains: 'React' })
    }
  ),

  testWithSetup(
    'Component without text (container)',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8

Card
  Text "Content inside card", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      api.dom.expect('node-2', { textContains: 'Content inside card' })
    }
  ),
])
