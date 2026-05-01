/**
 * Shared Types for DOM Runtime
 *
 * Types used across multiple runtime modules.
 */

import type { FocusTrap } from 'focus-trap'
import type { StateAnimation } from '../parser/ast'

// StateAnimation lives in `parser/ast` (parser-layer concept); re-exported
// here so runtime modules importing from `./types` keep working.
export type { StateAnimation }

/**
 * Element with Mirror runtime metadata.
 *
 * Single source of truth — both `dom-runtime.ts` and `mirror-runtime.ts`
 * re-export this type. Fields fall into three groups:
 *   - state machine (`_stateStyles`, `_stateMachine`, transition flags)
 *   - bindings (`_textBinding`, `_valueBinding`, `_selectionBinding`,
 *     `_triggerBinding`)
 *   - per-feature config (`_eachConfig`, `_conditionalConfig`, focus-trap,
 *     loop-focus / typeahead, click-outside / escape handlers)
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
    /** Compiled filter predicate (replaces `filter` once parsed). */
    filterFn?: (item: Record<string, unknown>, index: number) => boolean
    /** Sort key (object-property name on each item). */
    orderBy?: string
    /** True for descending sort. */
    orderDesc?: boolean
    renderItem: (item: unknown, index: number) => HTMLElement
  }
  _conditionalConfig?: {
    condition: () => boolean
    renderThen: () => DocumentFragment
    renderElse?: () => DocumentFragment
  }
  _loopItem?: unknown
  _loopFocus?: boolean
  _typeaheadEnabled?: boolean
  _triggerBinding?: string // Trigger element shows selected text
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
