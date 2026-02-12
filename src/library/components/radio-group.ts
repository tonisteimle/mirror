import type { LibraryComponent } from '../types'

export const RadioGroupComponent: LibraryComponent = {
  name: 'RadioGroup',
  category: 'form',
  description: 'A group of radio buttons where only one can be selected.',
  slots: [
    {
      name: 'Item',
      required: true,
      multiple: true,
      defaultProps: {
        hor: true,
        gap: 8,
        'align_cross': 'cen'
      }
    },
    {
      name: 'Radio',
      required: true,
      multiple: true,
      defaultProps: {
        w: 20,
        h: 20,
        rad: 10,
        bor: 2,
        boc: '$border-hover',
        bg: '$surface-hover'
      }
    },
    {
      name: 'Indicator',
      required: false,
      multiple: false,
      defaultProps: {
        w: 10,
        h: 10,
        rad: 5,
        bg: '$primary'
      }
    }
  ],
  defaultStates: ['option-1', 'option-2', 'option-3'],
  actions: ['change'],
  definitions: `// RadioGroup
RadioGroup: ver gap 12
RadioItem: hor gap 8 ver-cen
RadioCircle: w 20 h 20 rad 10 bor 2 boc $border-hover bg $surface-hover ver cen
RadioSelected: w 20 h 20 rad 10 bor 2 boc $primary bg $surface-hover ver cen
RadioDot: w 10 h 10 rad 5 bg $primary
RadioLabel: size 14`,
  layoutExample: `RadioGroup
  state opt1
  RadioItem
    onclick change to opt1
    RadioSelected
      if opt1
      RadioDot
    RadioCircle
      if not opt1
    RadioLabel "Option 1"
  RadioItem
    onclick change to opt2
    RadioSelected
      if opt2
      RadioDot
    RadioCircle
      if not opt2
    RadioLabel "Option 2"
  RadioItem
    onclick change to opt3
    RadioSelected
      if opt3
      RadioDot
    RadioCircle
      if not opt3
    RadioLabel "Option 3"`
}
