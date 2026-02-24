/**
 * ColorSystemPalette - Universal color palette with multiple systems
 *
 * Supports tabs to switch between:
 * - Tailwind CSS
 * - Radix Colors
 * - Material Design
 * - Open Color
 *
 * Layout: Horizontal (colors as columns, shades as rows)
 */
import { useState, memo } from 'react'
import { COLOR_SYSTEMS } from '../data/color-systems'

interface ColorSystemPaletteProps {
  /** Currently selected color (hex) */
  color: string
  /** Called when user selects a color */
  onChange: (color: string) => void
  /** Initial system to show */
  initialSystem?: string
}

const SWATCH_SIZE = 16
const GAP = 1

export const ColorSystemPalette = memo(function ColorSystemPalette({
  color,
  onChange,
  initialSystem = 'tailwind',
}: ColorSystemPaletteProps) {
  const [activeSystem, setActiveSystem] = useState(initialSystem)

  const currentSystem = COLOR_SYSTEMS.find(s => s.id === activeSystem) || COLOR_SYSTEMS[0]
  const selectedColor = color.toUpperCase()

  // Get max number of shades across all scales
  const maxShades = Math.max(...currentSystem.scales.map(s => s.shades.length))

  return (
    <div>
      {/* System Tabs */}
      <div style={{
        display: 'flex',
        gap: '2px',
        marginBottom: '8px',
      }}>
        {COLOR_SYSTEMS.map(system => (
          <button
            key={system.id}
            onMouseDown={(e) => {
              e.preventDefault()
              setActiveSystem(system.id)
            }}
            style={{
              padding: '3px 8px',
              fontSize: '10px',
              fontWeight: 500,
              backgroundColor: activeSystem === system.id ? '#333' : 'transparent',
              color: activeSystem === system.id ? '#fff' : '#666',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {system.name}
          </button>
        ))}
      </div>

      {/* Color Grid - Rotated: scales are columns, shades are rows */}
      <div style={{
        display: 'flex',
        gap: `${GAP}px`,
      }}>
        {currentSystem.scales.map(scale => (
          <div
            key={scale.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: `${GAP}px`,
            }}
          >
            {scale.shades.map((hex, index) => {
              const isSelected = hex.toUpperCase() === selectedColor
              return (
                <button
                  key={index}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onChange(hex.toUpperCase())
                  }}
                  title={`${scale.name}-${index + 1}: ${hex}`}
                  style={{
                    width: `${SWATCH_SIZE}px`,
                    height: `${SWATCH_SIZE}px`,
                    backgroundColor: hex,
                    border: isSelected ? '2px solid #fff' : 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: isSelected ? '0 0 0 1px #000' : 'none',
                    transform: isSelected ? 'scale(1.2)' : 'none',
                    zIndex: isSelected ? 1 : 0,
                    position: 'relative',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Selected Color Display */}
      <div style={{
        marginTop: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <div
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: color,
            borderRadius: '3px',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        />
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '11px',
          color: '#999',
        }}>
          {color.toUpperCase()}
        </span>
      </div>
    </div>
  )
})
