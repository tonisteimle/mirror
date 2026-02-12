import type { LibraryComponent } from '../types'

export const ProgressComponent: LibraryComponent = {
  name: 'Progress',
  category: 'feedback',
  description: 'A progress bar showing completion status.',
  slots: [
    {
      name: 'Indicator',
      required: false,
      multiple: false,
      defaultProps: {
        bg: '$primary'
      }
    }
  ],
  defaultStates: [],
  actions: ['change'],
  definitions: `// Progress
Progress: w 300 h 8 rad 4 bg $border hor
ProgressIndicator: h 8 rad 4 bg $primary w 150`,
  layoutExample: `Progress
  ProgressIndicator`
}
