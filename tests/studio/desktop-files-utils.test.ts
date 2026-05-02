/**
 * studio/desktop-files-utils
 *
 * Pure helpers extracted from desktop-files.ts: HTML/attr escaping,
 * filename validation, file-type lookup, tree traversal & sorting.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import type { StorageItem } from '../../studio/storage'
import {
  FILE_TYPES,
  escapeHtml,
  escapeAttr,
  validateFilename,
  getFileType,
  findFirstFile,
  getExtensionPriority,
  sortTreeItems,
} from '../../studio/desktop-files-utils'

function file(name: string, path = name): StorageItem {
  return { type: 'file', name, path } as StorageItem
}
function folder(name: string, children: StorageItem[] = [], path = name): StorageItem {
  return { type: 'folder', name, path, children } as StorageItem
}

describe('escapeHtml / escapeAttr', () => {
  it('escapes <, >, & in HTML body', () => {
    expect(escapeHtml('a<b>&c')).toBe('a&lt;b&gt;&amp;c')
  })

  it('passes plain ASCII through unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('escapeAttr also escapes quotes', () => {
    expect(escapeAttr(`"a"`)).toBe('&quot;a&quot;')
    expect(escapeAttr("'b'")).toBe('&#39;b&#39;')
    expect(escapeAttr('<x>&"\'')).toBe('&lt;x&gt;&amp;&quot;&#39;')
  })
})

describe('validateFilename', () => {
  it('accepts valid names', () => {
    expect(validateFilename('app.mir')).toBeNull()
    expect(validateFilename('component-1.com')).toBeNull()
    expect(validateFilename('file_name.tok')).toBeNull()
    expect(validateFilename('A1.mirror')).toBeNull()
  })

  it('rejects empty / whitespace', () => {
    expect(validateFilename('')).toMatch(/empty/)
    expect(validateFilename('   ')).toMatch(/empty/)
  })

  it('rejects path separators', () => {
    expect(validateFilename('a/b')).toBe('Name cannot contain / or \\')
    expect(validateFilename('a\\b')).toBe('Name cannot contain / or \\')
  })

  it('rejects colon', () => {
    expect(validateFilename('a:b')).toMatch(/:/)
  })

  it('rejects leading dot', () => {
    expect(validateFilename('.hidden')).toMatch(/start with/)
  })

  it('rejects non-ASCII', () => {
    expect(validateFilename('café.mir')).toMatch(/letters, numbers/)
    expect(validateFilename('a b.mir')).toMatch(/letters, numbers/)
    expect(validateFilename('hi!.mir')).toMatch(/letters, numbers/)
  })
})

describe('getFileType', () => {
  it('detects layout extensions', () => {
    expect(getFileType('app.mir').type).toBe('layout')
    expect(getFileType('app.mirror').type).toBe('layout')
  })

  it('detects token extensions', () => {
    expect(getFileType('design.tok').type).toBe('tokens')
    expect(getFileType('design.tokens').type).toBe('tokens')
  })

  it('detects component extensions', () => {
    expect(getFileType('btn.com').type).toBe('component')
    expect(getFileType('btn.components').type).toBe('component')
  })

  it('falls back to layout for unknown', () => {
    expect(getFileType('readme.txt').type).toBe('layout')
    expect(getFileType('noext').type).toBe('layout')
  })

  it('returns the FILE_TYPES color and icon by reference', () => {
    const info = getFileType('app.mir')
    expect(info.color).toBe(FILE_TYPES.layout.color)
    expect(info.icon).toBe(FILE_TYPES.layout.icon)
  })
})

describe('findFirstFile', () => {
  it('returns null for empty tree', () => {
    expect(findFirstFile([])).toBeNull()
  })

  it('prefers index.mir at root', () => {
    const tree: StorageItem[] = [file('a.mir'), file('index.mir'), file('b.mir')]
    expect(findFirstFile(tree)).toBe('index.mir')
  })

  it('prefers index.mir nested in folder over a sibling file at root', () => {
    const tree: StorageItem[] = [
      file('a.mir'),
      folder('layouts', [file('index.mir', 'layouts/index.mir')]),
    ]
    expect(findFirstFile(tree)).toBe('layouts/index.mir')
  })

  it('returns first available file when no index.mir exists', () => {
    const tree: StorageItem[] = [folder('empty', []), file('a.mir'), file('b.mir')]
    expect(findFirstFile(tree)).toBe('a.mir')
  })

  it('descends into folders for first file', () => {
    const tree: StorageItem[] = [
      folder('nested', [folder('deep', [file('deep.mir', 'nested/deep/deep.mir')])]),
    ]
    expect(findFirstFile(tree)).toBe('nested/deep/deep.mir')
  })

  it('returns null when tree contains only empty folders', () => {
    const tree: StorageItem[] = [folder('a', []), folder('b', [folder('c', [])])]
    expect(findFirstFile(tree)).toBeNull()
  })
})

describe('getExtensionPriority', () => {
  it('orders mir < com < tok < other', () => {
    expect(getExtensionPriority('a.mir')).toBe(0)
    expect(getExtensionPriority('a.mirror')).toBe(0)
    expect(getExtensionPriority('a.com')).toBe(1)
    expect(getExtensionPriority('a.components')).toBe(1)
    expect(getExtensionPriority('a.tok')).toBe(2)
    expect(getExtensionPriority('a.tokens')).toBe(2)
    expect(getExtensionPriority('a.txt')).toBe(3)
    expect(getExtensionPriority('noext')).toBe(3)
  })
})

describe('sortTreeItems', () => {
  it('puts folders before files', () => {
    const items: StorageItem[] = [file('z.mir'), folder('a-folder', [])]
    const sorted = sortTreeItems(items)
    expect(sorted[0].type).toBe('folder')
    expect(sorted[1].type).toBe('file')
  })

  it('sorts files by extension priority before alphabetical', () => {
    const items: StorageItem[] = [file('z.tok'), file('a.txt'), file('m.mir'), file('c.com')]
    const sorted = sortTreeItems(items)
    expect(sorted.map(i => i.name)).toEqual(['m.mir', 'c.com', 'z.tok', 'a.txt'])
  })

  it('sorts alphabetically within same priority', () => {
    const items: StorageItem[] = [file('z.mir'), file('a.mir'), file('m.mir')]
    const sorted = sortTreeItems(items)
    expect(sorted.map(i => i.name)).toEqual(['a.mir', 'm.mir', 'z.mir'])
  })

  it('sorts folders alphabetically among themselves', () => {
    const items: StorageItem[] = [folder('z'), folder('a'), folder('m')]
    const sorted = sortTreeItems(items)
    expect(sorted.map(i => i.name)).toEqual(['a', 'm', 'z'])
  })

  it('does not mutate input', () => {
    const items: StorageItem[] = [file('z.mir'), file('a.mir')]
    const before = items.map(i => i.name)
    sortTreeItems(items)
    expect(items.map(i => i.name)).toEqual(before)
  })
})
