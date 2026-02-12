import type { LibraryComponent } from '../types'

export const ScrollAreaComponent: LibraryComponent = {
  name: 'ScrollArea',
  category: 'navigation',
  description: 'A container with custom styled scrollbars.',
  slots: [
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true
      }
    },
    {
      name: 'Scrollbar',
      required: false,
      multiple: false,
      defaultProps: {
        w: 8,
        bg: '$surface-hover',
        rad: 4
      }
    }
  ],
  defaultStates: [],
  actions: [],
  definitions: `// ScrollArea
ScrollArea: h 300 w full clip
ScrollAreaContent: ver pad 16
ScrollAreaScrollbar: w 8 bg $surface-hover rad 4
ScrollAreaThumb: bg $border-hover rad 4`,
  layoutExample: `ScrollArea h 200
  ScrollAreaContent
    "Scrollable content here..."
    "More content..."
    "Even more content..."`
}
