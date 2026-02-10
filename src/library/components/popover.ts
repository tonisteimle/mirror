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
        bg: '#1E1E1E',
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
PopoverTrigger: pad 8 12 bg #3B82F6 col #FFF rad 6 hover-bg #2563EB
PopoverContent: ver bg #1E1E1E rad 8 pad 16 gap 12 w 280 bor 1 boc #333
PopoverClose: pad 8 12 bg #333 rad 4 col #FFF hover-bg #444`,
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
