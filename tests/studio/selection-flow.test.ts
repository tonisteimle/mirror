/**
 * Selection Flow Integration Tests
 *
 * Tests the complete selection flow:
 * Preview Click → State Update → Editor Cursor → Property Panel
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, actions, events } from '../../studio/core'
import { PreviewController, createPreviewController } from '../../studio/preview'

describe('Selection Flow', () => {
  let container: HTMLElement
  let preview: PreviewController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'preview'
    document.body.appendChild(container)

    // Create some elements in the preview
    const box = document.createElement('div')
    box.setAttribute('data-mirror-id', 'node-1')
    box.setAttribute('data-mirror-name', 'Box')
    container.appendChild(box)

    const text = document.createElement('span')
    text.setAttribute('data-mirror-id', 'node-2')
    text.setAttribute('data-mirror-name', 'Text')
    box.appendChild(text)

    const button = document.createElement('button')
    button.setAttribute('data-mirror-id', 'node-3')
    button.setAttribute('data-mirror-name', 'Button')
    box.appendChild(button)

    // Reset state
    actions.clearSelection()
    actions.clearMultiSelection()

    // Create preview
    preview = createPreviewController({
      container,
      enableSelection: true,
      enableHover: true,
    })
    preview.attach()
  })

  afterEach(() => {
    preview.dispose()
    document.body.innerHTML = ''
  })

  describe('single selection', () => {
    it('preview.select() method works', () => {
      preview.select('node-3')

      // Preview tracks selection internally
      const element = preview.getElementByNodeId('node-3')
      expect(element?.classList.contains('studio-selected')).toBe(true)
    })

    it('preview.clearSelection() clears selection', () => {
      preview.select('node-1')
      const element = preview.getElementByNodeId('node-1')
      expect(element?.classList.contains('studio-selected')).toBe(true)

      preview.clearSelection()
      expect(element?.classList.contains('studio-selected')).toBe(false)
    })

    it('clicking different element changes selection styling', () => {
      const element1 = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const element2 = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      preview.select('node-1')
      expect(element1.classList.contains('studio-selected')).toBe(true)

      preview.select('node-2')
      expect(element1.classList.contains('studio-selected')).toBe(false)
      expect(element2.classList.contains('studio-selected')).toBe(true)
    })
  })

  describe('multi-selection', () => {
    it('toggleMultiSelection adds to selection', () => {
      actions.toggleMultiSelection('node-1')
      actions.toggleMultiSelection('node-2')

      expect(state.get().multiSelection).toContain('node-1')
      expect(state.get().multiSelection).toContain('node-2')
    })

    it('toggleMultiSelection toggles off', () => {
      actions.toggleMultiSelection('node-1')
      actions.toggleMultiSelection('node-2')

      expect(state.get().multiSelection).toContain('node-1')
      expect(state.get().multiSelection).toContain('node-2')

      // Toggle node-1 off
      actions.toggleMultiSelection('node-1')

      expect(state.get().multiSelection).not.toContain('node-1')
      expect(state.get().multiSelection).toContain('node-2')
    })

    it('clearMultiSelection clears all', () => {
      actions.toggleMultiSelection('node-1')
      actions.toggleMultiSelection('node-2')

      expect(state.get().multiSelection.length).toBe(2)

      actions.clearMultiSelection()

      expect(state.get().multiSelection.length).toBe(0)
    })
  })

  describe('selection events', () => {
    it('onSelect callback is called', () => {
      const callback = vi.fn()
      const unsub = preview.onSelect(callback)

      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      element.click()

      expect(callback).toHaveBeenCalledWith('node-1', element)
      unsub()
    })

    it('onSelect receives null when cleared', () => {
      const callback = vi.fn()
      const unsub = preview.onSelect(callback)

      preview.select('node-1')
      preview.clearSelection()

      expect(callback).toHaveBeenLastCalledWith(null, null)
      unsub()
    })
  })

  describe('hover', () => {
    it('onHover callback is called on mouseover', () => {
      const callback = vi.fn()
      const unsub = preview.onHover(callback)

      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(callback).toHaveBeenCalledWith('node-1', element)
      unsub()
    })

    it('onHover receives null on mouseout', () => {
      const callback = vi.fn()
      const unsub = preview.onHover(callback)

      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      element.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: container }))

      expect(callback).toHaveBeenLastCalledWith(null, null)
      unsub()
    })
  })

  describe('selection styling', () => {
    it('selected element gets selected class', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      preview.select('node-1')

      expect(element.classList.contains('studio-selected')).toBe(true)
    })

    it('previous selection loses selected class', () => {
      const element1 = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const element2 = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      preview.select('node-1')
      expect(element1.classList.contains('studio-selected')).toBe(true)

      preview.select('node-2')
      expect(element1.classList.contains('studio-selected')).toBe(false)
      expect(element2.classList.contains('studio-selected')).toBe(true)
    })

    it('hovered element gets hover class', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(element.classList.contains('studio-hover')).toBe(true)
    })
  })

  describe('getElementByNodeId', () => {
    it('returns element for valid nodeId', () => {
      const element = preview.getElementByNodeId('node-1')

      expect(element).not.toBeNull()
      expect(element?.getAttribute('data-mirror-id')).toBe('node-1')
    })

    it('returns null for invalid nodeId', () => {
      const element = preview.getElementByNodeId('nonexistent')

      expect(element).toBeNull()
    })
  })
})

describe('Selection State Synchronization', () => {
  beforeEach(() => {
    actions.clearSelection()
    actions.clearMultiSelection()
  })

  describe('state updates', () => {
    it('actions.setSelection updates state', () => {
      actions.setSelection('test-node', 'editor')

      expect(state.get().selection.nodeId).toBe('test-node')
      expect(state.get().selection.origin).toBe('editor')
    })

    it('actions.clearSelection sets to null', () => {
      actions.setSelection('test-node', 'editor')
      actions.clearSelection()

      expect(state.get().selection.nodeId).toBeNull()
    })

    it('selection emits event', () => {
      const callback = vi.fn()
      const unsub = events.on('selection:changed', callback)

      actions.setSelection('test-node', 'preview')

      expect(callback).toHaveBeenCalled()
      unsub()
    })
  })

  describe('editor focus state', () => {
    it('setEditorFocus updates state', () => {
      actions.setEditorFocus(true)
      expect(state.get().editorHasFocus).toBe(true)

      actions.setEditorFocus(false)
      expect(state.get().editorHasFocus).toBe(false)
    })
  })
})
