/**
 * Color Trigger Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  COLOR_HASH_TRIGGER_ID,
  COLOR_DOUBLECLICK_TRIGGER_ID,
  createColorHashTriggerConfig,
  createColorDoubleClickTriggerConfig,
  registerColorTriggers,
  unregisterColorTriggers,
  getColorContextPattern,
  getHexColorPattern,
  navigateColorSwatches,
  getSelectedSwatchIndex,
  setSelectedSwatchIndex,
} from '../triggers/color-trigger'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../trigger-manager'

describe('Color Trigger', () => {
  beforeEach(() => {
    // Reset the trigger manager before each test
    setTriggerManager(createTriggerManager())
  })

  afterEach(() => {
    getTriggerManager().dispose()
  })

  describe('createColorHashTriggerConfig', () => {
    it('should create a valid trigger config', () => {
      const config = createColorHashTriggerConfig()

      expect(config.id).toBe(COLOR_HASH_TRIGGER_ID)
      expect(config.trigger.type).toBe('char')
      expect(config.liveFilter).toBe(false)
      expect(config.keyboard?.orientation).toBe('grid')
    })

    it('should have char trigger with #', () => {
      const config = createColorHashTriggerConfig()
      const trigger = config.trigger

      expect(trigger.type).toBe('char')
      if (trigger.type === 'char') {
        expect(trigger.char).toBe('#')
        expect(trigger.contextPattern).toBeDefined()
      }
    })
  })

  describe('createColorDoubleClickTriggerConfig', () => {
    it('should create a valid trigger config', () => {
      const config = createColorDoubleClickTriggerConfig()

      expect(config.id).toBe(COLOR_DOUBLECLICK_TRIGGER_ID)
      expect(config.trigger.type).toBe('doubleClick')
      expect(config.keyboard?.orientation).toBe('grid')
    })

    it('should have hex pattern for double-click', () => {
      const config = createColorDoubleClickTriggerConfig()
      const trigger = config.trigger

      expect(trigger.type).toBe('doubleClick')
      if (trigger.type === 'doubleClick') {
        expect(trigger.pattern).toBeDefined()
      }
    })
  })

  describe('registerColorTriggers', () => {
    it('should register both color triggers', () => {
      registerColorTriggers()

      const manager = getTriggerManager()
      const hashTrigger = manager.getTrigger(COLOR_HASH_TRIGGER_ID)
      const dblClickTrigger = manager.getTrigger(COLOR_DOUBLECLICK_TRIGGER_ID)

      expect(hashTrigger).toBeDefined()
      expect(dblClickTrigger).toBeDefined()
    })
  })

  describe('unregisterColorTriggers', () => {
    it('should unregister both color triggers', () => {
      registerColorTriggers()
      unregisterColorTriggers()

      const manager = getTriggerManager()
      const hashTrigger = manager.getTrigger(COLOR_HASH_TRIGGER_ID)
      const dblClickTrigger = manager.getTrigger(COLOR_DOUBLECLICK_TRIGGER_ID)

      expect(hashTrigger).toBeUndefined()
      expect(dblClickTrigger).toBeUndefined()
    })
  })

  describe('getColorContextPattern', () => {
    it('should return a regex pattern', () => {
      const pattern = getColorContextPattern()
      expect(pattern).toBeInstanceOf(RegExp)
    })

    it('should match color properties followed by space', () => {
      const pattern = getColorContextPattern()

      expect(pattern.test('bg ')).toBe(true)
      expect(pattern.test('col ')).toBe(true)
      expect(pattern.test('boc ')).toBe(true)
      expect(pattern.test('hover-bg ')).toBe(true)
    })

    it('should match token definitions', () => {
      const pattern = getColorContextPattern()

      expect(pattern.test('$accent.bg: ')).toBe(true)
      expect(pattern.test('$name.col: ')).toBe(true)
    })

    it('should not match non-color properties', () => {
      const pattern = getColorContextPattern()

      expect(pattern.test('pad ')).toBe(false)
      expect(pattern.test('gap ')).toBe(false)
    })
  })

  describe('getHexColorPattern', () => {
    it('should return a regex pattern', () => {
      const pattern = getHexColorPattern()
      expect(pattern).toBeInstanceOf(RegExp)
    })

    it('should match 3-digit hex colors', () => {
      const pattern = getHexColorPattern()
      const match = '#fff'.match(pattern)
      expect(match).toBeTruthy()
    })

    it('should match 6-digit hex colors', () => {
      const pattern = getHexColorPattern()
      const match = '#ffffff'.match(pattern)
      expect(match).toBeTruthy()
    })

    it('should match 8-digit hex colors (with alpha)', () => {
      const pattern = getHexColorPattern()
      const match = '#ffffff80'.match(pattern)
      expect(match).toBeTruthy()
    })
  })

  describe('navigateColorSwatches', () => {
    // Grid is 13 columns x 10 rows (row-major indexing)
    // Index = row * 13 + col

    beforeEach(() => {
      // Reset to a known position (row 0, col 0 = index 0)
      setSelectedSwatchIndex(0)
    })

    it('should move right from col 0 to col 1', () => {
      setSelectedSwatchIndex(0) // row 0, col 0
      navigateColorSwatches('right')
      expect(getSelectedSwatchIndex()).toBe(1) // row 0, col 1
    })

    it('should move left from col 1 to col 0', () => {
      setSelectedSwatchIndex(1) // row 0, col 1
      navigateColorSwatches('left')
      expect(getSelectedSwatchIndex()).toBe(0) // row 0, col 0
    })

    it('should not move left from col 0', () => {
      setSelectedSwatchIndex(0) // row 0, col 0
      navigateColorSwatches('left')
      expect(getSelectedSwatchIndex()).toBe(0) // still row 0, col 0
    })

    it('should not move right from last column', () => {
      setSelectedSwatchIndex(12) // row 0, col 12 (last column)
      navigateColorSwatches('right')
      expect(getSelectedSwatchIndex()).toBe(12) // still row 0, col 12
    })

    it('should move down from row 0 to row 1', () => {
      setSelectedSwatchIndex(0) // row 0, col 0
      navigateColorSwatches('down')
      expect(getSelectedSwatchIndex()).toBe(13) // row 1, col 0
    })

    it('should move up from row 1 to row 0', () => {
      setSelectedSwatchIndex(13) // row 1, col 0
      navigateColorSwatches('up')
      expect(getSelectedSwatchIndex()).toBe(0) // row 0, col 0
    })

    it('should not move up from row 0', () => {
      setSelectedSwatchIndex(0) // row 0, col 0
      navigateColorSwatches('up')
      expect(getSelectedSwatchIndex()).toBe(0) // still row 0, col 0
    })

    it('should not move down from last row', () => {
      setSelectedSwatchIndex(117) // row 9, col 0 (last row)
      navigateColorSwatches('down')
      expect(getSelectedSwatchIndex()).toBe(117) // still row 9, col 0
    })

    it('should navigate correctly in middle of grid', () => {
      // Start at row 5, col 6 (index = 5 * 13 + 6 = 71)
      setSelectedSwatchIndex(71)

      navigateColorSwatches('right')
      expect(getSelectedSwatchIndex()).toBe(72) // row 5, col 7

      navigateColorSwatches('down')
      expect(getSelectedSwatchIndex()).toBe(85) // row 6, col 7

      navigateColorSwatches('left')
      expect(getSelectedSwatchIndex()).toBe(84) // row 6, col 6

      navigateColorSwatches('up')
      expect(getSelectedSwatchIndex()).toBe(71) // back to row 5, col 6
    })

    it('should handle diagonal navigation', () => {
      // Start at row 4, col 4 (index = 4 * 13 + 4 = 56)
      setSelectedSwatchIndex(56)

      // Move down-right
      navigateColorSwatches('down')
      navigateColorSwatches('right')
      expect(getSelectedSwatchIndex()).toBe(70) // row 5, col 5

      // Move up-left
      navigateColorSwatches('up')
      navigateColorSwatches('left')
      expect(getSelectedSwatchIndex()).toBe(56) // back to row 4, col 4
    })
  })
})
