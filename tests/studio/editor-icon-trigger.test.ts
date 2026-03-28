/**
 * Icon Trigger Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  ICON_TRIGGER_ID,
  createIconTriggerConfig,
  registerIconTrigger,
  unregisterIconTrigger,
  setIconTriggerPrimitives,
  getIconTriggerPrimitives,
} from '../../studio/editor/triggers/icon-trigger'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../../studio/editor/trigger-manager'

describe('Icon Trigger', () => {
  beforeEach(() => {
    // Reset the trigger manager before each test
    setTriggerManager(createTriggerManager())
  })

  afterEach(() => {
    getTriggerManager().dispose()
  })

  describe('createIconTriggerConfig', () => {
    it('should create a valid trigger config', () => {
      const config = createIconTriggerConfig()

      expect(config.id).toBe(ICON_TRIGGER_ID)
      expect(config.trigger.type).toBe('component')
      expect(config.liveFilter).toBe(true)
      expect(config.keyboard?.orientation).toBe('grid')
      expect(config.keyboard?.columns).toBe(7)
    })

    it('should have component trigger with Icon name', () => {
      const config = createIconTriggerConfig()
      const trigger = config.trigger

      expect(trigger.type).toBe('component')
      if (trigger.type === 'component') {
        expect(trigger.names).toContain('Icon')
        expect(trigger.triggerChar).toBe(' ')
      }
    })
  })

  describe('registerIconTrigger', () => {
    it('should register the icon trigger with the manager', () => {
      registerIconTrigger()

      const manager = getTriggerManager()
      const trigger = manager.getTrigger(ICON_TRIGGER_ID)

      expect(trigger).toBeDefined()
      expect(trigger?.id).toBe(ICON_TRIGGER_ID)
    })
  })

  describe('unregisterIconTrigger', () => {
    it('should unregister the icon trigger', () => {
      registerIconTrigger()
      unregisterIconTrigger()

      const manager = getTriggerManager()
      const trigger = manager.getTrigger(ICON_TRIGGER_ID)

      expect(trigger).toBeUndefined()
    })
  })

  describe('component primitives', () => {
    it('should set and get component primitives', () => {
      const primitives = new Map<string, string>([
        ['Logo', 'icon'],
        ['Avatar', 'icon'],
      ])

      setIconTriggerPrimitives(primitives)
      const result = getIconTriggerPrimitives()

      expect(result.get('Logo')).toBe('icon')
      expect(result.get('Avatar')).toBe('icon')
    })
  })
})
