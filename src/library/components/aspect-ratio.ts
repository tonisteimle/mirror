import type { LibraryComponent } from '../types'

export const AspectRatioComponent: LibraryComponent = {
  name: 'AspectRatio',
  category: 'navigation',
  description: 'Maintains a consistent width-to-height ratio for content.',
  slots: [
    {
      name: 'Content',
      required: true,
      multiple: false,
      defaultProps: {}
    }
  ],
  defaultStates: [],
  actions: [],
  definitions: `// AspectRatio
AspectRatio: w full
AspectRatio16x9: w full
AspectRatio4x3: w full
AspectRatio1x1: w full`,
  layoutExample: `AspectRatio ratio 16/9
  image src "https://example.com/image.jpg" fit cover`
}
