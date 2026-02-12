/**
 * EmptyState Component
 *
 * Message shown when no items match the search or no items exist.
 */

import { memo } from 'react'
import { colors } from '../../theme'

interface EmptyStateProps {
  children: React.ReactNode
}

export const EmptyState = memo(function EmptyState({ children }: EmptyStateProps) {
  return (
    <div
      style={{
        padding: '16px 12px',
        fontSize: '12px',
        color: colors.textMuted,
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  )
})
