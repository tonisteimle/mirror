import type { LibraryComponent } from '../types'

export const ToggleComponent: LibraryComponent = {
  name: 'Toggle',
  category: 'form',
  description: 'A two-state button that can be either on or off.',
  slots: [],
  defaultStates: ['off', 'on'],
  actions: ['toggle'],
  definitions: `// Toggle
Toggle: hor ver-cen pad 8 rad 4 bg transparent hover-bg $surface-hover
ToggleOn: hor ver-cen pad 8 rad 4 bg $surface-hover
ToggleOutline: hor ver-cen pad 8 rad 4 bg transparent bor 1 boc $border hover-bg $surface-hover`,
  layoutExample: `Toggle
  state off
  onclick toggle
  icon "bold"`
}
