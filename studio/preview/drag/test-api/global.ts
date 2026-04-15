/**
 * Global Drag Test API
 *
 * Sets up window.__testDragDrop for browser-based testing.
 * This allows Playwright tests and manual debugging to use the test API.
 *
 * Usage in browser console:
 * ```javascript
 * // Simulate palette drag
 * const result = await window.__testDragDrop.simulatePaletteDrag({
 *   componentType: 'Button',
 *   targetNodeId: 'node-1',
 *   insertionIndex: 0
 * })
 *
 * // Simulate canvas move
 * await window.__testDragDrop.simulateCanvasMove({
 *   sourceNodeId: 'node-2',
 *   targetNodeId: 'node-1',
 *   insertionIndex: 1
 * })
 *
 * // Get current editor code
 * const code = window.__testDragDrop.getEditorCode()
 *
 * // Set editor code
 * window.__testDragDrop.setEditorCode('Frame gap 8')
 *
 * // Recompile
 * await window.__testDragDrop.recompile()
 *
 * // Get all fixtures
 * const fixtures = window.__testDragDrop.getFixtures()
 *
 * // Fluent API
 * const result = await window.__testDragDrop.createTest()
 *   .fromPalette('Button')
 *   .toContainer('node-1')
 *   .atPosition(0)
 *   .execute()
 * ```
 */

import type { GlobalDragTestAPI, DragTestContext } from './types'
import { DragTestRunner, createDragTest } from './drag-test-runner'
import { ALL_COMPONENTS, ALL_CONTAINERS } from './fixtures'
import { events } from '../../../core'

/**
 * Create a context that connects to the actual Studio editor
 */
function createStudioContext(): DragTestContext {
  // These will be set during setup
  const editorInstance: any = null
  const compileFunction: ((code: string) => void) | null = null

  return {
    getCode(): string {
      if (!editorInstance) {
        console.warn(
          '[DragTestAPI] Editor not connected. Call setupGlobalDragTestAPI with editor instance.'
        )
        return ''
      }
      return editorInstance.state?.doc?.toString() ?? ''
    },

    setCode(code: string): void {
      if (!editorInstance) {
        console.warn(
          '[DragTestAPI] Editor not connected. Call setupGlobalDragTestAPI with editor instance.'
        )
        return
      }
      // Replace entire document
      editorInstance.dispatch({
        changes: {
          from: 0,
          to: editorInstance.state.doc.length,
          insert: code,
        },
      })
    },

    async recompile(): Promise<void> {
      // Emit compile request event
      events.emit('compile:requested', {})

      // Wait a bit for compilation to complete
      await new Promise(resolve => setTimeout(resolve, 100))
    },

    getNodeIdByName(name: string): string | null {
      // Query the preview for an element with the given name
      const preview = document.getElementById('preview')
      if (!preview) return null

      const element = preview.querySelector(`[data-mirror-name="${name}"]`)
      return element?.getAttribute('data-mirror-id') ?? null
    },

    getAllNodeIds(): string[] {
      const preview = document.getElementById('preview')
      if (!preview) return []

      const elements = preview.querySelectorAll('[data-mirror-id]')
      return Array.from(elements)
        .map(el => el.getAttribute('data-mirror-id')!)
        .filter(Boolean)
    },

    async waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
      const startTime = performance.now()
      return new Promise((resolve, reject) => {
        const check = () => {
          if (condition()) {
            resolve()
          } else if (performance.now() - startTime > timeout) {
            reject(new Error('Timeout waiting for condition'))
          } else {
            requestAnimationFrame(check)
          }
        }
        check()
      })
    },
  }
}

/**
 * Setup the global drag test API on window.__testDragDrop
 *
 * Call this during Studio initialization to enable browser-based testing.
 *
 * @param editor - CodeMirror editor instance (optional, will be auto-detected)
 * @param compile - Compile function (optional, will use events)
 */
export function setupGlobalDragTestAPI(editor?: any, compile?: (code: string) => void): void {
  // Avoid re-setup
  if (window.__testDragDrop) {
    console.log('[DragTestAPI] Already set up')
    return
  }

  const context = createStudioContext()

  // Create the runner
  const runner = new DragTestRunner(context)

  // Create the global API
  const api: GlobalDragTestAPI = {
    async simulatePaletteDrag(params) {
      return runner.simulatePaletteDrag(params)
    },

    async simulateCanvasMove(params) {
      return runner.simulateCanvasMove(params)
    },

    getEditorCode() {
      return context.getCode()
    },

    setEditorCode(code: string) {
      context.setCode(code)
    },

    async recompile() {
      return context.recompile()
    },

    getFixtures() {
      return {
        components: ALL_COMPONENTS,
        containers: ALL_CONTAINERS,
      }
    },

    createTest() {
      return createDragTest(context) as any
    },
  }

  // Set on window
  window.__testDragDrop = api

  console.log('[DragTestAPI] Global test API ready at window.__testDragDrop')
  console.log('[DragTestAPI] Available methods:')
  console.log('  - simulatePaletteDrag({ componentType, targetNodeId, insertionIndex })')
  console.log('  - simulateCanvasMove({ sourceNodeId, targetNodeId, insertionIndex })')
  console.log('  - getEditorCode()')
  console.log('  - setEditorCode(code)')
  console.log('  - recompile()')
  console.log('  - getFixtures()')
  console.log('  - createTest() // Fluent API')
}

/**
 * Remove the global drag test API
 */
export function teardownGlobalDragTestAPI(): void {
  if (window.__testDragDrop) {
    delete window.__testDragDrop
    console.log('[DragTestAPI] Global test API removed')
  }
}
