/**
 * Real-pointer-event drag tests.
 *
 * The default __dragTest API runs startDrag + updatePosition (so HitDetector
 * and InsertionCalculator run), but then DISCARDS the live-computed target
 * and calls simulateDrop with an explicit {targetId, insertionIndex} from
 * the test parameters (test-runner.ts:556-563). That means a regression in
 * HitDetector or InsertionCalculator would not be caught by the standard
 * drag tests.
 *
 * The tests below bypass __dragTest entirely. They dispatch real DragEvents
 * on real DOM elements with realistic cursor positions, and rely on the
 * geometry pipeline to compute the insertion index. Verification then
 * checks that the resulting source matches what the geometry should have
 * produced for the given cursor path.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { assertParentHasChildren } from '../../helpers/structure'

/**
 * Dispatch a synthetic DragEvent of the given type on `target` with the
 * given client coordinates and an optional shared DataTransfer.
 *
 * Uses Event + Object.defineProperty rather than `new DragEvent(...)` because
 * the DragEvent constructor in some Chrome versions doesn't accept a custom
 * DataTransfer.
 */
function fireDragEvent(
  target: EventTarget,
  type: 'dragstart' | 'dragover' | 'drop' | 'dragend' | 'dragleave',
  clientX: number,
  clientY: number,
  dt: DataTransfer
): void {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as DragEvent
  Object.defineProperty(ev, 'clientX', { value: clientX })
  Object.defineProperty(ev, 'clientY', { value: clientY })
  Object.defineProperty(ev, 'dataTransfer', { value: dt })
  target.dispatchEvent(ev)
}

/** Wait for next animation frame (drag-preview throttles updatePosition via RAF). */
function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()))
}

export const realPointerEventTests: TestCase[] = describe('Drag - Real Pointer Events', [
  testWithSetup(
    'Move Button across containers via real drag events (geometry-driven)',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n    Button "Source"\n  Frame gap 8, bg #3a3a4a, pad 12\n    Text "Target"',
    async (api: TestAPI) => {
      const button = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement | null
      const frameB = document.querySelector('[data-mirror-id="node-4"]') as HTMLElement | null
      const text = document.querySelector('[data-mirror-id="node-5"]') as HTMLElement | null

      api.assert.ok(button, 'Source Button must exist before drag')
      api.assert.ok(frameB, 'Target Frame B must exist before drag')
      api.assert.ok(text, 'Text "Target" inside Frame B must exist before drag')

      const buttonRect = button!.getBoundingClientRect()
      const textRect = text!.getBoundingClientRect()
      const frameBRect = frameB!.getBoundingClientRect()

      // Drag start: from the centre of the Button.
      const startX = buttonRect.left + buttonRect.width / 2
      const startY = buttonRect.top + buttonRect.height / 2

      // Drop target: ABOVE the midpoint of Text "Target", inside Frame B.
      // - cursor.y < text midpoint → InsertionCalculator returns 0 → insert
      //   before Text "Target" (index 0).
      // - Cursor close to Frame B's top, far from bottom → HitDetector's
      //   24px escape zone (hit-detector.ts:21) does not trigger.
      // The first attempt picked a point past the Text bottom; Frame B's
      // total height is < ~50px so any point past the text was within the
      // escape zone, which made HitDetector walk up to the outer Frame.
      const textMidY = textRect.top + textRect.height / 2
      const endX = frameBRect.left + frameBRect.width / 2
      const endY = Math.max(frameBRect.top + 4, textMidY - 2)

      const previewContainer = document.getElementById('preview')
      api.assert.ok(previewContainer, 'Preview container (#preview) must exist')

      const dt = new DataTransfer()
      // The drag-preview only fires startCanvasDrag if the dataTransfer
      // carries the canvas-element type marker.
      dt.setData('application/mirror-canvas-element', 'node-3')

      // 1. dragstart on the source Button.
      fireDragEvent(button!, 'dragstart', startX, startY, dt)

      // 2. A few dragover frames along the path so HitDetector + Insertion-
      //    Calculator see a settled position. RAF-throttled, so wait per frame.
      const frames = 6
      for (let i = 1; i <= frames; i++) {
        const t = i / frames
        const x = startX + (endX - startX) * t
        const y = startY + (endY - startY) * t
        fireDragEvent(previewContainer!, 'dragover', x, y, dt)
        await nextFrame()
      }

      // 3. drop on the preview container at the final position.
      fireDragEvent(previewContainer!, 'drop', endX, endY, dt)
      fireDragEvent(button!, 'dragend', endX, endY, dt)

      await api.utils.waitForCompile()

      const actualCode = api.editor.getCode()
      const expected =
        'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12\n    Button "Source"\n    Text "Target"'

      api.assert.equals(
        actualCode,
        expected,
        `Real-event drag did not produce expected source.\n--- Expected ---\n${expected}\n--- Actual ---\n${actualCode}`
      )
      assertParentHasChildren(api, 'Source', ['Source', 'Target'])
    }
  ),
])
