/**
 * Token Trigger Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  TOKEN_TRIGGER_ID,
  createTokenTriggerConfig,
  registerTokenTrigger,
  unregisterTokenTrigger,
  extractAllTokens,
  getPropertySuffixes,
  getPropertyTypes,
} from '../triggers/token-trigger'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../trigger-manager'

describe('Token Trigger', () => {
  beforeEach(() => {
    // Reset the trigger manager before each test
    setTriggerManager(createTriggerManager())
  })

  afterEach(() => {
    getTriggerManager().dispose()
  })

  describe('createTokenTriggerConfig', () => {
    it('should create a valid trigger config', () => {
      const getFiles = () => ({})
      const config = createTokenTriggerConfig(getFiles)

      expect(config.id).toBe(TOKEN_TRIGGER_ID)
      expect(config.trigger.type).toBe('char')
      expect(config.liveFilter).toBe(true)
      expect(config.keyboard?.orientation).toBe('vertical')
    })

    it('should have char trigger with $', () => {
      const getFiles = () => ({})
      const config = createTokenTriggerConfig(getFiles)
      const trigger = config.trigger

      expect(trigger.type).toBe('char')
      if (trigger.type === 'char') {
        expect(trigger.char).toBe('$')
        expect(trigger.contextPattern).toBeDefined()
      }
    })
  })

  describe('registerTokenTrigger', () => {
    it('should register the token trigger with the manager', () => {
      const getFiles = () => ({})
      registerTokenTrigger(getFiles)

      const manager = getTriggerManager()
      const trigger = manager.getTrigger(TOKEN_TRIGGER_ID)

      expect(trigger).toBeDefined()
      expect(trigger?.id).toBe(TOKEN_TRIGGER_ID)
    })
  })

  describe('unregisterTokenTrigger', () => {
    it('should unregister the token trigger', () => {
      const getFiles = () => ({})
      registerTokenTrigger(getFiles)
      unregisterTokenTrigger()

      const manager = getTriggerManager()
      const trigger = manager.getTrigger(TOKEN_TRIGGER_ID)

      expect(trigger).toBeUndefined()
    })
  })

  describe('extractAllTokens', () => {
    it('should extract tokens from single file', () => {
      const files = {
        'theme.txt': `$accent.bg: #007bff
$primary.col: #ffffff
$base.pad: 16`,
      }

      const tokens = extractAllTokens(files)

      expect(tokens).toHaveLength(3)
      expect(tokens.map(t => t.name)).toContain('$accent.bg')
    })

    it('should extract tokens from multiple files', () => {
      const files = {
        'colors.txt': '$accent.bg: #007bff',
        'spacing.txt': '$base.pad: 16',
      }

      const tokens = extractAllTokens(files)

      expect(tokens).toHaveLength(2)
    })

    it('should deduplicate tokens by name', () => {
      const files = {
        'file1.txt': '$accent.bg: #007bff',
        'file2.txt': '$accent.bg: #ff0000',
      }

      const tokens = extractAllTokens(files)

      expect(tokens).toHaveLength(1)
    })
  })

  describe('getPropertySuffixes', () => {
    it('should return suffix mappings', () => {
      const suffixes = getPropertySuffixes()

      expect(suffixes.bg).toBe('.bg')
      expect(suffixes.pad).toBe('.pad')
      expect(suffixes.col).toBe('.col')
    })
  })

  describe('getPropertyTypes', () => {
    it('should return type mappings', () => {
      const types = getPropertyTypes()

      expect(types.bg).toBe('color')
      expect(types.pad).toBe('spacing')
      expect(types.col).toBe('color')
    })
  })
})
