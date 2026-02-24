/**
 * useEditorTriggers Hook
 *
 * Handles trigger character detection and panel state updates during editing.
 * Creates the update listener extension for the editor.
 */

import { useCallback, useMemo, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { getCharBefore } from '../editor/utils'
import { handleTriggerCharacter, type TriggerHandlers, type TriggerState } from '../editor/trigger-handlers'
import type { ColorPanelState } from './useColorPanel'
import type { InlinePanelState } from './useInlinePanel'
import type { ComponentPanelState } from './useComponentPanel'

// =============================================================================
// Context-Based Picker Mapping
// =============================================================================
// After typing a component name/type + space, the appropriate picker appears.
// This is determined by the component type (explicit via "as Type" or implicit).

/** Types that trigger the Text picker (Font only) */
const TEXT_TYPES = ['Text', 'Link']

/** Types that trigger the Icon picker */
const ICON_TYPES = ['Icon']

/** Types that trigger the Button picker (Layout, Font, Border) */
const BUTTON_TYPES = ['Button']

/** Types that trigger the Input picker (Input, Layout, Border, Font) */
const INPUT_TYPES = ['Input', 'Textarea']

/** Types that trigger the Image picker (Image, Layout, Border) */
const IMAGE_TYPES = ['Image']

/** Types that trigger the Default picker (Layout, Border) - containers */
const DEFAULT_TYPES = ['Box', 'Container', 'Wrapper', 'Group', 'Row', 'Col', 'Column', 'Stack', 'View']

/** All recognized primitive types for picker coordination */
const ALL_PRIMITIVE_TYPES = [...TEXT_TYPES, ...ICON_TYPES, ...BUTTON_TYPES, ...INPUT_TYPES, ...IMAGE_TYPES, ...DEFAULT_TYPES, 'Segment', 'Select', 'Option']

// =============================================================================
// Pre-compiled Regex Patterns (Performance Optimization)
// =============================================================================
// Compiled once at module load instead of on every keystroke

/** Pattern for "as Type " - explicit type declaration (exactly ONE space after type) */
const REGEX_AS_TYPE = /\bas\s+([A-Z][a-zA-Z0-9]*) $/

/** Pattern for "ComponentName " at line start (exactly ONE space after name) */
const REGEX_LINE_START = /^\s*([A-Z][a-zA-Z0-9]*) $/

/** Pattern for "ComponentName: " definition (exactly ONE space after colon) */
const REGEX_DEFINITION = /^\s*([A-Z][a-zA-Z0-9]*): $/

/** Picker types */
export type PickerType = 'text' | 'icon' | 'button' | 'input' | 'image' | 'default' | null

/**
 * Determine which picker to show based on component type.
 */
export function getPickerForType(type: string): PickerType {
  if (TEXT_TYPES.includes(type)) return 'text'
  if (ICON_TYPES.includes(type)) return 'icon'
  if (BUTTON_TYPES.includes(type)) return 'button'
  if (INPUT_TYPES.includes(type)) return 'input'
  if (IMAGE_TYPES.includes(type)) return 'image'
  if (DEFAULT_TYPES.includes(type)) return 'default'
  // Default: null for unrecognized primitives
  return null
}

export interface EditorTriggerConfig {
  /** Callback for document changes */
  onChange: (value: string) => void
  /** Get current trigger handlers */
  getTriggerHandlers: () => TriggerHandlers
  /** Get current trigger state (which panels are open) */
  getTriggerState: () => TriggerState
  /** Get current color panel state */
  getColorPanelState: () => ColorPanelState
  /** Close the color panel */
  closeColorPanel: () => void
  /** Update color panel filter */
  updateColorPanelFilter: (filter: string) => void
  /** Get current icon panel state (optional - for inline icon picker) */
  getIconPanelState?: () => InlinePanelState
  /** Close the icon panel */
  closeIconPanel?: () => void
  /** Update icon panel filter */
  updateIconPanelFilter?: (filter: string) => void
  /** Get current font panel state (optional - for inline font picker) */
  getFontPanelState?: () => InlinePanelState
  /** Close the font panel */
  closeFontPanel?: () => void
  /** Update font panel filter */
  updateFontPanelFilter?: (filter: string) => void
  /** Get current component panel state */
  getComponentPanelState?: () => ComponentPanelState
  /** Open the component panel with picker type */
  openComponentPanel?: (componentName: string, pickerType: PickerType) => void
  /** Close the component panel */
  closeComponentPanel?: () => void
}

export interface UseEditorTriggersReturn {
  /** Extension to add to the editor for trigger handling */
  triggerExtension: Extension
  /** Schedule a trigger callback with cleanup on unmount */
  scheduleTrigger: (fn: () => void, delay: number) => void
  /** Clear all pending triggers */
  clearTriggers: () => void
  /** Ref for autocomplete timeout management */
  autoCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}

/**
 * Hook for managing editor trigger characters and panel updates.
 *
 * @param config - Configuration for trigger handling
 * @returns Extension and utilities for trigger management
 */
export function useEditorTriggers(config: EditorTriggerConfig): UseEditorTriggersReturn {
  // Store config in ref so the extension always uses current values
  const configRef = useRef(config)
  configRef.current = config

  const triggerTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const autoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cache last filter values to avoid unnecessary updates
  const lastFiltersRef = useRef<{ icon: string; font: string; color: string }>({
    icon: '',
    font: '',
    color: ''
  })

  // Schedule a trigger timeout that will be cleaned up
  const scheduleTrigger = useCallback((fn: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      triggerTimeoutsRef.current.delete(timeoutId)
      fn()
    }, delay)
    triggerTimeoutsRef.current.add(timeoutId)
  }, [])

  // Clear all pending triggers
  const clearTriggers = useCallback(() => {
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current)
      autoCompleteTimeoutRef.current = null
    }
    for (const timeoutId of triggerTimeoutsRef.current) {
      clearTimeout(timeoutId)
    }
    triggerTimeoutsRef.current.clear()
  }, [])

  // Track last reported value to avoid duplicate onChange calls
  const lastReportedValueRef = useRef<string>('')

  // Create the update listener extension (uses configRef for current values)
  // Must be memoized to prevent editor recreation on every render
  const triggerExtension = useMemo(() => EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      const view = update.view
      const cursorPos = update.state.selection.main.head

      // =======================================================================
      // Close component panel when conditions are no longer met
      // =======================================================================
      // When user types or deletes, check if the trigger conditions are still valid.
      // Close the panel if:
      // 1. User types new characters (input event)
      // 2. User deletes and the line no longer matches the trigger pattern

      const componentPanelState = configRef.current.getComponentPanelState?.()
      if (componentPanelState?.isOpen) {
        const isUserTyping = update.transactions.some(tr => tr.isUserEvent('input'))
        const isUserDeleting = update.transactions.some(tr => tr.isUserEvent('delete'))

        if (isUserTyping) {
          // Close on any new typing
          configRef.current.closeComponentPanel?.()
        } else if (isUserDeleting) {
          // On delete, check if trigger conditions are still met
          const cursorPos = update.state.selection.main.head
          const line = update.state.doc.lineAt(cursorPos)
          const textBefore = line.text.slice(0, cursorPos - line.from)

          // Check if line still matches one of the trigger patterns
          const stillMatchesAsType = REGEX_AS_TYPE.test(textBefore)
          const stillMatchesDefinition = REGEX_DEFINITION.test(textBefore)
          const stillMatchesLineStart = REGEX_LINE_START.test(textBefore)

          if (!stillMatchesAsType && !stillMatchesDefinition && !stillMatchesLineStart) {
            configRef.current.closeComponentPanel?.()
          }
        }
      }

      // Also close color panel on user typing
      const colorPanelOpen = configRef.current.getColorPanelState?.()?.isOpen
      if (colorPanelOpen) {
        const isUserTyping = update.transactions.some(tr => tr.isUserEvent('input'))
        if (isUserTyping) {
          configRef.current.closeColorPanel?.()
        }
      }

      // Close icon panel on user typing
      const iconPanelOpen = configRef.current.getIconPanelState?.()?.isOpen
      if (iconPanelOpen) {
        const isUserTyping = update.transactions.some(tr => tr.isUserEvent('input'))
        if (isUserTyping) {
          configRef.current.closeIconPanel?.()
        }
      }

      // Close font panel on user typing
      const fontPanelOpen = configRef.current.getFontPanelState?.()?.isOpen
      if (fontPanelOpen) {
        const isUserTyping = update.transactions.some(tr => tr.isUserEvent('input'))
        if (isUserTyping) {
          configRef.current.closeFontPanel?.()
        }
      }

      // =======================================================================
      // Trigger character detection (# for color, $ for token, " for string)
      // =======================================================================
      if (cursorPos > 0) {
        const charBefore = getCharBefore(view, cursorPos)

        // Quick check: only process if it's a potential trigger character
        if (charBefore === '#' || charBefore === '$' || charBefore === '"' || charBefore === ':') {
          const line = update.state.doc.lineAt(cursorPos)
          const textBefore = line.text.slice(0, cursorPos - line.from)

          // Get current handlers and state from config
          const handlers = configRef.current.getTriggerHandlers()
          const state = configRef.current.getTriggerState()

          // Handle trigger character (# for color, $ for token)
          handleTriggerCharacter(
            charBefore,
            textBefore,
            handlers,
            state,
            (fn, delay) => {
              const timeoutId = setTimeout(() => {
                triggerTimeoutsRef.current.delete(timeoutId)
                fn()
              }, delay)
              triggerTimeoutsRef.current.add(timeoutId)
            }
          )
        }

        // =====================================================================
        // Component Panel Trigger: "ComponentName " or "as Type " or "Name: "
        // =====================================================================
        // Opens the appropriate picker panel based on component type.
        // ONLY triggers when:
        // 1. A SPACE was just typed (charBefore === ' ')
        // 2. Exactly ONE space after component name/type/colon
        // Unknown names get the default picker (Layout + Border).

        // Only trigger on SPACE input (charBefore already defined above)
        if (charBefore === ' ') {
          const componentPanelState = configRef.current.getComponentPanelState?.()
          if (configRef.current.openComponentPanel && !componentPanelState?.isOpen) {
            const line = update.state.doc.lineAt(cursorPos)
            const textBefore = line.text.slice(0, cursorPos - line.from)

            // Pattern 1: "as Type " - explicit type after "as" keyword (exactly 1 space)
            const asTypeMatch = textBefore.match(REGEX_AS_TYPE)
            if (asTypeMatch) {
              const type = asTypeMatch[1]
              const picker = getPickerForType(type) || 'default'
              const timeoutId = setTimeout(() => {
                triggerTimeoutsRef.current.delete(timeoutId)
                configRef.current.openComponentPanel?.(type, picker)
              }, 50)
              triggerTimeoutsRef.current.add(timeoutId)
            }
            // Pattern 2: "ComponentName: " - definition with colon
            else {
              const definitionMatch = textBefore.match(REGEX_DEFINITION)
              if (definitionMatch) {
                const name = definitionMatch[1]
                const picker = getPickerForType(name) || 'default'
                const timeoutId = setTimeout(() => {
                  triggerTimeoutsRef.current.delete(timeoutId)
                  configRef.current.openComponentPanel?.(name, picker)
                }, 50)
                triggerTimeoutsRef.current.add(timeoutId)
              }
              // Pattern 3: "ComponentName " at line start (exactly 1 space)
              else {
                const lineStartMatch = textBefore.match(REGEX_LINE_START)
                if (lineStartMatch) {
                  const name = lineStartMatch[1]
                  const picker = getPickerForType(name) || 'default'
                  const timeoutId = setTimeout(() => {
                    triggerTimeoutsRef.current.delete(timeoutId)
                    configRef.current.openComponentPanel?.(name, picker)
                  }, 50)
                  triggerTimeoutsRef.current.add(timeoutId)
                }
              }
            }
          }
        }
      }

      // =======================================================================
      // Update small panel filters (icon, font, color) when open
      // =======================================================================
      // Performance: Early-exit checks avoid string operations when panels are closed

      // Icon panel filter
      if (configRef.current.getIconPanelState && configRef.current.updateIconPanelFilter) {
        const iconPanelState = configRef.current.getIconPanelState()
        if (iconPanelState?.isOpen) {
          // Close panel if cursor moved before trigger (trigger char deleted)
          if (cursorPos <= iconPanelState.triggerPos) {
            configRef.current.closeIconPanel?.()
          } else {
            const filter = update.state.doc.sliceString(iconPanelState.triggerPos, cursorPos)
            if (filter !== lastFiltersRef.current.icon) {
              lastFiltersRef.current.icon = filter
              configRef.current.updateIconPanelFilter(filter)
            }
          }
        }
      }

      // Font panel filter
      if (configRef.current.getFontPanelState && configRef.current.updateFontPanelFilter) {
        const fontPanelState = configRef.current.getFontPanelState()
        if (fontPanelState?.isOpen) {
          // Close panel if cursor moved before trigger (trigger char deleted)
          if (cursorPos <= fontPanelState.triggerPos) {
            configRef.current.closeFontPanel?.()
          } else {
            const filter = update.state.doc.sliceString(fontPanelState.triggerPos, cursorPos)
            if (filter !== lastFiltersRef.current.font) {
              lastFiltersRef.current.font = filter
              configRef.current.updateFontPanelFilter(filter)
            }
          }
        }
      }

      // Color panel filter
      if (configRef.current.updateColorPanelFilter) {
        const colorPanelState = configRef.current.getColorPanelState()
        if (colorPanelState.isOpen) {
          // Close panel if cursor moved before trigger (trigger char deleted)
          if (cursorPos <= colorPanelState.triggerPos) {
            configRef.current.closeColorPanel()
          } else {
            const filter = update.state.doc.sliceString(colorPanelState.triggerPos, cursorPos)
            if (filter !== lastFiltersRef.current.color) {
              lastFiltersRef.current.color = filter
              configRef.current.updateColorPanelFilter(filter)
            }
          }
        }
      }

      // =======================================================================
      // Call onChange synchronously
      // =======================================================================
      const currentValue = update.state.doc.toString()
      if (currentValue !== lastReportedValueRef.current) {
        lastReportedValueRef.current = currentValue
        configRef.current.onChange(currentValue)
      }
    }
  }), [])

  return {
    triggerExtension,
    scheduleTrigger,
    clearTriggers,
    autoCompleteTimeoutRef,
  }
}
