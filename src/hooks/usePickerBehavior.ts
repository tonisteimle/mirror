/**
 * Shared behavior hook for picker components.
 * Handles keyboard navigation, scroll-into-view, and focus management.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject,
  type KeyboardEvent,
  type Dispatch,
  type SetStateAction,
} from 'react'

export interface UsePickerBehaviorConfig {
  /** Whether the picker is currently open */
  isOpen: boolean
  /** Callback to close the picker */
  onClose: () => void
  /** Total number of items in the list */
  itemCount: number
  /** Number of columns for grid navigation (e.g., IconPicker) */
  columns?: number
  /** Callback when an item is selected via Enter key */
  onSelect?: (index: number) => void
  /** Whether to scroll selected item into view */
  scrollIntoView?: boolean
  /** Initial selected index when opened */
  initialIndex?: number
  /** Whether to focus on container/input when opened */
  autoFocus?: boolean
  /** Custom key handlers to merge with default handlers */
  customKeyHandlers?: Record<string, (e: KeyboardEvent) => void>
}

export interface UsePickerBehaviorReturn {
  /** Currently selected index */
  selectedIndex: number
  /** Setter for selected index */
  setSelectedIndex: Dispatch<SetStateAction<number>>
  /** Ref for the container element */
  containerRef: RefObject<HTMLDivElement | null>
  /** Ref for the list/grid element (for scroll-into-view) */
  listRef: RefObject<HTMLDivElement | null>
  /** Ref for the input element (if present) */
  inputRef: RefObject<HTMLInputElement | null>
  /** Key down handler to attach to the focusable element */
  handleKeyDown: (e: KeyboardEvent) => void
  /** Reset selected index to initial value */
  resetSelection: () => void
}

export function usePickerBehavior(config: UsePickerBehaviorConfig): UsePickerBehaviorReturn {
  const {
    isOpen,
    onClose,
    itemCount,
    columns = 1,
    onSelect,
    scrollIntoView = true,
    initialIndex = 0,
    autoFocus = true,
    customKeyHandlers,
  } = config

  const [selectedIndex, setSelectedIndex] = useState(initialIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset selection when opened
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(initialIndex)
    }
  }, [isOpen, initialIndex])

  // Focus management when opened
  useEffect(() => {
    if (isOpen && autoFocus) {
      // Prioritize input, then list, then container
      const focusTarget = inputRef.current || listRef.current || containerRef.current
      if (focusTarget) {
        // Use setTimeout to ensure DOM is ready
        const timeoutId = setTimeout(() => focusTarget.focus(), 0)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [isOpen, autoFocus])

  // Scroll selected item into view
  useEffect(() => {
    if (!scrollIntoView || !listRef.current || itemCount === 0) return

    const selectedEl = listRef.current.querySelector(
      `[data-index="${selectedIndex}"], [data-selected="true"]`
    )
    selectedEl?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, scrollIntoView, itemCount])

  // Reset selection helper
  const resetSelection = useCallback(() => {
    setSelectedIndex(initialIndex)
  }, [initialIndex])

  // N1: Use ref for selectedIndex to avoid recreating handler on every selection change
  const selectedIndexRef = useRef(selectedIndex)
  selectedIndexRef.current = selectedIndex

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Check for custom handlers first
      if (customKeyHandlers?.[e.key]) {
        customKeyHandlers[e.key](e)
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (columns > 1) {
            // Grid navigation: move down by columns
            setSelectedIndex(i => Math.min(i + columns, itemCount - 1))
          } else {
            // List navigation: move down by 1
            setSelectedIndex(i => Math.min(i + 1, itemCount - 1))
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (columns > 1) {
            // Grid navigation: move up by columns
            setSelectedIndex(i => Math.max(i - columns, 0))
          } else {
            // List navigation: move up by 1
            setSelectedIndex(i => Math.max(i - 1, 0))
          }
          break

        case 'ArrowRight':
          if (columns > 1) {
            e.preventDefault()
            setSelectedIndex(i => Math.min(i + 1, itemCount - 1))
          }
          break

        case 'ArrowLeft':
          if (columns > 1) {
            e.preventDefault()
            setSelectedIndex(i => Math.max(i - 1, 0))
          }
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          if (onSelect && itemCount > 0) {
            // N1: Use ref to get current selectedIndex
            onSelect(selectedIndexRef.current)
          }
          break

        case 'Escape':
          e.preventDefault()
          onClose()
          break

        case 'Tab':
          // Allow Tab to cycle through items (with Shift for reverse)
          e.preventDefault()
          if (e.shiftKey) {
            setSelectedIndex(i => Math.max(i - 1, 0))
          } else {
            setSelectedIndex(i => Math.min(i + 1, itemCount - 1))
          }
          break
      }
    },
    [columns, itemCount, onSelect, onClose, customKeyHandlers]
  )

  return {
    selectedIndex,
    setSelectedIndex,
    containerRef,
    listRef,
    inputRef,
    handleKeyDown,
    resetSelection,
  }
}
