/**
 * TabButton Component
 *
 * Simple tab button for the editor panel tabs.
 */

import { memo } from 'react'
import { colors } from '../../theme'

interface TabButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
}

export const TabButton = memo(function TabButton({
  label,
  isActive,
  onClick,
}: TabButtonProps) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-label={`${label} tab`}
      onClick={onClick}
      style={{
        padding: '6px 0',
        fontSize: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontWeight: isActive ? 600 : 500,
        border: 'none',
        borderBottom: 'none',
        outline: 'none',
        textDecoration: 'none',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: isActive ? colors.text : colors.textMuted,
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </button>
  )
})
