/**
 * Trigger Integration Tests
 *
 * End-to-end tests for the unified trigger system.
 * Tests the full flow from trigger activation to value insertion.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../trigger-manager'
import {
  registerAllTriggers,
  unregisterAllTriggers,
  createTriggerExtensions,
  ICON_TRIGGER_ID,
  TOKEN_TRIGGER_ID,
  COLOR_HASH_TRIGGER_ID,
  COLOR_DOUBLECLICK_TRIGGER_ID,
  ANIMATION_TRIGGER_ID,
} from '../triggers'

describe('Trigger Integration', () => {
  beforeEach(() => {
    setTriggerManager(createTriggerManager())
  })

  afterEach(() => {
    getTriggerManager().dispose()
  })

  describe('registerAllTriggers', () => {
    it('should register all four trigger types', () => {
      const files = {
        'theme.txt': '$accent.bg: #007bff\n$base.pad: 16',
      }

      registerAllTriggers({
        getFiles: () => files,
        componentPrimitives: new Map([['Logo', 'icon']]),
      })

      const manager = getTriggerManager()

      // Verify all triggers are registered
      expect(manager.getTrigger(ICON_TRIGGER_ID)).toBeDefined()
      expect(manager.getTrigger(TOKEN_TRIGGER_ID)).toBeDefined()
      expect(manager.getTrigger(COLOR_HASH_TRIGGER_ID)).toBeDefined()
      expect(manager.getTrigger(COLOR_DOUBLECLICK_TRIGGER_ID)).toBeDefined()
      expect(manager.getTrigger(ANIMATION_TRIGGER_ID)).toBeDefined()
    })

    it('should create CodeMirror extensions', () => {
      registerAllTriggers({
        getFiles: () => ({}),
      })

      const extensions = createTriggerExtensions()

      expect(extensions).toBeDefined()
      expect(Array.isArray(extensions)).toBe(true)
      expect(extensions.length).toBeGreaterThan(0)
    })
  })

  describe('unregisterAllTriggers', () => {
    it('should unregister all triggers', () => {
      registerAllTriggers({
        getFiles: () => ({}),
      })

      unregisterAllTriggers()

      const manager = getTriggerManager()
      expect(manager.getTrigger(ICON_TRIGGER_ID)).toBeUndefined()
      expect(manager.getTrigger(TOKEN_TRIGGER_ID)).toBeUndefined()
      expect(manager.getTrigger(COLOR_HASH_TRIGGER_ID)).toBeUndefined()
    })
  })

  describe('Trigger Configurations', () => {
    beforeEach(() => {
      registerAllTriggers({
        getFiles: () => ({
          'tokens.txt': '$accent.bg: #007bff\n$base.pad: 16',
        }),
        componentPrimitives: new Map([['Logo', 'icon']]),
      })
    })

    it('icon trigger should have correct config', () => {
      const config = getTriggerManager().getTrigger(ICON_TRIGGER_ID)

      expect(config).toBeDefined()
      expect(config?.trigger.type).toBe('component')
      expect(config?.keyboard?.orientation).toBe('grid')
      expect(config?.keyboard?.columns).toBe(7)
      expect(config?.liveFilter).toBe(true)
    })

    it('token trigger should have correct config', () => {
      const config = getTriggerManager().getTrigger(TOKEN_TRIGGER_ID)

      expect(config).toBeDefined()
      expect(config?.trigger.type).toBe('char')
      if (config?.trigger.type === 'char') {
        expect(config.trigger.char).toBe('$')
      }
      expect(config?.keyboard?.orientation).toBe('vertical')
      expect(config?.liveFilter).toBe(true)
    })

    it('color hash trigger should have correct config', () => {
      const config = getTriggerManager().getTrigger(COLOR_HASH_TRIGGER_ID)

      expect(config).toBeDefined()
      expect(config?.trigger.type).toBe('char')
      if (config?.trigger.type === 'char') {
        expect(config.trigger.char).toBe('#')
      }
      expect(config?.keyboard?.orientation).toBe('grid')
      expect(config?.liveFilter).toBe(false)
    })

    it('color double-click trigger should have correct config', () => {
      const config = getTriggerManager().getTrigger(COLOR_DOUBLECLICK_TRIGGER_ID)

      expect(config).toBeDefined()
      expect(config?.trigger.type).toBe('doubleClick')
      expect(config?.keyboard?.orientation).toBe('grid')
    })

    it('animation trigger should have correct config', () => {
      const config = getTriggerManager().getTrigger(ANIMATION_TRIGGER_ID)

      expect(config).toBeDefined()
      expect(config?.trigger.type).toBe('doubleClick')
      expect(config?.keyboard?.orientation).toBe('vertical')
    })
  })

  describe('Trigger Priorities', () => {
    beforeEach(() => {
      registerAllTriggers({
        getFiles: () => ({}),
      })
    })

    it('should have correct priority ordering', () => {
      const manager = getTriggerManager()

      const token = manager.getTrigger(TOKEN_TRIGGER_ID)
      const colorHash = manager.getTrigger(COLOR_HASH_TRIGGER_ID)
      const colorDblClick = manager.getTrigger(COLOR_DOUBLECLICK_TRIGGER_ID)
      const animation = manager.getTrigger(ANIMATION_TRIGGER_ID)

      // Token should have highest priority (90)
      expect(token?.priority).toBe(90)
      // Color hash should be next (80)
      expect(colorHash?.priority).toBe(80)
      // Color double-click (70)
      expect(colorDblClick?.priority).toBe(70)
      // Animation lowest (60)
      expect(animation?.priority).toBe(60)
    })
  })

  describe('TriggerManager State', () => {
    beforeEach(() => {
      registerAllTriggers({
        getFiles: () => ({}),
      })
    })

    it('should start with closed state', () => {
      const manager = getTriggerManager()

      expect(manager.isOpen()).toBe(false)
      expect(manager.getActiveTrigger()).toBeNull()
    })

    it('should track state correctly', () => {
      const manager = getTriggerManager()
      const state = manager.getState()

      expect(state.isOpen).toBe(false)
      expect(state.startPos).toBeNull()
      expect(state.picker).toBeNull()
      expect(state.context).toBeNull()
      expect(state.triggerId).toBeNull()
    })
  })

  describe('Component Primitives', () => {
    it('should set and get component primitives', () => {
      const primitives = new Map([
        ['Logo', 'icon'],
        ['Avatar', 'icon'],
        ['ProfilePic', 'image'],
      ])

      registerAllTriggers({
        getFiles: () => ({}),
        componentPrimitives: primitives,
      })

      const manager = getTriggerManager()
      const stored = manager.getComponentPrimitives()

      expect(stored.get('Logo')).toBe('icon')
      expect(stored.get('Avatar')).toBe('icon')
      expect(stored.get('ProfilePic')).toBe('image')
    })
  })

  describe('Extension Creation', () => {
    it('should create 3 extensions (updateListener, keyboardHandler, doubleClickHandler)', () => {
      registerAllTriggers({
        getFiles: () => ({}),
      })

      const extensions = createTriggerExtensions()

      // Should have at least 3 extensions:
      // 1. Update listener for char/regex triggers
      // 2. Keyboard handler (highest priority)
      // 3. Double-click handler
      expect(extensions.length).toBe(3)
    })
  })
})
