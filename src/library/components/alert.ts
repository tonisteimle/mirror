import type { LibraryComponent } from '../types'

export const AlertComponent: LibraryComponent = {
  name: 'Alert',
  category: 'feedback',
  description: 'A callout box for important messages with icon support.',
  slots: [
    {
      name: 'Icon',
      required: false,
      multiple: false,
      defaultProps: {}
    },
    {
      name: 'Title',
      required: false,
      multiple: false,
      defaultProps: {
        weight: 600,
        size: 14
      }
    },
    {
      name: 'Description',
      required: false,
      multiple: false,
      defaultProps: {
        size: 14,
        col: '$text-dim'
      }
    }
  ],
  defaultStates: [],
  actions: ['dismiss'],
  definitions: `// Alert
Alert: hor gap 12 pad 16 bg $surface rad 8 bor 1 boc $border
AlertIcon: col $text-muted
AlertContent: ver gap 4 fill
AlertTitle: weight 600 size 14
AlertDescription: size 14 col $text-dim
AlertSuccess: hor gap 12 pad 16 bg $surface rad 8 bor 1 boc $success
AlertWarning: hor gap 12 pad 16 bg $surface rad 8 bor 1 boc $warning
AlertError: hor gap 12 pad 16 bg $surface rad 8 bor 1 boc $error`,
  layoutExample: `Alert
  AlertIcon
    icon "info"
  AlertContent
    AlertTitle "Information"
    AlertDescription "This is an informational message."`
}
