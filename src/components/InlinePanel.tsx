/**
 * InlinePanel - Base component for editor-integrated panels.
 *
 * Key behaviors:
 * - Focus stays in the editor
 * - Typing in editor filters the panel content
 * - Mouse clicks on panel still work
 * - Arrow keys navigate, Enter selects, Escape closes
 * - Unified dark design matching the editor
 * - Smart positioning: flips above cursor if not enough space below
 */
import { useEffect, useRef, useCallback, useState, useLayoutEffect } from 'react'
import { colors } from '../theme'

export interface InlinePanelProps {
  isOpen: boolean
  onClose: () => void
  position: { x: number; y: number }
  children: React.ReactNode
  width?: number
  maxHeight?: number
}

/**
 * Base panel container - positions at cursor, doesn't steal focus
 */
export function InlinePanel({
  isOpen,
  onClose,
  position,
  children,
  width = 240,
  maxHeight = 280,
}: InlinePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [flipAbove, setFlipAbove] = useState(false)
  const [adjustedLeft, setAdjustedLeft] = useState(position.x)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    // Use mousedown to catch clicks before they propagate
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  // Calculate position after render to get actual panel dimensions
  useLayoutEffect(() => {
    if (!isOpen || !panelRef.current) return

    const panel = panelRef.current
    const rect = panel.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const lineHeight = 20 // Approximate line height for cursor positioning

    // Check if panel fits below cursor
    const spaceBelow = viewportHeight - position.y - 16
    const spaceAbove = position.y - 16

    // Flip above if not enough space below but enough above
    if (rect.height > spaceBelow && spaceAbove > spaceBelow) {
      setFlipAbove(true)
    } else {
      setFlipAbove(false)
    }

    // Adjust horizontal position to stay in viewport
    let newLeft = position.x
    if (newLeft + width > viewportWidth - 16) {
      newLeft = viewportWidth - width - 16
    }
    if (newLeft < 16) {
      newLeft = 16
    }
    setAdjustedLeft(newLeft)
  }, [isOpen, position, width, maxHeight])

  // Reset flip state when closing
  useEffect(() => {
    if (!isOpen) {
      setFlipAbove(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Calculate final top position
  const lineHeight = 20
  const top = flipAbove
    ? position.y - maxHeight - lineHeight - 4  // Above cursor with gap
    : position.y + 4  // Below cursor with gap

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: adjustedLeft,
        top,
        width,
        maxHeight,
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        zIndex: 1000,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
        fontSize: '11px',
        // Smooth transition when flipping position
        transition: 'top 0.1s ease-out',
      }}
      // Prevent focus stealing
      onMouseDown={(e) => {
        // Allow clicks but prevent focus change
        e.preventDefault()
      }}
    >
      {children}
    </div>
  )
}

/**
 * Panel header with optional filter display
 */
export function PanelHeader({
  filter,
  placeholder = 'Tippen zum Filtern...',
  tabs,
  activeTab,
  onTabChange,
}: {
  filter?: string
  placeholder?: string
  tabs?: { id: string; label: string }[]
  activeTab?: string
  onTabChange?: (id: string) => void
}) {
  return (
    <div style={{
      borderBottom: `1px solid ${colors.border}`,
    }}>
      {/* Tabs if provided */}
      {tabs && tabs.length > 0 && (
        <div style={{
          display: 'flex',
          padding: '4px',
          gap: '2px',
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onMouseDown={(e) => {
                e.preventDefault()
                onTabChange?.(tab.id)
              }}
              style={{
                flex: 1,
                padding: '4px 8px',
                fontSize: '10px',
                fontWeight: 500,
                fontFamily: 'system-ui, sans-serif',
                backgroundColor: activeTab === tab.id ? colors.lineActive : 'transparent',
                color: activeTab === tab.id ? colors.text : colors.textMuted,
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter display */}
      <div style={{
        padding: '6px 8px',
        color: filter ? colors.text : colors.textMuted,
        fontSize: '11px',
        borderTop: tabs ? `1px solid ${colors.border}` : 'none',
      }}>
        {filter || placeholder}
      </div>
    </div>
  )
}

/**
 * Scrollable list container
 */
export function PanelList({
  children,
  listRef,
}: {
  children: React.ReactNode
  listRef?: React.RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={listRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {children}
    </div>
  )
}

/**
 * Single list item
 */
export function PanelItem({
  isSelected,
  onClick,
  onMouseEnter,
  children,
}: {
  isSelected?: boolean
  onClick?: () => void
  onMouseEnter?: () => void
  children: React.ReactNode
}) {
  return (
    <div
      onMouseDown={(e) => {
        e.preventDefault()
        onClick?.()
      }}
      onMouseEnter={onMouseEnter}
      style={{
        padding: '4px 8px',
        cursor: 'pointer',
        backgroundColor: isSelected ? colors.lineActive : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        lineHeight: '1.4',
      }}
    >
      {children}
    </div>
  )
}

// Re-export ColorSwatch and ItemLabel from picker/ for backwards compatibility
export { ColorSwatch, ItemLabel } from './picker'

/**
 * Panel footer with keyboard hints
 */
export function PanelFooter({
  hints = [
    { key: '↑↓', label: 'Navigation' },
    { key: '↵', label: 'Einfügen' },
  ],
}: {
  hints?: { key: string; label: string }[]
}) {
  return (
    <div
      style={{
        padding: '4px 8px',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        gap: '12px',
        fontSize: '10px',
        color: colors.textMuted,
        flexShrink: 0,
      }}
    >
      {hints.map((hint, i) => (
        <span key={i}>
          <span style={{
            color: colors.textDim,
            backgroundColor: colors.lineActive,
            padding: '1px 4px',
            borderRadius: '2px',
            marginRight: '4px',
          }}>
            {hint.key}
          </span>
          {hint.label}
        </span>
      ))}
    </div>
  )
}

/**
 * Hook to manage panel keyboard navigation from editor
 */
export function usePanelNavigation({
  isOpen,
  itemCount,
  onSelect,
  onClose,
}: {
  isOpen: boolean
  itemCount: number
  onSelect: (index: number) => void
  onClose: () => void
}) {
  const selectedIndex = useRef(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset selection when opening
  useEffect(() => {
    if (isOpen) {
      selectedIndex.current = 0
    }
  }, [isOpen])

  // Scroll selected item into view
  const scrollToSelected = useCallback(() => {
    if (!listRef.current) return
    const items = listRef.current.children
    const selected = items[selectedIndex.current] as HTMLElement
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent): boolean => {
    if (!isOpen || itemCount === 0) return false

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        selectedIndex.current = Math.min(itemCount - 1, selectedIndex.current + 1)
        scrollToSelected()
        return true
      case 'ArrowUp':
        e.preventDefault()
        selectedIndex.current = Math.max(0, selectedIndex.current - 1)
        scrollToSelected()
        return true
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        onSelect(selectedIndex.current)
        return true
      case 'Escape':
        e.preventDefault()
        onClose()
        return true
      default:
        return false
    }
  }, [isOpen, itemCount, onSelect, onClose, scrollToSelected])

  const setSelectedIndex = useCallback((index: number) => {
    selectedIndex.current = index
  }, [])

  const getSelectedIndex = useCallback(() => selectedIndex.current, [])

  return {
    listRef,
    handleKeyDown,
    selectedIndex: getSelectedIndex,
    setSelectedIndex,
  }
}
