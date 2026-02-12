/**
 * Tests for MirrorPlayground component
 * Specifically tests that rendered elements have correct sizing (not full width)
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MirrorPlayground } from '../../components/MirrorPlayground'

describe('MirrorPlayground', () => {
  describe('Box width behavior', () => {
    it('should render Box without width:100% in inline style', async () => {
      const { container } = render(
        <MirrorPlayground
          initialCode='Box col #2271c1 pad 20 rad 12 "Hello World"'
          height={300}
        />
      )

      const boxElement = container.querySelector('.Box') as HTMLElement
      expect(boxElement).toBeTruthy()

      // Check the inline style attribute directly
      const inlineStyle = boxElement.getAttribute('style') || ''
      console.log('Box inline style:', inlineStyle)

      // Should NOT have width: 100%
      expect(inlineStyle).not.toContain('width: 100%')
      expect(inlineStyle).not.toContain('width:100%')
    })

    it('Box should NOT have flex-grow in style', async () => {
      const { container } = render(
        <MirrorPlayground
          initialCode='Box col #2271c1 pad 20 "Hi"'
          height={300}
        />
      )

      const boxElement = container.querySelector('.Box') as HTMLElement
      expect(boxElement).toBeTruthy()

      const inlineStyle = boxElement.getAttribute('style') || ''

      // Should NOT have flex-grow which would cause stretching
      expect(inlineStyle).not.toContain('flex-grow')
      expect(inlineStyle).not.toContain('flex: 1')
    })

    it('preview container should use flex centering', async () => {
      const { container } = render(
        <MirrorPlayground
          initialCode='Box "Test"'
          height={300}
        />
      )

      // Find the wrapper div that contains the preview content
      const allDivs = container.querySelectorAll('div')
      let foundFlexCenter = false

      allDivs.forEach(div => {
        const style = div.getAttribute('style') || ''
        // Preview uses flex + alignItems: center to naturally size boxes
        if (style.includes('align-items: center')) {
          foundFlexCenter = true
          console.log('Found flex centering wrapper with style:', style.substring(0, 100))
        }
      })

      expect(foundFlexCenter).toBe(true)
    })

    it('Box parent chain should use centering that preserves natural width', async () => {
      const { container } = render(
        <MirrorPlayground
          initialCode='Box col #2271c1 pad 20 "Test"'
          height={300}
        />
      )

      const boxElement = container.querySelector('.Box') as HTMLElement
      expect(boxElement).toBeTruthy()

      // Walk up the parent chain and check that there's a centering container
      let parent = boxElement.parentElement
      let depth = 0
      const maxDepth = 10
      let foundCentering = false

      while (parent && depth < maxDepth) {
        const style = parent.getAttribute('style') || ''
        console.log(`Parent ${depth}:`, style.substring(0, 100))

        // Check for flex centering (align-items: center preserves natural width)
        if (style.includes('align-items: center')) {
          foundCentering = true
        }

        parent = parent.parentElement
        depth++
      }

      // There should be a centering container in the parent chain
      // that preserves the natural width of the Box
      expect(foundCentering).toBe(true)
    })
  })
})
