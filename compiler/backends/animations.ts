/**
 * Mirror animation primitives — shared across DOM, React, Framework backends.
 *
 * Mirror's `anim X` property maps a short keyword (`spin`, `bounce`, `fade-in`,
 * …) to a `mirror-<name>` CSS keyframe. The keyframes are static — every Mirror
 * file gets the same set — so they live here as a single source of truth and
 * each backend emits them once when any `anim` usage is detected in the tree.
 *
 * The animation shorthand (`mirror-spin 1s linear infinite`) lives here too so
 * cross-backend output keeps the same timing/iteration semantics. DOM emits the
 * shorthand directly into a stylesheet rule; React inlines it as a style prop;
 * Framework wires it through its M(...) descriptor.
 */

export const ANIMATION_KEYFRAMES_CSS: readonly string[] = [
  // fade-in / fade-out
  '@keyframes mirror-fade-in { from { opacity: 0; } to { opacity: 1; } }',
  '@keyframes mirror-fade-out { from { opacity: 1; } to { opacity: 0; } }',

  // slide-in / slide-out (horizontal default)
  '@keyframes mirror-slide-in { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',
  '@keyframes mirror-slide-out { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-20px); opacity: 0; } }',

  // slide-up / slide-down (vertical)
  '@keyframes mirror-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
  '@keyframes mirror-slide-down { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',

  // slide-left / slide-right (horizontal explicit)
  '@keyframes mirror-slide-left { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',
  '@keyframes mirror-slide-right { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }',

  // scale-in / scale-out
  '@keyframes mirror-scale-in { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }',
  '@keyframes mirror-scale-out { from { transform: scale(1); opacity: 1; } to { transform: scale(0.9); opacity: 0; } }',

  // bounce / pulse / shake / spin
  '@keyframes mirror-bounce { 0%, 20%, 50%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } 60% { transform: translateY(-5px); } }',
  '@keyframes mirror-pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }',
  '@keyframes mirror-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); } 20%, 40%, 60%, 80% { transform: translateX(5px); } }',
  '@keyframes mirror-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',

  // reveal animations (for scroll-triggered or entry)
  '@keyframes mirror-reveal-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }',
  '@keyframes mirror-reveal-scale { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }',
  '@keyframes mirror-reveal-fade { from { opacity: 0; } to { opacity: 1; } }',
] as const

export const ANIMATION_SHORTHAND: Record<string, string> = {
  'fade-in': 'mirror-fade-in 0.3s ease forwards',
  'fade-out': 'mirror-fade-out 0.3s ease forwards',
  'slide-in': 'mirror-slide-in 0.3s ease forwards',
  'slide-out': 'mirror-slide-out 0.3s ease forwards',
  'slide-up': 'mirror-slide-up 0.4s ease forwards',
  'slide-down': 'mirror-slide-down 0.4s ease forwards',
  'slide-left': 'mirror-slide-left 0.3s ease forwards',
  'slide-right': 'mirror-slide-right 0.3s ease forwards',
  'scale-in': 'mirror-scale-in 0.3s ease forwards',
  'scale-out': 'mirror-scale-out 0.3s ease forwards',
  bounce: 'mirror-bounce 0.5s ease infinite',
  pulse: 'mirror-pulse 1s ease infinite',
  shake: 'mirror-shake 0.5s ease',
  spin: 'mirror-spin 1s linear infinite',
  'reveal-up': 'mirror-reveal-up 0.5s ease forwards',
  'reveal-scale': 'mirror-reveal-scale 0.5s ease forwards',
  'reveal-fade': 'mirror-reveal-fade 0.5s ease forwards',
}

/**
 * Resolve a Mirror animation keyword to its CSS shorthand.
 * Unknown keywords pass through unchanged so authors can supply their own
 * `animation:` shorthand when needed.
 */
export function animationShorthand(keyword: string): string {
  return ANIMATION_SHORTHAND[keyword] ?? keyword
}
