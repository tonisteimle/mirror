/**
 * Integration — Icon & Button Patterns
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Icon & Button Patterns
// =============================================================================

export const iconButtonTests: TestCase[] = describe('Icon & Button Patterns', [
  testWithSetup(
    'Button with leading icon',
    `IconBtn as Button: hor, gap 8, pad 12 20, bg #2271C1, col white, rad 6, ver-center
  BtnIcon as Icon: is 18, ic white
  BtnText: weight 500

IconBtn
  BtnIcon "plus"
  BtnText "Hinzufügen"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button' })

      // Button styling
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')
      api.assert.hasStyle('node-1', 'paddingTop', '12px')
      api.assert.hasStyle('node-1', 'paddingLeft', '20px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      // Has icon and text
      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element should exist')
      const btnText = btn!.textContent || ''
      api.assert.ok(btnText.includes('Hinzufügen'), `Should have text, got: "${btnText}"`)

      // Should have 2 children (icon + text)
      api.assert.ok(
        btn!.children.length === 2,
        `Should have 2 children, found ${btn!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Icon-only button with hover',
    `IconBtn: w 40, h 40, rad 6, bg #222, center, cursor pointer
  hover:
    bg #333
  Icon "settings", ic #888, is 20
    hover:
      ic white

IconBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Button styling
      api.assert.hasStyle('node-1', 'width', '40px')
      api.assert.hasStyle('node-1', 'height', '40px')
      api.assert.hasStyle('node-1', 'borderRadius', '6px')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
      api.assert.hasStyle('node-1', 'cursor', 'pointer')

      // Centered content
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')

      // Hover changes background
      await api.interact.hover('node-1')
      await api.utils.delay(200)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'Button group with icons',
    `BtnGroup: hor, gap 0
  GroupBtn: pad 10 16, bg #222, col #888, cursor pointer, bor 1, boc #333
    hover:
      bg #333
      col white

Frame
  BtnGroup
    GroupBtn, rad 6 0 0 6
      Icon "align-left", ic #888, is 16
    GroupBtn
      Icon "align-center", ic #888, is 16
    GroupBtn
      Icon "align-right", ic #888, is 16
    GroupBtn, rad 0 6 6 0
      Icon "align-justify", ic #888, is 16`,
    async (api: TestAPI) => {
      api.assert.exists('node-1') // Frame
      api.assert.exists('node-2') // BtnGroup

      // BtnGroup is horizontal with no gap
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-2', 'gap', '0px')

      // Count buttons in group
      const group = document.querySelector('[data-mirror-id="node-2"]')
      api.assert.ok(group !== null, 'BtnGroup should exist')
      api.assert.ok(
        group!.children.length === 4,
        `Should have 4 buttons, found ${group!.children.length}`
      )

      // First button has left radius only
      const firstBtn = group!.children[0] as HTMLElement
      const firstStyle = getComputedStyle(firstBtn)
      api.assert.ok(firstStyle.borderTopLeftRadius === '6px', 'First should have top-left radius')
      api.assert.ok(
        firstStyle.borderBottomLeftRadius === '6px',
        'First should have bottom-left radius'
      )

      // Last button has right radius only
      const lastBtn = group!.children[3] as HTMLElement
      const lastStyle = getComputedStyle(lastBtn)
      api.assert.ok(lastStyle.borderTopRightRadius === '6px', 'Last should have top-right radius')
      api.assert.ok(
        lastStyle.borderBottomRightRadius === '6px',
        'Last should have bottom-right radius'
      )
    }
  ),

  testWithSetup(
    'Toggle button with icon change',
    `LikeBtn: hor, gap 8, pad 10 16, bg #222, col #888, rad 6, cursor pointer, ver-center, toggle()
  Icon "heart", ic #888, is 18
  Text "Like"
  on:
    bg #ef4444
    col white
    Icon "heart", ic white, is 18, fill
    Text "Liked"

LikeBtn`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      // Initial state
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
      api.assert.hasStyle('node-1', 'color', 'rgb(136, 136, 136)')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasStyle('node-1', 'gap', '8px')

      const btn = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(btn !== null, 'Button element should exist')
      const btnText = btn!.textContent || ''
      api.assert.ok(btnText.includes('Like'), `Should say Like initially, got: "${btnText}"`)

      // Toggle on
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')
      api.assert.hasStyle('node-1', 'color', 'rgb(255, 255, 255)')

      // Toggle off
      await api.interact.click('node-1')
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 34, 34)')
    }
  ),
])
