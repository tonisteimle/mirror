/**
 * Demos — barrel export.
 *
 * Demo tests are NOT suite tests. They use the OS-mouse bridge (real
 * macOS cursor + nut-js) so a screen recording captures actual cursor
 * motion. Pacing is tutorial-friendly (preHold/dwell/settle pauses).
 *
 * Run individually with --os-mouse, never as part of `--all`.
 */

import type { TestCase } from '../../types'
import { demoTextIntoFrame } from './01-text-into-frame.demo'
import { tutorial01 } from './tut-01-drop-sync.demo'
import { tutorial02 } from './tut-02-inline-edit.demo'
import { tutorial03 } from './tut-03-resize.demo'

export const demoTests: TestCase[] = [
  ...demoTextIntoFrame,
  ...tutorial01,
  ...tutorial02,
  ...tutorial03,
]
