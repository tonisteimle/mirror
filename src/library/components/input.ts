import type { LibraryComponent } from '../types'

export const formFieldComponent: LibraryComponent = {
  name: 'FormField',
  category: 'form',
  description: 'Formularfeld mit Label, Input-Feld, Hint und Error',
  slots: [
    { name: 'Label', required: false, multiple: false, defaultProps: {} },
    { name: 'Field', required: true, multiple: false, defaultProps: { placeholder: '' } },
    { name: 'Hint', required: false, multiple: false, defaultProps: {} },
    { name: 'Error', required: false, multiple: false, defaultProps: {} },
  ],
  defaultStates: [],
  actions: ['focus', 'blur'],
  definitions: `// FormField
FormFieldLabel: size 12 col $text-muted mar d 4
FormFieldInput: pad 10 12 bg $surface-hover rad 6 bor 1 boc $border-hover

FormFieldHint: size 11 col $text-muted mar u 4
FormFieldError: size 11 col $error mar u 4`,
  layoutExample: `EmailInput as FormField:
  Label "E-Mail"
  Field placeholder "name@beispiel.de"
  Hint "Wir geben deine E-Mail nicht weiter"`,
}
