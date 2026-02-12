import type { LibraryComponent } from '../types'

export const BadgeComponent: LibraryComponent = {
  name: 'Badge',
  category: 'feedback',
  description: 'A small label for status, counts, or categories.',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `// Badge
Badge: hor ver-cen pad 2 8 bg $primary rad 4 size 12 weight 500
BadgeSecondary: hor ver-cen pad 2 8 bg $surface-hover rad 4 size 12 weight 500
BadgeOutline: hor ver-cen pad 2 8 bg transparent rad 4 size 12 weight 500 bor 1 boc $border
BadgeSuccess: hor ver-cen pad 2 8 bg $success rad 4 size 12 weight 500
BadgeWarning: hor ver-cen pad 2 8 bg $warning rad 4 size 12 weight 500
BadgeError: hor ver-cen pad 2 8 bg $error rad 4 size 12 weight 500`,
  layoutExample: `Badge "New"`
}
