/**
 * State Types for Studio
 *
 * Type definitions extracted from state.ts for better modularity.
 */

import type { AST, ParseError } from '../../compiler/parser/ast'
import type { IR } from '../../compiler/ir/types'
import type { SourceMap } from '../../compiler/ir/source-map'

export type SelectionOrigin = 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard' | 'drag-drop'

export interface BreadcrumbItem {
  nodeId: string
  name: string
}

/**
 * Compile result - atomically updated together
 */
export interface CompileResult {
  ast: AST
  ir: IR
  sourceMap: SourceMap
  errors: ParseError[]
  version: number // Incremented on each compile
  timestamp: number
}

/**
 * Deferred selection - resolved after compile completes
 *
 * Two modes:
 * - 'nodeId': When the nodeId is known but SourceMap isn't ready (e.g., undo/redo during compile)
 * - 'line': When only the line number is known (e.g., drag-drop insert)
 */
export type DeferredSelection =
  | {
      type: 'nodeId'
      /** The nodeId to select once SourceMap is available */
      nodeId: string
      /** Origin of the selection request */
      origin: SelectionOrigin
    }
  | {
      type: 'line'
      /** Line number in the current file (1-based) where the element was inserted */
      line: number
      /** Component name that was inserted (e.g., "Frame", "Text") */
      componentName: string
      /** Origin of the selection request */
      origin: SelectionOrigin
    }
  | {
      type: 'lastChildOf'
      /** Parent nodeId whose child should be selected. */
      parentNodeId: string
      /** If set, select the child at this index; otherwise select the last. */
      insertionIndex?: number
      /** Origin of the selection request */
      origin: SelectionOrigin
    }

/**
 * @deprecated Use DeferredSelection with type: 'line' instead
 * Kept for backward compatibility
 */
export interface PendingSelection {
  /** Line number in the current file (1-based) where the element was inserted */
  line: number
  /** Component name that was inserted (e.g., "Frame", "Text") */
  componentName: string
  /** Origin of the selection request */
  origin: SelectionOrigin
}

/**
 * Panel visibility state for individual panels
 */
export interface PanelVisibility {
  prompt: boolean
  files: boolean
  code: boolean
  components: boolean
  'design-system': boolean
  preview: boolean
  property: boolean
}

/**
 * Panel sizes (pixels)
 */
export interface PanelSizes {
  sidebar: number
  components: number
  designSystem: number
  editor: number
  preview: number
  property: number
}

/**
 * Combined panel settings for localStorage persistence
 */
export interface PanelSettings {
  visibility: PanelVisibility
  sizes: PanelSizes
}

/**
 * Layout information for a single element
 * Extracted once after render, used by all visual systems (handles, resize, overlays)
 */
export interface LayoutRect {
  /** Position relative to preview container */
  x: number
  y: number
  /** Element dimensions */
  width: number
  height: number
  /** Padding values */
  padding: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** Margin values */
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
  /** Gap between children (for flex/grid containers) */
  gap: number
  /** Border radius */
  radius: number
  /** Whether element has position: absolute */
  isAbsolute: boolean
  /** Parent node ID (for hierarchy) */
  parentId: string | null
  /** Flex direction if container */
  flexDirection: 'row' | 'column' | null
  /** Whether element is a flex/grid container */
  isContainer: boolean
}

/**
 * Complete studio state
 */
export interface StudioState {
  source: string
  /** Resolved source = prelude + current file (used by CodeModifier to match SourceMap positions) */
  resolvedSource: string
  /** Last validated source content - used for draft line detection */
  validatedSource: string
  ast: AST | null
  ir: IR | null
  sourceMap: SourceMap | null
  errors: ParseError[]
  /** Compile version - use to detect stale SourceMap */
  compileVersion: number
  /** Timestamp of last successful compile */
  compileTimestamp: number
  /** True while compilation is in progress */
  compiling: boolean
  selection: { nodeId: string | null; origin: SelectionOrigin }
  /** Multi-selection for grouping operations (Shift+Click) */
  multiSelection: string[]
  breadcrumb: BreadcrumbItem[]
  cursor: { line: number; column: number }
  editorHasFocus: boolean
  currentFile: string
  /**
   * Layout file currently rendered in the preview. Decoupled from
   * `currentFile` so that editing a tokens / components / data file keeps
   * the same layout visible. Sticky: stays put when a non-layout file is
   * opened, follows `currentFile` when a layout (`.mir` / `.mirror`) is
   * opened. May be null when no layout has been opened yet.
   */
  previewFile: string | null
  files: Record<string, string>
  fileTypes: Record<string, string>
  panels: { left: boolean; right: boolean }
  /** Individual panel visibility */
  panelVisibility: PanelVisibility
  /** Panel sizes (percentages) */
  panelSizes: PanelSizes
  mode: 'mirror' | 'react'
  /** Character offset where current file starts in resolvedSource */
  preludeOffset: number
  /** Line offset where current file starts in resolvedSource (for line-based operations) */
  preludeLineOffset: number
  /**
   * True when the resolved source was produced by wrapping the user code
   * with an implicit `App` root (which prepends `App\n` and indents every
   * non-empty user line by 2 spaces). Consumers translating offsets from
   * resolved-source to editor coordinates must subtract those synthetic
   * indents in addition to `preludeOffset`.
   */
  isWrappedWithApp: boolean
  /** Pending selection to be resolved after compile completes (line-based) */
  pendingSelection: PendingSelection | null
  /** Queued selection when SourceMap not yet available (nodeId-based) */
  queuedSelection: { nodeId: string; origin: SelectionOrigin } | null
  /** Unified deferred selection - replaces pendingSelection and queuedSelection */
  deferredSelection: DeferredSelection | null
  /** Inline text editing state */
  inlineEditActive: boolean
  /** Node ID currently being inline edited */
  inlineEditNodeId: string | null
  /** Play mode - disables editor interactions, allows component testing */
  playMode: boolean
  /** Layout information for all elements, extracted after render */
  layoutInfo: Map<string, LayoutRect>
  /** Layout version - incremented after each layout extraction */
  layoutVersion: number
  /** Current handle mode in preview (resize, padding, margin) */
  handleMode: HandleMode
}

/**
 * Handle mode for preview interactions
 */
export type HandleMode = 'resize' | 'padding' | 'margin' | 'gap'

/**
 * Store subscriber type
 */
export type Subscriber<T> = (state: T, prevState: T) => void

/**
 * State selector type
 */
export type Selector<T, R> = (state: T) => R
