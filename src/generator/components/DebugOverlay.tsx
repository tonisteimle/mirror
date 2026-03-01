/**
 * DebugOverlay Component
 *
 * Displays actual computed CSS values and dimensions for debugging.
 * Uses getBoundingClientRect() for pixel dimensions and getComputedStyle() for CSS values.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react'

interface ComputedValues {
  // Dimensions
  width: number
  height: number
  // Colors
  backgroundColor: string
  color: string
  borderColor: string
  // Spacing
  paddingTop: string
  paddingRight: string
  paddingBottom: string
  paddingLeft: string
  // Border
  borderWidth: string
  borderRadius: string
  // Layout
  display: string
  flexDirection: string
  gap: string
}

interface DebugOverlayProps {
  children: React.ReactNode
  nodeId: string
  nodeName: string
}

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  color: '#fff',
  fontSize: '10px',
  fontFamily: 'monospace',
  padding: '4px 6px',
  zIndex: 9999,
  pointerEvents: 'none',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.3,
  borderRadius: '0 0 4px 4px',
}

const wrapperStyle: React.CSSProperties = {
  position: 'relative',
}

function formatColor(color: string): string {
  // Shorten rgba to hex if fully opaque
  if (color.startsWith('rgba(')) {
    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/)
    if (match) {
      const [, r, g, b, a] = match
      if (a === '1') {
        const hex = '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
        return hex.toUpperCase()
      }
    }
  }
  if (color.startsWith('rgb(')) {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      const [, r, g, b] = match
      const hex = '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')
      return hex.toUpperCase()
    }
  }
  return color
}

function formatPadding(top: string, right: string, bottom: string, left: string): string {
  const t = parseInt(top) || 0
  const r = parseInt(right) || 0
  const b = parseInt(bottom) || 0
  const l = parseInt(left) || 0

  if (t === r && r === b && b === l) {
    return `${t}`
  }
  if (t === b && l === r) {
    return `${t} ${r}`
  }
  return `${t} ${r} ${b} ${l}`
}

export const DebugOverlay = React.memo(function DebugOverlay({
  children,
  nodeId,
  nodeName,
}: DebugOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [computed, setComputed] = useState<ComputedValues | null>(null)

  const measureElement = useCallback(() => {
    if (!containerRef.current) return

    // Find the actual element (first child of the wrapper)
    const element = containerRef.current.firstElementChild as HTMLElement
    if (!element) return

    const rect = element.getBoundingClientRect()
    const styles = window.getComputedStyle(element)

    setComputed({
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      borderColor: styles.borderColor,
      paddingTop: styles.paddingTop,
      paddingRight: styles.paddingRight,
      paddingBottom: styles.paddingBottom,
      paddingLeft: styles.paddingLeft,
      borderWidth: styles.borderWidth,
      borderRadius: styles.borderRadius,
      display: styles.display,
      flexDirection: styles.flexDirection,
      gap: styles.gap,
    })
  }, [])

  useEffect(() => {
    // Initial measurement
    measureElement()

    // Re-measure on resize
    const observer = new ResizeObserver(measureElement)
    if (containerRef.current?.firstElementChild) {
      observer.observe(containerRef.current.firstElementChild)
    }

    return () => observer.disconnect()
  }, [measureElement])

  const buildDebugText = (): string => {
    if (!computed) return 'Measuring...'

    const lines: string[] = []

    // Dimensions
    lines.push(`${computed.width}×${computed.height}`)

    // Background
    if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      lines.push(`bg: ${formatColor(computed.backgroundColor)}`)
    }

    // Text color
    if (computed.color) {
      lines.push(`col: ${formatColor(computed.color)}`)
    }

    // Padding
    const pad = formatPadding(
      computed.paddingTop,
      computed.paddingRight,
      computed.paddingBottom,
      computed.paddingLeft
    )
    if (pad !== '0') {
      lines.push(`pad: ${pad}`)
    }

    // Border
    const borderW = parseInt(computed.borderWidth) || 0
    if (borderW > 0) {
      lines.push(`bor: ${borderW} ${formatColor(computed.borderColor)}`)
    }

    // Border radius
    const rad = parseInt(computed.borderRadius) || 0
    if (rad > 0) {
      lines.push(`rad: ${rad}`)
    }

    // Gap
    const gap = parseInt(computed.gap) || 0
    if (gap > 0) {
      lines.push(`gap: ${gap}`)
    }

    return lines.join(' | ')
  }

  return (
    <div ref={containerRef} style={wrapperStyle} data-debug-wrapper={nodeId}>
      {children}
      <div style={overlayStyle}>
        <strong>{nodeName}</strong>: {buildDebugText()}
      </div>
    </div>
  )
})
