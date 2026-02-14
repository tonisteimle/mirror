/**
 * Doc Wrapper Library Component
 *
 * Container for documentation pages.
 * Provides proper layout and styling for doc-mode content.
 */

import type { LibraryComponent } from '../types'

export const DocWrapperComponent: LibraryComponent = {
  name: 'doc',
  description: 'Documentation page container with proper layout',
  category: 'doc',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `doc
  text
    '...'
  playground
    '...'`,
  layoutExample: `doc
  text
    '$h1 Documentation

     $p Welcome to the documentation.'

  playground
    'Button bg #2271c1 pad 12 24 rad 8 "Click me"'`
}

export default DocWrapperComponent
