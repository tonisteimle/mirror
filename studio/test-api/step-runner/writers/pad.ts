/**
 * Property Writer: `pad` (uniform padding)
 *
 * Generated from the uniform factory. Three input paths:
 *   - via 'code'    — replaces or appends `pad N`
 *   - via 'panel'   — panel.setProperty('pad', N)
 *   - via 'preview' — P then ArrowUp/Down (gridSize-stepped)
 */

import { createUniformWriter } from './_uniform-factory'

export const padWriter = createUniformWriter('pad')
