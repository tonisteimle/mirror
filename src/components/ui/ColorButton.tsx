/**
 * Shared Color Components for Inline Panels
 *
 * ColorButton - Button that shows current color and opens picker
 * MiniColorPicker - Portal-based color picker dropdown
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { PANEL_COLORS, PANEL_SIZES } from './tokens'
import { ColorSystemPalette } from '../ColorSystemPalette'

interface ColorButtonProps {
  color: string
  onClick: () => void
  /** Button width (default: 80) */
  width?: number
  /** Empty state label (default: 'Keine') */
  emptyLabel?: string
}

/**
 * Color button that displays current color and triggers picker
 */
export function ColorButton({
  color,
  onClick,
  width = 80,
  emptyLabel = 'Keine',
}: ColorButtonProps) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      style={{
        width,
        height: PANEL_SIZES.buttonHeight,
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        backgroundColor: PANEL_COLORS.buttonBg,
        border: 'none',
        borderRadius: PANEL_SIZES.borderRadius,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: PANEL_SIZES.borderRadiusSmall,
          backgroundColor: color || 'transparent',
          border: color ? 'none' : `1px dashed ${PANEL_COLORS.label}`,
        }}
      />
      <span
        style={{
          color: color ? PANEL_COLORS.textLight : PANEL_COLORS.text,
          fontSize: PANEL_SIZES.fontSize,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {color || emptyLabel}
      </span>
    </button>
  )
}

interface MiniColorPickerProps {
  color: string
  onChange: (color: string) => void
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  /** Whether to uppercase output colors (default: true) */
  uppercaseOutput?: boolean
  /** Position above trigger instead of below (default: false) */
  positionAbove?: boolean
}

/**
 * Compact color picker rendered via portal
 * Positions below (or above) the trigger element
 */
export function MiniColorPicker({
  color,
  onChange,
  onClose,
  triggerRef,
  uppercaseOutput = true,
  positionAbove = false,
}: MiniColorPickerProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Calculate position based on trigger element
  useEffect(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()

    if (positionAbove) {
      // Position above trigger (needs panel height estimation)
      const panelHeight = panelRef.current?.offsetHeight || 300
      setPosition({
        top: rect.top - panelHeight - 8,
        left: rect.left,
      })
    } else {
      // Position below trigger
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
  }, [triggerRef, positionAbove])

  // Re-measure for positionAbove after render
  useEffect(() => {
    if (!positionAbove || !triggerRef.current || !panelRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const panelHeight = panelRef.current.offsetHeight
    setPosition({
      top: rect.top - panelHeight - 8,
      left: rect.left,
    })
  })

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Global keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleColorChange = (newColor: string) => {
    onChange(uppercaseOutput ? newColor.toUpperCase() : newColor)
  }

  const content = (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        backgroundColor: PANEL_COLORS.bg,
        border: `1px solid ${PANEL_COLORS.label}`,
        borderRadius: 8,
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div style={{ padding: 12 }}>
        <ColorSystemPalette
          color={color || '#FFFFFF'}
          onChange={handleColorChange}
        />
      </div>
      {/* Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: `1px solid ${PANEL_COLORS.label}`,
          display: 'flex',
          justifyContent: 'flex-end',
          fontSize: PANEL_SIZES.fontSizeSmall,
          color: PANEL_COLORS.text,
        }}
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            backgroundColor: 'transparent',
            border: `1px solid ${PANEL_COLORS.label}`,
            borderRadius: PANEL_SIZES.borderRadius,
            cursor: 'pointer',
            fontSize: PANEL_SIZES.fontSizeSmall,
            color: PANEL_COLORS.text,
          }}
        >
          OK
        </button>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
