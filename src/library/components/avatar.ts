import type { LibraryComponent } from '../types'

export const AvatarComponent: LibraryComponent = {
  name: 'Avatar',
  category: 'feedback',
  description: 'A profile image with fallback to initials.',
  slots: [
    {
      name: 'Image',
      required: false,
      multiple: false,
      defaultProps: {}
    },
    {
      name: 'Fallback',
      required: false,
      multiple: false,
      defaultProps: {
        bg: '$primary',
        weight: 600
      }
    }
  ],
  defaultStates: ['loading', 'loaded', 'error'],
  actions: [],
  definitions: `// Avatar
Avatar: w 48 h 48 rad 24 ver cen bg $border
AvatarImage: w 48 h 48 rad 24 fit cover
AvatarFallback: w 48 h 48 rad 24 bg $primary weight 600 ver cen`,
  layoutExample: `Avatar
  AvatarImage src "https://example.com/avatar.jpg"
  AvatarFallback "JD"`
}
