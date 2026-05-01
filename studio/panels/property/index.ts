/**
 * Property Panel Module
 *
 * Hexagonal Architecture implementation of the Property Panel.
 *
 * Main exports:
 * - PropertyPanel, createPropertyPanel - Main entry points (backwards compatible)
 * - PropertyPanelController - Core logic without DOM
 * - PropertyPanelView - DOM rendering layer
 * - Ports - Interface definitions for dependency injection
 * - Adapters - Production and mock implementations
 * - Sections - Individual section renderers
 */

// ============================================
// Main Entry Points (Backwards Compatible)
// ============================================

export {
  PropertyPanel,
  createPropertyPanel,
  type OnCodeChangeCallback,
  type GetAllSourceCallback,
  type PropertyPanelOptions,
} from './property-panel'

// ============================================
// Core Architecture
// ============================================

// Controller
export {
  PropertyPanelController,
  createPropertyPanelController,
  type PropertyPanelControllerOptions,
} from './controller'

// State Machine
export {
  type PanelState,
  type PanelEvent,
  type PanelEffect,
  type TransitionResult,
  createInitialState,
  transition,
  isShowing,
  isPendingUpdate,
  getCurrentElement,
  getCurrentNodeId,
} from './state-machine'

// View
export { PropertyPanelView, createPropertyPanelView, type PropertyPanelViewOptions } from './view'

// Ports
export type {
  PropertyPanelPorts,
  SelectionPort,
  PropertyExtractionPort,
  PropertyModificationPort,
  TokenPort,
  LayoutDetectionPort,
  PanelEventPort,
  CleanupFn,
  SpacingToken,
  ColorToken,
  PropertyChange,
  Rect,
} from './ports'

// ============================================
// Types
// ============================================

export type { SelectionProvider } from './types'

// ============================================
// Adapters
// ============================================

export * from './adapters'

// ============================================
// Utilities
// ============================================

export * from './utils'

// ============================================
// Base Classes
// ============================================

export * from './base'

// ============================================
// Sections
// ============================================

export * from './sections'

// ============================================
// Global event listeners (icon picker, add/delete/change event)
// ============================================

export {
  setupPropertyPanelIconPicker,
  setupPropertyPanelEventListeners,
  type PropertyPanelEventListenerDeps,
} from './event-listeners'
