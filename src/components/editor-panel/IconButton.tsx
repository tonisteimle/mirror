/**
 * IconButton Component
 *
 * Icon button with loading state for toolbar actions.
 */

import { memo } from 'react'
import { colors } from '../../theme'

interface IconButtonProps {
  onClick: (event: React.MouseEvent) => void
  title: string
  children: React.ReactNode
  isLoading?: boolean
  highlight?: boolean
  /** Custom color for the icon (e.g., '#3B82F6' for blue) */
  color?: string
  /** Prevent focus loss when clicking (uses onMouseDown with preventDefault) */
  preventFocusLoss?: boolean
}

export const IconButton = memo(function IconButton({
  onClick,
  title,
  children,
  isLoading,
  highlight,
  color,
  preventFocusLoss,
}: IconButtonProps) {
  const iconColor = color || (highlight ? '#FFF' : colors.textMuted)

  const handleMouseDown = preventFocusLoss
    ? (e: React.MouseEvent) => {
        e.preventDefault()
        onClick(e)
      }
    : undefined

  return (
    <button
      onClick={preventFocusLoss ? undefined : (e) => onClick(e)}
      onMouseDown={handleMouseDown}
      title={title}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px',
        backgroundColor: highlight ? colors.accentPrimary : 'transparent',
        color: iconColor,
        border: 'none',
        borderRadius: '4px',
        cursor: isLoading ? 'wait' : 'pointer',
        opacity: isLoading ? 0.7 : 1,
      }}
    >
      {isLoading ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <path d="M21 12a9 9 0 11-6.219-8.56"/>
        </svg>
      ) : children}
    </button>
  )
})
