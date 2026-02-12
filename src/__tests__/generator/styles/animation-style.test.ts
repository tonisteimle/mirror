/**
 * Animation Style Conversion Tests
 *
 * Tests for converting AnimationDefinition to CSS styles
 */

import { describe, it, expect } from 'vitest'
import { getAnimationStyle, getAnimationClasses } from '../../../generator/styles/style-composer'
import type { AnimationDefinition } from '../../../parser/types'

describe('getAnimationStyle', () => {
  describe('show animations', () => {
    it('converts fade show animation', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['fade'],
        duration: 300
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('fadeIn')
      expect(style.animation).toContain('300ms')
      expect(style.animation).toContain('forwards')
    })

    it('converts slide-up show animation', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['slide-up'],
        duration: 400
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('content-slide-up')
      expect(style.animation).toContain('400ms')
    })

    it('converts multiple animations', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['fade', 'slide-up'],
        duration: 300
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('fadeIn')
      expect(style.animation).toContain('content-slide-up')
    })

    it('converts scale show animation', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['scale'],
        duration: 250
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('scaleIn')
      expect(style.animation).toContain('250ms')
    })
  })

  describe('hide animations', () => {
    it('converts fade hide animation', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['fade'],
        duration: 200
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('fadeOut')
      expect(style.animation).toContain('200ms')
    })

    it('converts slide-up hide animation (slides out)', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['slide-up'],
        duration: 300
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('content-slide-up-out')
    })

    it('converts slide-down hide animation', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['slide-down'],
        duration: 300
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('content-slide-down-out')
    })

    it('converts scale hide animation', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['scale'],
        duration: 200
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('content-scale-out')
    })
  })

  describe('continuous animations', () => {
    it('converts spin animation', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['spin'],
        duration: 1000
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('spin')
      expect(style.animation).toContain('1000ms')
      expect(style.animation).toContain('infinite')
    })

    it('converts pulse animation', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['pulse'],
        duration: 800
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('pulse')
      expect(style.animation).toContain('800ms')
      expect(style.animation).toContain('infinite')
    })

    it('converts bounce animation', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['bounce'],
        duration: 600
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('bounce')
      expect(style.animation).toContain('infinite')
    })
  })

  describe('default durations', () => {
    it('uses 300ms default for show', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['fade']
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('300ms')
    })

    it('uses 300ms default for hide', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['fade']
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('300ms')
    })

    it('uses 1000ms default for animate', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['spin']
      }

      const style = getAnimationStyle(animDef)
      expect(style.animation).toContain('1000ms')
    })
  })

  describe('edge cases', () => {
    it('returns empty object for undefined', () => {
      const style = getAnimationStyle(undefined)
      expect(style).toEqual({})
    })

    it('returns empty object for empty animations', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: [],
        duration: 300
      }

      const style = getAnimationStyle(animDef)
      expect(style).toEqual({})
    })

    it('ignores unknown animation names', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['unknown-animation'],
        duration: 300
      }

      const style = getAnimationStyle(animDef)
      expect(style).toEqual({})
    })
  })
})

describe('getAnimationClasses', () => {
  describe('show animations', () => {
    it('returns correct class for fade-in', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['fade'],
        duration: 300
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-fade-in')
    })

    it('returns correct class for slide-up-in', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['slide-up'],
        duration: 300
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-slide-up-in')
    })

    it('returns multiple classes for combined animations', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: ['fade', 'scale'],
        duration: 300
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-fade-in')
      expect(classes).toContain('mirror-anim-scale-in')
    })
  })

  describe('hide animations', () => {
    it('returns correct class for fade-out', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['fade'],
        duration: 200
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-fade-out')
    })

    it('returns correct class for slide-up-out', () => {
      const animDef: AnimationDefinition = {
        type: 'hide',
        animations: ['slide-up'],
        duration: 300
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-slide-up-out')
    })
  })

  describe('continuous animations', () => {
    it('returns correct class for spin', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['spin'],
        duration: 1000
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-spin')
    })

    it('returns correct class for pulse', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['pulse'],
        duration: 800
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-pulse')
    })

    it('returns correct class for bounce', () => {
      const animDef: AnimationDefinition = {
        type: 'animate',
        animations: ['bounce'],
        duration: 600
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toContain('mirror-anim-bounce')
    })
  })

  describe('edge cases', () => {
    it('returns empty array for undefined', () => {
      const classes = getAnimationClasses(undefined)
      expect(classes).toEqual([])
    })

    it('returns empty array for empty animations', () => {
      const animDef: AnimationDefinition = {
        type: 'show',
        animations: [],
        duration: 300
      }

      const classes = getAnimationClasses(animDef)
      expect(classes).toEqual([])
    })
  })
})
