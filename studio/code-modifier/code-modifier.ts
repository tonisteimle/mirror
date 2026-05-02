/**
 * CodeModifier - Modifies Mirror source code at exact positions
 *
 * Handles:
 * - Updating existing property values
 * - Adding new properties
 * - Removing properties
 * - Adding children to components (for drag-and-drop)
 * - Returns changes in CodeMirror-compatible format
 *
 * Uses LinePropertyParser for robust line analysis with:
 * - Property alias support (bg → background)
 * - Multi-value properties (pad 16 12)
 * - Correct property boundary detection
 */

import type { SourceMap, NodeMapping } from '../../compiler/ir/source-map'
import type { SourcePosition } from '../../compiler/ir/types'
import { logCodeModifier as log } from '../../compiler/utils/logger'
import * as eventOps from './event-ops'
import * as childrenOps from './children-ops'
import * as propertyOps from './property-ops'
import * as animationOps from './animation-ops'
import * as layoutOps from './layout-ops'
import * as wrapOps from './wrap-ops'
import * as textOps from './text-ops'
import * as extractOps from './extract-ops'
// SemanticZone type for insertWithWrapper
export type SemanticZone =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
import {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  getCanonicalName,
  isSameProperty,
  type ParsedLine,
} from './line-property-parser'
import { adjustTemplateIndentation } from '../../compiler/schema/component-templates'

/**
 * Result of a code modification
 */
export interface CodeChange {
  from: number // Start position (character offset)
  to: number // End position (character offset)
  insert: string // Text to insert
}

/**
 * Result of a code modification operation
 */
export interface ModificationResult {
  success: boolean
  newSource: string
  change: CodeChange
  error?: string
  /** True if the operation succeeded but made no changes (e.g., position unchanged) */
  noChange?: boolean
}

/**
 * Options for property modification
 */
export interface ModifyPropertyOptions {
  /** Preserve token references (don't expand $tokens) */
  preserveTokens?: boolean
}

/**
 * Interface for accessing multiple files (for cross-file operations)
 */
export interface FilesAccess {
  getFile: (path: string) => string | undefined
  setFile: (path: string, content: string) => void
  getCurrentFile: () => string
}

/**
 * Result of extracting a component to a file
 */
export interface ExtractToComponentResult {
  success: boolean
  currentFileChange: CodeChange
  componentFileChange: { path: string; content: string }
  importAdded: boolean
  error?: string
}

/**
 * Options for adding a child component
 */
export interface AddChildOptions {
  /** Position to insert: 'first', 'last', or numeric index */
  position?: 'first' | 'last' | number
  /** Properties to add to the new component */
  properties?: string
  /** Text content for the component */
  textContent?: string
  /** Property to add to the PARENT (e.g., alignment like 'center', 'tl', etc.) */
  parentProperty?: string
}

/**
 * Snapshot of CodeModifier state for rollback
 */
interface StateSnapshot {
  source: string
  lines: string[]
}

/**
 * CodeModifier class
 *
 * Note on visibility: `source`, `sourceMap`, `lines` and the helpers
 * `errorResult` / `getCharacterOffset` are intentionally non-private so
 * that operation modules (`event-ops.ts`, etc.) extracted from this file
 * can use `this: CodeModifier` parameters to access shared state.
 * External callers should still go through the public methods.
 */
export class CodeModifier {
  source: string
  sourceMap: SourceMap
  lines: string[]
  private snapshot: StateSnapshot | null = null

  constructor(source: string, sourceMap: SourceMap) {
    this.source = source
    this.sourceMap = sourceMap
    this.lines = source.split('\n')
  }

  /**
   * Create a snapshot of current state for potential rollback
   * Use before multi-step operations that might fail mid-way
   */
  createSnapshot(): void {
    this.snapshot = {
      source: this.source,
      lines: [...this.lines],
    }
  }

  /**
   * Restore state from snapshot
   * Call this if a multi-step operation fails and needs to be rolled back
   */
  restoreSnapshot(): boolean {
    if (!this.snapshot) {
      return false
    }
    this.source = this.snapshot.source
    this.lines = this.snapshot.lines
    this.snapshot = null
    return true
  }

  /**
   * Clear snapshot after successful operation
   */
  clearSnapshot(): void {
    this.snapshot = null
  }

  /**
   * Check if a snapshot exists
   */
  hasSnapshot(): boolean {
    return this.snapshot !== null
  }

  /**
   * Get the current source
   */
  getSource(): string {
    return this.source
  }

  /**
   * Get the length of the current source
   * Useful for tracking original length before modifications
   */
  getSourceLength(): number {
    return this.source.length
  }

  /**
   * Get the current source map
   */
  getSourceMap(): SourceMap {
    return this.sourceMap
  }

  /**
   * Get the indentation of a line (leading whitespace)
   */
  getLineIndent(line: string | undefined): string {
    if (!line) return ''
    const match = line.match(/^(\s*)/)
    return match ? match[1] : ''
  }

  /**
   * Update the source code (after external changes)
   */
  updateSource(source: string): void {
    this.source = source
    this.lines = source.split('\n')
  }

  /**
   * Update the source map
   */
  updateSourceMap(sourceMap: SourceMap): void {
    this.sourceMap = sourceMap
  }

  /**
   * Get character offset from line and column
   */
  getCharacterOffset(line: number, column: number): number {
    let offset = 0
    for (let i = 0; i < line - 1; i++) {
      offset += this.lines[i].length + 1 // +1 for newline
    }
    return offset + column - 1
  }

  // ============================================================================
  // ANIMATION METHODS
  // ============================================================================

  // ===========================================
  // SEMANTIC ZONE / DIRECT CONTAINER LAYOUT
  // ===========================================

  /**
   * Layout properties to apply to container based on semantic zone
   *
   * The 9-zone alignment properties map directly to zone names.
   * Each property sets display:flex + flex-direction:column + justify/align.
   *
   * center-left is the default (no property needed) because:
   * - flex-direction: column (default vertical flow)
   * - justify-content: center (centered vertically)
   * - align-items: flex-start (left-aligned)
   */
  static readonly ZONE_CONTAINER_LAYOUT: Record<SemanticZone, string> = {
    'top-left': 'top-left',
    'top-center': 'top-center',
    'top-right': 'top-right',
    'center-left': '', // default, no layout needed
    center: 'center',
    'center-right': 'center-right',
    'bottom-left': 'bottom-left',
    'bottom-center': 'bottom-center',
    'bottom-right': 'bottom-right',
  }

  // ===========================================
  // MULTI-SELECT / WRAP NODES
  // ===========================================

  // ===========================================
  // TEXT CONTENT MODIFICATION
  // ===========================================

  // ===========================================
  // EVENT METHODS
  // ===========================================

  // Children operations — implemented in `./children-ops.ts`.
  addChild = childrenOps.addChild
  insertAsRoot = childrenOps.insertAsRoot
  addChildWithTemplate = childrenOps.addChildWithTemplate
  addChildWithTemplateRelativeTo = childrenOps.addChildWithTemplateRelativeTo
  addChildRelativeTo = childrenOps.addChildRelativeTo
  removeNode = childrenOps.removeNode
  replaceSlot = childrenOps.replaceSlot
  moveNode = childrenOps.moveNode
  duplicateNode = childrenOps.duplicateNode
  isDescendantOf = childrenOps.isDescendantOf
  reindentBlock = childrenOps.reindentBlock
  calculateChildInsertionPoint = childrenOps.calculateChildInsertionPoint
  buildComponentLine = childrenOps.buildComponentLine
  getBlockEndLine = childrenOps.getBlockEndLine

  // property-ops.ts
  updateProperty = propertyOps.updateProperty
  addProperty = propertyOps.addProperty
  removeProperty = propertyOps.removeProperty
  applyBatchChanges = propertyOps.applyBatchChanges
  findAndReplaceProperty = propertyOps.findAndReplaceProperty
  findAndRemoveProperty = propertyOps.findAndRemoveProperty
  formatProperty = propertyOps.formatProperty
  formatValue = propertyOps.formatValue
  lineHasProperties = propertyOps.lineHasProperties
  escapeRegex = propertyOps.escapeRegex

  // animation-ops.ts
  updateAnimation = animationOps.updateAnimation
  addAnimationKeyframe = animationOps.addAnimationKeyframe
  generateAnimationDSL = animationOps.generateAnimationDSL
  findAnimationInsertPosition = animationOps.findAnimationInsertPosition

  // layout-ops.ts
  setLayoutDirection = layoutOps.setLayoutDirection
  getLayoutForZone = layoutOps.getLayoutForZone
  applyLayoutToContainer = layoutOps.applyLayoutToContainer
  containerHasLayoutDirection = layoutOps.containerHasLayoutDirection

  // wrap-ops.ts
  insertWithWrapper = wrapOps.insertWithWrapper
  wrapNodes = wrapOps.wrapNodes
  unwrapNode = wrapOps.unwrapNode

  // text-ops.ts
  updateTextContent = textOps.updateTextContent
  rebuildLineWithText = textOps.rebuildLineWithText
  cleanupEmptyLines = textOps.cleanupEmptyLines

  // extract-ops.ts
  extractToComponentFile = extractOps.extractToComponentFile
  extractErrorResult = extractOps.extractErrorResult

  // Event methods — implemented in `./event-ops.ts`. Class-field assignment
  // binds the function reference; JS property-access sets `this` to the
  // instance when called as `modifier.addEvent(...)`.
  addEvent = eventOps.addEvent
  removeEvent = eventOps.removeEvent
  updateEvent = eventOps.updateEvent

  /**
   * Create an error result
   */
  errorResult(error: string): ModificationResult {
    log.warn('Operation failed:', error)
    return {
      success: false,
      newSource: this.source,
      change: { from: 0, to: 0, insert: '' },
      error,
    }
  }
}

/**
 * Create a CodeModifier
 */
export function createCodeModifier(source: string, sourceMap: SourceMap): CodeModifier {
  return new CodeModifier(source, sourceMap)
}

/**
 * Apply a change to source code
 */
export function applyChange(source: string, change: CodeChange): string {
  return source.substring(0, change.from) + change.insert + source.substring(change.to)
}
