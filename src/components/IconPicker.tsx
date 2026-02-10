import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import * as LucideIcons from 'lucide-react'
import { colors } from '../theme'
import { usePickerBehavior } from '../hooks/usePickerBehavior'
import { BasePicker, PickerList, PickerFooter, PickerSearch } from './picker'
import type { Position } from '../types/common'

interface IconPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (iconName: string) => void
  position: Position
}

// Get all icon names from Lucide
const allIconNames = Object.keys(LucideIcons).filter(
  key =>
    key !== 'default' &&
    key !== 'createLucideIcon' &&
    key !== 'icons' &&
    typeof (LucideIcons as Record<string, unknown>)[key] === 'function'
)

// Convert PascalCase to kebab-case for DSL
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

// Common/popular icons shown first
const popularIcons = [
  'Search', 'Home', 'User', 'Settings', 'Menu', 'X', 'Check', 'Plus', 'Minus',
  'ChevronDown', 'ChevronUp', 'ChevronLeft', 'ChevronRight', 'ArrowLeft', 'ArrowRight',
  'Heart', 'Star', 'Bell', 'Mail', 'Send', 'MessageCircle', 'Phone',
  'Calendar', 'Clock', 'MapPin', 'Image', 'Camera', 'Video', 'Music',
  'File', 'Folder', 'Download', 'Upload', 'Link', 'ExternalLink', 'Copy',
  'Edit', 'Trash', 'Save', 'RefreshCw', 'RotateCcw', 'Filter', 'SortAsc',
  'Eye', 'EyeOff', 'Lock', 'Unlock', 'Key', 'Shield', 'AlertCircle', 'Info',
  'Sun', 'Moon', 'Cloud', 'Zap', 'Wifi', 'Battery', 'Bluetooth',
  'Play', 'Pause', 'SkipBack', 'SkipForward', 'Volume2', 'VolumeX',
  'ShoppingCart', 'CreditCard', 'DollarSign', 'Gift', 'Package', 'Truck',
  'Github', 'Twitter', 'Linkedin', 'Instagram', 'Facebook', 'Youtube',
  'Code', 'Terminal', 'Database', 'Server', 'Globe', 'Layers', 'Grid',
  'BarChart', 'PieChart', 'TrendingUp', 'Activity', 'Target', 'Award',
  'Users', 'UserPlus', 'UserMinus', 'LogIn', 'LogOut', 'Share2',
  'Bookmark', 'Tag', 'Hash', 'AtSign', 'Paperclip', 'Scissors',
  'Move', 'Maximize', 'Minimize', 'MoreHorizontal', 'MoreVertical', 'Grip',
]

// Icon categories for organization
const iconCategories: Record<string, string[]> = {
  Beliebt: popularIcons,
  Navigation: ['Home', 'Menu', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'ChevronLeft', 'ChevronRight', 'ChevronUp', 'ChevronDown', 'ChevronsLeft', 'ChevronsRight', 'CornerDownLeft', 'CornerDownRight', 'ExternalLink', 'Link', 'Navigation', 'Compass', 'Map', 'MapPin'],
  Aktionen: ['Plus', 'Minus', 'X', 'Check', 'Edit', 'Trash', 'Save', 'Copy', 'Clipboard', 'Download', 'Upload', 'Share', 'Send', 'RefreshCw', 'RotateCcw', 'Undo', 'Redo', 'Move', 'Maximize', 'Minimize'],
  Kommunikation: ['Mail', 'MessageCircle', 'MessageSquare', 'Phone', 'PhoneCall', 'Video', 'Send', 'Inbox', 'AtSign', 'Bell', 'BellOff', 'Megaphone', 'Radio'],
  Medien: ['Image', 'Camera', 'Video', 'Music', 'Headphones', 'Mic', 'Volume', 'Volume1', 'Volume2', 'VolumeX', 'Play', 'Pause', 'Square', 'SkipBack', 'SkipForward', 'Rewind', 'FastForward'],
  Dateien: ['File', 'FileText', 'FilePlus', 'FileMinus', 'Folder', 'FolderOpen', 'FolderPlus', 'Archive', 'Paperclip', 'Scissors', 'FileImage', 'FileVideo', 'FileAudio', 'FileCode'],
  User: ['User', 'Users', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Contact', 'LogIn', 'LogOut', 'Key', 'Lock', 'Unlock', 'Shield', 'ShieldCheck'],
  UI: ['Search', 'Filter', 'SortAsc', 'SortDesc', 'Settings', 'Sliders', 'MoreHorizontal', 'MoreVertical', 'Grip', 'Grid', 'List', 'LayoutGrid', 'Sidebar', 'PanelLeft', 'Loader', 'RefreshCw'],
  Status: ['Check', 'CheckCircle', 'X', 'XCircle', 'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle', 'Ban', 'ThumbsUp', 'ThumbsDown', 'Flag', 'Bookmark'],
  Wetter: ['Sun', 'Moon', 'Cloud', 'CloudRain', 'CloudSnow', 'CloudLightning', 'Wind', 'Droplet', 'Thermometer', 'Umbrella'],
  Geräte: ['Monitor', 'Laptop', 'Tablet', 'Smartphone', 'Tv', 'Watch', 'Printer', 'Keyboard', 'Mouse', 'Cpu', 'HardDrive', 'Wifi', 'Bluetooth', 'Battery'],
  Entwicklung: ['Code', 'Terminal', 'Database', 'Server', 'Globe', 'Layers', 'GitBranch', 'GitCommit', 'GitMerge', 'GitPullRequest', 'Bug', 'Braces', 'FileCode'],
  Charts: ['BarChart', 'BarChart2', 'PieChart', 'LineChart', 'TrendingUp', 'TrendingDown', 'Activity', 'Target', 'Percent'],
  Commerce: ['ShoppingCart', 'ShoppingBag', 'CreditCard', 'DollarSign', 'Euro', 'Gift', 'Package', 'Truck', 'Tag', 'Receipt', 'Wallet'],
  Social: ['Heart', 'Star', 'ThumbsUp', 'Share2', 'MessageCircle', 'AtSign', 'Hash', 'Smile', 'Frown', 'Meh'],
}

const categoryNames = Object.keys(iconCategories)
const COLUMNS = 6 // Icons per row

export const IconPicker = memo(function IconPicker({
  isOpen,
  onClose,
  onSelect,
  position,
}: IconPickerProps) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Beliebt')

  // Filter icons based on query
  const filteredIcons = useMemo(() => {
    if (query) {
      const lowerQuery = query.toLowerCase()
      return allIconNames
        .filter(
          name =>
            name.toLowerCase().includes(lowerQuery) ||
            toKebabCase(name).includes(lowerQuery)
        )
        .slice(0, 100) // Limit results for performance
    }
    // Show category icons when not searching
    return iconCategories[activeCategory] || popularIcons
  }, [query, activeCategory])

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setActiveCategory('Beliebt')
    }
  }, [isOpen])

  const handleSelect = useCallback(
    (index: number) => {
      if (filteredIcons[index]) {
        onSelect(`"${toKebabCase(filteredIcons[index])}"`)
        onClose()
      }
    },
    [filteredIcons, onSelect, onClose]
  )

  // Custom Tab handler to cycle categories
  const handleTabKey = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault()
      const currentCatIndex = categoryNames.indexOf(activeCategory)
      const nextCatIndex = e.shiftKey
        ? (currentCatIndex - 1 + categoryNames.length) % categoryNames.length
        : (currentCatIndex + 1) % categoryNames.length
      setActiveCategory(categoryNames[nextCatIndex])
    },
    [activeCategory]
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
    itemCount: filteredIcons.length,
    columns: COLUMNS,
    onSelect: handleSelect,
    customKeyHandlers: { Tab: handleTabKey },
  })

  // Reset selection when query or category changes
  useEffect(() => {
    resetSelection()
  }, [query, activeCategory, resetSelection])

  return (
    <BasePicker
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      width={340}
      maxHeight={400}
      footer={
        <PickerFooter
          hints={[
            { key: '↑↓←→', label: 'Navigation' },
            { key: '↵', label: 'Einfügen' },
            { key: 'Tab', label: 'Kategorie' },
          ]}
        />
      }
    >
      {/* Category Tabs */}
      <div
        style={{
          padding: '8px',
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}
      >
        {categoryNames.slice(0, 6).map(cat => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat)
              setQuery('')
            }}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              fontWeight: 500,
              fontFamily: 'system-ui, sans-serif',
              backgroundColor: activeCategory === cat ? colors.accentPrimary : colors.inputBg,
              color: activeCategory === cat ? colors.text : colors.textMuted,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {cat}
          </button>
        ))}
        <select
          value={categoryNames.indexOf(activeCategory) >= 6 ? activeCategory : ''}
          onChange={e => {
            if (e.target.value) {
              setActiveCategory(e.target.value)
              setQuery('')
            }
          }}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor:
              categoryNames.indexOf(activeCategory) >= 6 ? colors.accentPrimary : colors.inputBg,
            color:
              categoryNames.indexOf(activeCategory) >= 6 ? colors.text : colors.textMuted,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          <option value="">Mehr...</option>
          {categoryNames.slice(6).map(cat => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Search Input */}
      <PickerSearch
        ref={inputRef}
        value={query}
        onChange={setQuery}
        onKeyDown={handleKeyDown}
        placeholder="Icon suchen..."
      />

      {/* Icon Grid */}
      <PickerList ref={listRef} padding="8px">
        {filteredIcons.length === 0 ? (
          <div
            style={{
              padding: '12px',
              fontSize: '12px',
              color: colors.textMuted,
              textAlign: 'center',
            }}
          >
            Keine Icons gefunden
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${COLUMNS}, 1fr)`,
              gap: '4px',
            }}
          >
            {filteredIcons.map((iconName, index) => {
              const IconComponent = (
                LucideIcons as unknown as Record<
                  string,
                  React.ComponentType<{ size?: number; color?: string }>
                >
              )[iconName]
              const isSelected = index === selectedIndex

              if (!IconComponent) return null

              return (
                <div
                  key={iconName}
                  data-index={index}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  title={toKebabCase(iconName)}
                  style={{
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? colors.accentPrimary : 'transparent',
                    borderRadius: '6px',
                    transition: 'background-color 0.1s',
                  }}
                >
                  <IconComponent size={20} color={colors.text} />
                </div>
              )
            })}
          </div>
        )}
      </PickerList>

      {/* Selected Icon Preview */}
      {filteredIcons[selectedIndex] && (
        <div
          style={{
            padding: '8px 12px',
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {(() => {
            const IconComponent = (
              LucideIcons as unknown as Record<
                string,
                React.ComponentType<{ size?: number; color?: string }>
              >
            )[filteredIcons[selectedIndex]]
            return IconComponent ? <IconComponent size={16} color={colors.text} /> : null
          })()}
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: colors.text,
            }}
          >
            icon "{toKebabCase(filteredIcons[selectedIndex])}"
          </span>
        </div>
      )}
    </BasePicker>
  )
})
