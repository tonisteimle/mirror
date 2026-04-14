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
  preview: boolean
  property: boolean
}

/**
 * Panel sizes (pixels)
 */
export interface PanelSizes {
  sidebar: number
  components: number
  editor: number
  preview: number
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
  /** Preview zoom level (100 = 100%) */
  previewZoom: number
  /** Play mode - disables editor interactions, allows component testing */
  playMode: boolean
  /** Layout information for all elements, extracted after render */
  layoutInfo: Map<string, LayoutRect>
  /** Layout version - incremented after each layout extraction */
  layoutVersion: number
}

/**
 * Store subscriber type
 */
export type Subscriber<T> = (state: T, prevState: T) => void

/**
 * State selector type
 */
export type Selector<T, R> = (state: T) => R
