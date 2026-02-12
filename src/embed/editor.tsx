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
import { EmbeddableEditor, type EmbeddableEditorProps } from '../components/EmbeddableEditor'

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
   */
  initAll() {
    const elements = document.querySelectorAll('.mirror-editor[data-code]')
    elements.forEach((el) => {
      const code = el.getAttribute('data-code') || ''
      const prelude = el.getAttribute('data-prelude') || ''
      const previewHeightAttr = el.getAttribute('data-preview-height')
      const previewHeight = previewHeightAttr ? parseInt(previewHeightAttr, 10) : undefined
      const readOnly = el.hasAttribute('data-readonly')

      this.render(el as HTMLElement, { code, prelude, previewHeight, readOnly })
    })
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
