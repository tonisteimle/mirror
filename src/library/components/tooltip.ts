import type { LibraryComponent } from '../types'

export const TooltipComponent: LibraryComponent = {
  name: 'Tooltip',
  category: 'overlays',
  description: 'A small popup that displays information when hovering over an element.',
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
        bg: '$surface',
        pad: 8,
        rad: 4,
        size: 12
      }
    }
  ],
  defaultStates: ['hidden', 'visible'],
  actions: ['show', 'hide'],
  definitions: `// Tooltip Components
TooltipTrigger: pad 4
TooltipContent: bg $surface col $text pad 8 rad 4 size 12 bor 1 boc $border`,
  layoutExample: `Tooltip
  state hidden
  TooltipTrigger
    onhover show
    icon "info" col $text-muted
  TooltipContent
    if visible
    "Helpful information here"`
}
