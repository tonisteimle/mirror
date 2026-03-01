/**
 * Animation Arbitraries for Mirror DSL
 *
 * Generates random show/hide animations and continuous animations.
 */

import * as fc from 'fast-check'
import {
  componentName,
  anyComponentName,
  smallPixelValue
} from './primitives'

// =============================================================================
// Animation Keywords
// =============================================================================

/** Transition animation types */
export const transitionAnimation = fc.constantFrom(
  'fade', 'scale', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'none'
)

/** Continuous animation types */
export const continuousAnimation = fc.constantFrom(
  'spin', 'pulse', 'bounce'
)

/** Animation duration (ms) */
export const animationDuration = fc.integer({ min: 100, max: 1000 })

// =============================================================================
// Show/Hide Animation Blocks
// =============================================================================

/** Simple show animation */
export const simpleShowAnimation = transitionAnimation.map(anim =>
  `show ${anim}`
)

/** Show with duration */
export const showWithDuration = fc.record({
  animation: transitionAnimation,
  duration: animationDuration
}).map(({ animation, duration }) =>
  `show ${animation} ${duration}`
)

/** Show with multiple animations */
export const showMultipleAnimations = fc.record({
  anim1: fc.constantFrom('fade', 'scale'),
  anim2: fc.constantFrom('slide-up', 'slide-down', 'slide-left', 'slide-right'),
  duration: animationDuration
}).map(({ anim1, anim2, duration }) =>
  `show ${anim1} ${anim2} ${duration}`
)

/** Simple hide animation */
export const simpleHideAnimation = transitionAnimation.map(anim =>
  `hide ${anim}`
)

/** Hide with duration */
export const hideWithDuration = fc.record({
  animation: transitionAnimation,
  duration: animationDuration
}).map(({ animation, duration }) =>
  `hide ${animation} ${duration}`
)

/** Show and hide pair */
export const showHidePair = fc.record({
  showAnim: transitionAnimation,
  showDuration: animationDuration,
  hideAnim: transitionAnimation,
  hideDuration: animationDuration
}).map(({ showAnim, showDuration, hideAnim, hideDuration }) =>
  `show ${showAnim} ${showDuration}\nhide ${hideAnim} ${hideDuration}`
)

// =============================================================================
// Continuous Animation Blocks
// =============================================================================

/** Simple animate */
export const simpleAnimate = continuousAnimation.map(anim =>
  `animate ${anim}`
)

/** Animate with duration */
export const animateWithDuration = fc.record({
  animation: continuousAnimation,
  duration: animationDuration
}).map(({ animation, duration }) =>
  `animate ${animation} ${duration}`
)

// =============================================================================
// Components with Animations
// =============================================================================

/** Overlay with show/hide */
export const overlayWithAnimation = fc.record({
  name: anyComponentName,
  showAnim: transitionAnimation,
  hideAnim: transitionAnimation,
  duration: animationDuration
}).map(({ name, showAnim, hideAnim, duration }) =>
  `${name}: hidden, pad 16, bg #333, rad 8\n  show ${showAnim} ${duration}\n  hide ${hideAnim} ${duration}`
)

/** Dropdown with slide animation */
export const dropdownAnimation = fc.record({
  name: fc.constantFrom('Dropdown', 'Menu', 'Popover', 'Tooltip')
}).map(({ name }) =>
  `${name}: hidden, pad 8, bg #333\n  show fade slide-down 200\n  hide fade 150`
)

/** Modal with scale animation */
export const modalAnimation = fc.record({
  name: fc.constantFrom('Modal', 'Dialog', 'AlertDialog', 'Sheet')
}).map(({ name }) =>
  `${name}: hidden, pad 24, bg #1E1E2E, rad 12, shadow lg\n  show fade scale 300\n  hide fade 200`
)

/** Toast notification animation */
export const toastAnimation = fc.record({
  direction: fc.constantFrom('slide-up', 'slide-down', 'slide-left', 'slide-right')
}).map(({ direction }) =>
  `Toast: hidden, pad 16, bg #333, rad 8\n  show fade ${direction} 250\n  hide fade 150`
)

/** Loading spinner */
export const loadingSpinner = fc.record({
  duration: fc.integer({ min: 500, max: 1500 })
}).map(({ duration }) =>
  `Spinner size 24\n  animate spin ${duration}`
)

/** Pulsing indicator */
export const pulsingIndicator = fc.record({
  size: fc.integer({ min: 8, max: 24 }),
  duration: fc.integer({ min: 600, max: 1200 })
}).map(({ size, duration }) =>
  `Indicator size ${size}, bg #22C55E, rad ${size / 2}\n  animate pulse ${duration}`
)

/** Bouncing element */
export const bouncingElement = fc.record({
  component: fc.constantFrom('Icon', 'Badge', 'Dot')
}).map(({ component }) =>
  `${component}\n  animate bounce 800`
)

// =============================================================================
// Open Action with Animation
// =============================================================================

/** Open with position and animation */
export const openWithAnimation = fc.record({
  target: anyComponentName,
  position: fc.constantFrom('below', 'above', 'left', 'right', 'center'),
  animation: transitionAnimation,
  duration: animationDuration
}).map(({ target, position, animation, duration }) =>
  `open ${target} ${position} ${animation} ${duration}`
)

/** Common overlay patterns */
export const dropdownOpenPattern = anyComponentName.map(name =>
  `onclick open ${name} below fade slide-down 200`
)

export const modalOpenPattern = anyComponentName.map(name =>
  `onclick open ${name} center fade scale 300`
)

export const tooltipOpenPattern = anyComponentName.map(name =>
  `onhover open ${name} above fade 150`
)

// =============================================================================
// Combined Generators
// =============================================================================

/** Any show animation */
export const anyShowAnimation = fc.oneof(
  simpleShowAnimation,
  showWithDuration,
  showMultipleAnimations
)

/** Any hide animation */
export const anyHideAnimation = fc.oneof(
  simpleHideAnimation,
  hideWithDuration
)

/** Any continuous animation */
export const anyContinuousAnimation = fc.oneof(
  simpleAnimate,
  animateWithDuration
)

/** Any animation block */
export const anyAnimationBlock = fc.oneof(
  anyShowAnimation,
  anyHideAnimation,
  showHidePair,
  anyContinuousAnimation
)

/** Component with any animation */
export const componentWithAnimation = fc.oneof(
  overlayWithAnimation,
  dropdownAnimation,
  modalAnimation,
  toastAnimation,
  loadingSpinner,
  pulsingIndicator,
  bouncingElement
)

/** Real-world animation patterns */
export const realWorldAnimationPattern = fc.oneof(
  dropdownAnimation,
  modalAnimation,
  toastAnimation,
  loadingSpinner
)
