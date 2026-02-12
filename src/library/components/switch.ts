import type { LibraryComponent } from '../types'

export const SwitchComponent: LibraryComponent = {
  name: 'Switch',
  category: 'form',
  description: 'A toggle switch for on/off states.',
  slots: [
    {
      name: 'Thumb',
      required: false,
      multiple: false,
      defaultProps: {
        w: 20,
        h: 20,
        rad: 10,
        col: '$text'
      }
    }
  ],
  defaultStates: ['off', 'on'],
  actions: ['toggle'],
  definitions: `// Switch Components
Switch: hor w 44 h 24 rad 12 bg $border pad 2
SwitchOn: hor w 44 h 24 rad 12 bg $primary pad 2 hor-r
SwitchThumb: w 20 h 20 rad 10`,
  layoutExample: `Switch
  state off
  SwitchThumb
  onclick toggle`
}
