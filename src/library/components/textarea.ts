import type { LibraryComponent } from '../types'

export const TextareaComponent: LibraryComponent = {
  name: 'Textarea',
  category: 'form',
  description: 'A multi-line text input field.',
  slots: [
    {
      name: 'Label',
      required: false,
      multiple: false,
      defaultProps: {
        size: 12,
        col: '$text-muted'
      }
    },
    {
      name: 'Field',
      required: true,
      multiple: false,
      defaultProps: {
        pad: 12,
        bg: '$surface-hover',
        rad: 6,
        bor: 1,
        boc: '$border-hover',
        minh: 100
      }
    },
    {
      name: 'Hint',
      required: false,
      multiple: false,
      defaultProps: {
        size: 11,
        col: '$text-muted'
      }
    }
  ],
  defaultStates: [],
  actions: ['focus', 'blur'],
  definitions: `// Textarea
TextareaLabel: size 12 col $text-muted mar d 4
TextareaField: pad 12 bg $surface-hover rad 6 bor 1 boc $border-hover col $text minh 100
TextareaHint: size 11 col $text-muted mar u 4`,
  layoutExample: `Textarea
  TextareaLabel "Message"
  TextareaField placeholder "Enter your message..."
  TextareaHint "Maximum 500 characters"`
}
