/**
 * Property Panel Types
 */

import type { ExtractedProperty, ExtractedElement, PropertyCategory } from '../../../src/studio/property-extractor'
import type { CodeModifier, ModificationResult } from '../../../src/studio/code-modifier'

export type { ExtractedProperty, ExtractedElement, PropertyCategory }
export type { CodeModifier, ModificationResult }

export interface PropertyPanelConfig {
  container: HTMLElement
  showCategories?: boolean
  showChildList?: boolean
  showActions?: boolean
  enableDragDrop?: boolean
  showBreadcrumb?: boolean
}

export interface PropertyPanelCallbacks {
  onPropertyChange: (nodeId: string, property: string, value: string, result: ModificationResult) => void
  onPropertyRemove: (nodeId: string, property: string, result: ModificationResult) => void
  onChildAdd?: (parentId: string, component: string, result: ModificationResult) => void
  onChildRemove?: (parentId: string, childId: string, result: ModificationResult) => void
  onChildReorder?: (parentId: string, fromIndex: number, toIndex: number, result: ModificationResult) => void
  onExtractComponent?: (nodeId: string, name: string, result: any) => void
  onNodeSelect?: (nodeId: string) => void
}

export interface PropertyInputConfig {
  property: ExtractedProperty
  nodeId: string
  onChange: (value: string) => void
  onRemove: () => void
  onFocus?: () => void
  onBlur?: () => void
}

export interface ChildElement {
  id: string
  name: string
  type: string
  index: number
}

// Category name type
export type CategoryName = 'layout' | 'size' | 'spacing' | 'appearance' | 'typography' | 'border' | 'state' | 'event' | 'other'

// Property categories with display info
export const CATEGORY_INFO: Record<CategoryName, { label: string; icon: string; order: number }> = {
  layout: { label: 'Layout', icon: 'layout', order: 1 },
  size: { label: 'Size', icon: 'size', order: 2 },
  spacing: { label: 'Spacing', icon: 'spacing', order: 3 },
  appearance: { label: 'Appearance', icon: 'appearance', order: 4 },
  typography: { label: 'Typography', icon: 'typography', order: 5 },
  border: { label: 'Border', icon: 'border', order: 6 },
  state: { label: 'States', icon: 'state', order: 7 },
  event: { label: 'Events', icon: 'event', order: 8 },
  other: { label: 'Other', icon: 'other', order: 9 },
}
