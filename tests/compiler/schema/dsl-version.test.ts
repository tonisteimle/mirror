/**
 * DSL Version — contract pin.
 *
 * `DSL_VERSION` is the handle Mirror promises to AI consumers and
 * bundle-readers. This test locks the format and re-export surface so a
 * silent change can't slip through. The actual version-bumping rules
 * live in `compiler/schema/dsl-version.ts` and are PR-review territory,
 * not test-territory.
 */

import { describe, it, expect } from 'vitest'
import { DSL_VERSION, DSL_MAJOR } from '../../../compiler/schema/dsl-version'
import * as compilerPublic from '../../../compiler'

describe('DSL_VERSION — contract handle', () => {
  it('is a valid SemVer string (MAJOR.MINOR.PATCH)', () => {
    expect(DSL_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('DSL_MAJOR matches the major-version part', () => {
    const expected = parseInt(DSL_VERSION.split('.')[0], 10)
    expect(DSL_MAJOR).toBe(expected)
    expect(Number.isInteger(DSL_MAJOR)).toBe(true)
    expect(DSL_MAJOR).toBeGreaterThanOrEqual(1)
  })

  it('is re-exported from the public NPM API (compiler/index.ts)', () => {
    // Spec-bundle consumers and external tools import from `mirror-lang`,
    // which re-exports compiler/index.ts. If the version disappears from
    // the public surface, downstream consumers can't gate on it.
    expect(compilerPublic.DSL_VERSION).toBe(DSL_VERSION)
    expect(compilerPublic.DSL_MAJOR).toBe(DSL_MAJOR)
  })
})
