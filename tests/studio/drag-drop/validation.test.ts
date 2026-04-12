/**
 * Validation Tests
 *
 * Tests for DragSource and DropResult validation functions.
 */

import { describe, it, expect } from 'vitest'
import {
  validateDragSource,
  validateDropResult,
  validateDropOperation,
} from '../../../studio/drag-drop/validation'
import type { DragSource, DropResult, DropTarget } from '../../../studio/drag-drop/types'

// ============================================
// Test Helpers
// ============================================

function createPaletteSource(overrides?: Partial<DragSource>): DragSource {
  return {
    type: 'palette',
    componentName: 'Button',
    ...overrides,
  }
}

function createCanvasSource(overrides?: Partial<DragSource>): DragSource {
  return {
    type: 'canvas',
    nodeId: 'node-1',
    ...overrides,
  }
}

function createDropTarget(overrides?: Partial<DropTarget>): DropTarget {
  return {
    nodeId: 'target-1',
    rect: { x: 0, y: 0, width: 100, height: 100 },
    layoutType: 'flex',
    ...overrides,
  }
}

function createDropResult(overrides?: Partial<DropResult>): DropResult {
  return {
    target: createDropTarget(),
    placement: 'inside',
    targetId: 'target-1',
    ...overrides,
  }
}

// ============================================
// validateDragSource Tests
// ============================================

describe('validateDragSource', () => {
  describe('palette source', () => {
    it('validates valid palette source', () => {
      const source = createPaletteSource()
      const result = validateDragSource(source)
      expect(result.valid).toBe(true)
    })

    it('rejects palette source without componentName', () => {
      const source = createPaletteSource({ componentName: undefined })
      const result = validateDragSource(source)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Palette DragSource requires componentName')
    })

    it('allows palette source without optional fields', () => {
      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        // No componentId, properties, textContent, children
      }
      const result = validateDragSource(source)
      expect(result.valid).toBe(true)
    })
  })

  describe('canvas source', () => {
    it('validates valid canvas source', () => {
      const source = createCanvasSource()
      const result = validateDragSource(source)
      expect(result.valid).toBe(true)
    })

    it('rejects canvas source without nodeId', () => {
      const source = createCanvasSource({ nodeId: undefined })
      const result = validateDragSource(source)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Canvas DragSource requires nodeId')
    })
  })

  describe('invalid sources', () => {
    it('rejects source without type', () => {
      const source = { componentName: 'Button' } as DragSource
      const result = validateDragSource(source)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('DragSource missing type')
    })

    it('rejects source with invalid type', () => {
      const source = { type: 'invalid' } as DragSource
      const result = validateDragSource(source)
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid DragSource type: invalid')
    })
  })
})

// ============================================
// validateDropResult Tests
// ============================================

describe('validateDropResult', () => {
  describe('valid results', () => {
    it('validates inside placement', () => {
      const result = createDropResult({ placement: 'inside' })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(true)
    })

    it('validates before placement with targetId', () => {
      const result = createDropResult({ placement: 'before', targetId: 'sibling-1' })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(true)
    })

    it('validates after placement with targetId', () => {
      const result = createDropResult({ placement: 'after', targetId: 'sibling-1' })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(true)
    })

    it('validates absolute placement with position', () => {
      const result = createDropResult({
        placement: 'absolute',
        position: { x: 100, y: 200 },
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(true)
    })
  })

  describe('missing fields', () => {
    it('rejects result without target', () => {
      const result = { placement: 'inside', targetId: 'target-1' } as DropResult
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('DropResult missing target')
    })

    it('rejects result without placement', () => {
      const result = createDropResult({ placement: undefined as unknown as 'inside' })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('DropResult missing placement')
    })

    it('rejects target without nodeId', () => {
      const result = createDropResult({
        target: createDropTarget({ nodeId: undefined as unknown as string }),
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('DropResult target missing nodeId')
    })
  })

  describe('placement-specific validation', () => {
    it('rejects before placement without targetId', () => {
      const result = createDropResult({
        placement: 'before',
        targetId: undefined as unknown as string,
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('before placement requires targetId')
    })

    it('rejects after placement without targetId', () => {
      const result = createDropResult({
        placement: 'after',
        targetId: undefined as unknown as string,
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('after placement requires targetId')
    })

    it('rejects absolute placement without position', () => {
      const result = createDropResult({
        placement: 'absolute',
        position: undefined,
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('Absolute placement requires position')
    })

    it('rejects absolute placement with invalid position', () => {
      const result = createDropResult({
        placement: 'absolute',
        position: { x: 'invalid', y: 100 } as unknown as { x: number; y: number },
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('Invalid position: x and y must be numbers')
    })
  })

  describe('invalid placement', () => {
    it('rejects invalid placement type', () => {
      const result = createDropResult({
        placement: 'invalid' as unknown as 'inside',
      })
      const validation = validateDropResult(result)
      expect(validation.valid).toBe(false)
      expect(validation.error).toBe('Invalid placement: invalid')
    })
  })
})

// ============================================
// validateDropOperation Tests
// ============================================

describe('validateDropOperation', () => {
  it('validates valid palette drop', () => {
    const source = createPaletteSource()
    const result = createDropResult()
    const validation = validateDropOperation(source, result)
    expect(validation.valid).toBe(true)
  })

  it('validates valid canvas drop', () => {
    const source = createCanvasSource()
    const result = createDropResult()
    const validation = validateDropOperation(source, result)
    expect(validation.valid).toBe(true)
  })

  it('returns source error when source is invalid', () => {
    const source = { componentName: 'Button' } as DragSource // Missing type
    const result = createDropResult()
    const validation = validateDropOperation(source, result)
    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('DragSource missing type')
  })

  it('returns result error when result is invalid', () => {
    const source = createPaletteSource()
    const result = createDropResult({ placement: 'absolute', position: undefined })
    const validation = validateDropOperation(source, result)
    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('Absolute placement requires position')
  })

  it('validates both source and result', () => {
    const source = createCanvasSource({ nodeId: undefined })
    const result = createDropResult({ placement: 'absolute', position: undefined })
    const validation = validateDropOperation(source, result)
    // Should fail on source validation first
    expect(validation.valid).toBe(false)
    expect(validation.error).toBe('Canvas DragSource requires nodeId')
  })
})
