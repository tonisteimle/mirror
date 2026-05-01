/**
 * Component Variant Tests (multiple variants from same base)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const variantTests: TestCase[] = describe('Component Variants', [
  testWithSetup(
    'Multiple variants from base',
    `Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #444

Frame gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
  GhostBtn "Cancel"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')

      api.dom.expect('node-2', { text: 'Save' })
      api.dom.expect('node-3', { text: 'Delete' })
      api.dom.expect('node-4', { text: 'Cancel' })
    }
  ),

  testWithSetup(
    'Size variants',
    `Btn: rad 6, bg #2271C1, col white
SmallBtn as Btn: pad 6 12, fs 12
MediumBtn as Btn: pad 10 20, fs 14
LargeBtn as Btn: pad 14 28, fs 16

Frame gap 8, ver-center
  SmallBtn "Small"
  MediumBtn "Medium"
  LargeBtn "Large"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'Icon variants',
    `IconBtn as Button: w 40, h 40, rad 6, center, cursor pointer
PrimaryIconBtn as IconBtn: bg #2271C1, col white
GhostIconBtn as IconBtn: bg transparent, col #888

Frame hor, gap 8
  PrimaryIconBtn
    Icon "plus", ic white, is 20
  GhostIconBtn
    Icon "settings", ic #888, is 20`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-4')
    }
  ),
])
