import type { LibraryComponent } from '../types'

export const inputComponent: LibraryComponent = {
  name: 'Input',
  category: 'form',
  description: 'Texteingabefeld mit Label und Placeholder',
  slots: [
    { name: 'Label', required: false, multiple: false, defaultProps: {} },
    { name: 'Field', required: true, multiple: false, defaultProps: { placeholder: '' } },
    { name: 'Hint', required: false, multiple: false, defaultProps: {} },
  ],
  defaultStates: [],
  actions: ['focus', 'blur'],
  definitions: `// Input
InputLabel: size 12 col #888 mar d 4
InputField: pad 10 12 bg #252525 rad 6 bor 1 boc #444 col #FFF
InputHint: size 11 col #666 mar u 4`,
  layoutExample: `Input
  InputLabel "E-Mail"
  InputField placeholder "name@beispiel.de"
  InputHint "Wir geben deine E-Mail nicht weiter"`,
}
