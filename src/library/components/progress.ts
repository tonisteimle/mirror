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
        bg: '#3B82F6'
      }
    }
  ],
  defaultStates: [],
  actions: ['change'],
  definitions: `// Progress
Progress: w 300 h 8 rad 4 bg #333 hor
ProgressIndicator: h 8 rad 4 bg #3B82F6 w 150`,
  layoutExample: `Progress
  ProgressIndicator`
}
