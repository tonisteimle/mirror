/**
 * Timing classes — single source of truth for OS-mouse + OS-keyboard
 * timings inside Mirror demo actions.
 *
 * Each action primitive belongs to exactly one class. The class governs:
 *  - preHoldMs:  pause between mouse-down and the start of motion
 *  - dwellMs:    pause at the destination, button still held — gives
 *                Mirror's drop / lint / handle indicators time to render
 *                and the viewer time to read what's about to happen
 *  - settleMs:   pause after mouse-up before the next demo step
 *
 * Every action implementation reads its values from here. Magic numbers
 * inline in action code are forbidden — they are a bug of inconsistency
 * waiting to happen.
 */

export type TimingClassName = 'drop' | 'handle' | 'edit' | 'click' | 'typing'

export interface TimingClassValues {
  preHoldMs: number
  dwellMs: number
  settleMs: number
}

export const TIMING_CLASSES: Record<TimingClassName, TimingClassValues> = {
  // Palette → preview drops (and element-to-container moves).
  // Long dwell so Mirror's drop indicator fully renders before release.
  drop: { preHoldMs: 220, dwellMs: 800, settleMs: 360 },

  // Resize / padding / margin handle drags. Slightly faster than drops:
  // the changing element itself is the indicator.
  handle: { preHoldMs: 180, dwellMs: 600, settleMs: 260 },

  // Inline-edit / setProperty / pickColor — click into a field and
  // change it. No drag, no dwell at destination.
  edit: { preHoldMs: 140, dwellMs: 0, settleMs: 200 },

  // Plain selection click on a preview node or panel chrome.
  click: { preHoldMs: 0, dwellMs: 0, settleMs: 180 },

  // Typing into the editor (JS-dispatched, deterministic across keyboard
  // layouts). settleMs gives Mirror's compile a beat before the next step.
  typing: { preHoldMs: 0, dwellMs: 0, settleMs: 200 },
}

export function getTimingClass(name: TimingClassName): TimingClassValues {
  return TIMING_CLASSES[name]
}
