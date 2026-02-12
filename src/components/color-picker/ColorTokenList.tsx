/**
 * ColorTokenList Component
 *
 * List of color tokens for selection.
 */

import { forwardRef, memo } from 'react'
import { colors } from '../../theme'
import { PickerList, ColorSwatch, PickerItem } from '../picker'

export interface ColorToken {
  name: string
  value: string
}

interface ColorTokenListProps {
  tokens: ColorToken[]
  selectedIndex: number
  onSelect: (index: number) => void
  onHover: (index: number) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export const ColorTokenList = memo(forwardRef<HTMLDivElement, ColorTokenListProps>(
  function ColorTokenList({ tokens, selectedIndex, onSelect, onHover, onKeyDown }, ref) {
    if (tokens.length === 0) {
      return (
        <PickerList ref={ref} onKeyDown={onKeyDown}>
          <div
            style={{
              padding: '12px',
              fontSize: '12px',
              color: colors.textMuted,
              textAlign: 'center',
            }}
          >
            Keine Farb-Tokens definiert
          </div>
        </PickerList>
      )
    }

    return (
      <PickerList ref={ref} onKeyDown={onKeyDown}>
        {tokens.map((token, index) => (
          <PickerItem
            key={token.name}
            index={index}
            isSelected={index === selectedIndex}
            onClick={() => onSelect(index)}
            onMouseEnter={() => onHover(index)}
          >
            {/* Color swatch */}
            <ColorSwatch color={token.value} size={24} borderRadius={4} />
            {/* Token info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '12px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: colors.text,
                }}
              >
                {token.name}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: colors.textMuted,
                }}
              >
                {token.value}
              </div>
            </div>
          </PickerItem>
        ))}
      </PickerList>
    )
  }
))
