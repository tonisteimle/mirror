/**
 * CategoryHeader Component
 *
 * Section header for grouped picker items.
 */

import { memo } from 'react'
import { colors } from '../../theme'

interface CategoryHeaderProps {
  children: React.ReactNode
}

export const CategoryHeader = memo(function CategoryHeader({ children }: CategoryHeaderProps) {
  return (
    <div
      style={{
        padding: '6px 12px 4px',
        fontSize: '10px',
        fontWeight: 600,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
      }}
    >
      {children}
    </div>
  )
})
