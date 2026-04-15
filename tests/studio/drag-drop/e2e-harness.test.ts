/**
 * E2E Harness Tests
 *
 * Tests the complete drag-drop flow using StudioTestHarness:
 *   simulateDrop → DropService → CodeModifier → Editor → SourceMap
 *
 * These are realistic E2E tests without a real browser.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { StudioTestHarness, createTestHarness, assertions } from '../../../studio/drop/test-harness'

// =============================================================================
// SIMPLE PALETTE DROPS
// =============================================================================

describe('E2E: Simple Palette Drops', () => {
  let harness: StudioTestHarness

  beforeEach(() => {
    harness = createTestHarness('Frame gap 8')
  })

  it('should add Button to empty Frame', async () => {
    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      textContent: 'Click me',
    })

    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, 'Button')).toBe(true)
    expect(assertions.hasIndentation(result, 'Button', 2)).toBe(true)
  })

  it('should add Text after existing child', async () => {
    harness.setCode(`Frame gap 8
  Button "First"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Text',
      targetNodeId: 'node-1',
      insertionIndex: 1,
      textContent: 'Second',
    })

    expect(result.success).toBe(true)
    expect(assertions.componentOrder(result, ['Button', 'Text'])).toBe(true)
  })

  it('should insert at specific position', async () => {
    harness.setCode(`Frame gap 8
  Text "First"
  Text "Third"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Text',
      targetNodeId: 'node-1',
      insertionIndex: 1,
      textContent: 'Second',
    })

    expect(result.success).toBe(true)
    expect(assertions.componentOrder(result, ['First', 'Second', 'Third'])).toBe(true)
  })

  it('should add Icon with properties', async () => {
    const result = await harness.simulatePaletteDrop({
      componentName: 'Icon',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      textContent: 'star',
    })

    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, 'Icon')).toBe(true)
  })
})

// =============================================================================
// NESTED CONTAINERS
// =============================================================================

describe('E2E: Nested Containers', () => {
  let harness: StudioTestHarness

  it('should add to inner container with correct indentation', async () => {
    harness = createTestHarness(`Frame gap 12
  Frame gap 8, bg #1a1a1a
    Text "Inner"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-2', // Inner Frame
      insertionIndex: 1,
      textContent: 'Nested',
    })

    expect(result.success).toBe(true)
    expect(assertions.hasIndentation(result, 'Button', 4)).toBe(true)
  })

  it('should add to deeply nested container (3 levels)', async () => {
    harness = createTestHarness(`Frame gap 16
  Frame gap 12, bg #1a1a1a
    Frame gap 8, bg #2a2a2a
      Text "Deep"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-3', // Deepest Frame
      insertionIndex: 1,
      textContent: 'Add',
    })

    expect(result.success).toBe(true)
    expect(assertions.hasIndentation(result, 'Button', 6)).toBe(true)
  })

  it('should add to sibling container', async () => {
    harness = createTestHarness(`Frame gap 16
  Frame gap 8, bg #1a1a1a
    Text "Container 1"
  Frame gap 8, bg #2a2a2a
    Text "Container 2"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Icon',
      targetNodeId: 'node-4', // Second inner Frame
      insertionIndex: 1,
      textContent: 'star',
    })

    expect(result.success).toBe(true)
    expect(assertions.hasIndentation(result, 'Icon', 4)).toBe(true)
  })

  it('should maintain structure when adding to root', async () => {
    harness = createTestHarness(`Frame gap 16
  Frame gap 8
    Text "Nested"
  Text "Sibling"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1', // Root Frame
      insertionIndex: 2,
      textContent: 'Root Level',
    })

    expect(result.success).toBe(true)
    expect(assertions.hasIndentation(result, 'Button', 2)).toBe(true)
  })
})

// =============================================================================
// CANVAS MOVES
// =============================================================================

describe('E2E: Canvas Moves', () => {
  let harness: StudioTestHarness

  it('should reorder within same container', async () => {
    harness = createTestHarness(`Frame gap 8
  Text "First"
  Text "Second"
  Text "Third"`)

    // Move "Third" (node-4) to position 0
    const result = await harness.simulateCanvasMove({
      sourceNodeId: 'node-4',
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })

    expect(result.success).toBe(true)
    // After move: Third, First, Second
    expect(assertions.componentOrder(result, ['Third', 'First', 'Second'])).toBe(true)
  })

  it('should move between containers', async () => {
    harness = createTestHarness(`Frame gap 16
  Frame gap 8, name source
    Text "Move me"
    Text "Stay here"
  Frame gap 8, name target
    Text "Already here"`)

    // Move "Move me" (node-3) to target container (node-5)
    const result = await harness.simulateCanvasMove({
      sourceNodeId: 'node-3',
      targetNodeId: 'node-5',
      insertionIndex: 1,
    })

    expect(result.success).toBe(true)
    // "Move me" should be after "Already here"
    const lines = result.codeAfter.split('\n')
    const moveIndex = lines.findIndex(l => l.includes('Move me'))
    const alreadyIndex = lines.findIndex(l => l.includes('Already here'))
    expect(moveIndex).toBeGreaterThan(alreadyIndex)
  })

  it('should adjust indentation when moving to different depth', async () => {
    harness = createTestHarness(`Frame gap 16
  Text "Shallow"
  Frame gap 8
    Frame gap 4
      Text "Deep"`)

    // Move "Shallow" (node-2) to deep container (node-4)
    const result = await harness.simulateCanvasMove({
      sourceNodeId: 'node-2',
      targetNodeId: 'node-4',
      insertionIndex: 0,
    })

    expect(result.success).toBe(true)
    // "Shallow" should now have 6 spaces indentation
    expect(assertions.hasIndentation(result, 'Text "Shallow"', 6)).toBe(true)
  })
})

// =============================================================================
// MULTI-LINE TEMPLATES
// =============================================================================

describe('E2E: Multi-line Templates', () => {
  let harness: StudioTestHarness

  beforeEach(() => {
    harness = createTestHarness('Frame gap 8')
  })

  it('should add Dialog with slots', async () => {
    const result = await harness.simulatePaletteDrop({
      componentName: 'Dialog',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      template: `Dialog
  Trigger:
    Button "Open"
  Backdrop: bg #00000080
  Content: pad 24`,
    })

    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, 'Dialog')).toBe(true)
    expect(assertions.codeContains(result, 'Trigger:')).toBe(true)
    expect(assertions.codeContains(result, 'Backdrop:')).toBe(true)
    expect(assertions.codeContains(result, 'Content:')).toBe(true)
  })

  it('should add Checkbox with Control and Label', async () => {
    const result = await harness.simulatePaletteDrop({
      componentName: 'Checkbox',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      template: `Checkbox
  Control: w 20, h 20, bor 1 #555, rad 4
  Label: "Accept terms"`,
    })

    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, 'Checkbox')).toBe(true)
    expect(assertions.codeContains(result, 'Control:')).toBe(true)
    expect(assertions.codeContains(result, 'Label:')).toBe(true)
  })

  it('should add Select with options', async () => {
    const result = await harness.simulatePaletteDrop({
      componentName: 'Select',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      template: `Select placeholder "Choose..."
  Trigger: pad 12
  Content: bg #2a2a3e
    Item "Option A"
    Item "Option B"`,
    })

    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, 'Select')).toBe(true)
    expect(assertions.codeContains(result, 'Item "Option A"')).toBe(true)
    expect(assertions.codeContains(result, 'Item "Option B"')).toBe(true)
  })

  it('should maintain correct indentation for nested template', async () => {
    harness.setCode(`Frame gap 12
  Frame gap 8, bg #1a1a1a`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Tabs',
      targetNodeId: 'node-2',
      insertionIndex: 0,
      template: `Tabs
  List: hor, gap 4
    Tab "Tab 1"
    Tab "Tab 2"
  Content: pad 16`,
    })

    expect(result.success).toBe(true)
    // Tabs should have 4 spaces (inside node-2)
    expect(assertions.hasIndentation(result, 'Tabs', 4)).toBe(true)
    // List should have 6 spaces
    expect(assertions.hasIndentation(result, 'List:', 6)).toBe(true)
  })
})

// =============================================================================
// SOURCE MAP VERIFICATION
// =============================================================================

describe('E2E: SourceMap Verification', () => {
  let harness: StudioTestHarness

  it('should generate valid SourceMap after drop', async () => {
    harness = createTestHarness('Frame gap 8')

    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      textContent: 'Test',
    })

    expect(result.success).toBe(true)
    expect(result.sourceMap).not.toBeNull()

    // Root Frame should still be node-1
    expect(assertions.sourceMapHasNode(result, 'node-1')).toBe(true)

    // New Button should be node-2
    expect(assertions.sourceMapHasNode(result, 'node-2')).toBe(true)
  })

  it('should update SourceMap after canvas move', async () => {
    harness = createTestHarness(`Frame gap 8
  Text "A"
  Text "B"`)

    const result = await harness.simulateCanvasMove({
      sourceNodeId: 'node-3', // Text "B"
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })

    expect(result.success).toBe(true)
    expect(result.sourceMap).not.toBeNull()

    // All nodes should still exist
    expect(assertions.sourceMapHasNode(result, 'node-1')).toBe(true)
    expect(assertions.sourceMapHasNode(result, 'node-2')).toBe(true)
    expect(assertions.sourceMapHasNode(result, 'node-3')).toBe(true)
  })
})

// =============================================================================
// EVENT VERIFICATION
// =============================================================================

describe('E2E: Event Verification', () => {
  let harness: StudioTestHarness

  it('should emit source:changed event', async () => {
    harness = createTestHarness('Frame gap 8')

    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })

    expect(result.success).toBe(true)
    const sourceEvents = result.events.filter(e => e.name === 'source:changed')
    expect(sourceEvents.length).toBe(1)
  })

  it('should record undo command', async () => {
    harness = createTestHarness('Frame gap 8')

    await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })

    const commands = harness.getCommands()
    expect(commands.length).toBe(1)
    expect((commands[0] as { type: string }).type).toBe('recorded-change')
  })

  it('should set pending selection', async () => {
    harness = createTestHarness('Frame gap 8')

    await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })

    const selection = harness.getPendingSelection() as { componentName: string }
    expect(selection).not.toBeNull()
    expect(selection.componentName).toBe('Button')
  })
})

// =============================================================================
// COMPLEX SCENARIOS
// =============================================================================

describe('E2E: Complex Scenarios', () => {
  let harness: StudioTestHarness

  it('should build form with multiple drops', async () => {
    harness = createTestHarness('Frame gap 16, pad 24, bg #1a1a1a, rad 12')

    // 1. Add Checkbox
    let result = await harness.simulatePaletteDrop({
      componentName: 'Checkbox',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      template: `Checkbox
  Control: w 20, h 20
  Label: "Newsletter"`,
    })
    expect(result.success).toBe(true)

    // 2. Add Switch
    result = await harness.simulatePaletteDrop({
      componentName: 'Switch',
      targetNodeId: 'node-1',
      insertionIndex: 1,
      template: `Switch
  Track: w 44, h 24, rad 12
  Thumb: w 20, h 20, rad 10`,
    })
    expect(result.success).toBe(true)

    // 3. Add Button
    result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 2,
      textContent: 'Submit',
    })
    expect(result.success).toBe(true)

    // Verify final code contains all components
    const finalCode = harness.getCode()
    expect(finalCode).toContain('Checkbox')
    expect(finalCode).toContain('Switch')
    expect(finalCode).toContain('Button')
  })

  it('should build nested card layout', async () => {
    harness = createTestHarness('Frame gap 24, pad 32')

    // Card 1 with content
    let result = await harness.simulatePaletteDrop({
      componentName: 'Frame',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      template: `Frame gap 12, pad 16, bg #1a1a1a, rad 8
  Text "Card 1", fs 18, weight bold`,
    })
    expect(result.success).toBe(true)

    // Card 2 with different content
    result = await harness.simulatePaletteDrop({
      componentName: 'Frame',
      targetNodeId: 'node-1',
      insertionIndex: 1,
      template: `Frame gap 12, pad 16, bg #2a2a2a, rad 8
  Text "Card 2", fs 18, weight bold`,
    })
    expect(result.success).toBe(true)

    const finalCode = harness.getCode()
    expect(finalCode).toContain('Card 1')
    expect(finalCode).toContain('Card 2')
  })

  it('should handle drop followed by move', async () => {
    harness = createTestHarness(`Frame gap 8
  Text "First"
  Text "Second"`)

    // 1. Add new element
    let result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 2,
      textContent: 'New',
    })
    expect(result.success).toBe(true)

    // 2. Move it to the front
    result = await harness.simulateCanvasMove({
      sourceNodeId: 'node-4', // The new Button
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })
    expect(result.success).toBe(true)

    // Verify order: Button, First, Second
    expect(assertions.componentOrder(result, ['Button', 'First', 'Second'])).toBe(true)
  })
})

// =============================================================================
// EDGE CASES
// =============================================================================

describe('E2E: Edge Cases', () => {
  let harness: StudioTestHarness

  it('should handle empty template gracefully', async () => {
    harness = createTestHarness('Frame gap 8')

    const result = await harness.simulatePaletteDrop({
      componentName: 'Frame',
      targetNodeId: 'node-1',
      insertionIndex: 0,
    })

    // Should succeed with just "Frame"
    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, 'Frame')).toBe(true)
  })

  it('should handle special characters in text content', async () => {
    harness = createTestHarness('Frame gap 8')

    const result = await harness.simulatePaletteDrop({
      componentName: 'Text',
      targetNodeId: 'node-1',
      insertionIndex: 0,
      textContent: 'Hello "World" & <Test>',
    })

    expect(result.success).toBe(true)
  })

  it('should preserve comments in code', async () => {
    harness = createTestHarness(`// Header comment
Frame gap 8
  // Child comment
  Text "Existing"`)

    const result = await harness.simulatePaletteDrop({
      componentName: 'Button',
      targetNodeId: 'node-1',
      insertionIndex: 1,
    })

    expect(result.success).toBe(true)
    expect(assertions.codeContains(result, '// Header comment')).toBe(true)
    expect(assertions.codeContains(result, '// Child comment')).toBe(true)
  })
})
