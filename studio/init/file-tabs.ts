/**
 * Editor File Tabs Renderer
 *
 * Extracted from app.ts. Renders the editor-file-tabs strip (Daten / Tokens /
 * Komponenten / Anwendung), sorted by phase. Cheap diff: skips re-render when
 * the tab set + active tab haven't changed, so listeners aren't destroyed on
 * every save.
 */

const FILE_PHASE: Record<string, number> = {
  data: 0,
  tokens: 1,
  component: 2,
  javascript: 3,
  layout: 4,
}

const TAB_LABELS: Record<string, string> = {
  'data.mir': 'Daten',
  'tokens.mir': 'Tokens',
  'components.mir': 'Komponenten',
  'app.mir': 'Anwendung',
}

export function tabLabel(filename: string): string {
  return TAB_LABELS[filename] ?? filename
}

export interface FileTabsDeps {
  getFiles: () => Record<string, string>
  getCurrentFile: () => string
  detectFileType: (filename: string, content: string) => string
  switchFile: (filename: string) => void
}

export function renderEditorFileTabs(activeFilename: string, deps: FileTabsDeps): void {
  const container = document.getElementById('editor-file-tabs')
  if (!container) return

  const allFiles = deps.getFiles()
  const entries = Object.entries(allFiles).filter(
    ([, content]) => typeof content === 'string'
  ) as Array<[string, string]>

  const sorted = entries
    .map(([name, content]) => ({ name, type: deps.detectFileType(name, content) }))
    .sort((a, b) => {
      const pa = FILE_PHASE[a.type] ?? 99
      const pb = FILE_PHASE[b.type] ?? 99
      if (pa !== pb) return pa - pb
      return a.name.localeCompare(b.name)
    })

  const desiredKey = sorted.map(s => s.name).join('|') + '||' + activeFilename
  if (container.dataset.tabsKey === desiredKey) return
  container.dataset.tabsKey = desiredKey

  container.innerHTML = ''
  for (const { name } of sorted) {
    const btn = document.createElement('button')
    btn.className = 'editor-file-tab'
    btn.dataset.file = name
    btn.textContent = tabLabel(name)
    if (name === activeFilename) btn.classList.add('active')
    btn.addEventListener('click', () => {
      if (name === deps.getCurrentFile()) return
      deps.switchFile(name)
      renderEditorFileTabs(name, deps)
    })
    container.appendChild(btn)
  }
}

export function syncEditorFileTabs(activeFilename: string, deps: FileTabsDeps): void {
  renderEditorFileTabs(activeFilename, deps)
}
