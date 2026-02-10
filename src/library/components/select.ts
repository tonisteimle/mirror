import type { LibraryComponent } from '../types'

export const SelectComponent: LibraryComponent = {
  name: 'Select',
  category: 'form',
  description: 'A dropdown select menu for choosing from a list of options.',
  slots: [
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        'align_main': 'between',
        'align_cross': 'cen',
        pad: 12,
        bg: '#252525',
        bor: 1,
        boc: '#444',
        rad: 6,
        minw: 180
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '#1E1E1E',
        rad: 8,
        pad: 4
      }
    },
    {
      name: 'Group',
      required: false,
      multiple: true,
      defaultProps: {
        ver: true
      }
    },
    {
      name: 'Label',
      required: false,
      multiple: true,
      defaultProps: {
        pad_l: 12,
        pad_u: 8,
        pad_d: 4,
        size: 11,
        col: '#888'
      }
    },
    {
      name: 'Item',
      required: true,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        pad: 8,
        pad_l: 12,
        pad_r: 12,
        rad: 4,
        'hover-bg': '#3B82F6'
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Select Components
SelectTrigger: hor between ver-cen pad 12 bg #252525 bor 1 boc #444 rad 6 minw 180 hover-bg #333
SelectContent: ver bg #1E1E1E rad 8 pad 4 bor 1 boc #333
SelectGroup: ver
SelectLabel: pad 8 12 size 11 col #888
SelectItem: hor ver-cen pad 8 12 rad 4 hover-bg #3B82F6`,
  layoutExample: `Select
  state closed
  SelectTrigger
    onclick toggle
    "Select option..."
    icon "chevron-down"
  SelectContent
    if open
    SelectGroup
      SelectLabel "Category"
      SelectItem "Option 1"
      SelectItem "Option 2"
      SelectItem "Option 3"`
}
