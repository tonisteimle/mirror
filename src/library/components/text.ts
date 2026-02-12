import type { LibraryComponent } from '../types'

export const TextComponent: LibraryComponent = {
  name: 'Text',
  category: 'typography',
  description: 'A text element where col sets text color instead of background.',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `// Text styles
Heading as Text: size 24 weight 600
Subheading as Text: size 18 weight 500
Body as Text: size 14
Caption as Text: size 12 col #71717A`,
  layoutExample: `Heading as Text: size 24 weight 600
Heading "Welcome"`
}
