/**
 * Shared Types for DOM Runtime
 *
 * Types used across multiple runtime modules.
 */

import type { FocusTrap } from 'focus-trap'

/**
 * Animation configuration for state transitions
 */
export interface StateAnimation {
  preset?: string
  duration?: number
  easing?: string
  delay?: number
}

/**
 * Element with Mirror runtime metadata
 */
export interface MirrorElement extends HTMLElement {
  _stateStyles?: Record<string, Record<string, string>>
  _baseStyles?: Record<string, string>
  _initialState?: string
  _visibleWhen?: string
  _visibilityPaths?: string[]
  _selectionBinding?: string
  _textBinding?: string
  _textPlaceholder?: string
  _savedDisplay?: string
  _clickOutsideHandler?: (e: MouseEvent) => void
  _clickOutsideTimeout?: ReturnType<typeof setTimeout>
  _autoSelectHandler?: () => void
  _escapeHandler?: (e: KeyboardEvent) => void
  _focusTrap?: FocusTrap
  _previouslyFocused?: Element | null
  _isTransitioning?: boolean
  _baseDisplay?: string
  _valueBinding?: string
  _textTemplate?: () => string
  _eachConfig?: {
    itemVar: string
    collection: string
    filter?: string
    renderItem: (item: unknown, index: number) => HTMLElement
  }
  _conditionalConfig?: {
    condition: () => boolean
    renderThen: () => DocumentFragment
    renderElse?: () => DocumentFragment
  }
  _loopItem?: unknown
  _stateMachine?: {
    initial: string
    current: string
    states: Record<
      string,
      {
        styles: Record<string, string>
        children?: () => HTMLElement[]
        enter?: StateAnimation
        exit?: StateAnimation
      }
    >
    transitions: Array<{
      to: string
      trigger: string
      key?: string
      modifier?: 'exclusive' | 'toggle' | 'initial'
    }>
  }
  _baseChildren?: HTMLElement[]
}

// ============================================
// OVERLAY TYPES
// ============================================

export type OverlayPosition = 'below' | 'above' | 'left' | 'right' | 'center'

export interface PositionOptions {
  offset?: number
  flip?: boolean
  align?: 'start' | 'center' | 'end'
}
