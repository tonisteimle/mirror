import { useCallback, useMemo, memo } from 'react'
import { colors } from '../theme'
import { usePickerWithSearch } from '../hooks/usePickerWithSearch'
import { useGroupedItems } from '../hooks/useGroupedItems'
import { BasePicker, PickerList, PickerFooter, PickerSearch, PickerItem, CategoryHeader, EmptyState } from './picker'
import { searchCommands, commandCategories, type DSLCommand } from '../editor/dsl-commands'
import type { Position } from '../types/common'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (syntax: string) => void
  position: Position
  initialQuery?: string
}

// Searchable fields for commands
const getCommandSearchableFields = (cmd: DSLCommand) => [cmd.name, cmd.syntax, cmd.description]
const getCommandCategory = (cmd: DSLCommand) => cmd.category

export const CommandPalette = memo(function CommandPalette({
  isOpen,
  onClose,
  onSelect,
  position,
  initialQuery = ''
}: CommandPaletteProps) {
  // Get all commands (searchCommands with empty query returns all)
  const allCommands = useMemo(() => searchCommands(''), [])

  // Handle command selection
  const handleCommandSelect = useCallback(
    (cmd: DSLCommand) => onSelect(cmd.syntax),
    [onSelect]
  )

  // Combined search, filter, and navigation
  const {
    query,
    setQuery,
    filteredItems: filteredCommands,
    selectedIndex,
    setSelectedIndex,
    listRef,
    inputRef,
    handleKeyDown,
    handleSelect,
  } = usePickerWithSearch({
    isOpen,
    onClose,
    items: allCommands,
    getSearchableFields: getCommandSearchableFields,
    onSelectItem: handleCommandSelect,
    initialQuery,
  })

  // Group by category with stable flat indices
  const { groupedItems: groupedCommands } = useGroupedItems({
    items: filteredCommands,
    getCategory: getCommandCategory,
    categories: commandCategories,
  })

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={280}
      maxHeight={320}
      footer={
        <PickerFooter
          hints={[
            { key: '↑↓', label: 'Navigation' },
            { key: '↵', label: 'Einfügen' },
            { key: 'Esc', label: 'Schliessen' },
          ]}
        />
      }
    >
      {/* Search Input */}
      <PickerSearch
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onKeyDown={handleKeyDown}
        placeholder="Suchen... (z.B. rahmen, padding)"
      />

      {/* Command List */}
      <PickerList ref={listRef}>
        {filteredCommands.length === 0 ? (
          <EmptyState>Keine Befehle gefunden</EmptyState>
        ) : (
          groupedCommands.map(({ category, items: commands }) => (
            <div key={category}>
              <CategoryHeader>{category}</CategoryHeader>
              {commands.map(cmd => (
                <PickerItem
                  key={cmd.name + cmd.syntax}
                  index={cmd.flatIndex}
                  isSelected={cmd.flatIndex === selectedIndex}
                  onClick={() => handleSelect(cmd.flatIndex)}
                  onMouseEnter={() => setSelectedIndex(cmd.flatIndex)}
                  style={{ padding: '6px 12px' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        color: colors.text,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {cmd.syntax.split('\n')[0]}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: colors.textMuted,
                        marginTop: '2px',
                      }}
                    >
                      {cmd.description}
                    </div>
                  </div>
                </PickerItem>
              ))}
            </div>
          ))
        )}
      </PickerList>
    </BasePicker>
  )
})
