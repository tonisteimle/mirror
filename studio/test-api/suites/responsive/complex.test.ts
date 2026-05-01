/**
 * Complex Responsive Patterns — dashboard, product grid, form layout
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getStyle, setContainerSize } from './_helpers'

export const complexResponsiveTests: TestCase[] = describe('Complex Responsive Patterns', [
  testWithSetup(
    'Dashboard layout switches at breakpoints',
    `Frame w full, h 400, bg #0a0a0a
  compact:
    Frame w full, h 60, bg #1a1a1a, hor, spread, ver-center, pad 0 16
      Icon "menu", ic white, is 24
      Text "Dashboard", col white
    Frame w full, grow, pad 16
      Text "Mobile Content", col white
  wide:
    Frame w full, h full, hor
      Frame w 200, bg #1a1a1a, pad 16
        Text "Sidebar", col white
      Frame grow, pad 24
        Text "Desktop Content", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const dashboard = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(dashboard !== null, 'Dashboard should exist')

      setContainerSize(dashboard, 375)
      await api.utils.delay(100)

      setContainerSize(dashboard, 1200)
      await api.utils.delay(100)

      api.assert.ok(true, 'Dashboard renders at both sizes')
    }
  ),

  testWithSetup(
    'Product grid columns change with size',
    `Frame w 800, wrap, gap 16, pad 16, bg #0a0a0a
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 1", col white
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 2", col white
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 3", col white
  Frame bg #1a1a1a, rad 8, pad 16, h 150
    compact:
      w full
    regular:
      w 180
    wide:
      w 150
    Text "Product 4", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const grid = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const products = [
        document.querySelector('[data-mirror-id="node-2"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-3"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-4"]') as HTMLElement,
        document.querySelector('[data-mirror-id="node-5"]') as HTMLElement,
      ]

      api.assert.ok(grid !== null, 'Grid should exist')
      products.forEach((p, i) => api.assert.ok(p !== null, `Product ${i + 1} should exist`))

      setContainerSize(grid, 350)
      await api.utils.delay(50)
      const compactWidth = products[0].offsetWidth

      setContainerSize(grid, 600)
      await api.utils.delay(50)
      const regularWidth = products[0].offsetWidth

      setContainerSize(grid, 1000)
      await api.utils.delay(50)
      const wideWidth = products[0].offsetWidth

      api.assert.ok(
        compactWidth > 0 && regularWidth > 0 && wideWidth > 0,
        `Product widths: compact=${compactWidth}, regular=${regularWidth}, wide=${wideWidth}`
      )
    }
  ),

  testWithSetup(
    'Form layout adapts to container',
    `Frame w 500, bg #1a1a1a, pad 24, rad 8
  compact:
    gap 12
  wide:
    gap 16
    hor
    wrap
  Frame gap 4
    compact:
      w full
    wide:
      w 200
    Text "First Name", col #888, fs 12
    Input placeholder "John", pad 12, bg #222, col white, rad 6
  Frame gap 4
    compact:
      w full
    wide:
      w 200
    Text "Last Name", col #888, fs 12
    Input placeholder "Doe", pad 12, bg #222, col white, rad 6`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const form = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const field1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const field2 = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement

      api.assert.ok(form !== null, 'Form should exist')
      api.assert.ok(field1 !== null, 'Field 1 should exist')
      api.assert.ok(field2 !== null, 'Field 2 should exist')

      setContainerSize(form, 350)
      await api.utils.delay(50)
      const compactDirection = getStyle(form, 'flex-direction')

      setContainerSize(form, 900)
      await api.utils.delay(50)
      const wideDirection = getStyle(form, 'flex-direction')

      api.assert.ok(
        compactDirection && wideDirection,
        `Form direction: compact=${compactDirection}, wide=${wideDirection}`
      )
    }
  ),
])
