import type { LibraryComponent } from '../types'

export const CardComponent: LibraryComponent = {
  name: 'Card',
  category: 'navigation',
  description: 'A container component with header, content, and footer sections.',
  slots: [
    {
      name: 'Header',
      required: false,
      multiple: false,
      defaultProps: {
        pad: 16,
        bor_d: 1,
        boc: '$border'
      }
    },
    {
      name: 'Content',
      required: false,
      multiple: false,
      defaultProps: {
        pad: 16,
        ver: true,
        gap: 8
      }
    },
    {
      name: 'Footer',
      required: false,
      multiple: false,
      defaultProps: {
        pad: 16,
        bor_u: 1,
        boc: '$border',
        hor: true,
        gap: 8,
        'align_main': 'r'
      }
    }
  ],
  defaultStates: [],
  actions: [],
  definitions: `// Card
Card: ver bg $surface rad 8 bor 1 boc $border
CardHeader: pad 16 bor d 1 boc $border
CardTitle: size 16 weight 600
CardDescription: size 14 col $text-dim
CardContent: pad 16 ver gap 8
CardFooter: pad 16 bor u 1 boc $border hor gap 8 hor-r`,
  layoutExample: `Card
  CardHeader
    CardTitle "Card Title"
    CardDescription "Card description text"
  CardContent
    "Card content goes here"
  CardFooter
    ButtonSecondary "Cancel"
    Button "Save"`
}
