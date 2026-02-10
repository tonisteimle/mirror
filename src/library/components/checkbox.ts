import type { LibraryComponent } from '../types'

export const CheckboxComponent: LibraryComponent = {
  name: 'Checkbox',
  category: 'form',
  description: 'A checkbox input with optional label.',
  slots: [
    {
      name: 'Indicator',
      required: false,
      multiple: false,
      defaultProps: {}
    }
  ],
  defaultStates: ['unchecked', 'checked'],
  actions: ['toggle', 'check', 'uncheck'],
  definitions: `// Checkbox
CheckboxBox: w 20 h 20 rad 4 bor 2 boc #444 bg #252525 ver cen
CheckboxChecked: w 20 h 20 rad 4 bg #3B82F6 ver cen
CheckboxLabel: size 14`,
  layoutExample: `Checkbox
  state unchecked
  onclick toggle
  CheckboxBox
    if unchecked
  CheckboxChecked
    if checked
    icon "check" col #FFF
  CheckboxLabel "Accept terms"`
}
