import type { LibraryComponent } from '../types'

export const PopoverComponent: LibraryComponent = {
  name: 'Popover',
  category: 'overlays',
  description: 'An interactive popup that appears on click, great for forms or rich content.',
  slots: [
    {
      name: 'Trigger',
      required: true,
      multiple: false,
      defaultProps: {}
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        bg: '$surface',
        rad: 8,
        pad: 16,
        gap: 12
      }
    },
    {
      name: 'Close',
      required: false,
      multiple: false,
      defaultProps: {}
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Popover
PopoverTrigger: pad 8 12 bg $primary rad 6 hover-bg $primary-hover
PopoverContent: ver bg $surface rad 8 pad 16 gap 12 w 280 bor 1 boc $border
PopoverClose: pad 8 12 bg $border rad 4 hover-bg $border-hover`,
  layoutExample: `Popover
  state closed
  PopoverTrigger
    onclick toggle
    "Edit Profile"
  PopoverContent
    if open
    InputLabel "Name"
    InputField placeholder "Enter name..."
    PopoverClose
      onclick close
      "Save"`
}
