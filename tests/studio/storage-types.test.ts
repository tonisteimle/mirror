/**
 * Storage Types Tests
 *
 * Tests for pure utility functions in storage/types.ts
 */

import { describe, it, expect } from 'vitest'
import { getMirrorFileType, isMirrorFile, FILE_EXTENSIONS } from '../../studio/storage/types'

// =============================================================================
// FILE TYPE DETECTION
// =============================================================================

describe('getMirrorFileType', () => {
  describe('layout files', () => {
    it('should detect .mir files as layout', () => {
      expect(getMirrorFileType('index.mir')).toBe('layout')
      expect(getMirrorFileType('app.mir')).toBe('layout')
      expect(getMirrorFileType('pages/home.mir')).toBe('layout')
    })

    it('should detect .mirror files as layout', () => {
      expect(getMirrorFileType('main.mirror')).toBe('layout')
      expect(getMirrorFileType('components/button.mirror')).toBe('layout')
    })
  })

  describe('token files', () => {
    it('should detect .tok files as tokens', () => {
      expect(getMirrorFileType('theme.tok')).toBe('tokens')
      expect(getMirrorFileType('colors.tok')).toBe('tokens')
    })

    it('should detect .tokens files as tokens', () => {
      expect(getMirrorFileType('design-system.tokens')).toBe('tokens')
    })
  })

  describe('component files', () => {
    it('should detect .com files as component', () => {
      expect(getMirrorFileType('button.com')).toBe('component')
      expect(getMirrorFileType('ui/card.com')).toBe('component')
    })

    it('should detect .components files as component', () => {
      expect(getMirrorFileType('shared.components')).toBe('component')
    })
  })

  describe('data files', () => {
    it('should detect .yaml files as data', () => {
      expect(getMirrorFileType('config.yaml')).toBe('data')
    })

    it('should detect .yml files as data', () => {
      expect(getMirrorFileType('settings.yml')).toBe('data')
    })
  })

  describe('unknown files', () => {
    it('should return unknown for non-Mirror files', () => {
      expect(getMirrorFileType('readme.md')).toBe('unknown')
      expect(getMirrorFileType('style.css')).toBe('unknown')
      expect(getMirrorFileType('app.js')).toBe('unknown')
      expect(getMirrorFileType('image.png')).toBe('unknown')
    })

    it('should return unknown for files without extension', () => {
      expect(getMirrorFileType('Makefile')).toBe('unknown')
      expect(getMirrorFileType('.gitignore')).toBe('unknown')
    })
  })

  describe('edge cases', () => {
    it('should handle double extensions correctly', () => {
      expect(getMirrorFileType('backup.mir.bak')).toBe('unknown')
      expect(getMirrorFileType('file.tok.old')).toBe('unknown')
    })

    it('should be case-sensitive', () => {
      expect(getMirrorFileType('file.MIR')).toBe('unknown')
      expect(getMirrorFileType('file.TOK')).toBe('unknown')
    })

    it('should handle paths with dots in folder names', () => {
      expect(getMirrorFileType('v1.0/index.mir')).toBe('layout')
      expect(getMirrorFileType('test.folder/theme.tok')).toBe('tokens')
    })
  })
})

// =============================================================================
// IS MIRROR FILE
// =============================================================================

describe('isMirrorFile', () => {
  describe('Mirror files', () => {
    it('should return true for layout files', () => {
      expect(isMirrorFile('index.mir')).toBe(true)
      expect(isMirrorFile('page.mirror')).toBe(true)
    })

    it('should return true for token files', () => {
      expect(isMirrorFile('theme.tok')).toBe(true)
      expect(isMirrorFile('colors.tokens')).toBe(true)
    })

    it('should return true for component files', () => {
      expect(isMirrorFile('button.com')).toBe(true)
      expect(isMirrorFile('ui.components')).toBe(true)
    })
  })

  describe('non-Mirror files', () => {
    it('should return false for common files', () => {
      expect(isMirrorFile('readme.md')).toBe(false)
      expect(isMirrorFile('style.css')).toBe(false)
      expect(isMirrorFile('app.js')).toBe(false)
      expect(isMirrorFile('index.html')).toBe(false)
    })

    it('returns true for data files (yaml/yml ARE in the Mirror extension set)', () => {
      // isMirrorFile flattens FILE_EXTENSIONS — since .yaml/.yml are
      // registered there, they count as Mirror files for this predicate.
      // Pinning the contract: yaml/yml ARE Mirror.
      expect(isMirrorFile('config.yaml')).toBe(true)
      expect(isMirrorFile('settings.yml')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(isMirrorFile('')).toBe(false)
    })

    it('should handle just extension', () => {
      expect(isMirrorFile('.mir')).toBe(true)
      expect(isMirrorFile('.tok')).toBe(true)
    })

    it('uses suffix matching, not substring (filename containing ext but not ending with it)', () => {
      // 'mirror.html' contains 'mirror' but doesn't END with .mir/.mirror.
      // Locks in that endsWith() — not includes() — drives the match.
      expect(isMirrorFile('mirror.html')).toBe(false)
      expect(isMirrorFile('something.mir.txt')).toBe(false)
      expect(isMirrorFile('button.commands')).toBe(false) // .commands ≠ .com
    })

    it('returns true even for paths with leading slash or whitespace-tolerant inputs', () => {
      // The code uses endsWith on the raw string — leading paths don't matter.
      expect(isMirrorFile('/abs/path/to/app.mir')).toBe(true)
      expect(isMirrorFile('./relative/comp.com')).toBe(true)
    })
  })
})

// =============================================================================
// P2 coverage: locked invariants between getFileType and isMirrorFile
// =============================================================================

describe('getMirrorFileType / isMirrorFile coherence', () => {
  it('every file isMirrorFile returns true for, getFileType returns non-unknown', () => {
    // Discriminating invariant: a file the predicate accepts must yield
    // a meaningful type. If they ever drift apart, both tests fail and
    // the regression is obvious.
    const samples = [
      'app.mir',
      'page.mirror',
      'theme.tok',
      'design.tokens',
      'card.com',
      'shared.components',
      'config.yaml',
      'settings.yml',
    ]
    for (const file of samples) {
      expect(isMirrorFile(file)).toBe(true)
      expect(getMirrorFileType(file)).not.toBe('unknown')
    }
  })

  it('every file isMirrorFile returns false for, getFileType returns unknown', () => {
    const samples = ['readme.md', 'app.js', 'style.css', 'index.html', '']
    for (const file of samples) {
      expect(isMirrorFile(file)).toBe(false)
      expect(getMirrorFileType(file)).toBe('unknown')
    }
  })
})

// =============================================================================
// FILE EXTENSIONS CONSTANT
// =============================================================================

describe('FILE_EXTENSIONS', () => {
  it('should have layout extensions', () => {
    expect(FILE_EXTENSIONS.layout).toContain('.mir')
    expect(FILE_EXTENSIONS.layout).toContain('.mirror')
  })

  it('should have tokens extensions', () => {
    expect(FILE_EXTENSIONS.tokens).toContain('.tok')
    expect(FILE_EXTENSIONS.tokens).toContain('.tokens')
  })

  it('should have component extensions', () => {
    expect(FILE_EXTENSIONS.component).toContain('.com')
    expect(FILE_EXTENSIONS.component).toContain('.components')
  })

  it('should have data extensions', () => {
    expect(FILE_EXTENSIONS.data).toContain('.yaml')
    expect(FILE_EXTENSIONS.data).toContain('.yml')
  })

  it('should have all categories defined', () => {
    // Verify structure is complete
    expect(FILE_EXTENSIONS).toHaveProperty('layout')
    expect(FILE_EXTENSIONS).toHaveProperty('tokens')
    expect(FILE_EXTENSIONS).toHaveProperty('component')
    expect(FILE_EXTENSIONS).toHaveProperty('data')
  })
})
