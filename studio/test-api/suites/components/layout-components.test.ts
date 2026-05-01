/**
 * Layout Component Tests (AppShell, TwoColumn, Stack)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const layoutComponentTests: TestCase[] = describe('Layout Components', [
  testWithSetup(
    'AppShell with Sidebar and Main',
    `AppShell: hor, h 200
  Sidebar: w 160, bg #1a1a1a, pad 16, gap 8
  Main: grow, pad 16, bg #0a0a0a

AppShell
  Sidebar
    Text "Nav Item 1", col white
    Text "Nav Item 2", col white
  Main
    Text "Main Content", col white, fs 18`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      const shell = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(shell !== null, 'AppShell should exist')
    }
  ),

  testWithSetup(
    'Two-column layout',
    `TwoColumn: hor, gap 16
  Left: w 200, shrink
  Right: grow

TwoColumn
  Left
    Text "Sidebar", col #888
  Right
    Text "Content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Stack layout component',
    `Stack: gap 8
VStack as Stack: ver
HStack as Stack: hor

Frame gap 16
  VStack
    Text "Item 1", col white
    Text "Item 2", col white
  HStack
    Text "A", col white
    Text "B", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-5')
    }
  ),
])
