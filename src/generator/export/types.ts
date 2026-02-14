/**
 * Export Types
 *
 * Shared types for the React exporter.
 */

import type { ASTNode, ComponentTemplate } from '../../parser/types'
import type { InteractivityAnalysis } from './analyze-interactivity'

/**
 * Result of the export operation
 */
export interface ExportResult {
  /** The generated App.tsx content */
  tsx: string
  /** The generated styles.css content */
  css: string
}

/**
 * Context passed during export traversal
 */
export interface ExportContext {
  /** Get or generate a unique class name for a node */
  getClassName(node: ASTNode): string
  /** Check if a component is defined (should render as <Component>) */
  isDefinedComponent(name: string): boolean
  /** Get visibility state info for an element */
  getVisibilityState(name: string): { stateName: string; setterName: string } | undefined
  /** Get component state info */
  getComponentState(name: string): { stateName: string; states: string[] } | undefined
  /** Check if an element should be conditionally rendered */
  isConditionallyRendered(name: string): boolean
  /** Interactivity analysis results */
  interactivity: InteractivityAnalysis
  /** Component registry */
  registry: Map<string, ComponentTemplate>
}
