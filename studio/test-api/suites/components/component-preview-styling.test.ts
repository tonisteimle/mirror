/**
 * Component Preview Styling Tests
 *
 * Tests that components rendered in the Component Panel Preview
 * correctly apply their styling (padding, radius, background, etc.)
 * and resolve tokens properly.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// DIAGNOSTIC TEST - Understand what's happening in Component Preview
// =============================================================================

export const componentPreviewStylingTests: TestCase[] = describe('Component Preview Styling', [
  // Test 1: Create a .com file and check if component preview renders correctly
  testWithSetup(
    'Component Preview: Diagnostic - check styling in component file',
    // Empty initial code - we'll set up via API
    ``,
    async (api: TestAPI) => {
      // Step 1: Create tokens file
      const tokenContent = `// Design tokens
card.bg: #1a1a1a
card.pad: 16
card.rad: 8`
      await api.panels.files.create('tokens.tok', tokenContent)

      // Step 2: Create components file
      const componentContent = `// Card component using tokens
Card: bg $card, pad $card, rad $card`
      await api.panels.files.create('components.com', componentContent)

      // Step 3: Switch to the .com file
      await api.panels.files.open('components.com')

      // Step 4: Wait for component preview to render
      await new Promise(resolve => setTimeout(resolve, 500))

      // Step 5: Inspect what's in the preview
      const preview = document.getElementById('preview')
      console.log('=== COMPONENT PREVIEW DIAGNOSTIC ===')
      console.log('Preview class:', preview?.className)
      console.log('Preview HTML (first 2000 chars):', preview?.innerHTML?.slice(0, 2000))

      // Check if it's a components preview
      const isComponentPreview = preview?.className?.includes('components-preview')
      console.log('Is component preview:', isComponentPreview)

      // Find the component render container
      const renderContainer = preview?.querySelector('.components-preview-render')
      console.log('Render container found:', !!renderContainer)

      if (renderContainer) {
        console.log('Render container HTML:', renderContainer.innerHTML)

        // Find the wrapper and actual element
        const wrapper = renderContainer.querySelector('.components-preview-wrapper')
        const cardEl = wrapper?.firstElementChild as HTMLElement

        if (cardEl) {
          const computed = getComputedStyle(cardEl)
          console.log('Card element found!')
          console.log('  tagName:', cardEl.tagName)
          console.log('  display:', computed.display)
          console.log('  padding:', computed.padding)
          console.log('  paddingTop:', computed.paddingTop)
          console.log('  borderRadius:', computed.borderRadius)
          console.log('  backgroundColor:', computed.backgroundColor)
          console.log('  style attribute:', cardEl.getAttribute('style'))

          // Check CSS variables
          console.log('CSS variable --card-pad:', computed.getPropertyValue('--card-pad'))
          console.log('CSS variable --card-bg:', computed.getPropertyValue('--card-bg'))
          console.log('CSS variable --card-rad:', computed.getPropertyValue('--card-rad'))

          // The actual test: Does padding work?
          const padding = computed.paddingTop || computed.padding
          api.assert.ok(
            padding === '16px' || padding.includes('16'),
            `Expected padding to be 16px from token, got: ${padding}`
          )
        } else {
          console.log('No card element found in wrapper')
          api.assert.ok(false, 'No card element found in component preview')
        }
      } else {
        console.log('No render container found')
        api.assert.ok(false, 'Component preview render container not found')
      }
    }
  ),

  // Test 2: Simple inline styles without tokens
  testWithSetup('Component Preview: Inline styles work', ``, async (api: TestAPI) => {
    // Create a simple .com file with inline styles (no tokens)
    const componentContent = `// Simple button with inline styles
Btn: bg #2271C1, pad 12, rad 6, col white`

    await api.panels.files.create('simple.com', componentContent)
    await api.panels.files.open('simple.com')

    await new Promise(resolve => setTimeout(resolve, 500))

    const preview = document.getElementById('preview')
    const renderContainer = preview?.querySelector('.components-preview-render')
    const wrapper = renderContainer?.querySelector('.components-preview-wrapper')
    const btnEl = wrapper?.firstElementChild as HTMLElement

    if (btnEl) {
      const computed = getComputedStyle(btnEl)
      console.log('Button inline styles:')
      console.log('  padding:', computed.padding)
      console.log('  borderRadius:', computed.borderRadius)
      console.log('  backgroundColor:', computed.backgroundColor)

      // Check padding
      const hasPadding = computed.paddingTop === '12px' || computed.padding?.includes('12')
      api.assert.ok(hasPadding, `Expected padding 12px, got: ${computed.padding}`)

      // Check radius
      const hasRadius = computed.borderRadius?.includes('6')
      api.assert.ok(hasRadius, `Expected radius 6px, got: ${computed.borderRadius}`)

      // Check background
      const hasBg =
        computed.backgroundColor === 'rgb(34, 113, 193)' ||
        computed.backgroundColor?.includes('34, 113, 193')
      api.assert.ok(hasBg, `Expected blue background, got: ${computed.backgroundColor}`)
    } else {
      api.assert.ok(false, 'No button element found in component preview')
    }
  }),
])
