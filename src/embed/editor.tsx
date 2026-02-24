/**
 * Mirror Editor - Full Embeddable Bundle
 *
 * This file creates a standalone, embeddable version of the full Mirror editor
 * with syntax highlighting and live preview.
 *
 * Usage in HTML:
 *
 *   <script src="mirror-editor.js"></script>
 *   <div class="mirror-editor" data-code="Button col #2271c1 'Hello'"></div>
 *
 * Or with JavaScript API:
 *
 *   <div id="my-editor"></div>
 *   <script>
 *     MirrorEditor.render('#my-editor', {
 *       code: 'Button col #3B82F6 "Click me"',
 *       previewHeight: 200
 *     });
 *   </script>
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { EmbeddableEditor } from '../components/EmbeddableEditor'

// ============================================
// Types
// ============================================

interface EditorOptions {
  code: string
  prelude?: string
  previewHeight?: number
  readOnly?: boolean
}

// ============================================
// Global API
// ============================================

const MirrorEditorAPI = {
  /**
   * Render an editor into a container
   */
  render(selector: string | HTMLElement, options: EditorOptions) {
    const container = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector

    if (!container) {
      console.error(`MirrorEditor: Container not found: ${selector}`)
      return null
    }

    const root = createRoot(container)
    root.render(
      <EmbeddableEditor
        initialCode={options.code}
        prelude={options.prelude}
        previewHeight={options.previewHeight}
        readOnly={options.readOnly}
      />
    )

    return root
  },

  /**
   * Initialize all editors with data-code attribute
   * Uses IntersectionObserver for lazy loading to prevent browser crashes
   * with many editors on a single page.
   */
  initAll() {
    const elements = document.querySelectorAll('.mirror-editor[data-code]')
    const initializedSet = new WeakSet<Element>()

    const initEditor = (el: Element) => {
      if (initializedSet.has(el)) return
      initializedSet.add(el)

      const code = el.getAttribute('data-code') || ''
      const prelude = el.getAttribute('data-prelude') || ''
      const previewHeightAttr = el.getAttribute('data-preview-height')
      const previewHeight = previewHeightAttr ? parseInt(previewHeightAttr, 10) : undefined
      const readOnly = el.hasAttribute('data-readonly')

      this.render(el as HTMLElement, { code, prelude, previewHeight, readOnly })
    }

    // Use IntersectionObserver for lazy loading
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              initEditor(entry.target)
              observer.unobserve(entry.target)
            }
          })
        },
        {
          rootMargin: '200px', // Pre-load editors 200px before they enter viewport
          threshold: 0
        }
      )

      elements.forEach((el) => observer.observe(el))
    } else {
      // Fallback for browsers without IntersectionObserver
      elements.forEach((el) => initEditor(el))
    }
  }
}

// Export to window for script usage
declare global {
  interface Window {
    MirrorEditor: typeof MirrorEditorAPI
  }
}

if (typeof window !== 'undefined') {
  window.MirrorEditor = MirrorEditorAPI

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      MirrorEditorAPI.initAll()
    })
  } else {
    // DOM already loaded
    MirrorEditorAPI.initAll()
  }
}

export { MirrorEditorAPI as MirrorEditor }
export type { EditorOptions }
