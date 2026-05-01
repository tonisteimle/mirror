/**
 * Setup fragments — canvas reset, prelude / panel management.
 */

import type { DemoAction } from '../types'

export interface ResetCanvasOptions {
  /** Mirror source to reset to (default: minimal centered Frame). No trailing
   *  newline — see docs/archive/concepts/visual-editing-demo.md for why. */
  baseCode?: string
  /** Pause after reset to let the editor settle (default 500ms) */
  settleMs?: number
  /** Comment shown in the demo log (default: "Reset auf leeren Canvas") */
  comment?: string
}

const DEFAULT_BASE = 'Frame bg #0f0f0f, col white, pad 24, gap 16, w full, h full, center'

/**
 * Reset the editor to a known starting state via __dragTest.setTestCode (so the
 * compile bypasses the prelude — required for stable nodeIds).
 *
 * Always emits an `expectCode` step so demos fail fast if the reset itself
 * didn't take effect.
 */
export function resetCanvas(opts: ResetCanvasOptions = {}): DemoAction[] {
  const baseCode = opts.baseCode ?? DEFAULT_BASE
  const settleMs = opts.settleMs ?? 500
  const comment = opts.comment ?? 'Reset auf leeren Canvas'
  return [
    {
      action: 'execute',
      code: `
        (async function() {
          const baseCode = ${JSON.stringify(baseCode)};
          await window.__dragTest.setTestCode(baseCode);
          await new Promise(r => setTimeout(r, 200));
        })();
      `,
      comment,
    },
    { action: 'wait', duration: settleMs },
    { action: 'expectCode', comment: 'after reset', code: baseCode },
  ]
}

export interface ValidateStudioReadyOptions {
  comment?: string
}

/**
 * Validate that the Studio chrome (panels, editor, preview) is mounted and the
 * root Frame exists. Cheap, but invaluable as a first check — Demo failures
 * before this point usually mean the Studio didn't load at all.
 */
export function validateStudioReady(opts: ValidateStudioReadyOptions = {}): DemoAction[] {
  return [
    {
      action: 'validate',
      comment: opts.comment ?? 'Studio ist bereit',
      checks: [
        { type: 'exists', selector: '#components-panel' },
        { type: 'exists', selector: '#preview' },
        { type: 'exists', selector: '.cm-editor' },
        { type: 'exists', selector: '#preview [data-mirror-id="node-1"]' },
      ],
    },
  ]
}
