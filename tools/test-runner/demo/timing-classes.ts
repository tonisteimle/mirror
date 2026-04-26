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
  return scaleTimingClass(TIMING_CLASSES[name], name)
}

// =============================================================================
// Speed multipliers
// =============================================================================
//
// A multiplier of 2.0 makes that class twice as slow (delays × 2); 0.5 makes
// it twice as fast. The global multiplier composes with the per-class one:
// effectiveDivisor = globalSpeed × classSpeed. We DIVIDE delays by the speed
// because higher speed → shorter delays.
//
// Set via CLI:
//   --global-speed=2.0
//   --typing-speed=0.5  --drop-speed=2.0  --handle-speed=1.5
//   --edit-speed=1.0    --click-speed=1.0
// or programmatically in DemoConfig.speedMultipliers.

export interface SpeedMultipliers {
  global?: number
  drop?: number
  handle?: number
  edit?: number
  click?: number
  typing?: number
}

let activeMultipliers: SpeedMultipliers = {}

export function setSpeedMultipliers(m: SpeedMultipliers): void {
  activeMultipliers = { ...m }
}

export function getSpeedMultipliers(): SpeedMultipliers {
  return { ...activeMultipliers }
}

export function getEffectiveSpeed(name: TimingClassName): number {
  const g = activeMultipliers.global ?? 1
  const c = activeMultipliers[name] ?? 1
  // Clamp to a safe range — 0 would divide-by-zero, very tiny values would
  // collapse pacing entirely.
  return Math.max(0.05, g * c)
}

function scaleTimingClass(t: TimingClassValues, name: TimingClassName): TimingClassValues {
  const speed = getEffectiveSpeed(name)
  if (speed === 1) return t
  return {
    preHoldMs: Math.round(t.preHoldMs / speed),
    dwellMs: Math.round(t.dwellMs / speed),
    settleMs: Math.round(t.settleMs / speed),
  }
}
