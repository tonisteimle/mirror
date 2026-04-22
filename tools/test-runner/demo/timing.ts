/**
 * Demo Timing System
 *
 * Comprehensive timing configuration for demo recordings.
 * Provides optimal, consistent timings for all action types.
 */

// =============================================================================
// Action Timing Definitions
// =============================================================================

/**
 * Timing configuration for mouse movement
 */
export interface MoveToTiming {
  /** Base duration for mouse movement (ms) */
  baseMs: number
  /** Additional ms per 100 pixels of distance */
  perHundredPixels: number
  /** Minimum duration (ms) */
  minMs: number
  /** Maximum duration (ms) */
  maxMs: number
  /** Easing function */
  easing: 'linear' | 'easeInOut' | 'easeOut' | 'easeInOutCubic'
}

/**
 * Timing configuration for click actions
 */
export interface ClickTiming {
  /** Delay before click for visual anticipation (ms) */
  preDelayMs: number
  /** Delay after click for visual feedback (ms) */
  postDelayMs: number
  /** Click ripple animation duration (ms) */
  rippleDurationMs: number
}

/**
 * Timing configuration for typing
 */
export interface TypeTiming {
  /** Base delay per character (ms) */
  charMs: number
  /** Random variance factor (0-1, e.g. 0.3 = ±30%) */
  variance: number
  /** Extra pause after space (ms) */
  wordPauseMs: number
  /** Extra pause after newline (ms) */
  linePauseMs: number
  /** Pause for "thinking" effect before typing (ms) */
  thoughtPauseMs: number
}

/**
 * Timing configuration for key presses
 */
export interface PressKeyTiming {
  /** Duration for key press action (ms) */
  keyMs: number
  /** How long to show keystroke overlay (ms) */
  overlayMs: number
}

/**
 * Timing configuration for wait actions
 */
export interface WaitTiming {
  /** Minimum wait duration (ms) - even if script says less */
  minMs: number
  /** Maximum wait duration (ms) - cap long waits */
  maxMs: number
  /** Scale factor for all waits (1.0 = normal) */
  scale: number
}

/**
 * Timing configuration for highlight actions
 */
export interface HighlightTiming {
  /** Default highlight duration (ms) */
  durationMs: number
  /** Fade in duration (ms) */
  fadeInMs: number
  /** Fade out duration (ms) */
  fadeOutMs: number
}

/**
 * Timing configuration for comments/captions
 */
export interface CommentTiming {
  /** Reading speed in words per minute */
  readingSpeedWPM: number
  /** Minimum display time (ms) */
  minMs: number
  /** Maximum display time (ms) */
  maxMs: number
  /** Base time before calculating from text (ms) */
  baseMs: number
}

/**
 * Timing for transitions between actions
 */
export interface TransitionTiming {
  /** Pause after clicking before next action (ms) */
  afterClick: number
  /** Pause after typing before next action (ms) */
  afterType: number
  /** Pause after file operation (ms) */
  afterFileOp: number
  /** Pause after navigation (ms) */
  afterNavigate: number
  /** Pause before validation - not visible (ms) */
  beforeValidate: number
  /** Pause between action groups (ms) */
  betweenGroups: number
}

/**
 * Complete timing configuration for all action types
 */
export interface ActionTimings {
  moveTo: MoveToTiming
  click: ClickTiming
  doubleClick: ClickTiming
  type: TypeTiming
  pressKey: PressKeyTiming
  wait: WaitTiming
  highlight: HighlightTiming
  comment: CommentTiming
  transitions: TransitionTiming
}

// =============================================================================
// Pacing Profiles
// =============================================================================

/**
 * Pre-defined pacing profiles for different use cases
 */
export type PacingProfile = 'video' | 'presentation' | 'tutorial' | 'testing' | 'instant'

/**
 * Video recording profile - comfortable viewing speed
 * Optimized for screen recordings that will be watched at 1x speed
 */
export const VIDEO_TIMING: ActionTimings = {
  moveTo: {
    baseMs: 400,
    perHundredPixels: 50,
    minMs: 200,
    maxMs: 800,
    easing: 'easeInOutCubic',
  },
  click: {
    preDelayMs: 50,
    postDelayMs: 150,
    rippleDurationMs: 300,
  },
  doubleClick: {
    preDelayMs: 50,
    postDelayMs: 200,
    rippleDurationMs: 300,
  },
  type: {
    charMs: 45,
    variance: 0.25,
    wordPauseMs: 60,
    linePauseMs: 150,
    thoughtPauseMs: 200,
  },
  pressKey: {
    keyMs: 100,
    overlayMs: 1200,
  },
  wait: {
    minMs: 100,
    maxMs: 1500,
    scale: 0.6,
  },
  highlight: {
    durationMs: 800,
    fadeInMs: 150,
    fadeOutMs: 200,
  },
  comment: {
    readingSpeedWPM: 200,
    minMs: 500,
    maxMs: 3000,
    baseMs: 300,
  },
  transitions: {
    afterClick: 100,
    afterType: 150,
    afterFileOp: 300,
    afterNavigate: 500,
    beforeValidate: 50,
    betweenGroups: 300,
  },
}

/**
 * Presentation profile - slightly slower, more dramatic
 * For live presentations where pauses help audience follow
 */
export const PRESENTATION_TIMING: ActionTimings = {
  moveTo: {
    baseMs: 600,
    perHundredPixels: 80,
    minMs: 300,
    maxMs: 1200,
    easing: 'easeInOutCubic',
  },
  click: {
    preDelayMs: 100,
    postDelayMs: 250,
    rippleDurationMs: 400,
  },
  doubleClick: {
    preDelayMs: 100,
    postDelayMs: 300,
    rippleDurationMs: 400,
  },
  type: {
    charMs: 65,
    variance: 0.2,
    wordPauseMs: 100,
    linePauseMs: 250,
    thoughtPauseMs: 400,
  },
  pressKey: {
    keyMs: 150,
    overlayMs: 1500,
  },
  wait: {
    minMs: 200,
    maxMs: 2500,
    scale: 1.0,
  },
  highlight: {
    durationMs: 1200,
    fadeInMs: 200,
    fadeOutMs: 300,
  },
  comment: {
    readingSpeedWPM: 150,
    minMs: 800,
    maxMs: 5000,
    baseMs: 500,
  },
  transitions: {
    afterClick: 200,
    afterType: 300,
    afterFileOp: 500,
    afterNavigate: 800,
    beforeValidate: 100,
    betweenGroups: 500,
  },
}

/**
 * Tutorial profile - balanced for learning
 * Slightly faster than presentation but with good readability
 */
export const TUTORIAL_TIMING: ActionTimings = {
  moveTo: {
    baseMs: 500,
    perHundredPixels: 60,
    minMs: 250,
    maxMs: 1000,
    easing: 'easeInOutCubic',
  },
  click: {
    preDelayMs: 80,
    postDelayMs: 180,
    rippleDurationMs: 350,
  },
  doubleClick: {
    preDelayMs: 80,
    postDelayMs: 220,
    rippleDurationMs: 350,
  },
  type: {
    charMs: 55,
    variance: 0.2,
    wordPauseMs: 80,
    linePauseMs: 180,
    thoughtPauseMs: 300,
  },
  pressKey: {
    keyMs: 120,
    overlayMs: 1400,
  },
  wait: {
    minMs: 150,
    maxMs: 2000,
    scale: 0.8,
  },
  highlight: {
    durationMs: 1000,
    fadeInMs: 180,
    fadeOutMs: 250,
  },
  comment: {
    readingSpeedWPM: 180,
    minMs: 600,
    maxMs: 4000,
    baseMs: 400,
  },
  transitions: {
    afterClick: 150,
    afterType: 200,
    afterFileOp: 400,
    afterNavigate: 600,
    beforeValidate: 80,
    betweenGroups: 400,
  },
}

/**
 * Testing profile - fast but still visible
 * For development/testing where you want to see what's happening
 */
export const TESTING_TIMING: ActionTimings = {
  moveTo: {
    baseMs: 150,
    perHundredPixels: 20,
    minMs: 80,
    maxMs: 400,
    easing: 'easeOut',
  },
  click: {
    preDelayMs: 0,
    postDelayMs: 50,
    rippleDurationMs: 150,
  },
  doubleClick: {
    preDelayMs: 0,
    postDelayMs: 80,
    rippleDurationMs: 150,
  },
  type: {
    charMs: 15,
    variance: 0,
    wordPauseMs: 0,
    linePauseMs: 20,
    thoughtPauseMs: 0,
  },
  pressKey: {
    keyMs: 50,
    overlayMs: 500,
  },
  wait: {
    minMs: 50,
    maxMs: 500,
    scale: 0.3,
  },
  highlight: {
    durationMs: 300,
    fadeInMs: 50,
    fadeOutMs: 100,
  },
  comment: {
    readingSpeedWPM: 400,
    minMs: 100,
    maxMs: 500,
    baseMs: 50,
  },
  transitions: {
    afterClick: 30,
    afterType: 50,
    afterFileOp: 100,
    afterNavigate: 200,
    beforeValidate: 20,
    betweenGroups: 80,
  },
}

/**
 * Instant profile - no delays
 * For validation/CI where we just need to verify functionality
 */
export const INSTANT_TIMING: ActionTimings = {
  moveTo: {
    baseMs: 0,
    perHundredPixels: 0,
    minMs: 0,
    maxMs: 0,
    easing: 'linear',
  },
  click: {
    preDelayMs: 0,
    postDelayMs: 20,
    rippleDurationMs: 0,
  },
  doubleClick: {
    preDelayMs: 0,
    postDelayMs: 30,
    rippleDurationMs: 0,
  },
  type: {
    charMs: 0,
    variance: 0,
    wordPauseMs: 0,
    linePauseMs: 0,
    thoughtPauseMs: 0,
  },
  pressKey: {
    keyMs: 20,
    overlayMs: 0,
  },
  wait: {
    minMs: 20,
    maxMs: 200,
    scale: 0.1,
  },
  highlight: {
    durationMs: 100,
    fadeInMs: 0,
    fadeOutMs: 0,
  },
  comment: {
    readingSpeedWPM: 1000,
    minMs: 0,
    maxMs: 100,
    baseMs: 0,
  },
  transitions: {
    afterClick: 10,
    afterType: 10,
    afterFileOp: 50,
    afterNavigate: 100,
    beforeValidate: 10,
    betweenGroups: 20,
  },
}

/**
 * Get timing profile by name
 */
export function getTimingProfile(profile: PacingProfile): ActionTimings {
  switch (profile) {
    case 'video':
      return VIDEO_TIMING
    case 'presentation':
      return PRESENTATION_TIMING
    case 'tutorial':
      return TUTORIAL_TIMING
    case 'testing':
      return TESTING_TIMING
    case 'instant':
      return INSTANT_TIMING
    default:
      return VIDEO_TIMING
  }
}

/**
 * All available profiles for reference
 */
export const PACING_PROFILES: Record<PacingProfile, ActionTimings> = {
  video: VIDEO_TIMING,
  presentation: PRESENTATION_TIMING,
  tutorial: TUTORIAL_TIMING,
  testing: TESTING_TIMING,
  instant: INSTANT_TIMING,
}

// =============================================================================
// Timing Calculator
// =============================================================================

/**
 * Calculate optimal timing for actions
 */
export class TimingCalculator {
  constructor(private timings: ActionTimings) {}

  /**
   * Calculate mouse movement duration based on distance
   */
  calculateMoveDuration(fromX: number, fromY: number, toX: number, toY: number): number {
    const distance = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2))
    const hundredPixels = distance / 100
    const duration = this.timings.moveTo.baseMs + (hundredPixels * this.timings.moveTo.perHundredPixels)
    return Math.max(this.timings.moveTo.minMs, Math.min(this.timings.moveTo.maxMs, Math.round(duration)))
  }

  /**
   * Calculate typing duration for text
   */
  calculateTypeDuration(text: string): number {
    let duration = this.timings.type.thoughtPauseMs

    for (const char of text) {
      // Base char delay with variance
      const variance = this.timings.type.variance
      const charDelay = this.timings.type.charMs * (1 + (Math.random() - 0.5) * 2 * variance)
      duration += charDelay

      // Extra pauses
      if (char === ' ') {
        duration += this.timings.type.wordPauseMs
      } else if (char === '\n') {
        duration += this.timings.type.linePauseMs
      }
    }

    return Math.round(duration)
  }

  /**
   * Calculate comment display duration based on text length
   */
  calculateCommentDuration(text: string): number {
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length
    const readingTime = (wordCount / this.timings.comment.readingSpeedWPM) * 60 * 1000
    const duration = this.timings.comment.baseMs + readingTime

    return Math.max(
      this.timings.comment.minMs,
      Math.min(this.timings.comment.maxMs, Math.round(duration))
    )
  }

  /**
   * Calculate adjusted wait duration
   */
  calculateWaitDuration(requestedMs: number): number {
    const scaled = requestedMs * this.timings.wait.scale
    return Math.max(
      this.timings.wait.minMs,
      Math.min(this.timings.wait.maxMs, Math.round(scaled))
    )
  }

  /**
   * Get click timing
   */
  getClickTiming(): ClickTiming {
    return this.timings.click
  }

  /**
   * Get double-click timing
   */
  getDoubleClickTiming(): ClickTiming {
    return this.timings.doubleClick
  }

  /**
   * Get key press timing
   */
  getPressKeyTiming(): PressKeyTiming {
    return this.timings.pressKey
  }

  /**
   * Get highlight timing
   */
  getHighlightTiming(): HighlightTiming {
    return this.timings.highlight
  }

  /**
   * Get transition timing
   */
  getTransitionTiming(): TransitionTiming {
    return this.timings.transitions
  }

  /**
   * Get the raw timing config
   */
  getTimings(): ActionTimings {
    return this.timings
  }
}

// =============================================================================
// Timing Comparison & Optimization
// =============================================================================

/**
 * Compare estimated timing between profiles
 */
export interface TimingComparison {
  profile: PacingProfile
  estimatedTotalMs: number
  estimatedTotalFormatted: string
}

/**
 * Estimate total demo duration for a given step count and profile
 */
export function estimateDemoDuration(
  stepCounts: {
    moveTo: number
    click: number
    type: number
    typeChars: number
    pressKey: number
    wait: number
    waitTotalMs: number
    highlight: number
    comment: number
    commentWords: number
  },
  profile: PacingProfile
): number {
  const t = getTimingProfile(profile)

  let total = 0

  // Move actions (assume average 300px distance)
  total += stepCounts.moveTo * (t.moveTo.baseMs + 3 * t.moveTo.perHundredPixels)

  // Click actions
  total += stepCounts.click * (t.click.preDelayMs + t.click.postDelayMs + t.click.rippleDurationMs)

  // Type actions
  total += stepCounts.type * t.type.thoughtPauseMs
  total += stepCounts.typeChars * t.type.charMs

  // Press key actions
  total += stepCounts.pressKey * t.pressKey.keyMs

  // Wait actions (scaled)
  total += stepCounts.waitTotalMs * t.wait.scale

  // Highlight actions
  total += stepCounts.highlight * t.highlight.durationMs

  // Comment actions
  const avgWordsPerComment = stepCounts.comment > 0 ? stepCounts.commentWords / stepCounts.comment : 0
  const commentReadTime = (avgWordsPerComment / t.comment.readingSpeedWPM) * 60 * 1000
  total += stepCounts.comment * (t.comment.baseMs + commentReadTime)

  // Transitions (rough estimate)
  const totalSteps = stepCounts.moveTo + stepCounts.click + stepCounts.type +
                     stepCounts.pressKey + stepCounts.highlight
  total += totalSteps * t.transitions.afterClick * 0.3 // Rough average

  return Math.round(total)
}

/**
 * Format milliseconds as human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  }
  const seconds = ms / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Compare all profiles for a demo
 */
export function compareProfiles(stepCounts: Parameters<typeof estimateDemoDuration>[0]): TimingComparison[] {
  const profiles: PacingProfile[] = ['video', 'presentation', 'tutorial', 'testing', 'instant']

  return profiles.map(profile => {
    const estimatedMs = estimateDemoDuration(stepCounts, profile)
    return {
      profile,
      estimatedTotalMs: estimatedMs,
      estimatedTotalFormatted: formatDuration(estimatedMs),
    }
  })
}
