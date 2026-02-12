import type { LibraryComponent } from '../types'

export const SpinnerComponent: LibraryComponent = {
  name: 'Spinner',
  category: 'feedback',
  description: 'A loading spinner animation.',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `// Spinner
Spinner: w 24 h 24 bor 2 boc $border rad 12 bor u 2 boc $primary animate spin
SpinnerSmall: w 16 h 16 bor 2 boc $border rad 8 bor u 2 boc $primary animate spin
SpinnerLarge: w 32 h 32 bor 3 boc $border rad 16 bor u 3 boc $primary animate spin`,
  layoutExample: `Spinner`
}
