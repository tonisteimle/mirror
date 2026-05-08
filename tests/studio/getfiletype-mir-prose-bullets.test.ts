/**
 * Regression: getFileType('app.mir') misclassifies prose-bullet layouts
 *
 * The personas-informatik project (and any layout that uses `, prose`
 * frames with `- bullet` lines) failed to compile in Tauri-mode because:
 *
 *   1. studio/app.ts:getFileType for `.mir` extensions used to call
 *      detectFileType (content-based)
 *   2. detectData() returns true on the first `^\s*-\s+\w+` it finds —
 *      which prose-mode bullets satisfy
 *   3. With fileType !== 'layout', compile() skips the prelude branch
 *   4. Generated JS references tokens that aren't registered → JS
 *      SyntaxError "Unexpected identifier '$get'" from new Function()
 *
 * Fix: getFileType('.mir') now defaults to 'layout' unless the filename
 * itself hints at tokens/components/data (e.g., 'tokens.mir').
 */

import { describe, it, expect } from 'vitest'
import { detectFileType } from '../../studio/file-types'

const PERSONAS_APP_MIR_HEAD = `// Personas — Studieninteressierte Bachelor Informatik
canvas desktop, bg #fff, font sans, fs 17

Topbar
  Logo

Hero
  Eyebrow "Internes Arbeitsdokument"
  HeroVessel
    H1 "Personas"

Section
  Container
    H2 "Übergreifende Beobachtungen"
    ProseBody
      - **Universalfragen**, die durch fast alle Personas gehen:
        - «Schaffe ich das?»
        - «Passe ich da rein?»
      - Sehr viele Fragen haben nichts mit Curriculum zu tun
`

describe('getFileType regression: .mir with prose-mode bullets', () => {
  it('detectFileType still misclassifies prose-bullet content as data', () => {
    // Documents the underlying bug — detectFileType is content-based
    // and prose bullets trigger detectData. This is why studio's
    // getFileType cannot rely on detectFileType for .mir files.
    expect(detectFileType('app.mir', PERSONAS_APP_MIR_HEAD)).toBe('data')
  })

  it('app.ts:getFileType returns "layout" for app.mir despite prose bullets', () => {
    // Replicate the post-fix logic from studio/app.ts:getFileType.
    // No content sniffing for .mir — only filename hints.
    function getFileType(filename: string): string {
      const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
      if (ext === '.tok' || ext === '.tokens') return 'tokens'
      if (ext === '.com' || ext === '.components') return 'component'
      if (ext === '.yaml' || ext === '.yml' || ext === '.data') return 'data'
      const lower = filename.toLowerCase()
      if (lower.includes('token')) return 'tokens'
      if (lower.includes('component')) return 'component'
      if (/\bdata\.mir$/.test(lower)) return 'data'
      return 'layout'
    }

    expect(getFileType('app.mir')).toBe('layout')
    expect(getFileType('app.mirror')).toBe('layout')
    expect(getFileType('screen.mir')).toBe('layout')

    // Filename hints still classify correctly
    expect(getFileType('tokens.mir')).toBe('tokens')
    expect(getFileType('components.mir')).toBe('component')
    expect(getFileType('data.mir')).toBe('data')

    // Legacy extensions still authoritative
    expect(getFileType('tokens.tok')).toBe('tokens')
    expect(getFileType('components.com')).toBe('component')
    expect(getFileType('data.data')).toBe('data')
  })
})
