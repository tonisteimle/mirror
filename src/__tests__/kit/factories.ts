/**
 * Props Factories
 *
 * Create component props with auto-mocked callbacks.
 */
import { vi } from 'vitest'

/**
 * Create props object with all function properties replaced by vi.fn()
 */
export function createProps<T extends Record<string, unknown>>(defaults: T): T {
  const result = { ...defaults }

  for (const key of Object.keys(result)) {
    const value = result[key]
    if (typeof value === 'function') {
      (result as Record<string, unknown>)[key] = vi.fn()
    }
  }

  return result
}

// =============================================================================
// Component-specific factories
// =============================================================================

export function editorPanelProps() {
  return createProps({
    width: 420,
    activeTab: 'layout' as const,
    onTabChange: () => {},
    layoutCode: 'Box',
    componentsCode: 'Button: col #3B82F6',
    tokensCode: '$primary: #3B82F6',
    onLayoutChange: () => {},
    onComponentsChange: () => {},
    onTokensChange: () => {},
    highlightLine: undefined as number | undefined,
    autoCompleteMode: 'always' as const,
  })
}

export function editorActionsContext() {
  return createProps({
    onClear: () => {},
  })
}

export function colorPickerProps() {
  return createProps({
    isOpen: true,
    onClose: () => {},
    onSelect: () => {},
    position: { x: 100, y: 100 },
    tokens: '',
    defaultToTokens: false,
  })
}

export function errorDialogProps() {
  return createProps({
    isOpen: true,
    title: 'Fehler',
    message: 'Test error message',
    details: undefined as string | undefined,
    onClose: () => {},
  })
}

export function pageSidebarProps() {
  return createProps({
    pages: [
      { id: 'page1', name: 'Home', layoutCode: 'Box' },
      { id: 'page2', name: 'About', layoutCode: 'Box' },
      { id: 'page3', name: 'Contact', layoutCode: 'Box' },
    ],
    currentPageId: 'page1',
    onSelectPage: () => {},
    onDeletePage: () => null as string[] | null,
    onRenamePage: () => {},
    referencedPages: new Set<string>(),
  })
}

export function headerBarProps() {
  return createProps({
    onNewPrototype: () => {},
    onOpen: () => {},
    onSave: () => {},
    onExport: () => {},
    onOpenSettings: () => {},
  })
}

export function promptPanelProps() {
  return createProps({
    value: '',
    onChange: () => {},
    selectionPrefix: undefined as string | undefined,
    highlightLine: undefined as number | undefined,
    tokensCode: '',
  })
}

export function tokenPickerProps() {
  return createProps({
    isOpen: true,
    onClose: () => {},
    onSelect: () => {},
    position: { x: 100, y: 100 },
    tokensCode: '$primary: #3B82F6\n$secondary: #10B981\n$spacing-sm: 8',
    propertyContext: undefined as string | undefined,
  })
}

export function basePickerProps() {
  return createProps({
    isOpen: true,
    onClose: () => {},
    position: { x: 100, y: 100 },
    width: 300,
    maxHeight: 400,
    title: undefined as string | undefined,
    footer: undefined as React.ReactNode,
    useBackdrop: true,
    zIndex: 1000,
  })
}
