/**
 * Nested Slot Tests (Card with Title/Body/Footer slots)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const nestedSlotTests: TestCase[] = describe('Nested Slots', [
  testWithSetup(
    'Card with Title and Description slots',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: col white, fs 16, weight 500
  Desc: col #888, fs 14

Card
  Title "Project Name"
  Desc "A description of the project"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
      const content = card!.textContent || ''
      api.assert.ok(
        content.includes('Project Name'),
        `Should contain title, got: ${content.substring(0, 100)}`
      )
      api.assert.ok(
        content.includes('A description of the project'),
        `Should contain description, got: ${content.substring(0, 100)}`
      )
    }
  ),

  testWithSetup(
    'Card with Header, Body, Footer slots',
    `Card: bg #1a1a1a, rad 8, gap 0
  Header: pad 16, bor 0 0 1 0, boc #333
  Body: pad 16, grow
  Footer: pad 16, bor 1 0 0 0, boc #333, hor, gap 8

Card h 300
  Header
    Text "Card Title", col white, weight bold
  Body
    Text "Main content goes here", col #888
  Footer
    Button "Cancel", bg #333, col white, pad 8 16, rad 4
    Button "Save", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card should exist')
    }
  ),

  testWithSetup(
    'List item with slots',
    `ListItem: hor, pad 12, bg #1a1a1a, gap 12, ver-center, rad 6
  Avatar: w 40, h 40, rad 99, bg #333, center
  Content: grow, gap 2
  Actions: hor, gap 8

Frame gap 8
  ListItem
    Avatar
      Text "JD", col white, fs 12
    Content
      Text "John Doe", col white, weight 500
      Text "john@example.com", col #888, fs 12
    Actions
      Button "Edit", bg #333, col white, pad 6 12, rad 4, fs 12`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),
])
