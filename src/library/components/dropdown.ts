import type { LibraryComponent } from '../types'

export const DropdownComponent: LibraryComponent = {
  name: 'Dropdown',
  category: 'overlays',
  description: 'A menu that appears when triggered, with keyboard navigation and accessibility built-in.',
  slots: [
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {
        hor: true,
        gap: 8,
        pad: 8,
        bg: '$surface-hover',
        rad: 6,
        bor: 1,
        boc: '$border-hover'
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '$surface',
        rad: 8,
        pad: 4,
        minw: 180
      }
    },
    {
      name: 'Item',
      required: false,
      multiple: true,
      defaultProps: {
        hor: true,
        gap: 8,
        pad: 8,
        rad: 4,
        'hover-bg': '$primary'
      }
    },
    {
      name: 'Separator',
      required: false,
      multiple: true,
      defaultProps: {
        h: 1,
        bg: '$border',
        mar: 4
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Dropdown
DropdownTrigger: hor ver-cen gap 8 pad 8 12 bg $surface-hover rad 6 bor 1 boc $border-hover hover-bg $border
DropdownContent: ver bg $surface rad 8 pad 4 minw 180 bor 1 boc $border
DropdownItem: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg $primary
DropdownSeparator: h 1 bg $border mar 4`,
  layoutExample: `Dropdown
  state closed
  DropdownTrigger
    onclick toggle
    icon "chevron-down"
    "Options"
  DropdownContent
    if open
    DropdownItem
      icon "user"
      "Profile"
    DropdownItem
      icon "settings"
      "Settings"
    DropdownSeparator
    DropdownItem bg $error
      icon "log-out"
      "Logout"`
}
