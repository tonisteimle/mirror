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
export { padRReader, padBReader, padLReader } from './pad-sides'
export { padXReader, padYReader } from './pad-axis'
export { marReader } from './mar'
export { marTReader, marRReader, marBReader, marLReader } from './mar-sides'
export { marXReader, marYReader } from './mar-axis'
export { gapReader } from './gap'
export { fsReader } from './fs'
export { radReader } from './rad'
export { bgReader } from './bg'
export { colReader } from './col'

import type { PropertyReader } from './types'
import { padReader } from './pad'
import { padTReader } from './pad-t'
import { padRReader, padBReader, padLReader } from './pad-sides'
import { padXReader, padYReader } from './pad-axis'
import { marReader } from './mar'
import { marTReader, marRReader, marBReader, marLReader } from './mar-sides'
import { marXReader, marYReader } from './mar-axis'
import { gapReader } from './gap'
import { fsReader } from './fs'
import { radReader } from './rad'
import { bgReader } from './bg'
import { colReader } from './col'

export const PROPERTY_READERS: Record<string, PropertyReader> = {
  pad: padReader,
  'pad-t': padTReader,
  'pad-r': padRReader,
  'pad-b': padBReader,
  'pad-l': padLReader,
  'pad-x': padXReader,
  'pad-y': padYReader,
  mar: marReader,
  'mar-t': marTReader,
  'mar-r': marRReader,
  'mar-b': marBReader,
  'mar-l': marLReader,
  'mar-x': marXReader,
  'mar-y': marYReader,
  gap: gapReader,
  fs: fsReader,
  rad: radReader,
  bg: bgReader,
  col: colReader,
}

export function getReader(propertyName: string): PropertyReader | null {
  return PROPERTY_READERS[propertyName] ?? null
}
