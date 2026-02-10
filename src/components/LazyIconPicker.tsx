/**
 * Lazy-loaded wrapper for IconPicker.
 * Reduces initial bundle size by ~1MB (Lucide icons).
 */
import { lazy, Suspense } from 'react'
import type { Position } from '../types/common'
import { colors } from '../theme'

// Lazy load the IconPicker component
const IconPicker = lazy(() =>
  import('./IconPicker').then(module => ({ default: module.IconPicker }))
)

interface LazyIconPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconName: string) => void
  position: Position
}

// Loading fallback
function IconPickerLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: colors.textMuted,
        width: 340,
        height: 200,
      }}
    >
      Icons werden geladen...
    </div>
  )
}

export function LazyIconPicker(props: LazyIconPickerProps) {
  if (!props.isOpen) return null

  return (
    <Suspense fallback={<IconPickerLoading />}>
      <IconPicker {...props} />
    </Suspense>
  )
}
