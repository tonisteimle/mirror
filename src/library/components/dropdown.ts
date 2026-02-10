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
        bg: '#252525',
        rad: 6,
        bor: 1,
        boc: '#444'
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
        'hover-bg': '#3B82F6'
      }
    },
    {
      name: 'Separator',
      required: false,
      multiple: true,
      defaultProps: {
        h: 1,
        bg: '#333',
        mar: 4
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Dropdown
DropdownTrigger: hor ver-cen gap 8 pad 8 12 bg #252525 rad 6 bor 1 boc #444 hover-bg #333
DropdownContent: ver bg #1E1E1E rad 8 pad 4 minw 180 bor 1 boc #333
DropdownItem: hor ver-cen gap 8 pad 8 12 rad 4 hover-bg #3B82F6
DropdownSeparator: h 1 bg #333 mar 4`,
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
    DropdownItem col #EF4444
      icon "log-out"
      "Logout"`
}
