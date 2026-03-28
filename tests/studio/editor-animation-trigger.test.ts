/**
 * Animation Trigger Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ANIMATION_TRIGGER_ID,
  createAnimationTriggerConfig,
  registerAnimationTrigger,
  unregisterAnimationTrigger,
  parseAnimationFromLine,
  generateAnimationDSL,
  getAnimationData,
  setAnimationData,
  updateAnimationData,
  addAnimationTrack,
  removeAnimationTrack,
  updateAnimationTrack,
  type AnimationData,
  type AnimationTrack,
} from '../../studio/editor/triggers/animation-trigger'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../../studio/editor/trigger-manager'

describe('Animation Trigger', () => {
  beforeEach(() => {
    // Reset the trigger manager before each test
    setTriggerManager(createTriggerManager())
  })

  afterEach(() => {
    getTriggerManager().dispose()
  })

  describe('createAnimationTriggerConfig', () => {
    it('should create a valid trigger config', () => {
      const config = createAnimationTriggerConfig()

      expect(config.id).toBe(ANIMATION_TRIGGER_ID)
      expect(config.trigger.type).toBe('doubleClick')
      expect(config.keyboard?.orientation).toBe('vertical')
      expect(config.priority).toBe(60)
      expect(config.shouldActivate).toBeDefined()
    })

    it('should have doubleClick trigger with animation pattern', () => {
      const config = createAnimationTriggerConfig()
      const trigger = config.trigger

      expect(trigger.type).toBe('doubleClick')
      if (trigger.type === 'doubleClick') {
        expect(trigger.pattern).toBeDefined()
        // Pattern should match lines with "as animation"
        expect(trigger.pattern.test('FadeIn as animation')).toBe(true)
        expect(trigger.pattern.test('SlideUp as animation 0.5s')).toBe(true)
        expect(trigger.pattern.test('Button bg #fff')).toBe(false)
      }
    })
  })

  describe('registerAnimationTrigger', () => {
    it('should register the animation trigger with the manager', () => {
      registerAnimationTrigger()

      const manager = getTriggerManager()
      const trigger = manager.getTrigger(ANIMATION_TRIGGER_ID)

      expect(trigger).toBeDefined()
      expect(trigger?.id).toBe(ANIMATION_TRIGGER_ID)
    })
  })

  describe('unregisterAnimationTrigger', () => {
    it('should unregister the animation trigger', () => {
      registerAnimationTrigger()
      unregisterAnimationTrigger()

      const manager = getTriggerManager()
      const trigger = manager.getTrigger(ANIMATION_TRIGGER_ID)

      expect(trigger).toBeUndefined()
    })
  })

  describe('parseAnimationFromLine', () => {
    it('should parse simple animation definition', () => {
      const result = parseAnimationFromLine('FadeIn as animation')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('FadeIn')
      expect(result?.easing).toBe('ease-out')
      expect(result?.duration).toBe(0.3)
    })

    it('should parse animation with duration in seconds', () => {
      const result = parseAnimationFromLine('SlideUp as animation 0.5s')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('SlideUp')
      expect(result?.duration).toBe(0.5)
    })

    it('should parse animation with duration in milliseconds', () => {
      const result = parseAnimationFromLine('Bounce as animation 500ms')

      expect(result).not.toBeNull()
      expect(result?.duration).toBe(0.5)
    })

    it('should parse animation with easing', () => {
      const result = parseAnimationFromLine('FadeOut as animation ease-in')

      expect(result).not.toBeNull()
      expect(result?.easing).toBe('ease-in')
    })

    it('should parse animation with delay', () => {
      const result = parseAnimationFromLine('FadeIn as animation delay 0.2s')

      expect(result).not.toBeNull()
      expect(result?.delay).toBe(0.2)
    })

    it('should parse animation with loop', () => {
      const result = parseAnimationFromLine('Spin as animation loop')

      expect(result).not.toBeNull()
      expect(result?.loop).toBe(true)
    })

    it('should parse animation with reverse', () => {
      const result = parseAnimationFromLine('Pulse as animation reverse')

      expect(result).not.toBeNull()
      expect(result?.reverse).toBe(true)
    })

    it('should parse complex animation definition', () => {
      const result = parseAnimationFromLine('FadeUp as animation 0.4s ease-in-out delay 0.1s loop')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('FadeUp')
      expect(result?.duration).toBe(0.4)
      expect(result?.easing).toBe('ease-in-out')
      expect(result?.delay).toBe(0.1)
      expect(result?.loop).toBe(true)
    })

    it('should return null for invalid input', () => {
      expect(parseAnimationFromLine('Button bg #fff')).toBeNull()
      expect(parseAnimationFromLine('Card')).toBeNull()
      expect(parseAnimationFromLine('')).toBeNull()
    })

    it('should handle leading whitespace', () => {
      const result = parseAnimationFromLine('  FadeIn as animation')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('FadeIn')
    })
  })

  describe('generateAnimationDSL', () => {
    it('should generate minimal DSL for default values', () => {
      const data: AnimationData = {
        name: 'FadeIn',
        easing: 'ease-out',
        duration: 0.3,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('FadeIn as animation')
    })

    it('should include duration when non-default', () => {
      const data: AnimationData = {
        name: 'SlideUp',
        easing: 'ease-out',
        duration: 0.5,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('SlideUp as animation 0.5s')
    })

    it('should include easing when non-default', () => {
      const data: AnimationData = {
        name: 'FadeOut',
        easing: 'ease-in',
        duration: 0.3,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('FadeOut as animation ease-in')
    })

    it('should include delay when present', () => {
      const data: AnimationData = {
        name: 'FadeIn',
        easing: 'ease-out',
        duration: 0.3,
        delay: 0.2,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('FadeIn as animation delay 0.2s')
    })

    it('should include loop when true', () => {
      const data: AnimationData = {
        name: 'Spin',
        easing: 'ease-out',
        duration: 0.3,
        loop: true,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('Spin as animation loop')
    })

    it('should include reverse when true', () => {
      const data: AnimationData = {
        name: 'Pulse',
        easing: 'ease-out',
        duration: 0.3,
        reverse: true,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('Pulse as animation reverse')
    })

    it('should generate complex DSL with all options', () => {
      const data: AnimationData = {
        name: 'FadeUp',
        easing: 'linear',
        duration: 0.5,
        delay: 0.1,
        loop: true,
        reverse: true,
        tracks: [],
      }

      const result = generateAnimationDSL(data)
      expect(result).toBe('FadeUp as animation 0.5s linear delay 0.1s loop reverse')
    })
  })

  describe('animation data management', () => {
    it('should set and get animation data', () => {
      const data: AnimationData = {
        name: 'TestAnim',
        easing: 'ease-out',
        duration: 0.3,
        tracks: [],
      }

      setAnimationData(data)
      const result = getAnimationData()

      expect(result).toEqual(data)
    })

    it('should update animation data', () => {
      const data: AnimationData = {
        name: 'TestAnim',
        easing: 'ease-out',
        duration: 0.3,
        tracks: [],
      }

      setAnimationData(data)
      updateAnimationData({ duration: 0.5, loop: true })

      const result = getAnimationData()
      expect(result?.duration).toBe(0.5)
      expect(result?.loop).toBe(true)
      expect(result?.name).toBe('TestAnim')
    })
  })

  describe('animation tracks', () => {
    beforeEach(() => {
      setAnimationData({
        name: 'TestAnim',
        easing: 'ease-out',
        duration: 0.3,
        tracks: [
          { property: 'opacity', startTime: 0, endTime: 0.3, fromValue: 0, toValue: 1 },
        ],
      })
    })

    it('should add a track', () => {
      const track: AnimationTrack = {
        property: 'transform',
        startTime: 0,
        endTime: 0.3,
        fromValue: 'translateY(20px)',
        toValue: 'translateY(0)',
      }

      addAnimationTrack(track)

      const data = getAnimationData()
      expect(data?.tracks).toHaveLength(2)
      expect(data?.tracks[1]).toEqual(track)
    })

    it('should remove a track (not the last one)', () => {
      addAnimationTrack({
        property: 'transform',
        startTime: 0,
        endTime: 0.3,
        fromValue: 'translateY(20px)',
        toValue: 'translateY(0)',
      })

      removeAnimationTrack(0)

      const data = getAnimationData()
      expect(data?.tracks).toHaveLength(1)
      expect(data?.tracks[0].property).toBe('transform')
    })

    it('should not remove the last track', () => {
      removeAnimationTrack(0)

      const data = getAnimationData()
      expect(data?.tracks).toHaveLength(1)
    })

    it('should update a track', () => {
      updateAnimationTrack(0, { property: 'scale', toValue: 1.2 })

      const data = getAnimationData()
      expect(data?.tracks[0].property).toBe('scale')
      expect(data?.tracks[0].toValue).toBe(1.2)
      expect(data?.tracks[0].fromValue).toBe(0) // unchanged
    })
  })
})
