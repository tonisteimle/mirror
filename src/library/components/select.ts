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
        bg: '$surface-hover',
        bor: 1,
        boc: '$border-hover',
        rad: 6,
        minw: 180
      }
    },
    {
      name: 'Options',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '$surface',
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
        col: '$text-muted'
      }
    },
    {
      name: 'Option',
      required: true,
      multiple: true,
      defaultProps: {
        hor: true,
        'align_cross': 'cen',
        pad: 8,
        pad_l: 12,
        pad_r: 12,
        rad: 4,
        'hover-bg': '$primary'
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Select Components
SelectTrigger: hor between ver-cen pad 12 bg $surface-hover bor 1 boc $border-hover rad 6 minw 180 hover-bg $border
SelectOptions: ver bg $surface rad 8 pad 4 bor 1 boc $border
SelectGroup: ver
SelectLabel: pad 8 12 size 11 col $text-muted
SelectOption: hor ver-cen pad 8 12 rad 4 hover-bg $primary`,
  layoutExample: `Select
  state closed
  SelectTrigger
    onclick toggle
    "Select option..."
    icon "chevron-down"
  SelectOptions
    if open
    SelectGroup
      SelectLabel "Category"
      SelectOption "Option 1"
      SelectOption "Option 2"
      SelectOption "Option 3"`
}
