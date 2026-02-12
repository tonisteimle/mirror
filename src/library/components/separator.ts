import type { LibraryComponent } from '../types'

export const SeparatorComponent: LibraryComponent = {
  name: 'Separator',
  category: 'navigation',
  description: 'A visual divider between content sections.',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `// Separator
Separator: h 1 bg $border full
SeparatorVertical: w 1 bg $border h full`,
  layoutExample: `Separator`
}
