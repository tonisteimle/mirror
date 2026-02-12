import type { LibraryComponent } from '../types'

export const ToggleGroupComponent: LibraryComponent = {
  name: 'ToggleGroup',
  category: 'form',
  description: 'A group of toggle buttons where one or multiple can be active.',
  slots: [
    {
      name: 'Item',
      required: true,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        pad: 8,
        rad: 4,
        bg: 'transparent',
        'hover-bg': '$surface-hover'
      }
    }
  ],
  defaultStates: ['item-1', 'item-2', 'item-3'],
  actions: ['change'],
  definitions: `// ToggleGroup
ToggleGroup: hor bg $surface rad 6 pad 2 gap 2
ToggleGroupItem: hor ver-cen pad 8 12 rad 4 bg transparent hover-bg $surface-hover
ToggleGroupItemActive: hor ver-cen pad 8 12 rad 4 bg $primary`,
  layoutExample: `ToggleGroup
  state left
  ToggleGroupItemActive
    onclick change to left
    if left
    icon "align-left"
  ToggleGroupItem
    onclick change to center
    if not left and not right
    icon "align-center"
  ToggleGroupItem
    onclick change to right
    if right
    icon "align-right"`
}
