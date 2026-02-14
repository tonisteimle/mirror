/**
 * HoverableDiv Component
 *
 * A div that applies hover styles when the mouse is over it.
 * Memoized for performance.
 */

import React, { useState, useCallback, useMemo } from 'react'

export interface HoverableDivProps {
  baseStyle: React.CSSProperties
  hoverStyle: React.CSSProperties
  className: string
  dataId: string
  dataSourceLine?: number
  children: React.ReactNode
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: (e: React.MouseEvent) => void
}

export const HoverableDiv = React.memo(function HoverableDiv({
  baseStyle,
  hoverStyle,
  className,
  dataId,
  dataSourceLine,
  children,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: HoverableDivProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    onMouseEnter?.()
  }, [onMouseEnter])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    onMouseLeave?.()
  }, [onMouseLeave])

  const style = useMemo(
    () => isHovered ? { ...baseStyle, ...hoverStyle } : baseStyle,
    [isHovered, baseStyle, hoverStyle]
  )

  return (
    <div
      data-id={dataId}
      data-source-line={dataSourceLine}
      className={className}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {children}
    </div>
  )
})
