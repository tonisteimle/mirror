/**
 * Overlay Portal Module
 *
 * Renders active overlays from the overlay registry as React portals.
 * Supports animations for opening and closing.
 * Supports positioning: center (modal), below/above/left/right (dropdown-style).
 */

import { createPortal } from 'react-dom'
import { useOverlayRegistry, type OverlayPosition } from './overlay-registry'
import type { ASTNode } from '../parser/types'

/**
 * Calculate position styles based on position type and trigger rect.
 */
function getPositionStyles(
  position: OverlayPosition | undefined,
  triggerRect: DOMRect | undefined
): React.CSSProperties {
  // Center position (modal) - centered in viewport
  if (!position || position === 'center' || !triggerRect) {
    return {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }

  // Dropdown-style positioning relative to trigger
  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
  }

  switch (position) {
    case 'below':
      return {
        ...baseStyle,
        top: triggerRect.bottom + 4, // 4px gap
        left: triggerRect.left,
        minWidth: triggerRect.width,
      }
    case 'above':
      return {
        ...baseStyle,
        bottom: window.innerHeight - triggerRect.top + 4,
        left: triggerRect.left,
        minWidth: triggerRect.width,
      }
    case 'left':
      return {
        ...baseStyle,
        top: triggerRect.top,
        right: window.innerWidth - triggerRect.left + 4,
      }
    case 'right':
      return {
        ...baseStyle,
        top: triggerRect.top,
        left: triggerRect.right + 4,
      }
    default:
      return baseStyle
  }
}

interface OverlayPortalProps {
  renderNode: (node: ASTNode) => React.ReactNode
}

export function OverlayPortal({ renderNode }: OverlayPortalProps) {
  const registry = useOverlayRegistry()
  if (!registry) return null

  const { overlays, close } = registry

  if (overlays.size === 0) return null

  return createPortal(
    <>
      {Array.from(overlays.entries()).map(([name, state]) => {
        const animation = state.animation || 'fade'
        const duration = state.duration || 200
        const isClosing = state.isClosing
        const position = state.position || 'center'
        const isModal = position === 'center'

        // Determine animations
        const backdropAnimation = isClosing
          ? `overlay-fade-out ${duration}ms ease-out forwards`
          : `overlay-fade ${duration}ms ease-out`
        const contentAnimation = isClosing
          ? `content-${animation}-out ${duration}ms ease-out forwards`
          : `content-${animation} ${duration}ms ease-out`

        // Modal overlay (centered with backdrop)
        if (isModal) {
          return (
            <div
              key={name}
              data-overlay={name}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                animation: backdropAnimation,
              }}
              onClick={(e) => {
                // Close on backdrop click
                if (e.target === e.currentTarget && !isClosing) {
                  close(name)
                }
              }}
            >
              <div
                data-overlay-content={name}
                style={{
                  animation: contentAnimation,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {renderNode(state.node)}
              </div>
            </div>
          )
        }

        // Dropdown-style overlay (positioned relative to trigger)
        const positionStyles = getPositionStyles(position, state.triggerRect)

        return (
          <div key={name} data-overlay-wrapper={name}>
            {/* Invisible backdrop to catch clicks outside */}
            <div
              data-overlay-backdrop={name}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 999,
              }}
              onClick={() => {
                if (!isClosing) {
                  close(name, animation, duration)
                }
              }}
            />
            {/* The dropdown content */}
            <div
              data-overlay={name}
              style={{
                ...positionStyles,
                zIndex: 1000,
                animation: contentAnimation,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {renderNode(state.node)}
            </div>
          </div>
        )
      })}
    </>,
    document.body
  )
}
