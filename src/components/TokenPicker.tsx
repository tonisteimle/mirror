import { useMemo, useCallback, memo } from 'react'
import { colors } from '../theme'
import { usePickerWithSearch } from '../hooks/usePickerWithSearch'
import { BasePicker, PickerList, PickerFooter, PickerSearch, PickerItem, EmptyState } from './picker'
import type { Position } from '../types/common'
import { parseTokens } from '../utils/token-parser'
import { isTokenTypeValidForProperty } from '../data/property-token-types'
import type { ParsedToken } from '../utils/token-parser'

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

function TokenTypeIndicator({ token }: { token: ParsedToken }) {
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

// Stable callback for searchable fields
const getTokenSearchableFields = (token: ParsedToken) => [token.name, token.value]

export const TokenPicker = memo(function TokenPicker({ isOpen, onClose, onSelect, position, tokensCode, propertyContext }: TokenPickerProps) {
  // Parse tokens with type inference
  const allTokens = useMemo(() => parseTokens(tokensCode), [tokensCode])

  // First filter by property context if provided
  const contextFilteredTokens = useMemo(() => {
    if (!propertyContext) return allTokens
    return allTokens.filter(t => isTokenTypeValidForProperty(propertyContext, t.type))
  }, [allTokens, propertyContext])

  // Handle token selection - format as $tokenName
  const handleTokenSelect = useCallback(
    (token: ParsedToken) => onSelect(`$${token.name}`),
    [onSelect]
  )

  // Combined search, filter, and navigation
  const {
    query: search,
    setQuery: setSearch,
    filteredItems: filteredTokens,
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    handleSelect,
  } = usePickerWithSearch({
    isOpen,
    onClose,
    items: contextFilteredTokens,
    getSearchableFields: getTokenSearchableFields,
    onSelectItem: handleTokenSelect,
  })

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
          <EmptyState>
            {allTokens.length === 0
              ? 'Keine Tokens definiert'
              : propertyContext
                ? `Keine passenden Tokens für "${propertyContext}"`
                : 'Kein Token gefunden'}
          </EmptyState>
        ) : (
          filteredTokens.map((token, index) => (
            <PickerItem
              key={token.name}
              index={index}
              isSelected={index === selectedIndex}
              onClick={() => handleSelect(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{ gap: '10px', padding: '8px 10px', borderRadius: '4px' }}
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
            </PickerItem>
          ))
        )}
      </PickerList>
    </BasePicker>
  )
})
