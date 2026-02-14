/**
 * Tests for .mirror file format parser and serializer
 */

import { describe, it, expect } from 'vitest'
import {
  parseMirrorFile,
  serializeMirrorFile,
  parseProjectFile,
  isMirrorFormat,
  isJsonFormat,
  convertJsonToMirrorProject,
  type MirrorProject
} from '../../lib/mirror-file'

// =============================================================================
// PARSING
// =============================================================================

describe('parseMirrorFile', () => {
  it('parses complete .mirror file', () => {
    const content = `[data]
Task:
  title: text
  done: boolean

- Task "Einkaufen", false

[tokens]
$primary: #3B82F6
$spacing: 16

[components]
Button: pad 12 bg $primary

[page: Home]
App ver gap 16
  Button "Click"

[page: Settings]
Settings ver pad 24
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project).toBeDefined()

    const project = result.project!
    expect(project.dataCode).toContain('Task:')
    expect(project.dataCode).toContain('- Task "Einkaufen"')
    expect(project.tokensCode).toContain('$primary: #3B82F6')
    expect(project.componentsCode).toContain('Button: pad 12')
    expect(project.pages).toHaveLength(2)
    expect(project.pages[0].name).toBe('Home')
    expect(project.pages[0].layoutCode).toContain('App ver gap 16')
    expect(project.pages[1].name).toBe('Settings')
    expect(project.currentPageId).toBe('page-home')
  })

  it('parses file with only pages', () => {
    const content = `[page: Main]
App ver
  Label "Hello"
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.pages).toHaveLength(1)
    expect(result.project!.dataCode).toBe('')
    expect(result.project!.tokensCode).toBe('')
    expect(result.project!.componentsCode).toBe('')
  })

  it('parses file with empty sections', () => {
    const content = `[data]

[tokens]

[components]

[page: Main]
App ver
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.dataCode).toBe('')
    expect(result.project!.tokensCode).toBe('')
    expect(result.project!.componentsCode).toBe('')
    expect(result.project!.pages[0].layoutCode).toBe('App ver')
  })

  it('creates default page if none defined', () => {
    const content = `[tokens]
$primary: #3B82F6
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.pages).toHaveLength(1)
    expect(result.project!.pages[0].name).toBe('Main')
    expect(result.project!.pages[0].id).toBe('page-1')
  })

  it('handles page names with spaces', () => {
    const content = `[page: My Dashboard]
Dashboard ver
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.pages[0].name).toBe('My Dashboard')
    expect(result.project!.pages[0].id).toBe('page-my-dashboard')
  })

  it('rejects unknown section types', () => {
    const content = `[unknown]
some content
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown section type')
  })

  it('requires page name', () => {
    const content = `[page]
App ver
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(false)
    expect(result.error).toContain('requires a name')
  })

  it('trims leading/trailing whitespace from sections', () => {
    const content = `[tokens]

$primary: #3B82F6

[page: Main]

App ver

`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.tokensCode).toBe('$primary: #3B82F6')
    expect(result.project!.pages[0].layoutCode).toBe('App ver')
  })

  it('preserves multiline content within sections', () => {
    const content = `[page: Main]
App ver gap 16
  Header hor
    Logo "Mirror"
  Content ver pad 24
    Label "Hello"
`

    const result = parseMirrorFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.pages[0].layoutCode).toContain('Header hor')
    expect(result.project!.pages[0].layoutCode).toContain('Content ver pad 24')
  })
})

// =============================================================================
// SERIALIZING
// =============================================================================

describe('serializeMirrorFile', () => {
  it('serializes complete project', () => {
    const project: MirrorProject = {
      version: 1,
      dataCode: 'Task:\n  title: text',
      tokensCode: '$primary: #3B82F6',
      componentsCode: 'Button: pad 12',
      pages: [
        { id: 'page-home', name: 'Home', layoutCode: 'App ver' },
        { id: 'page-settings', name: 'Settings', layoutCode: 'Settings ver' }
      ],
      currentPageId: 'page-home'
    }

    const content = serializeMirrorFile(project)

    expect(content).toContain('[data]')
    expect(content).toContain('Task:')
    expect(content).toContain('[tokens]')
    expect(content).toContain('$primary: #3B82F6')
    expect(content).toContain('[components]')
    expect(content).toContain('Button: pad 12')
    expect(content).toContain('[page: Home]')
    expect(content).toContain('App ver')
    expect(content).toContain('[page: Settings]')
    expect(content).toContain('Settings ver')
  })

  it('omits empty sections', () => {
    const project: MirrorProject = {
      version: 1,
      dataCode: '',
      tokensCode: '$primary: #3B82F6',
      componentsCode: '',
      pages: [{ id: 'page-1', name: 'Main', layoutCode: 'App ver' }],
      currentPageId: 'page-1'
    }

    const content = serializeMirrorFile(project)

    expect(content).not.toContain('[data]')
    expect(content).toContain('[tokens]')
    expect(content).not.toContain('[components]')
    expect(content).toContain('[page: Main]')
  })

  it('handles empty page layout', () => {
    const project: MirrorProject = {
      version: 1,
      dataCode: '',
      tokensCode: '',
      componentsCode: '',
      pages: [{ id: 'page-1', name: 'Main', layoutCode: '' }],
      currentPageId: 'page-1'
    }

    const content = serializeMirrorFile(project)

    expect(content).toContain('[page: Main]')
  })
})

// =============================================================================
// ROUND-TRIP
// =============================================================================

describe('round-trip: serialize -> parse', () => {
  it('preserves all data through round-trip', () => {
    const original: MirrorProject = {
      version: 1,
      dataCode: 'Task:\n  title: text\n  done: boolean\n\n- Task "Test", true',
      tokensCode: '$primary: #3B82F6\n$spacing: 16',
      componentsCode: 'Button: pad 12 bg $primary rad 8',
      pages: [
        { id: 'page-home', name: 'Home', layoutCode: 'App ver gap 16\n  Button "Click"' },
        { id: 'page-settings', name: 'Settings', layoutCode: 'Settings ver pad 24' }
      ],
      currentPageId: 'page-home'
    }

    const serialized = serializeMirrorFile(original)
    const result = parseMirrorFile(serialized)

    expect(result.success).toBe(true)
    const parsed = result.project!

    expect(parsed.dataCode).toBe(original.dataCode)
    expect(parsed.tokensCode).toBe(original.tokensCode)
    expect(parsed.componentsCode).toBe(original.componentsCode)
    expect(parsed.pages).toHaveLength(2)
    expect(parsed.pages[0].name).toBe('Home')
    expect(parsed.pages[0].layoutCode).toBe(original.pages[0].layoutCode)
    expect(parsed.pages[1].name).toBe('Settings')
    expect(parsed.pages[1].layoutCode).toBe(original.pages[1].layoutCode)
  })
})

// =============================================================================
// FORMAT DETECTION
// =============================================================================

describe('isMirrorFormat', () => {
  it('detects .mirror format', () => {
    expect(isMirrorFormat('[data]\nTask:')).toBe(true)
    expect(isMirrorFormat('[tokens]\n$primary: #FFF')).toBe(true)
    expect(isMirrorFormat('[page: Home]\nApp ver')).toBe(true)
    expect(isMirrorFormat('[components]\nButton:')).toBe(true)
  })

  it('rejects non-.mirror format', () => {
    expect(isMirrorFormat('{ "version": 1 }')).toBe(false)
    expect(isMirrorFormat('App ver gap 16')).toBe(false)
  })
})

describe('isJsonFormat', () => {
  it('detects JSON format', () => {
    expect(isJsonFormat('{ "version": 1 }')).toBe(true)
    expect(isJsonFormat('  { "pages": [] }  ')).toBe(true)
  })

  it('rejects non-JSON format', () => {
    expect(isJsonFormat('[data]\nTask:')).toBe(false)
    expect(isJsonFormat('App ver gap 16')).toBe(false)
  })
})

// =============================================================================
// BACKWARDS COMPATIBILITY
// =============================================================================

describe('parseProjectFile - backwards compatibility', () => {
  it('parses legacy JSON format', () => {
    const json = JSON.stringify({
      version: 1,
      pages: [
        { id: 'page-1', name: 'Home', layoutCode: 'App ver' }
      ],
      currentPageId: 'page-1',
      componentsCode: 'Button: pad 12',
      tokensCode: '$primary: #FFF'
    })

    const result = parseProjectFile(json)

    expect(result.success).toBe(true)
    expect(result.project!.pages[0].name).toBe('Home')
    expect(result.project!.componentsCode).toBe('Button: pad 12')
    expect(result.project!.tokensCode).toBe('$primary: #FFF')
    expect(result.project!.dataCode).toBe('')  // Not in legacy format
  })

  it('parses .mirror format', () => {
    const content = `[page: Main]
App ver
`

    const result = parseProjectFile(content)

    expect(result.success).toBe(true)
    expect(result.project!.pages[0].name).toBe('Main')
  })
})

describe('convertJsonToMirrorProject', () => {
  it('converts legacy JSON with all fields', () => {
    const json = {
      version: 1,
      pages: [{ id: 'p1', name: 'Home', layoutCode: 'App' }],
      currentPageId: 'p1',
      componentsCode: 'Button:',
      tokensCode: '$x: 1',
      dataCode: 'Task:'
    }

    const project = convertJsonToMirrorProject(json)

    expect(project.version).toBe(1)
    expect(project.pages).toHaveLength(1)
    expect(project.dataCode).toBe('Task:')
    expect(project.tokensCode).toBe('$x: 1')
    expect(project.componentsCode).toBe('Button:')
  })

  it('provides defaults for missing fields', () => {
    const json = {}

    const project = convertJsonToMirrorProject(json)

    expect(project.version).toBe(1)
    expect(project.pages).toHaveLength(1)
    expect(project.pages[0].name).toBe('Main')
    expect(project.dataCode).toBe('')
    expect(project.tokensCode).toBe('')
    expect(project.componentsCode).toBe('')
  })
})
