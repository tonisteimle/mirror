/**
 * Mirror Playground - Embeddable Bundle
 *
 * This file creates a standalone, embeddable version of MirrorPlayground
 * that can be included in HTML documentation.
 *
 * Usage in HTML:
 *
 *   <script src="mirror-playground.js"></script>
 *   <div id="playground-1"></div>
 *   <script>
 *     MirrorPlayground.render('#playground-1', {
 *       code: 'Button col #3B82F6 "Click me"',
 *       height: 250
 *     });
 *   </script>
 *
 * Or with data attributes:
 *
 *   <div class="mirror-playground" data-code="Button pad 16 'Hello'"></div>
 *   <script src="mirror-playground.js"></script>
 *
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { MirrorPlayground } from '../components/MirrorPlayground'

// ============================================
// Types
// ============================================

interface PlaygroundOptions {
  code: string
  height?: number
  title?: string
  theme?: 'dark' | 'light'
  readOnly?: boolean
  layout?: 'horizontal' | 'vertical'
  minimal?: boolean
}

// ============================================
// Global API
// ============================================

const MirrorPlaygroundAPI = {
  /**
   * Render a playground into a container
   */
  render(selector: string | HTMLElement, options: PlaygroundOptions) {
    const container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector

    if (!container) {
      console.error(`MirrorPlayground: Container not found: ${selector}`)
      return null
    }

    const root = createRoot(container)
    root.render(
      <MirrorPlayground
        initialCode={options.code}
        height={options.height}
        title={options.title}
        theme={options.theme}
        readOnly={options.readOnly}
      />
    )

    return root
  },

  /**
   * Initialize all playgrounds with data-code attribute
   */
  initAll() {
    const elements = document.querySelectorAll('.mirror-playground[data-code]')
    elements.forEach((el) => {
      const code = el.getAttribute('data-code') || ''
      const height = parseInt(el.getAttribute('data-height') || '300', 10)
      const title = el.getAttribute('data-title') || 'Try it'
      const theme = (el.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
      const readOnly = el.hasAttribute('data-readonly')

      this.render(el as HTMLElement, { code, height, title, theme, readOnly })
    })
  }
}

// Export to window for script usage
declare global {
  interface Window {
    MirrorPlayground: typeof MirrorPlaygroundAPI
  }
}

if (typeof window !== 'undefined') {
  window.MirrorPlayground = MirrorPlaygroundAPI

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      MirrorPlaygroundAPI.initAll()
    })
  } else {
    // DOM already loaded
    MirrorPlaygroundAPI.initAll()
  }
}

export { MirrorPlaygroundAPI as MirrorPlayground }
export type { PlaygroundOptions }
