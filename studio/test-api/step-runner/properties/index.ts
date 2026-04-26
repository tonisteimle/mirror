/**
 * Property Reader Registry
 *
 * Map of property-name → reader. The runner looks up readers here when
 * validating `expect.props`. Adding a new property means writing a reader
 * file (see `pad.ts` as the reference) and registering it here.
 *
 * Properties currently supported: `pad`.
 * Properties intentionally NOT yet supported (will return "no reader" error):
 * `pad-t`/`pad-r`/`pad-b`/`pad-l`/`pad-x`/`pad-y`, `mar*`, `gap`, `bg`, `col`,
 * `w`, `h`, `fs`, `rad`, `bor`, etc. — incremental rollout to validate the
 * reader pattern before scaling.
 */

export type { PropertyReader, PropertyValue, ReaderContext, SourceMapLike } from './types'
export { padReader } from './pad'
export { padTReader } from './pad-t'

import type { PropertyReader } from './types'
import { padReader } from './pad'
import { padTReader } from './pad-t'

export const PROPERTY_READERS: Record<string, PropertyReader> = {
  pad: padReader,
  'pad-t': padTReader,
}

export function getReader(propertyName: string): PropertyReader | null {
  return PROPERTY_READERS[propertyName] ?? null
}
