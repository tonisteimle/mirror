import type { LibraryComponent } from '../types'

export const SkeletonComponent: LibraryComponent = {
  name: 'Skeleton',
  category: 'feedback',
  description: 'A loading placeholder that mimics content shape.',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `// Skeleton
Skeleton: bg $surface-hover rad 4 animate pulse
SkeletonText: h 16 bg $surface-hover rad 4 animate pulse
SkeletonCircle: w 40 h 40 rad 20 bg $surface-hover animate pulse
SkeletonCard: w full h 120 bg $surface-hover rad 8 animate pulse`,
  layoutExample: `Skeleton w 200 h 20`
}
