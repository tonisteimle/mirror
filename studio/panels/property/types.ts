/**
 * Property Panel Types
 */

import type { BreadcrumbItem } from '../../../compiler/studio/selection-manager'
import type { ExtractedElement, ExtractedProperty, PropertyCategory } from '../../../compiler/studio/property-extractor'
import type { ModificationResult, FilesAccess } from '../../../compiler/studio/code-modifier'

/**
 * Interface for selection providers
 */
export interface SelectionProvider {
  subscribe(listener: (nodeId: string | null, previousNodeId: string | null) => void): () => void
  subscribeBreadcrumb(listener: (chain: BreadcrumbItem[]) => void): () => void
  getSelection(): string | null
  clearSelection(): void
  select(nodeId: string | null): void
}

/**
 * Token info extracted from source
 */
export interface SpacingToken {
  name: string      // e.g., "sm", "md", "lg"
  fullName: string  // e.g., "sm.pad", "md.rad"
  value: string     // e.g., "4", "8"
}

/**
 * Color token
 */
export interface ColorToken {
  name: string
  value: string
}

/**
 * Callback when code changes
 */
export type OnCodeChangeCallback = (result: ModificationResult) => void

/**
 * Callback to get all project source
 */
export type GetAllSourceCallback = () => string

/**
 * PropertyPanel options
 */
export interface PropertyPanelOptions {
  debounceTime?: number
  showSourceIndicators?: boolean
  getAllSource?: GetAllSourceCallback
  filesAccess?: FilesAccess
}

/**
 * Validation rule
 */
export interface ValidationRule {
  pattern: RegExp
  allowEmpty: boolean
  message: string
}

// Re-export types from compiler
export type { ExtractedElement, ExtractedProperty, PropertyCategory, ModificationResult, FilesAccess }
