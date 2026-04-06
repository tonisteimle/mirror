/**
 * Verification Tests for Sync Mocks & Helpers
 *
 * Ensures the new test utilities work correctly.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockSourceMap,
  createMockSyncTargets,
  createMockLineOffsetService,
  createStandardTestScenario,
  createNestedTestScenario,
} from '../utils/mocks/sync-mocks'
import {
  resetStudioState,
  waitForDebounce,
  simulateSelection,
  assertSelection,
  assertEditorScrolledTo,
  assertPreviewHighlighted,
  delay,
} from '../utils/helpers/sync-helpers'
import { state } from '../../studio/core'

describe('Sync Mocks Verification', () => {
  beforeEach(() => {
    resetStudioState()
  })

  describe('MockSourceMap', () => {
    it('should create an empty mock source map', () => {
      const sourceMap = createMockSourceMap()

      expect(sourceMap.getNodeById).toBeDefined()
      expect(sourceMap.getNodeAtLine).toBeDefined()
      expect(sourceMap._nodes.size).toBe(0)
    })

    it('should allow setting and getting nodes', () => {
      const sourceMap = createMockSourceMap()

      sourceMap._setNode('node-1', {
        componentName: 'Frame',
        position: { line: 10, column: 0, offset: 100 },
      })

      const node = sourceMap.getNodeById('node-1')
      expect(node).toBeDefined()
      expect(node?.componentName).toBe('Frame')
      expect(node?.position.line).toBe(10)
    })

    it('should support node lookup by line', () => {
      const sourceMap = createMockSourceMap()

      sourceMap._setNode('node-1', {
        componentName: 'Text',
        position: { line: 15, column: 2, offset: 150 },
      })

      const node = sourceMap.getNodeAtLine(15)
      expect(node?.nodeId).toBe('node-1')
    })
  })

  describe('MockSyncTargets', () => {
    it('should track scroll history', () => {
      const targets = createMockSyncTargets()

      targets.scrollEditorToLine(10)
      targets.scrollEditorToLine(20)
      targets.scrollEditorToLine(30)

      expect(targets._scrollHistory).toEqual([10, 20, 30])
      expect(targets.scrollEditorToLine).toHaveBeenCalledTimes(3)
    })

    it('should track highlight history', () => {
      const targets = createMockSyncTargets()

      targets.highlightPreviewElement('node-1')
      targets.highlightPreviewElement('node-2')
      targets.highlightPreviewElement(null)

      expect(targets._highlightHistory).toEqual(['node-1', 'node-2', null])
    })
  })

  describe('MockLineOffsetService', () => {
    it('should translate editor to source map lines', () => {
      const service = createMockLineOffsetService(50)

      expect(service.editorToSourceMap(1)).toBe(51)
      expect(service.editorToSourceMap(10)).toBe(60)
    })

    it('should translate source map to editor lines', () => {
      const service = createMockLineOffsetService(50)

      expect(service.sourceMapToEditor(51)).toBe(1)
      expect(service.sourceMapToEditor(100)).toBe(50)
    })

    it('should identify lines in current file', () => {
      const service = createMockLineOffsetService(50)

      expect(service.isInCurrentFile(50)).toBe(false) // At offset
      expect(service.isInCurrentFile(51)).toBe(true) // After offset
    })
  })

  describe('Standard Test Scenario', () => {
    it('should create a complete scenario with 3 sibling elements', () => {
      const { sourceMap, targets, lineOffset } = createStandardTestScenario()

      // Check nodes exist
      expect(sourceMap.getNodeById('node-1')).toBeDefined()
      expect(sourceMap.getNodeById('node-2')).toBeDefined()
      expect(sourceMap.getNodeById('node-3')).toBeDefined()
      expect(sourceMap.getNodeById('node-4')).toBeDefined()

      // Check hierarchy
      expect(sourceMap.getNodeById('node-2')?.parentId).toBe('node-1')
      expect(sourceMap.getNodeById('node-3')?.parentId).toBe('node-1')
      expect(sourceMap.getNodeById('node-4')?.parentId).toBe('node-1')

      // Check line offset
      expect(lineOffset.getOffset()).toBe(50)
    })
  })

  describe('Nested Test Scenario', () => {
    it('should create a scenario with nested containers', () => {
      const { sourceMap } = createNestedTestScenario()

      // Check nested structure
      const node3 = sourceMap.getNodeById('node-3')
      const node5 = sourceMap.getNodeById('node-5')

      expect(node3?.parentId).toBe('node-2') // Inside nested frame
      expect(node5?.parentId).toBe('node-4') // Inside sibling frame
    })
  })
})

describe('Sync Helpers Verification', () => {
  beforeEach(() => {
    resetStudioState()
  })

  describe('State Management', () => {
    it('should reset state to initial values', () => {
      // Set some state
      state.set({ source: 'test code', selection: { nodeId: 'node-1', origin: 'preview' } })

      // Reset
      resetStudioState()

      // Verify reset
      expect(state.get().source).toBe('')
      expect(state.get().selection.nodeId).toBeNull()
    })

    it('should simulate selection', () => {
      simulateSelection('node-5', 'preview')

      expect(state.get().selection.nodeId).toBe('node-5')
      expect(state.get().selection.origin).toBe('preview')
    })
  })

  describe('Assertions', () => {
    it('should assert selection correctly', () => {
      simulateSelection('node-3', 'editor')

      // Should not throw
      expect(() => assertSelection('node-3', 'editor')).not.toThrow()

      // Should throw for wrong values
      expect(() => assertSelection('node-5')).toThrow()
      expect(() => assertSelection('node-3', 'preview')).toThrow()
    })

    it('should assert editor scroll', () => {
      const targets = createMockSyncTargets()
      targets.scrollEditorToLine(25)

      expect(() => assertEditorScrolledTo(targets, 25)).not.toThrow()
      expect(() => assertEditorScrolledTo(targets, 30)).toThrow()
    })

    it('should assert preview highlight', () => {
      const targets = createMockSyncTargets()
      targets.highlightPreviewElement('node-2')

      expect(() => assertPreviewHighlighted(targets, 'node-2')).not.toThrow()
      expect(() => assertPreviewHighlighted(targets, 'node-3')).toThrow()
    })
  })

  describe('Timing Utilities', () => {
    it('should delay for specified time', async () => {
      const start = Date.now()
      await delay(50)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(45) // Allow small variance
    })
  })
})
