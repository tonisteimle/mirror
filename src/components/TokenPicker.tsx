import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { colors } from '../theme'
import { usePickerBehavior } from '../hooks/usePickerBehavior'
import { BasePicker, PickerList, PickerFooter, PickerSearch } from './picker'
import type { Position } from '../types/common'
import { parseTokensWithTypes } from '../utils/token-type-inference'
import { isTokenTypeValidForProperty } from '../data/property-token-types'
import type { TypedToken } from '../types/token-types'

interface TokenPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: string) => void
  position: Position
  tokensCode: string
  propertyContext?: string  // Property that triggered this picker (for filtering)
}

// Type indicator colors and labels
const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  color: { bg: '', color: '', label: '' }, // Color uses actual value
  spacing: { bg: '#3B82F620', color: '#3B82F6', label: '#' },
  size: { bg: '#3B82F620', color: '#3B82F6', label: 'S' },
  font: { bg: '#10B98120', color: '#10B981', label: 'F' },
  weight: { bg: '#F5970020', color: '#F59700', label: 'W' },
  shadow: { bg: '#8B5CF620', color: '#8B5CF6', label: 'S' },
  radius: { bg: '#EC489920', color: '#EC4899', label: 'R' },
  opacity: { bg: '#06B6D420', color: '#06B6D4', label: 'O' },
  border: { bg: '#F9731620', color: '#F97316', label: 'B' },
  unknown: { bg: '#6B728020', color: '#6B7280', label: '?' },
}

function TokenTypeIndicator({ token }: { token: TypedToken }) {
  if (token.type === 'color') {
    return (
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: '4px',
          backgroundColor: token.value,
          border: '1px solid rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}
      />
    )
  }

  const style = TYPE_STYLES[token.type] || TYPE_STYLES.unknown
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '4px',
        backgroundColor: style.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        fontWeight: 600,
        color: style.color,
        flexShrink: 0,
      }}
    >
      {style.label}
    </div>
  )
}

export const TokenPicker = memo(function TokenPicker({ isOpen, onClose, onSelect, position, tokensCode, propertyContext }: TokenPickerProps) {
  const [search, setSearch] = useState('')

  // Parse tokens with type inference
  const allTokens = useMemo(() => parseTokensWithTypes(tokensCode), [tokensCode])

  // Filter tokens by property context and search term
  const filteredTokens = useMemo(() => {
    let tokens = allTokens

    // First filter by property context if provided
    if (propertyContext) {
      tokens = tokens.filter(t => isTokenTypeValidForProperty(propertyContext, t.type))
    }

    // Then filter by search term
    if (search) {
      const searchLower = search.toLowerCase()
      tokens = tokens.filter(
        t =>
          t.name.toLowerCase().includes(searchLower) ||
          t.value.toLowerCase().includes(searchLower)
      )
    }

    return tokens
  }, [allTokens, propertyContext, search])

  // Reset search on open
  useEffect(() => {
    if (isOpen) {
      setSearch('')
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (index: number) => {
      if (filteredTokens[index]) {
        onSelect(`$${filteredTokens[index].name}`)
        onClose()
      }
    },
    [filteredTokens, onSelect, onClose]
  )

  const {
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    resetSelection,
  } = usePickerBehavior({
    isOpen,
    onClose,
    itemCount: filteredTokens.length,
    onSelect: handleSelect,
  })

  // Reset selection when filter changes
  useEffect(() => {
    resetSelection()
  }, [search, resetSelection])

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={260}
      maxHeight={320}
      footer={
        <PickerFooter
          hints={[
            { key: '↑↓', label: 'Navigation' },
            { key: '↵', label: 'Einfügen' },
          ]}
        />
      }
    >
      {/* Search input */}
      <PickerSearch
        ref={inputRef}
        value={search}
        onChange={setSearch}
        onKeyDown={handleKeyDown}
        placeholder="Token suchen..."
      />

      {/* Token list */}
      <PickerList ref={listRef} padding="4px">
        {filteredTokens.length === 0 ? (
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              color: colors.textMuted,
              fontSize: '12px',
            }}
          >
            {allTokens.length === 0
              ? 'Keine Tokens definiert'
              : propertyContext
                ? `Keine passenden Tokens für "${propertyContext}"`
                : 'Kein Token gefunden'}
          </div>
        ) : (
          filteredTokens.map((token, index) => (
            <div
              key={token.name}
              data-index={index}
              data-selected={index === selectedIndex}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: index === selectedIndex ? colors.selected : 'transparent',
              }}
            >
              {/* Type indicator */}
              <TokenTypeIndicator token={token} />

              {/* Token name and value */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: colors.text,
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  ${token.name}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: colors.textMuted,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {token.value}
                </div>
              </div>
            </div>
          ))
        )}
      </PickerList>
    </BasePicker>
  )
})
