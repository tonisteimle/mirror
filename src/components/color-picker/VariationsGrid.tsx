/**
 * VariationsGrid Component
 *
 * Grid of color variations based on selected hue.
 */

import { memo } from 'react'

interface VariationsGridProps {
  variations: string[][]
  selectedRow: number
  selectedCol: number
  onColorSelect: (color: string) => void
}

export const VariationsGrid = memo(function VariationsGrid({
  variations,
  selectedRow,
  selectedCol,
  onColorSelect,
}: VariationsGridProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
      {variations.map((row, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: '1px' }}>
          {row.map((color, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              onClick={() => onColorSelect(color)}
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '2px',
                backgroundColor: '#' + color,
                cursor: 'pointer',
                border:
                  selectedRow === rowIndex && selectedCol === colIndex
                    ? '1px solid #FFF'
                    : 'none',
                boxSizing: 'border-box',
              }}
              title={'#' + color}
            />
          ))}
        </div>
      ))}
    </div>
  )
})
