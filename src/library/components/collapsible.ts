import type { LibraryComponent } from '../types'

export const CollapsibleComponent: LibraryComponent = {
  name: 'Collapsible',
  category: 'navigation',
  description: 'A simple collapsible section that can be opened or closed.',
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
        rad: 6
      }
    },
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {
        ver: true,
        pad: 12,
        gap: 8
      }
    }
  ],
  defaultStates: ['closed', 'open'],
  actions: ['open', 'close', 'toggle'],
  definitions: `// Collapsible
CollapsibleTrigger: hor between ver-cen pad 12 bg #252525 rad 6 hover-bg #333
CollapsibleContent: ver pad 12 gap 8`,
  layoutExample: `Collapsible
  state closed
  CollapsibleTrigger
    onclick toggle
    "Show more"
    icon "chevron-down"
  CollapsibleContent
    if open
    "Hidden content that appears when expanded."
    "Can contain any elements."`
}
