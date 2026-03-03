import { useMemo, useCallback, useEffect, memo } from 'react'
import { colors } from '../theme'
import { usePickerWithSearch } from '../hooks/usePickerWithSearch'
import { BasePicker, PickerList, PickerFooter, PickerItem, EmptyState } from './picker'
import type { Position } from '../types/common'
import { parseBoundTokens, getTokensForProperty, type BoundToken } from '../utils/token-parser'

interface TokenPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (token: string) => void
  position: Position
  tokensCode: string
  propertyContext?: string  // Property that triggered this picker (for filtering)
  /** External filter query (typed in editor after $) - focus stays in editor */
  initialQuery?: string
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

function TokenTypeIndicator({ token }: { token: BoundToken }) {
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
const getTokenSearchableFields = (token: BoundToken) => [token.name, token.baseName, token.value]

export const TokenPicker = memo(function TokenPicker({ isOpen, onClose, onSelect, position, tokensCode, propertyContext, initialQuery = '' }: TokenPickerProps) {
  // Parse all tokens with bound property info
  const allTokens = useMemo(() => parseBoundTokens(tokensCode), [tokensCode])

  // Filter by property context: show tokens with matching .property suffix
  // e.g., "col $" shows tokens like $primary.col, $neutral.col
  const contextFilteredTokens = useMemo(() => {
    if (!propertyContext) return allTokens
    return getTokensForProperty(propertyContext, undefined, allTokens)
  }, [allTokens, propertyContext])

  // Handle token selection
  // When property context is known, insert just the base name (e.g., $control instead of $control.col)
  // The parser resolves $control in "col $control" context to $control.col automatically
  const handleTokenSelect = useCallback(
    (token: BoundToken) => {
      // If we have a property context and the token has a matching bound property,
      // insert just the base name - the context makes the suffix redundant
      if (propertyContext && token.boundProperty === propertyContext.toLowerCase()) {
        onSelect(`$${token.baseName}`)
      } else {
        onSelect(`$${token.name}`)
      }
    },
    [onSelect, propertyContext]
  )

  // Combined search, filter, and navigation
  // Focus stays in editor - we receive filter via initialQuery prop
  const {
    filteredItems: filteredTokens,
    selectedIndex,
    setSelectedIndex,
    listRef,
    handleSelect,
  } = usePickerWithSearch({
    isOpen,
    onClose,
    items: contextFilteredTokens,
    getSearchableFields: getTokenSearchableFields,
    onSelectItem: handleTokenSelect,
    initialQuery,
    autoFocus: false, // Focus stays in editor
  })

  // Global keyboard handler - focus stays in editor
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(i => Math.min(i + 1, filteredTokens.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(i => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          handleSelect(selectedIndex)
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredTokens.length, selectedIndex, setSelectedIndex, handleSelect, onClose])

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
      {/* Token list - no search input, focus stays in editor */}
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
