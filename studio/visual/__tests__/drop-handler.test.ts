/**
 * DropHandler Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DropHandler, createDropHandler, DropData } from '../drop-handler'
import type { DropZoneInfo } from '../drag-drop-visualizer'
import type { CodeModifier, ModificationResult } from '../../../src/studio/code-modifier'

// Mock DOMRect for Node.js environment
const mockRect = (x = 0, y = 0, w = 100, h = 100) => ({ x, y, width: w, height: h }) as DOMRect

describe('DropHandler', () => {
  let mockCodeModifier: Partial<CodeModifier>
  let onCodeChange: ReturnType<typeof vi.fn>
  let dropHandler: DropHandler

  const successResult: ModificationResult = {
    success: true,
    newSource: 'Box\n  Button "Click"',
    change: { from: 0, to: 0, insert: '' },
  }

  const failResult: ModificationResult = {
    success: false,
    newSource: '',
    change: { from: 0, to: 0, insert: '' },
    error: 'Test error',
  }

  beforeEach(() => {
    mockCodeModifier = {
      addChild: vi.fn().mockReturnValue(successResult),
      addChildRelativeTo: vi.fn().mockReturnValue(successResult),
      insertWithWrapper: vi.fn().mockReturnValue(successResult),
    }
    onCodeChange = vi.fn()
    dropHandler = createDropHandler(() => mockCodeModifier as CodeModifier, onCodeChange)
  })

  describe('handleDrop', () => {
    it('handles inside placement with regular child insertion', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'component',
        component: 'Button',
        textContent: 'Click',
      }

      const result = dropHandler.handleDrop(zone, data)

      expect(result).toBe(true)
      expect(mockCodeModifier.addChild).toHaveBeenCalledWith('node-1', 'Button', {
        position: 'last',
        properties: undefined,
        textContent: 'Click',
      })
      expect(onCodeChange).toHaveBeenCalledWith('Box\n  Button "Click"')
    })

    it('handles inside placement with semantic zone wrapper', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        semanticZone: 'top-left',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'component',
        component: 'Icon',
        properties: '"star"',
      }

      const result = dropHandler.handleDrop(zone, data)

      expect(result).toBe(true)
      expect(mockCodeModifier.insertWithWrapper).toHaveBeenCalledWith(
        'node-1',
        'Icon',
        'top-left',
        {
          properties: '"star"',
          textContent: undefined,
        }
      )
      expect(onCodeChange).toHaveBeenCalled()
    })

    it('skips wrapper for mid-center zone', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        semanticZone: 'mid-center',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'component',
        component: 'Text',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChild).toHaveBeenCalled()
      expect(mockCodeModifier.insertWithWrapper).not.toHaveBeenCalled()
    })

    it('handles before placement as sibling', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-2',
        placement: 'before',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'component',
        component: 'Divider',
      }

      const result = dropHandler.handleDrop(zone, data)

      expect(result).toBe(true)
      expect(mockCodeModifier.addChildRelativeTo).toHaveBeenCalledWith(
        'node-2',
        'Divider',
        'before',
        {
          properties: undefined,
          textContent: undefined,
        }
      )
    })

    it('handles after placement as sibling', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-3',
        placement: 'after',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'component',
        component: 'Spacer',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChildRelativeTo).toHaveBeenCalledWith(
        'node-3',
        'Spacer',
        'after',
        expect.any(Object)
      )
    })

    it('returns false when CodeModifier is not available', () => {
      const handler = createDropHandler(() => null, onCodeChange)
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }

      const result = handler.handleDrop(zone, { type: 'component', component: 'Box' })

      expect(result).toBe(false)
      expect(onCodeChange).not.toHaveBeenCalled()
    })

    it('returns false when modification fails', () => {
      mockCodeModifier.addChild = vi.fn().mockReturnValue(failResult)

      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }

      const result = dropHandler.handleDrop(zone, { type: 'component', component: 'Box' })

      expect(result).toBe(false)
      expect(onCodeChange).not.toHaveBeenCalled()
    })
  })

  describe('getComponentName', () => {
    it('uses component property when provided', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'component',
        component: 'CustomButton',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChild).toHaveBeenCalledWith(
        'node-1',
        'CustomButton',
        expect.any(Object)
      )
    })

    it('maps container type with horizontal direction to HBox', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'container',
        direction: 'horizontal',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChild).toHaveBeenCalledWith(
        'node-1',
        'HBox',
        expect.any(Object)
      )
    })

    it('maps container type with vertical direction to VBox', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'container',
        direction: 'vertical',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChild).toHaveBeenCalledWith(
        'node-1',
        'VBox',
        expect.any(Object)
      )
    })

    it('defaults container without direction to VBox', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'container',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChild).toHaveBeenCalledWith(
        'node-1',
        'VBox',
        expect.any(Object)
      )
    })

    it('defaults layout type to Box', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }
      const data: DropData = {
        type: 'layout',
      }

      dropHandler.handleDrop(zone, data)

      expect(mockCodeModifier.addChild).toHaveBeenCalledWith(
        'node-1',
        'Box',
        expect.any(Object)
      )
    })
  })

  describe('createDropHandler factory', () => {
    it('creates a working DropHandler instance', () => {
      const handler = createDropHandler(
        () => mockCodeModifier as CodeModifier,
        onCodeChange
      )

      expect(handler).toBeInstanceOf(DropHandler)

      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        targetRect: mockRect(),
      }

      handler.handleDrop(zone, { type: 'component', component: 'Test' })

      expect(mockCodeModifier.addChild).toHaveBeenCalled()
    })
  })
})
