import type { LibraryComponent } from '../types'

export const ButtonComponent: LibraryComponent = {
  name: 'Button',
  category: 'form',
  description: 'An interactive button element with optional icon.',
  slots: [
    {
      name: 'Icon',
      required: false,
      multiple: false,
      defaultProps: {}
    }
  ],
  defaultStates: ['default', 'disabled'],
  actions: ['click'],
  definitions: `// Button
Button: hor ver-cen gap 8 pad 10 16 bg $primary rad 6 hover-bg $primary-hover
ButtonSecondary: hor ver-cen gap 8 pad 10 16 bg $surface-hover rad 6 bor 1 boc $border hover-bg $border
ButtonOutline: hor ver-cen gap 8 pad 10 16 bg transparent rad 6 bor 1 boc $border hover-bg $surface-hover
ButtonGhost: hor ver-cen gap 8 pad 10 16 bg transparent rad 6 hover-bg $surface-hover
ButtonDanger: hor ver-cen gap 8 pad 10 16 bg $error rad 6 hover-bg $error-hover`,
  layoutExample: `Button
  icon "plus"
  "Add Item"`
}
