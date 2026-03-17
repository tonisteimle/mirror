/**
 * Smart Guides Module
 *
 * Provides alignment guides that snap to sibling edges during drag operations.
 */

export { GuideCalculator, createGuideCalculator } from './guide-calculator'
export { GuideRenderer, createGuideRenderer } from './guide-renderer'
export type {
  EdgeType,
  AlignmentEdge,
  Guide,
  SnapResult,
  ElementRect,
  SmartGuidesConfig,
} from './types'
