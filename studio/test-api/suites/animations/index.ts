/**
 * Animation Tests Index
 *
 * Comprehensive tests for Mirror DSL animations:
 * - Animation presets (spin, bounce, pulse, shake, fade, slide, scale)
 * - State-triggered animations
 * - Hover transitions with timing
 * - Entry/exit animations
 * - Playback verification (A4.1 - Phase 4)
 */

import type { TestCase } from '../../types'

// Animation preset tests
import {
  allAnimationPresetTests,
  spinAnimationTests,
  pulseAnimationTests,
  bounceAnimationTests,
  shakeAnimationTests,
  fadeAnimationTests,
  slideAnimationTests,
  scaleAnimationTests,
} from './presets.test'

// State animation tests
import {
  allStateAnimationTests,
  stateToggleAnimationTests,
  hoverAnimationTests,
  entryExitAnimationTests,
  combinedAnimationTests,
} from './state-animations.test'

// Playback verification tests (A4.1)
import {
  allPlaybackVerificationTests,
  playbackStateTests,
  durationTests,
  timingFunctionTests,
  transformMotionTests,
  multipleAnimationTests,
} from './playback-verification.test'

// Re-export individual test arrays
export {
  // Presets
  allAnimationPresetTests,
  spinAnimationTests,
  pulseAnimationTests,
  bounceAnimationTests,
  shakeAnimationTests,
  fadeAnimationTests,
  slideAnimationTests,
  scaleAnimationTests,
  // State animations
  allStateAnimationTests,
  stateToggleAnimationTests,
  hoverAnimationTests,
  entryExitAnimationTests,
  combinedAnimationTests,
  // Playback verification (A4.1)
  allPlaybackVerificationTests,
  playbackStateTests,
  durationTests,
  timingFunctionTests,
  transformMotionTests,
  multipleAnimationTests,
}

/**
 * All animation tests combined
 */
export const allAnimationTests: TestCase[] = [
  ...allAnimationPresetTests,
  ...allStateAnimationTests,
  ...allPlaybackVerificationTests,
]

/**
 * Quick animation tests for fast validation
 */
export const quickAnimationTests: TestCase[] = [
  ...spinAnimationTests.slice(0, 2),
  ...bounceAnimationTests.slice(0, 2),
  ...hoverAnimationTests.slice(0, 2),
  ...playbackStateTests.slice(0, 2),
]
