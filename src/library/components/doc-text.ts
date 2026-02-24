/**
 * Doc Text Library Component
 *
 * Renders formatted text blocks for doc-mode documentation.
 */

import type { LibraryComponent } from '../types'

export const DocTextComponent: LibraryComponent = {
  name: 'text',
  description: 'Formatted text block with token-based styling',
  category: 'doc',
  slots: [],
  defaultStates: [],
  actions: [],
  definitions: `text
  '...'`,
  layoutExample: `text
  '$h2 Title

   $p Paragraph with **bold** text.'`
}

export default DocTextComponent
