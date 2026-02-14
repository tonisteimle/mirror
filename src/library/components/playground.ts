/**
 * Playground Library Component
 *
 * Shows Mirror code with syntax highlighting and live preview.
 */

import type { LibraryComponent } from '../types'

export const PlaygroundComponent: LibraryComponent = {
  name: 'playground',
  description: 'Code playground with syntax highlighting and live preview',
  category: 'doc',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `playground
  '...'`,
  layoutExample: `playground
  'Button bg #2271c1 pad 12 24 rad 8 "Click me"'`
}

export default PlaygroundComponent
