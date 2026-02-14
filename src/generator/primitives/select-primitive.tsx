/**
 * Select Primitive - Behavior Component
 *
 * A fully-featured dropdown/select component with:
 * - Click to open/close
 * - Click outside to close
 * - Escape to close
 * - Arrow keys to navigate
 * - Enter to select
 * - Type-ahead search
 * - ARIA accessibility
 *
 * This is a "behavior component" - it provides all the interaction logic
 * but minimal styling. Users can customize appearance via slots.
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react'

// Types imported from separate file to avoid react-refresh issues
import type { SelectOption, SelectProps } from './select-types'

interface SelectContextValue {
  // State
  isOpen: boolean
  selectedValue: string | null
  highlightedIndex: number
  options: SelectOption[]
  searchQuery: string

  // Actions
  open: () => void
  close: () => void
  toggle: () => void
  select: (value: string) => void
  highlight: (index: number) => void
  highlightNext: () => void
  highlightPrev: () => void
  search: (query: string) => void

  // Refs
  triggerRef: React.RefObject<HTMLButtonElement | null>
  menuRef: React.RefObject<HTMLDivElement | null>

  // Helpers
  getOptionByValue: (value: string) => SelectOption | undefined
  getSelectedOption: () => SelectOption | undefined
}

// ============================================================================
// CONTEXT
// ============================================================================

const SelectContext = createContext<SelectContextValue | null>(null)

function useSelectContext() {
  const ctx = useContext(SelectContext)
  if (!ctx) throw new Error('Select components must be used within a Select')
  return ctx
}

// ============================================================================
// MAIN SELECT COMPONENT
// ============================================================================

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
  style,
  children,
}: SelectProps) {
  // State
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Filtered options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter(opt =>
      opt.label.toLowerCase().includes(query) ||
      opt.value.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  // Helpers
  const getOptionByValue = useCallback(
    (val: string) => options.find(opt => opt.value === val),
    [options]
  )

  const getSelectedOption = useCallback(
    () => value ? getOptionByValue(value) : undefined,
    [value, getOptionByValue]
  )

  // Actions
  const open = useCallback(() => {
    if (disabled) return
    setIsOpen(true)
    setHighlightedIndex(0)
    setSearchQuery('')
  }, [disabled])

  const close = useCallback(() => {
    setIsOpen(false)
    setSearchQuery('')
    triggerRef.current?.focus()
  }, [])

  const toggle = useCallback(() => {
    if (isOpen) close()
    else open()
  }, [isOpen, open, close])

  const select = useCallback((val: string) => {
    const option = getOptionByValue(val)
    if (option && !option.disabled) {
      onChange?.(val, option)
      close()
    }
  }, [getOptionByValue, onChange, close])

  const highlight = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, filteredOptions.length - 1))
    setHighlightedIndex(clampedIndex)
  }, [filteredOptions.length])

  const highlightNext = useCallback(() => {
    highlight(highlightedIndex + 1)
  }, [highlight, highlightedIndex])

  const highlightPrev = useCallback(() => {
    highlight(highlightedIndex - 1)
  }, [highlight, highlightedIndex])

  const search = useCallback((query: string) => {
    setSearchQuery(prev => prev + query)

    // Clear search after 500ms of no typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery('')
    }, 500)
  }, [])

  // ========================================================================
  // BEHAVIORS
  // ========================================================================

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close()
      }
    }

    // Use mousedown to catch before click propagates
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          close()
          break

        case 'ArrowDown':
          e.preventDefault()
          highlightNext()
          break

        case 'ArrowUp':
          e.preventDefault()
          highlightPrev()
          break

        case 'Enter':
        case 'Tab':
          e.preventDefault()
          if (filteredOptions[highlightedIndex]) {
            select(filteredOptions[highlightedIndex].value)
          }
          break

        case 'Home':
          e.preventDefault()
          highlight(0)
          break

        case 'End':
          e.preventDefault()
          highlight(filteredOptions.length - 1)
          break

        default:
          // Type-ahead search
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            search(e.key)
          }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close, highlightNext, highlightPrev, highlight, select, search, filteredOptions, highlightedIndex])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || !menuRef.current) return

    const highlightedEl = menuRef.current.querySelector('[data-highlighted="true"]')
    if (highlightedEl) {
      highlightedEl.scrollIntoView({ block: 'nearest' })
    }
  }, [isOpen, highlightedIndex])

  // Context value
  const contextValue: SelectContextValue = {
    isOpen,
    selectedValue: value ?? null,
    highlightedIndex,
    options: filteredOptions,
    searchQuery,
    open,
    close,
    toggle,
    select,
    highlight,
    highlightNext,
    highlightPrev,
    search,
    triggerRef,
    menuRef,
    getOptionByValue,
    getSelectedOption,
  }

  // Render
  return (
    <SelectContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'relative',
          display: 'inline-block',
          ...style,
        }}
        data-state={isOpen ? 'open' : 'closed'}
        data-disabled={disabled || undefined}
      >
        {children || (
          <>
            <SelectTrigger>
              {getSelectedOption()?.label || placeholder}
            </SelectTrigger>
            <SelectMenu>
              {filteredOptions.map((option, index) => (
                <SelectItem key={option.value} value={option.value} index={index}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectMenu>
          </>
        )}
      </div>
    </SelectContext.Provider>
  )
}

// ============================================================================
// SLOT COMPONENTS
// ============================================================================

interface SelectTriggerProps {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function SelectTrigger({ children, className, style }: SelectTriggerProps) {
  const { toggle, isOpen, triggerRef, getSelectedOption } = useSelectContext()

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={toggle}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        cursor: 'pointer',
        ...style,
      }}
      aria-haspopup="listbox"
      aria-expanded={isOpen}
    >
      {children}
    </button>
  )
}

interface SelectMenuProps {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function SelectMenu({ children, className, style }: SelectMenuProps) {
  const { isOpen, menuRef, highlightedIndex } = useSelectContext()

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      role="listbox"
      className={className}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        maxHeight: '300px',
        overflowY: 'auto',
        zIndex: 1000,
        ...style,
      }}
      aria-activedescendant={`option-${highlightedIndex}`}
    >
      {children}
    </div>
  )
}

interface SelectItemProps {
  value: string
  index: number
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export function SelectItem({ value, index, children, className, style }: SelectItemProps) {
  const { select, highlight, highlightedIndex, selectedValue, getOptionByValue } = useSelectContext()

  const option = getOptionByValue(value)
  const isHighlighted = index === highlightedIndex
  const isSelected = value === selectedValue
  const isDisabled = option?.disabled

  return (
    <div
      id={`option-${index}`}
      role="option"
      onClick={() => !isDisabled && select(value)}
      onMouseEnter={() => !isDisabled && highlight(index)}
      className={className}
      style={{
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.5 : 1,
        ...style,
      }}
      data-highlighted={isHighlighted || undefined}
      data-selected={isSelected || undefined}
      data-disabled={isDisabled || undefined}
      aria-selected={isSelected}
      aria-disabled={isDisabled}
    >
      {children}
    </div>
  )
}

interface SelectSearchProps {
  placeholder?: string
  className?: string
  style?: React.CSSProperties
}

export function SelectSearch({ placeholder = 'Search...', className, style }: SelectSearchProps) {
  const { searchQuery } = useSelectContext()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when menu opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      value={searchQuery}
      placeholder={placeholder}
      className={className}
      style={{
        width: '100%',
        ...style,
      }}
      // Note: Actual search is handled by keyboard events on document
      // This input just shows the current search query
      readOnly
    />
  )
}

// ============================================================================
// COMPOUND EXPORT
// ============================================================================

Select.Trigger = SelectTrigger
Select.Menu = SelectMenu
Select.Item = SelectItem
Select.Search = SelectSearch

export default Select
