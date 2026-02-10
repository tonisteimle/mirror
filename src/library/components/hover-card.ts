import type { LibraryComponent } from '../types'

export const HoverCardComponent: LibraryComponent = {
  name: 'HoverCard',
  category: 'overlays',
  description: 'A card that appears when hovering over a trigger, great for previews.',
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
        w: 280
      }
    }
  ],
  defaultStates: ['hidden', 'visible'],
  actions: ['show', 'hide'],
  definitions: `// HoverCard
HoverCardTrigger: col #3B82F6
HoverCardContent: ver bg #1E1E1E rad 8 pad 16 w 280 gap 12 bor 1 boc #333
HoverCardHeader: hor gap 12 ver-cen
HoverCardAvatar: w 48 h 48 rad 24 bg #3B82F6
HoverCardInfo: ver gap 2
HoverCardName: weight 600
HoverCardHandle: size 12 col #888
HoverCardBio: size 14 col #A0A0A0`,
  layoutExample: `HoverCard
  state hidden
  HoverCardTrigger
    onhover show
    "@username"
  HoverCardContent
    if visible
    HoverCardHeader
      HoverCardAvatar
      HoverCardInfo
        HoverCardName "John Doe"
        HoverCardHandle "@username"
    HoverCardBio "Frontend developer passionate about UI/UX"`
}
