/**
 * Base picker component that provides consistent layout and styling.
 * Used as a foundation for all picker components.
 */

import { type ReactNode, type CSSProperties, forwardRef, memo } from 'react'
import { useViewportPosition } from '../../hooks/useViewportPosition'
import { colors } from '../../theme'
import type { Position } from '../../types/common'

export interface BasePickerProps {
  /** Whether the picker is visible */
  isOpen: boolean
  /** Callback to close the picker */
  onClose: () => void
  /** Base position for the picker */
  position: Position
  /** Width of the picker (default: 300) */
  width?: number
  /** Maximum height of the picker (default: 400) */
  maxHeight?: number
  /** Optional title shown in the header */
  title?: string
  /** Optional footer content */
  footer?: ReactNode
  /** Whether to show a backdrop that closes picker on click (default: true) */
  useBackdrop?: boolean
  /** Content of the picker */
  children: ReactNode
  /** Additional styles for the container */
  style?: CSSProperties
  /** Z-index for the picker (default: 1000) */
  zIndex?: number
}

/**
 * BasePicker provides:
 * - Viewport-aware positioning
 * - Optional backdrop for click-outside handling
 * - Consistent container styling
 * - Optional header with title
 * - Optional footer
 */
export const BasePicker = forwardRef<HTMLDivElement, BasePickerProps>(
  function BasePicker(props, ref) {
    const {
      isOpen,
      onClose,
      position,
      width = 300,
      maxHeight = 400,
      title,
      footer,
      useBackdrop = true,
      children,
      style,
      zIndex = 1000,
    } = props

    // Calculate viewport-adjusted position
    const adjustedPosition = useViewportPosition({
      position,
      width,
      maxHeight,
      margin: 20,
      allowFlipUp: true,
    })

    if (!isOpen) return null

    return (
      <>
        {/* Backdrop for click-outside */}
        {useBackdrop && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: zIndex - 1,
            }}
            onClick={onClose}
          />
        )}

        {/* Picker container */}
        <div
          ref={ref}
          style={{
            position: 'fixed',
            left: adjustedPosition.x,
            top: adjustedPosition.y,
            width,
            maxHeight,
            backgroundColor: colors.hover,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            zIndex,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            ...style,
          }}
        >
          {/* Optional header */}
          {title && (
            <div
              style={{
                padding: '8px 12px',
                borderBottom: `1px solid ${colors.border}`,
                fontSize: '11px',
                fontWeight: 600,
                color: colors.text,
              }}
            >
              {title}
            </div>
          )}

          {/* Main content */}
          {children}

          {/* Optional footer */}
          {footer}
        </div>
      </>
    )
  }
)

/**
 * Pre-styled footer component for keyboard hints.
 */
export interface PickerFooterProps {
  hints: Array<{ key: string; label: string }>
}

export function PickerFooter({ hints }: PickerFooterProps) {
  return (
    <div
      style={{
        padding: '6px 12px',
        fontSize: '10px',
        color: colors.textMuted,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        gap: '12px',
      }}
    >
      {hints.map(({ key, label }) => (
        <span key={key}>
          {key} {label}
        </span>
      ))}
    </div>
  )
}

/**
 * Pre-styled list container for picker items.
 */
export interface PickerListProps {
  children: ReactNode
  onKeyDown?: (e: React.KeyboardEvent) => void
  padding?: string
}

export const PickerList = memo(forwardRef<HTMLDivElement, PickerListProps>(
  function PickerList({ children, onKeyDown, padding = '4px 0' }, ref) {
    return (
      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{
          flex: 1,
          overflow: 'auto',
          padding,
          outline: 'none',
        }}
      >
        {children}
      </div>
    )
  }
))

/**
 * Pre-styled search input for pickers.
 */
export interface PickerSearchProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  placeholder?: string
}

export const PickerSearch = forwardRef<HTMLInputElement, PickerSearchProps>(
  function PickerSearch({ value, onChange, onKeyDown, placeholder = 'Suchen...' }, ref) {
    return (
      <div style={{ padding: '8px', borderBottom: `1px solid ${colors.border}` }}>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '6px 10px',
            backgroundColor: colors.inputBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            color: colors.text,
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>
    )
  }
)

/**
 * Pre-styled list item for pickers.
 */
export interface PickerItemProps {
  index: number
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  children: ReactNode
  style?: CSSProperties
}

export const PickerItem = memo(function PickerItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  children,
  style,
}: PickerItemProps) {
  return (
    <div
      data-index={index}
      data-selected={isSelected}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      style={{
        padding: '8px 12px',
        cursor: 'pointer',
        backgroundColor: isSelected ? colors.selected : 'transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...style,
      }}
    >
      {children}
    </div>
  )
})
