import type { LibraryComponent } from '../types'

export const dropdownComponent: LibraryComponent = {
  name: 'Dropdown',
  category: 'form',
  description: 'Dropdown/Select mit anpassbarem Trigger, Menu und Items',
  slots: [
    { name: 'Trigger', required: false, multiple: false, defaultProps: {} },
    { name: 'Menu', required: false, multiple: false, defaultProps: {} },
    { name: 'Item', required: false, multiple: true, defaultProps: {}, aliases: ['Option'] },
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle', 'select'],
  definitions: `// Dropdown
Dropdown: width 200
  Trigger: padding 12, background #333, radius 8
    Icon "chevron-down"
  Menu: background #1E1E2E, radius 8, shadow md
  Item: padding 10 14
    state hover
      background #3B82F6
    state selected
      background #2563EB`,
  layoutExample: `FruitPicker as Dropdown: "Choose fruit..."
  - Item value "apple" "Apple"
  - Item value "banana" "Banana"
  - Item value "cherry" "Cherry"`,
}
