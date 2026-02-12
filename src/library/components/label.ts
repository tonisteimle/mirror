import type { LibraryComponent } from '../types'

export const LabelComponent: LibraryComponent = {
  name: 'Label',
  category: 'form',
  description: 'A label for form elements.',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `// Label
Label: size 14 weight 500

LabelRequired: size 14 weight 500

LabelHint: size 12 col $text-muted`,
  layoutExample: `Label "Username"`
}
