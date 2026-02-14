/**
 * EditorSkeleton Component
 *
 * Lightweight loading placeholder shown while the CodeMirror editor loads.
 * Mimics the appearance of the real editor for minimal visual shift.
 */

import { memo } from 'react'
import { colors } from '../theme'

interface EditorSkeletonProps {
  /** Number of skeleton lines to show (default: 12) */
  lines?: number
}

export const EditorSkeleton = memo(function EditorSkeleton({
  lines = 12,
}: EditorSkeletonProps) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: colors.panel,
        padding: '8px 0',
      }}
    >
      {/* Simulated line numbers and content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Array.from({ length: lines }, (_, i) => (
          <SkeletonLine key={i} index={i} />
        ))}
      </div>
    </div>
  )
})

const SkeletonLine = memo(function SkeletonLine({ index }: { index: number }) {
  // Vary line widths for visual interest
  const widths = [60, 85, 40, 70, 55, 90, 45, 75, 50, 80, 65, 35]
  const width = widths[index % widths.length]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        height: '20px',
      }}
    >
      {/* Line number placeholder */}
      <div
        style={{
          width: '32px',
          height: '12px',
          backgroundColor: '#2a2a2a',
          borderRadius: '2px',
          marginRight: '12px',
          opacity: 0.5,
        }}
      />
      {/* Content placeholder */}
      <div
        style={{
          width: `${width}%`,
          height: '12px',
          backgroundColor: '#2a2a2a',
          borderRadius: '2px',
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  )
})

export default EditorSkeleton
