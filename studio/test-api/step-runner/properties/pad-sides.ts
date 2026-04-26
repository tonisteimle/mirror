/**
 * Property Readers: `pad-r`, `pad-b`, `pad-l` — generated from the
 * single-side factory. `pad-t` lives in its own file for historical
 * reasons (was the first single-side property, kept as a reference
 * delegating to the same factory).
 */

import { createSidePadReader } from './_pad-side-factory'

export const padRReader = createSidePadReader('right')
export const padBReader = createSidePadReader('bottom')
export const padLReader = createSidePadReader('left')
