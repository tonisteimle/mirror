/**
 * E2E: TauriProvider gegen echtes examples/personas-informatik
 *
 * Validiert den vollen JS-side-Flow von "Open Folder" bis sichtbarem
 * File-Tree:
 *   1. TauriProvider.openProject(path)
 *      → ruft bridge.project.openProject (Rust open_project) ✱
 *      → setzt JS basePath
 *   2. TauriProvider.getTree()
 *      → bridge.fs.listDirectory rekursiv
 *      → Filter via isMirrorProjectFile
 *      → 4 Mirror-Files (app.mir, components.com, data.data, tokens.tok)
 *   3. TauriProvider.readFile('app.mir')
 *      → bridge.fs.readFile (mit relativem Pfad zu basePath)
 *      → Inhalt der echten Datei
 *
 * Der Bridge-Mock spiegelt die Rust-FS-API auf node:fs ab — damit ist
 * dieser Test "E2E" für den TS-Layer ohne Tauri-Runtime.
 *
 * ✱ Critical: vor dem Fix in providers/tauri.ts:openProject hat die
 *   JS-Seite die Rust-Backend-State (AppState.basePath) nicht informiert.
 *   guard_path schlug dann jeden weiteren read_file/list_directory ab
 *   → File-Tree blieb leer, das Projekt "öffnete sich nicht".
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'node:fs'
import * as nodePath from 'node:path'
import { TauriProvider } from '../../studio/storage/providers/tauri'

const PROJECT_ROOT = nodePath.resolve(__dirname, '../../examples/personas-informatik')

interface BridgeCallLog {
  cmd: string
  args: unknown
}

function installMockTauriBridge(callLog: BridgeCallLog[]): void {
  const log = (cmd: string, args: unknown) => callLog.push({ cmd, args })

  ;(globalThis as { window?: unknown }).window = (globalThis as { window?: unknown }).window ?? {}
  // Tauri-Detection
  ;(globalThis.window as Record<string, unknown>).__TAURI_INTERNALS__ = {}
  ;(globalThis.window as Record<string, unknown>).TauriBridge = {
    isTauri: () => true,
    fs: {
      readFile: async (path: string) => {
        log('read_file', { path })
        return fs.readFileSync(path, 'utf8')
      },
      writeFile: async (path: string, content: string) => {
        log('write_file', { path, content: `<${content.length} bytes>` })
        fs.writeFileSync(path, content)
      },
      listDirectory: async (path: string) => {
        log('list_directory', { path })
        const entries = fs.readdirSync(path, { withFileTypes: true })
        return {
          path,
          files: entries.map(e => ({ name: e.name, is_dir: e.isDirectory() })),
        }
      },
      createDirectory: async (path: string) => {
        log('create_directory', { path })
        fs.mkdirSync(path, { recursive: true })
      },
      deletePath: async (path: string) => {
        log('delete_path', { path })
        fs.rmSync(path, { recursive: true, force: true })
      },
      renamePath: async (from: string, to: string) => {
        log('rename_path', { from, to })
        fs.renameSync(from, to)
      },
      pathExists: async (path: string) => {
        log('path_exists', { path })
        return fs.existsSync(path)
      },
    },
    dialog: {
      openFolder: async () => null,
      openFile: async () => null,
    },
    project: {
      openProject: async (path: string) => {
        log('open_project', { path })
      },
      createProject: async (name: string, parent: string) => {
        log('create_project', { name, parent })
      },
      getRecentProjects: async () => {
        log('get_recent_projects', {})
        return []
      },
    },
    window: {
      setTitle: async (title: string) => {
        log('set_window_title', { title })
      },
    },
  }
}

describe('TauriProvider E2E gegen examples/personas-informatik', () => {
  let calls: BridgeCallLog[]
  let provider: TauriProvider

  beforeAll(() => {
    calls = []
    installMockTauriBridge(calls)
    provider = new TauriProvider()
  })

  it('Phase A: openProject ruft Rust open_project bevor basePath gesetzt wird', async () => {
    await provider.openProject(PROJECT_ROOT)

    // Der Backend-Call muss zuerst kommen (sonst blockt guard_path alle FS-Ops)
    const openIdx = calls.findIndex(c => c.cmd === 'open_project')
    expect(openIdx).toBeGreaterThanOrEqual(0)
    expect(calls[openIdx].args).toEqual({ path: PROJECT_ROOT })

    // Set-Title danach (best-effort, blockt nicht)
    const titleIdx = calls.findIndex(c => c.cmd === 'set_window_title')
    expect(titleIdx).toBeGreaterThan(openIdx)
  })

  it('Phase B: getTree zeigt alle 4 Mirror-Files (filtert .js, .html)', async () => {
    const tree = await provider.getTree()

    const names = tree
      .filter(t => t.type === 'file')
      .map(t => t.name)
      .sort()
    expect(names).toEqual(['app.mir', 'components.com', 'data.data', 'tokens.tok'])

    // personas.js + preview.html + (kein .data vor Phase 1.1) wurden gefiltert
    expect(names).not.toContain('personas.js')
    expect(names).not.toContain('preview.html')

    // Phase-1.1-Assertion: data.data ist drin
    expect(names).toContain('data.data')
  })

  it('Phase C: readFile liefert echten Disk-Inhalt für relative Pfade', async () => {
    const content = await provider.readFile('app.mir')
    expect(content.startsWith('// Personas')).toBe(true)
    expect(content).toContain('canvas desktop')
    expect(content).toContain('Hero')

    const tokens = await provider.readFile('tokens.tok')
    expect(tokens).toContain('yellow.bg:')

    // Bridge-Call: relative Pfade werden gegen basePath aufgelöst
    const lastReadCall = [...calls].reverse().find(c => c.cmd === 'read_file')
    expect(lastReadCall).toBeDefined()
    expect((lastReadCall!.args as { path: string }).path).toContain(PROJECT_ROOT)
  })

  it('Phase D: alle FS-Operationen liefen vollständig durch', async () => {
    // Sanity-check über alle Calls — nichts geht in einen Error-Pfad
    const cmdCounts = calls.reduce<Record<string, number>>((acc, c) => {
      acc[c.cmd] = (acc[c.cmd] || 0) + 1
      return acc
    }, {})
    expect(cmdCounts.open_project).toBe(1)
    expect(cmdCounts.list_directory).toBeGreaterThan(0)
    expect(cmdCounts.read_file).toBeGreaterThanOrEqual(2) // app.mir + tokens.tok aus Phase C
  })
})
