/**
 * Animations Module
 *
 * Animation system for Mirror runtime.
 * Extracted from dom-runtime.ts for Clean Code.
 */

import { animate as motionAnimateFn } from 'motion'
import type { MirrorElement, StateAnimation } from './types'

// ============================================
// TYPES
// ============================================

export type { StateAnimation }

export interface MotionConfig {
  duration?: number
  delay?: number
  easing?: string | number[]
}

interface AnimationDefinition {
  name: string
  easing: string
  duration?: number
  roles?: string[]
  keyframes: AnimationKeyframe[]
}

interface AnimationKeyframe {
  time: number
  properties: { property: string; value: string; target?: string }[]
}

// ============================================
// PRESETS
// ============================================

const ANIMATION_PRESETS: Record<string, { keyframes: Keyframe[]; easing?: string }> = {
  'fade-in': {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    easing: 'ease-out',
  },
  'fade-out': {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    easing: 'ease-out',
  },
  'slide-in': {
    keyframes: [
      { transform: 'translateY(-10px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    easing: 'ease-out',
  },
  'slide-out': {
    keyframes: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(10px)', opacity: 0 },
    ],
    easing: 'ease-in',
  },
  'scale-in': {
    keyframes: [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    easing: 'ease-out',
  },
  'scale-out': {
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
    easing: 'ease-in',
  },
  bounce: {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ],
    easing: 'ease-out',
  },
  pulse: {
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    easing: 'ease-in-out',
  },
  shake: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' },
    ],
    easing: 'ease-in-out',
  },
  spin: {
    keyframes: [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
    easing: 'linear',
  },
}

const MOTION_PRESETS: Record<
  string,
  {
    keyframes: Record<string, unknown[]>
    options: { duration?: number; easing?: string | number[] }
  }
> = {
  'fade-in': { keyframes: { opacity: [0, 1] }, options: { duration: 0.3, easing: 'ease-out' } },
  'fade-out': { keyframes: { opacity: [1, 0] }, options: { duration: 0.3, easing: 'ease-out' } },
  'slide-up': {
    keyframes: { transform: ['translateY(20px)', 'translateY(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'slide-down': {
    keyframes: { transform: ['translateY(-20px)', 'translateY(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'slide-left': {
    keyframes: { transform: ['translateX(20px)', 'translateX(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'slide-right': {
    keyframes: { transform: ['translateX(-20px)', 'translateX(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'scale-in': {
    keyframes: { transform: ['scale(0.9)', 'scale(1)'], opacity: [0, 1] },
    options: { duration: 0.3, easing: [0.34, 1.56, 0.64, 1] },
  },
  'scale-out': {
    keyframes: { transform: ['scale(1)', 'scale(0.9)'], opacity: [1, 0] },
    options: { duration: 0.2, easing: 'ease-in' },
  },
  bounce: {
    keyframes: { transform: ['scale(1)', 'scale(1.15)', 'scale(0.95)', 'scale(1.02)', 'scale(1)'] },
    options: { duration: 0.5, easing: 'ease-out' },
  },
  pulse: {
    keyframes: { transform: ['scale(1)', 'scale(1.05)', 'scale(1)'], opacity: [1, 0.85, 1] },
    options: { duration: 0.6, easing: 'ease-in-out' },
  },
  shake: {
    keyframes: {
      transform: [
        'translateX(0)',
        'translateX(-8px)',
        'translateX(8px)',
        'translateX(-4px)',
        'translateX(4px)',
        'translateX(0)',
      ],
    },
    options: { duration: 0.4, easing: 'ease-in-out' },
  },
  spin: {
    keyframes: { transform: ['rotate(0deg)', 'rotate(360deg)'] },
    options: { duration: 1, easing: 'linear' },
  },
}

// ============================================
// STATE
// ============================================

const animationRegistry: Map<string, AnimationDefinition> = new Map()

// ============================================
// PUBLIC API
// ============================================

export function playStateAnimation(
  el: MirrorElement,
  anim: StateAnimation,
  styles?: Record<string, string>
): Promise<void> {
  return new Promise(resolve => {
    const duration = (anim.duration || 0.3) * 1000,
      delay = (anim.delay || 0) * 1000,
      easing = anim.easing || 'ease-out'
    if (anim.preset) {
      playPresetAnimation(el, anim.preset, duration, delay, easing, styles, resolve)
      return
    }
    if (styles && duration > 0) {
      playCSSTransition(el, styles, duration, delay, easing, resolve)
      return
    }
    applyStylesImmediate(el, styles)
    resolve()
  })
}

export function registerAnimation(animation: AnimationDefinition): void {
  animationRegistry.set(animation.name, animation)
}

export function getAnimation(name: string): AnimationDefinition | undefined {
  return animationRegistry.get(name)
}

export function animate(
  animationName: string,
  elements: MirrorElement | MirrorElement[] | null,
  options: {
    duration?: number
    delay?: number
    stagger?: number
    loop?: boolean
    reverse?: boolean
    fill?: FillMode
  } = {}
): Animation[] | null {
  if (!elements) return null
  const animation = animationRegistry.get(animationName)
  if (!animation) {
    console.warn(`Animation "${animationName}" not found`)
    return null
  }
  return (Array.isArray(elements) ? elements : [elements]).map((el, i) =>
    animateElement(el, animation, options, i)
  )
}

export function setupEnterExitObserver(
  el: MirrorElement,
  onEnter?: () => void,
  onExit?: () => void
): IntersectionObserver {
  const observer = new IntersectionObserver(
    entries => handleIntersection(entries, onEnter, onExit),
    { threshold: 0.1 }
  )
  observer.observe(el)
  return observer
}

export function motionAnimate(
  el: HTMLElement,
  preset: string | Record<string, unknown[]>,
  config?: MotionConfig
): Promise<void> {
  return new Promise(resolve => {
    const { keyframes, options } = resolveMotionPreset(preset)
    if (!keyframes) {
      resolve()
      return
    }
    const animOptions = buildMotionOptions(options, config)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    motionAnimateFn(el, keyframes as any, animOptions as any)
      .finished.then(() => resolve())
      .catch(() => resolve())
  })
}

export function getMotionPreset(name: string): (typeof MOTION_PRESETS)[string] | undefined {
  return MOTION_PRESETS[name]
}

// ============================================
// INTERNAL HELPERS
// ============================================

function playPresetAnimation(
  el: MirrorElement,
  presetName: string,
  duration: number,
  delay: number,
  easing: string,
  styles: Record<string, string> | undefined,
  resolve: () => void
): void {
  const preset = ANIMATION_PRESETS[presetName]
  if (!preset) {
    applyStylesImmediate(el, styles)
    resolve()
    return
  }

  prepareElementForEnterAnimation(el, styles)

  const animation = el.animate(preset.keyframes, {
    duration,
    delay,
    easing: preset.easing || easing,
    fill: 'forwards',
  })

  animation.onfinish = () => finalizeAnimation(el, styles, resolve)
  animation.oncancel = () => finalizeAnimation(el, styles, resolve)
}

function prepareElementForEnterAnimation(el: MirrorElement, styles?: Record<string, string>): void {
  if (styles && 'display' in styles) {
    el.style.display = styles.display || 'flex'
    el.hidden = false
  }
}

function finalizeAnimation(
  el: MirrorElement,
  styles: Record<string, string> | undefined,
  resolve: () => void
): void {
  if (styles) Object.assign(el.style, styles)
  resolve()
}

function playCSSTransition(
  el: MirrorElement,
  styles: Record<string, string>,
  duration: number,
  delay: number,
  easing: string,
  resolve: () => void
): void {
  el.style.transition = `all ${duration}ms ${easing}`
  Object.assign(el.style, styles)
  setTimeout(() => {
    el.style.transition = ''
    resolve()
  }, duration + delay)
}

function applyStylesImmediate(el: MirrorElement, styles?: Record<string, string>): void {
  if (styles) Object.assign(el.style, styles)
}

function animateElement(
  el: MirrorElement,
  animation: AnimationDefinition,
  options: {
    duration?: number
    delay?: number
    stagger?: number
    loop?: boolean
    reverse?: boolean
    fill?: FillMode
  },
  index: number
): Animation {
  const keyframes = convertKeyframes(animation.keyframes, animation.duration || 0.3)
  const duration = (options.duration || animation.duration || 0.3) * 1000
  const delay = (options.delay || 0) * 1000 + (options.stagger || 0) * 1000 * index

  return el.animate(keyframes, {
    duration,
    delay,
    easing: animation.easing,
    fill: options.fill || 'forwards',
    iterations: options.loop ? Infinity : 1,
    direction: options.reverse ? 'reverse' : 'normal',
  })
}

function convertKeyframes(keyframes: AnimationKeyframe[], duration: number): Keyframe[] {
  return keyframes.map(kf => {
    const frame: Keyframe = { offset: kf.time / duration }
    for (const prop of kf.properties) {
      applyKeyframeProperty(frame, prop)
    }
    return frame
  })
}

function applyKeyframeProperty(frame: Keyframe, prop: { property: string; value: string }): void {
  switch (prop.property) {
    case 'opacity':
      frame.opacity = prop.value
      break
    case 'y-offset':
      frame.transform = `translateY(${prop.value}px)`
      break
    case 'x-offset':
      frame.transform = `translateX(${prop.value}px)`
      break
    case 'scale':
      frame.transform = `scale(${prop.value})`
      break
    case 'rotate':
      frame.transform = `rotate(${prop.value}deg)`
      break
  }
}

function handleIntersection(
  entries: IntersectionObserverEntry[],
  onEnter?: () => void,
  onExit?: () => void
): void {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      onEnter?.()
    } else {
      onExit?.()
    }
  }
}

function resolveMotionPreset(preset: string | Record<string, unknown[]>): {
  keyframes: Record<string, unknown[]> | null
  options: { duration?: number; easing?: string | number[] }
} {
  if (typeof preset === 'string' && MOTION_PRESETS[preset]) {
    return { keyframes: MOTION_PRESETS[preset].keyframes, options: MOTION_PRESETS[preset].options }
  }
  if (typeof preset === 'object') {
    return { keyframes: preset, options: {} }
  }
  console.warn(`Motion preset "${preset}" not found`)
  return { keyframes: null, options: {} }
}

function buildMotionOptions(
  baseOptions: { duration?: number; easing?: string | number[] },
  config?: MotionConfig
): Record<string, unknown> {
  return {
    duration: config?.duration || baseOptions.duration || 0.3,
    delay: config?.delay || 0,
    easing: config?.easing || baseOptions.easing || 'ease-out',
  }
}
