/**
 * Property Writer: `mar` (uniform margin)
 *
 * Generated from the uniform factory. Three input paths:
 *   - via 'code'    — replaces or appends `mar N`
 *   - via 'panel'   — panel.setProperty('mar', N)
 *   - via 'preview' — M then ArrowUp/Down (gridSize-stepped)
 */

import { createUniformWriter } from './_uniform-factory'

export const marWriter = createUniformWriter('mar')
