/**
 * Unit Tests for CodeModifierV2 (Hexagonal Architecture)
 *
 * Tests the CodeModifier using mock ports.
 * No real SourceMap, no DOM - pure unit tests.
 *
 * Use Cases:
 * - UC-CM-01: Property hinzufügen
 * - UC-CM-02: Property ändern
 * - UC-CM-03: Property entfernen
 * - UC-CM-04: Element einfügen
 * - UC-CM-05: Element verschieben
 * - UC-CM-06: Multi-Property Batch-Updates
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CodeModifierV2, createCodeModifierV2 } from '../../../compiler/studio/code-modifier-v2'
import {
  createMockCodeModifierPorts,
  createNodeMapping,
  type MockCodeModifierPorts,
} from '../../../compiler/studio/adapters/mock-code-modifier-adapters'

describe('CodeModifierV2 (Hexagonal)', () => {
  let ports: MockCodeModifierPorts
  let modifier: CodeModifierV2

  // ============================================
  // Test Fixtures
  // ============================================

  function setupSimpleFrame() {
    const source = `Frame gap 16, pad 20
  Text "Hello"
  Button "Click"`

    ports = createMockCodeModifierPorts({ source })

    // Add node mappings
    ports.sourceMap.addNode('frame-1', createNodeMapping('frame-1', 'Frame', 1))
    ports.sourceMap.addNode('text-1', createNodeMapping('text-1', 'Text', 2))
    ports.sourceMap.addNode('button-1', createNodeMapping('button-1', 'Button', 3))

    // Set up parent-child relationships
    ports.sourceMap.setChildren('frame-1', ['text-1', 'button-1'])

    modifier = createCodeModifierV2(ports)
  }

  function setupNestedStructure() {
    const source = `Frame gap 16
  Frame pad 10
    Text "Nested"
  Button "Action"`

    ports = createMockCodeModifierPorts({ source })

    ports.sourceMap.addNode('frame-1', createNodeMapping('frame-1', 'Frame', 1))
    ports.sourceMap.addNode('frame-2', createNodeMapping('frame-2', 'Frame', 2))
    ports.sourceMap.addNode('text-1', createNodeMapping('text-1', 'Text', 3))
    ports.sourceMap.addNode('button-1', createNodeMapping('button-1', 'Button', 4))

    ports.sourceMap.setChildren('frame-1', ['frame-2', 'button-1'])
    ports.sourceMap.setChildren('frame-2', ['text-1'])

    modifier = createCodeModifierV2(ports)
  }

  // ============================================
  // UC-CM-01: Property hinzufügen
  // ============================================

  describe('UC-CM-01: Add Property', () => {
    beforeEach(setupSimpleFrame)

    it('should add a new property to an element', () => {
      const result = modifier.addProperty('frame-1', 'bg', '#1a1a1a')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg #1a1a1a')
    })

    it('should add property to element without existing properties', () => {
      // Text has no properties, just content
      const result = modifier.addProperty('text-1', 'col', 'white')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('col white')
    })

    it('should fail for non-existent node', () => {
      const result = modifier.addProperty('unknown-node', 'bg', 'red')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Node not found')
    })
  })

  // ============================================
  // UC-CM-02: Property ändern
  // ============================================

  describe('UC-CM-02: Update Property', () => {
    beforeEach(setupSimpleFrame)

    it('should update an existing property', () => {
      const result = modifier.updateProperty('frame-1', 'gap', '24')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('gap 24')
      expect(result.newSource).not.toContain('gap 16')
    })

    it('should update padding property', () => {
      const result = modifier.updateProperty('frame-1', 'pad', '30')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('pad 30')
    })

    it('should add property if it does not exist', () => {
      // updateProperty falls back to addProperty if not found
      const result = modifier.updateProperty('frame-1', 'bg', '#000')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg #000')
    })

    it('should fail for non-existent node', () => {
      const result = modifier.updateProperty('unknown', 'bg', 'red')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Node not found')
    })
  })

  // ============================================
  // UC-CM-03: Property entfernen
  // ============================================

  describe('UC-CM-03: Remove Property', () => {
    beforeEach(setupSimpleFrame)

    it('should remove an existing property', () => {
      const result = modifier.removeProperty('frame-1', 'gap')

      expect(result.success).toBe(true)
      expect(result.newSource).not.toContain('gap 16')
      expect(result.newSource).toContain('pad 20') // Other property remains
    })

    it('should remove padding property', () => {
      const result = modifier.removeProperty('frame-1', 'pad')

      expect(result.success).toBe(true)
      expect(result.newSource).not.toContain('pad 20')
    })

    it('should fail when property does not exist', () => {
      const result = modifier.removeProperty('frame-1', 'bg')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Property not found')
    })

    it('should fail for non-existent node', () => {
      const result = modifier.removeProperty('unknown', 'gap')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Node not found')
    })
  })

  // ============================================
  // UC-CM-04: Element einfügen
  // ============================================

  describe('UC-CM-04: Insert Element', () => {
    beforeEach(setupSimpleFrame)

    it('should add child as last element', () => {
      const result = modifier.addChild('frame-1', 'Icon', {
        properties: 'ic white',
        textContent: 'star',
      })

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Icon "star"')
      expect(result.newSource).toContain('ic white')
    })

    it('should add child with proper indentation', () => {
      const result = modifier.addChild('frame-1', 'Divider')

      expect(result.success).toBe(true)
      // Should be indented 2 spaces (child of Frame)
      expect(result.newSource).toContain('  Divider')
    })

    it('should add child relative to sibling (before)', () => {
      const result = modifier.addChildRelativeTo('button-1', 'Spacer', 'before')

      expect(result.success).toBe(true)
      // Spacer should appear before Button
      const lines = result.newSource.split('\n')
      const spacerIndex = lines.findIndex(l => l.includes('Spacer'))
      const buttonIndex = lines.findIndex(l => l.includes('Button'))
      expect(spacerIndex).toBeLessThan(buttonIndex)
    })

    it('should add child relative to sibling (after)', () => {
      const result = modifier.addChildRelativeTo('text-1', 'Divider', 'after')

      expect(result.success).toBe(true)
      // Divider should appear after Text
      const lines = result.newSource.split('\n')
      const textIndex = lines.findIndex(l => l.includes('Text'))
      const dividerIndex = lines.findIndex(l => l.includes('Divider'))
      expect(dividerIndex).toBeGreaterThan(textIndex)
    })

    it('should fail for non-existent parent', () => {
      const result = modifier.addChild('unknown', 'Text')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Parent node not found')
    })

    it('should add child at position 0 (before first child)', () => {
      // Position 0 means "before first child" - this is the bug fix test
      const result = modifier.addChild('frame-1', 'Icon', {
        position: 0,
        textContent: 'star',
      })

      expect(result.success).toBe(true)
      // Icon should appear before Text "Hello" (the first existing child)
      const lines = result.newSource.split('\n')
      const iconIndex = lines.findIndex(l => l.includes('Icon'))
      const textIndex = lines.findIndex(l => l.includes('Text'))
      expect(iconIndex).toBeLessThan(textIndex)
      // Icon should be on its own line (not on same line as Text)
      expect(lines[iconIndex]).not.toContain('Text')
    })
  })

  // ============================================
  // UC-CM-05: Element verschieben
  // ============================================

  describe('UC-CM-05: Move Element', () => {
    beforeEach(setupNestedStructure)

    it('should move element before another', () => {
      // Move button before nested frame
      const result = modifier.moveNode('button-1', 'frame-2', 'before')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      const buttonIndex = lines.findIndex(l => l.includes('Button'))
      const frame2Index = lines.findIndex(l => l.includes('pad 10'))
      expect(buttonIndex).toBeLessThan(frame2Index)
    })

    it('should move element after another', () => {
      // Move text after button
      const result = modifier.moveNode('text-1', 'button-1', 'after')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      const textIndex = lines.findIndex(l => l.includes('Text'))
      const buttonIndex = lines.findIndex(l => l.includes('Button'))
      expect(textIndex).toBeGreaterThan(buttonIndex)
    })

    it('should move element inside another', () => {
      // Move button inside frame-2
      const result = modifier.moveNode('button-1', 'frame-2', 'inside')

      expect(result.success).toBe(true)
      // Button should be more indented now
      expect(result.newSource).toContain('    Button') // 4 spaces
    })

    it('should prevent moving node into itself', () => {
      const result = modifier.moveNode('frame-1', 'frame-1', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot move node onto itself')
    })

    it('should prevent moving node into descendant', () => {
      // Try to move frame-1 inside its descendant text-1
      const result = modifier.moveNode('frame-1', 'text-1', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot move node into its own descendant')
    })

    it('should fail for non-existent source', () => {
      const result = modifier.moveNode('unknown', 'frame-1', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Source node not found')
    })

    it('should fail for non-existent target', () => {
      const result = modifier.moveNode('button-1', 'unknown', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Target node not found')
    })
  })

  // ============================================
  // Element duplizieren
  // ============================================

  describe('Duplicate Element', () => {
    beforeEach(setupSimpleFrame)

    it('should duplicate element after target', () => {
      const result = modifier.duplicateNode('text-1', 'button-1', 'after')

      expect(result.success).toBe(true)
      // Should have two Text elements now
      const textMatches = result.newSource.match(/Text "Hello"/g)
      expect(textMatches?.length).toBe(2)
    })

    it('should duplicate element before target', () => {
      const result = modifier.duplicateNode('button-1', 'text-1', 'before')

      expect(result.success).toBe(true)
      // Should have two Button elements now
      const buttonMatches = result.newSource.match(/Button "Click"/g)
      expect(buttonMatches?.length).toBe(2)
    })
  })

  // ============================================
  // Element entfernen
  // ============================================

  describe('Remove Element', () => {
    beforeEach(setupSimpleFrame)

    it('should remove a node', () => {
      const result = modifier.removeNode('text-1')

      expect(result.success).toBe(true)
      expect(result.newSource).not.toContain('Text "Hello"')
      expect(result.newSource).toContain('Button "Click"') // Other elements remain
    })

    it('should remove node with children', () => {
      setupNestedStructure()
      const result = modifier.removeNode('frame-2')

      expect(result.success).toBe(true)
      // Both frame-2 and its child text-1 should be gone
      expect(result.newSource).not.toContain('pad 10')
      expect(result.newSource).not.toContain('Nested')
    })

    it('should fail for non-existent node', () => {
      const result = modifier.removeNode('unknown')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Node not found')
    })
  })

  // ============================================
  // UC-CM-06: Multi-Property Batch-Updates
  // ============================================

  describe('UC-CM-06: Batch Updates', () => {
    beforeEach(setupSimpleFrame)

    it('should support multiple property updates in sequence', () => {
      // Update multiple properties
      modifier.updateProperty('frame-1', 'gap', '24')
      modifier.updateProperty('frame-1', 'pad', '30')
      const result = modifier.addProperty('frame-1', 'bg', '#1a1a1a')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('gap 24')
      expect(result.newSource).toContain('pad 30')
      expect(result.newSource).toContain('bg #1a1a1a')
    })

    it('should support add and remove in sequence', () => {
      modifier.addProperty('frame-1', 'bg', '#1a1a1a')
      const result = modifier.removeProperty('frame-1', 'gap')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg #1a1a1a')
      expect(result.newSource).not.toContain('gap 16')
    })
  })

  // ============================================
  // Snapshot Management
  // ============================================

  describe('Snapshot Management', () => {
    beforeEach(setupSimpleFrame)

    it('should create and detect snapshot', () => {
      expect(modifier.hasSnapshot()).toBe(false)

      modifier.createSnapshot()
      expect(modifier.hasSnapshot()).toBe(true)
    })

    it('should restore from snapshot', () => {
      const originalSource = modifier.getSource()

      modifier.createSnapshot()
      modifier.updateProperty('frame-1', 'gap', '100')

      expect(modifier.getSource()).toContain('gap 100')

      const restored = modifier.restoreSnapshot()
      expect(restored).toBe(true)
      expect(modifier.getSource()).toBe(originalSource)
    })

    it('should clear snapshot', () => {
      modifier.createSnapshot()
      expect(modifier.hasSnapshot()).toBe(true)

      modifier.clearSnapshot()
      expect(modifier.hasSnapshot()).toBe(false)
    })

    it('should return false when no snapshot to restore', () => {
      const restored = modifier.restoreSnapshot()
      expect(restored).toBe(false)
    })
  })

  // ============================================
  // Template-based Insertion
  // ============================================

  describe('Template Insertion', () => {
    beforeEach(setupSimpleFrame)

    it('should add child with multi-line template', () => {
      const template = `Card pad 16
  Text "Title"
  Text "Body"`

      const result = modifier.addChildWithTemplate('frame-1', template)

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Card')
      expect(result.newSource).toContain('Title')
      expect(result.newSource).toContain('Body')
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle empty source', () => {
      ports = createMockCodeModifierPorts({ source: '' })
      modifier = createCodeModifierV2(ports)

      const result = modifier.addProperty('node-1', 'bg', 'red')
      expect(result.success).toBe(false)
    })

    it('should handle single line source', () => {
      ports = createMockCodeModifierPorts({ source: 'Frame gap 16' })
      ports.sourceMap.addNode('frame-1', createNodeMapping('frame-1', 'Frame', 1))
      modifier = createCodeModifierV2(ports)

      const result = modifier.updateProperty('frame-1', 'gap', '24')
      expect(result.success).toBe(true)
      expect(result.newSource).toBe('Frame gap 24')
    })

    it('should preserve indentation in nested structures', () => {
      setupNestedStructure()

      const result = modifier.addChild('frame-2', 'Icon', {
        properties: 'is 16',
        textContent: 'star',
      })

      expect(result.success).toBe(true)
      // Should have 4 spaces of indentation (child of frame-2)
      expect(result.newSource).toContain('    Icon')
    })
  })
})
