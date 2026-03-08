import { describe, it, expect } from 'vitest'
import { combineProjectFiles, combineFiles, DIRECTORY_ORDER } from '../../preprocessor'

describe('Preprocessor: combineProjectFiles', () => {
  it('combines files in correct directory order', () => {
    const files: Record<string, string[]> = {
      'data': ['users.mirror'],
      'tokens': ['colors.mirror'],
      'components': ['button.mirror'],
      'layouts': ['home.mirror']
    }
    const fileContents: Record<string, string> = {
      'data/users.mirror': '$users: []',
      'tokens/colors.mirror': '$primary: #3B82F6',
      'components/button.mirror': 'Button: pad 12',
      'layouts/home.mirror': 'Home\n  Button "Click"'
    }

    const listFiles = (dir: string) => files[dir] || []
    const readFile = (path: string) => fileContents[path] || null

    const result = combineProjectFiles(listFiles, readFile)

    // Check order: data first, then tokens, then components, then layouts
    const dataPos = result.indexOf('$users')
    const tokensPos = result.indexOf('$primary')
    const componentsPos = result.indexOf('Button:')
    const layoutsPos = result.indexOf('Home')

    expect(dataPos).toBeLessThan(tokensPos)
    expect(tokensPos).toBeLessThan(componentsPos)
    expect(componentsPos).toBeLessThan(layoutsPos)
  })

  it('handles empty directories', () => {
    const files: Record<string, string[]> = {
      'data': [],
      'tokens': ['colors.mirror'],
      'components': [],
      'layouts': ['home.mirror']
    }
    const fileContents: Record<string, string> = {
      'tokens/colors.mirror': '$primary: #3B82F6',
      'layouts/home.mirror': 'Home'
    }

    const listFiles = (dir: string) => files[dir] || []
    const readFile = (path: string) => fileContents[path] || null

    const result = combineProjectFiles(listFiles, readFile)

    expect(result).toContain('$primary')
    expect(result).toContain('Home')
  })

  it('adds section comments for debugging', () => {
    const files: Record<string, string[]> = {
      'data': [],
      'tokens': ['colors.mirror'],
      'components': [],
      'layouts': []
    }
    const fileContents: Record<string, string> = {
      'tokens/colors.mirror': '$primary: #3B82F6'
    }

    const listFiles = (dir: string) => files[dir] || []
    const readFile = (path: string) => fileContents[path] || null

    const result = combineProjectFiles(listFiles, readFile)

    expect(result).toContain('// === tokens/colors.mirror ===')
  })

  it('handles multiple files per directory', () => {
    const files: Record<string, string[]> = {
      'data': [],
      'tokens': ['colors.mirror', 'spacing.mirror'],
      'components': [],
      'layouts': []
    }
    const fileContents: Record<string, string> = {
      'tokens/colors.mirror': '$primary: #3B82F6',
      'tokens/spacing.mirror': '$gap: 16'
    }

    const listFiles = (dir: string) => files[dir] || []
    const readFile = (path: string) => fileContents[path] || null

    const result = combineProjectFiles(listFiles, readFile)

    expect(result).toContain('$primary')
    expect(result).toContain('$gap')
  })
})

describe('Preprocessor: combineFiles', () => {
  it('combines files in given order', () => {
    const fileContents: Record<string, string> = {
      'tokens.mirror': '$primary: #3B82F6',
      'components.mirror': 'Button: pad 12'
    }

    const readFile = (path: string) => fileContents[path] || null

    const result = combineFiles(['tokens.mirror', 'components.mirror'], readFile)

    expect(result).toContain('$primary')
    expect(result).toContain('Button:')

    const tokensPos = result.indexOf('$primary')
    const componentsPos = result.indexOf('Button:')
    expect(tokensPos).toBeLessThan(componentsPos)
  })

  it('skips missing files', () => {
    const fileContents: Record<string, string> = {
      'existing.mirror': 'Box'
    }

    const readFile = (path: string) => fileContents[path] || null

    const result = combineFiles(['missing.mirror', 'existing.mirror'], readFile)

    expect(result).toContain('Box')
    expect(result).not.toContain('missing')
  })
})

describe('DIRECTORY_ORDER constant', () => {
  it('has correct order', () => {
    expect(DIRECTORY_ORDER).toEqual(['data', 'tokens', 'components', 'layouts'])
  })
})
