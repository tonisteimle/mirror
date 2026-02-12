/**
 * HueSelector Component
 *
 * Row of hue buttons for selecting a base color hue.
 */

import { memo } from 'react'
import { hslToHex, HUES } from '../../utils/color'

interface HueSelectorProps {
  selectedHue: number | null
  onHueSelect: (hue: number | null) => void
}

export const HueSelector = memo(function HueSelector({
  selectedHue,
  onHueSelect,
}: HueSelectorProps) {
  return (
    <div style={{ display: 'flex', gap: '1px', marginBottom: '4px' }}>
      {/* Grayscale button */}
      <div
        onClick={() => onHueSelect(null)}
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '2px',
          background: 'linear-gradient(135deg, #FFF 0%, #000 100%)',
          cursor: 'pointer',
          border: selectedHue === null ? '1px solid #FFF' : 'none',
          boxSizing: 'border-box',
        }}
        title="Graustufen"
      />

      {/* Hue buttons */}
      {HUES.map(hue => (
        <div
          key={hue}
          onClick={() => onHueSelect(hue)}
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '2px',
            backgroundColor: '#' + hslToHex(hue, 100, 50),
            cursor: 'pointer',
            border: selectedHue === hue ? '1px solid #FFF' : 'none',
            boxSizing: 'border-box',
          }}
          title={`Hue ${hue}`}
        />
      ))}
    </div>
  )
})
