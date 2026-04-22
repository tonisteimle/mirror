/**
 * Drag & Drop Test API - Types
 *
 * Types for programmatic testing of drag & drop operations.
 */

import type { DragSource, DropTarget, Point } from '../types'

// =============================================================================
// Test Parameters
// =============================================================================

/**
 * Parameters for simulating a palette drag operation
 */
export interface PaletteDragParams {
  /** Component type from palette (e.g., 'Button', 'Checkbox', 'Dialog') */
  componentType: string
  /** Target container node ID */
  targetNodeId: string
  /** Insertion index within the container (0 = before first child) */
  insertionIndex: number
  /** Optional: explicit properties to pass */
  properties?: string
  /** Optional: text content for the component */
  textContent?: string
  /** Optional: children template for containers */
  children?: string
}

/**
 * Parameters for simulating a canvas element move
 */
export interface CanvasMoveParams {
  /** Node ID of the element being moved */
  sourceNodeId: string
  /** Target container node ID */
  targetNodeId: string
  /** Insertion index within the target container */
  insertionIndex: number
}

/**
 * Parameters for simulating drop at specific coordinates
 */
export interface CoordinateDragParams {
  /** Drag source (palette or canvas element) */
  source: DragSource
  /** Drop coordinates on the canvas */
  dropCoordinates: Point
}

// =============================================================================
// Test Results
// =============================================================================

/**
 * Result of a simulated drag operation
 */
export interface DragTestResult {
  /** Whether the drop was successful */
  success: boolean
  /** The drag source that was used */
  source: DragSource
  /** The resolved drop target */
  target: DropTarget
  /** Code change information */
  codeChange: {
    /** Editor content before drop */
    before: string
    /** Editor content after drop */
    after: string
    /** Unified diff of changes */
    diff: string
  }
  /** Error message if operation failed */
  error?: string
  /** Timing information for performance analysis */
  timing?: {
    dropDuration: number
    codeModificationDuration: number
    totalDuration: number
  }
}

// =============================================================================
// Code Expectations
// =============================================================================

/**
 * Expected code changes for verification
 */
export interface CodeExpectation {
  /** Lines that should be inserted */
  insertedLines?: string[]
  /** Line content that should exist after drop */
  containsLine?: string
  /** Lines that should be removed (for move operations) */
  removedLines?: string[]
  /** Expected indentation level of inserted content */
  indentationLevel?: number
  /** Expected position in file (line number, 1-indexed) */
  atLine?: number
  /** Should be inserted as children of a specific parent */
  asChildOf?: string
}

// =============================================================================
// Component Fixtures
// =============================================================================

/**
 * Fixture for a single component
 */
export interface ComponentFixture {
  /** Component name as it appears in palette */
  componentName: string
  /** Default properties for the component */
  properties?: string
  /** Default text content */
  textContent?: string
  /** Template string for code generation */
  template: string
  /** Multi-line template for presets/composites (e.g., Accordion, Tabs) */
  mirTemplate?: string
  /** Whether component creates a definition (ends with :) */
  hasDefinition?: boolean
  /** Whether component has child slots */
  hasSlots?: boolean
  /** Expected code lines when dropped */
  expectedLines: string[]
  /** Component category for organization */
  category: 'simple' | 'zag' | 'chart' | 'layout'
}

/**
 * Fixture for a container layout
 */
export interface ContainerFixture {
  /** Container name for identification */
  name: string
  /** Mirror code for the container setup */
  code: string
  /** Node IDs available for targeting (after compilation) */
  nodeIds: string[]
  /** Layout type */
  layout: 'vertical' | 'horizontal' | 'grid' | 'stacked'
  /** Number of existing children */
  childCount: number
}

// =============================================================================
// Test Configuration
// =============================================================================

/**
 * Configuration for the test runner
 */
export interface DragTestConfig {
  /** Whether to capture timing information */
  captureTimings?: boolean
  /** Whether to capture before/after code snapshots */
  captureCodeChanges?: boolean
  /** Timeout for async operations (ms) */
  timeout?: number
  /** Whether to reset state between tests */
  resetBetweenTests?: boolean
}

/**
 * Context provided to test functions
 */
export interface DragTestContext {
  /** Current editor code */
  getCode(): string
  /** Set editor code directly */
  setCode(code: string): void
  /** Trigger recompilation */
  recompile(): Promise<void>
  /** Get node ID from element name */
  getNodeIdByName(name: string): string | null
  /** Get all node IDs in the preview */
  getAllNodeIds(): string[]
  /** Wait for a condition to be true */
  waitFor(condition: () => boolean, timeout?: number): Promise<void>
}

// =============================================================================
// Fluent API Types
// =============================================================================

/**
 * Builder for fluent test API
 */
export interface DragTestBuilder {
  /** Start a palette drag */
  fromPalette(componentType: string): PaletteDragBuilder
  /** Start a canvas move */
  fromCanvas(nodeId: string): CanvasMoveBuilder
  /** Set the initial code before test */
  withCode(code: string): DragTestBuilder
}

export interface PaletteDragBuilder {
  /** Set properties for the component */
  withProperties(props: string): PaletteDragBuilder
  /** Set text content */
  withText(text: string): PaletteDragBuilder
  /** Set target container */
  toContainer(nodeId: string): PaletteDragBuilder
  /** Set insertion position */
  atPosition(index: number): PaletteDragBuilder
  /** Execute the drag operation */
  execute(): Promise<DragTestResult>
}

export interface CanvasMoveBuilder {
  /** Set target container */
  toContainer(nodeId: string): CanvasMoveBuilder
  /** Set insertion position */
  atPosition(index: number): CanvasMoveBuilder
  /** Execute the move operation */
  execute(): Promise<DragTestResult>
}

// =============================================================================
// Global Test API (exposed on window for browser tests)
// =============================================================================

/**
 * Global test API exposed on window.__testDragDrop
 */
export interface GlobalDragTestAPI {
  /** Simulate a palette drag */
  simulatePaletteDrag(params: PaletteDragParams): Promise<DragTestResult>
  /** Simulate a canvas element move */
  simulateCanvasMove(params: CanvasMoveParams): Promise<DragTestResult>
  /** Get current editor code */
  getEditorCode(): string
  /** Set editor code */
  setEditorCode(code: string): void
  /** Trigger recompilation */
  recompile(): Promise<void>
  /** Get all fixtures */
  getFixtures(): {
    components: Record<string, ComponentFixture>
    containers: ContainerFixture[]
  }
  /** Create a fluent test builder */
  createTest(): DragTestBuilder
}

// =============================================================================
// Window Declaration
// =============================================================================

declare global {
  interface Window {
    __testDragDrop?: GlobalDragTestAPI
  }
}
