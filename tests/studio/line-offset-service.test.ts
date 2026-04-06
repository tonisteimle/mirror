/**
 * Unit Tests for LineOffsetService
 *
 * Tests the line number translation between editor view and SourceMap.
 * The editor shows only the current file, while the SourceMap uses combined
 * source line numbers (prelude + separator + current file).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  LineOffsetService,
  createLineOffsetService,
} from '../../studio/sync/line-offset-service'

describe('LineOffsetService', () => {
  let service: LineOffsetService

  beforeEach(() => {
    service = createLineOffsetService()
  })

  describe('Construction', () => {
    it('should create with default offset of 0', () => {
      expect(service.getOffset()).toBe(0)
    })

    it('should be created via factory function', () => {
      const factoryService = createLineOffsetService()
      expect(factoryService).toBeInstanceOf(LineOffsetService)
      expect(factoryService.getOffset()).toBe(0)
    })
  })

  describe('setOffset / getOffset', () => {
    it('should set and get the offset', () => {
      service.setOffset(50)
      expect(service.getOffset()).toBe(50)
    })

    it('should update offset when called multiple times', () => {
      service.setOffset(10)
      expect(service.getOffset()).toBe(10)

      service.setOffset(100)
      expect(service.getOffset()).toBe(100)
    })

    it('should accept zero offset', () => {
      service.setOffset(0)
      expect(service.getOffset()).toBe(0)
    })
  })

  describe('editorToSourceMap', () => {
    it('should return same line when offset is 0', () => {
      service.setOffset(0)

      expect(service.editorToSourceMap(1)).toBe(1)
      expect(service.editorToSourceMap(10)).toBe(10)
      expect(service.editorToSourceMap(100)).toBe(100)
    })

    it('should add offset to editor line', () => {
      service.setOffset(50)

      // Editor line 1 → SourceMap line 51
      expect(service.editorToSourceMap(1)).toBe(51)
      // Editor line 10 → SourceMap line 60
      expect(service.editorToSourceMap(10)).toBe(60)
      // Editor line 100 → SourceMap line 150
      expect(service.editorToSourceMap(100)).toBe(150)
    })

    it('should handle various offsets', () => {
      service.setOffset(25)
      expect(service.editorToSourceMap(1)).toBe(26)

      service.setOffset(200)
      expect(service.editorToSourceMap(5)).toBe(205)
    })
  })

  describe('sourceMapToEditor', () => {
    it('should return same line when offset is 0', () => {
      service.setOffset(0)

      expect(service.sourceMapToEditor(1)).toBe(1)
      expect(service.sourceMapToEditor(10)).toBe(10)
      expect(service.sourceMapToEditor(100)).toBe(100)
    })

    it('should subtract offset from SourceMap line', () => {
      service.setOffset(50)

      // SourceMap line 51 → Editor line 1
      expect(service.sourceMapToEditor(51)).toBe(1)
      // SourceMap line 60 → Editor line 10
      expect(service.sourceMapToEditor(60)).toBe(10)
      // SourceMap line 150 → Editor line 100
      expect(service.sourceMapToEditor(150)).toBe(100)
    })

    it('should return minimum of 1 for lines before the file', () => {
      service.setOffset(50)

      // SourceMap line 50 is at offset, would calculate to 0, should return 1
      expect(service.sourceMapToEditor(50)).toBe(1)
      // SourceMap line 25 is before the file, would calculate to -25, should return 1
      expect(service.sourceMapToEditor(25)).toBe(1)
      // SourceMap line 1 would calculate to -49, should return 1
      expect(service.sourceMapToEditor(1)).toBe(1)
    })

    it('should handle edge case at exactly offset + 1', () => {
      service.setOffset(50)
      // SourceMap line 51 → Editor line 1 (first line of file)
      expect(service.sourceMapToEditor(51)).toBe(1)
    })
  })

  describe('isInCurrentFile', () => {
    it('should return true for all lines when offset is 0', () => {
      service.setOffset(0)

      // Line 1 is after offset 0
      expect(service.isInCurrentFile(1)).toBe(true)
      expect(service.isInCurrentFile(10)).toBe(true)
      expect(service.isInCurrentFile(100)).toBe(true)
    })

    it('should return false for lines in prelude (at or before offset)', () => {
      service.setOffset(50)

      // Lines 1-50 are prelude
      expect(service.isInCurrentFile(1)).toBe(false)
      expect(service.isInCurrentFile(25)).toBe(false)
      expect(service.isInCurrentFile(50)).toBe(false) // Exactly at offset - still prelude
    })

    it('should return true for lines after the offset', () => {
      service.setOffset(50)

      // Line 51+ is in current file
      expect(service.isInCurrentFile(51)).toBe(true)
      expect(service.isInCurrentFile(100)).toBe(true)
      expect(service.isInCurrentFile(1000)).toBe(true)
    })

    it('should handle zero line number', () => {
      service.setOffset(50)
      // Line 0 is not in file (before offset)
      expect(service.isInCurrentFile(0)).toBe(false)

      service.setOffset(0)
      // Even with zero offset, line 0 is not "after" 0
      expect(service.isInCurrentFile(0)).toBe(false)
    })
  })

  describe('Round-trip Conversion', () => {
    it('should round-trip: editor → sourceMap → editor', () => {
      service.setOffset(50)

      const editorLine = 25
      const sourceMapLine = service.editorToSourceMap(editorLine)
      const backToEditor = service.sourceMapToEditor(sourceMapLine)

      expect(backToEditor).toBe(editorLine)
    })

    it('should round-trip for multiple lines', () => {
      service.setOffset(100)

      const testLines = [1, 5, 10, 50, 100, 500]
      for (const line of testLines) {
        const converted = service.editorToSourceMap(line)
        const backToEditor = service.sourceMapToEditor(converted)
        expect(backToEditor).toBe(line)
      }
    })

    it('should NOT round-trip for prelude lines (clamps to 1)', () => {
      service.setOffset(50)

      // SourceMap line 25 is in prelude
      const editorLine = service.sourceMapToEditor(25)
      expect(editorLine).toBe(1) // Clamped to minimum

      // Converting back gives different result
      const backToSourceMap = service.editorToSourceMap(editorLine)
      expect(backToSourceMap).toBe(51) // Not 25
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle typical prelude with components', () => {
      // Typical scenario: 45 lines of prelude (component definitions)
      // + separator lines
      service.setOffset(48)

      // User code starts at editor line 1, which is SourceMap line 49
      expect(service.editorToSourceMap(1)).toBe(49)

      // A Frame at SourceMap line 52 is at editor line 4
      expect(service.sourceMapToEditor(52)).toBe(4)

      // SourceMap line 52 is definitely in current file
      expect(service.isInCurrentFile(52)).toBe(true)

      // SourceMap line 48 (last prelude line) is not in current file
      expect(service.isInCurrentFile(48)).toBe(false)
    })

    it('should handle file without prelude', () => {
      // Single file without prelude
      service.setOffset(0)

      // Editor and SourceMap lines are identical
      expect(service.editorToSourceMap(10)).toBe(10)
      expect(service.sourceMapToEditor(10)).toBe(10)
      expect(service.isInCurrentFile(1)).toBe(true)
    })

    it('should handle very large prelude', () => {
      // Large prelude (many component definitions)
      service.setOffset(500)

      expect(service.editorToSourceMap(1)).toBe(501)
      expect(service.sourceMapToEditor(501)).toBe(1)
      expect(service.isInCurrentFile(500)).toBe(false)
      expect(service.isInCurrentFile(501)).toBe(true)
    })
  })
})
