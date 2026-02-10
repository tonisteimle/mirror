import type { LibraryComponent } from '../types'

export const SliderComponent: LibraryComponent = {
  name: 'Slider',
  category: 'form',
  description: 'A slider input for selecting a value within a range.',
  slots: [
    {
      name: 'Track',
      required: false,
      multiple: false,
      defaultProps: {
        h: 4,
        rad: 2,
        bg: '#333'
      }
    },
    {
      name: 'Range',
      required: false,
      multiple: false,
      defaultProps: {
        bg: '#3B82F6'
      }
    },
    {
      name: 'Thumb',
      required: false,
      multiple: false,
      defaultProps: {
        w: 20,
        h: 20,
        rad: 10,
        bg: '#FFFFFF'
      }
    }
  ],
  defaultStates: [],
  actions: ['change'],
  definitions: `// Slider
Slider: w 200 hor ver-cen
SliderTrack: h 4 rad 2 bg #333 full hor
SliderRange: h 4 rad 2 bg #3B82F6 w 100
SliderThumb: w 20 h 20 rad 10 bg #FFF`,
  layoutExample: `Slider
  SliderTrack
    SliderRange
  SliderThumb`
}
