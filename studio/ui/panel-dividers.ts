/**
 * Resizable Panel Dividers (legacy)
 *
 * Manual mousedown/mousemove resizers for the four-pane studio layout
 * (sidebar + components + editor + preview). Sizes are persisted via
 * `MirrorStudio.actions.setPanelSizes` to localStorage.
 *
 * NOTE: studio/ui/splitter.ts ships a Zag-based replacement that is
 * intended to take over from these handlers; this module preserves
 * the existing behaviour until the splitter migration lands.
 */

const log = (...args: unknown[]): void => console.log('[PanelResizer]', ...args)
const warn = (...args: unknown[]): void => console.warn('[PanelResizer]', ...args)

interface PanelSizes {
  sidebar: number
  components: number
  editor: number
  preview: number
}

interface MirrorStudioBridge {
  state?: {
    get: () => { panelSizes?: Partial<PanelSizes> }
  }
  actions?: {
    setPanelSizes?: (sizes: PanelSizes) => void
    invalidateLayoutInfo?: (reason: string) => void
  }
  getPreviewController?: () => {
    getResizeManager?: () => { refresh?: () => void } | null
  } | null
}

export interface PanelDividerDeps {
  /** Element with the file-tree / explorer panel. May be null if hidden. */
  sidebar: HTMLElement | null
  sidebarDivider: HTMLElement | null
  /** Component palette panel. May be null if hidden. */
  componentsPanel: HTMLElement | null
  componentsDivider: HTMLElement | null
  /** Editor panel — required. */
  editorPanel: HTMLElement
  editorDivider: HTMLElement
  /** Preview panel — required. */
  previewPanel: HTMLElement
  /**
   * Returns the global studio bridge for state/actions access. Called
   * lazily so the bridge can be installed after dividers are wired.
   */
  getStudio: () => MirrorStudioBridge | undefined
}

const MIN_PANEL = 200
const MIN_SIDEBAR = 150
const MIN_COMPONENTS = 180

/**
 * Wire up the resizable dividers between studio panels.
 * Idempotent — if any required element is missing, logs a warning and exits.
 */
export function initPanelDividers(deps: PanelDividerDeps): void {
  const {
    sidebar,
    sidebarDivider,
    componentsPanel,
    componentsDivider,
    editorPanel,
    editorDivider,
    previewPanel,
    getStudio,
  } = deps

  if (!editorPanel || !editorDivider || !previewPanel) {
    warn('Missing editor/preview elements')
    return
  }

  function loadSavedSizes(): void {
    try {
      const studio = getStudio()
      const sizes = studio?.state?.get().panelSizes
      if (!sizes) return

      if (sidebar && sizes.sidebar) sidebar.style.width = `${sizes.sidebar}px`
      if (componentsPanel && sizes.components) {
        componentsPanel.style.width = `${sizes.components}px`
      }
      if (sizes.editor) editorPanel.style.width = `${sizes.editor}px`
      if (sizes.preview) previewPanel.style.width = `${sizes.preview}px`
      log('Restored saved sizes:', sizes)
    } catch (e) {
      warn('Failed to load saved sizes:', e)
    }
  }

  function saveSizes(): void {
    try {
      const studio = getStudio()
      const setPanelSizes = studio?.actions?.setPanelSizes
      if (!setPanelSizes) return

      const sizes: PanelSizes = {
        sidebar: sidebar ? sidebar.offsetWidth : 200,
        components: componentsPanel ? componentsPanel.offsetWidth : 220,
        editor: editorPanel.offsetWidth,
        preview: previewPanel.offsetWidth,
      }
      setPanelSizes(sizes)
      log('Saved sizes:', sizes)
    } catch (e) {
      warn('Failed to save sizes:', e)
    }
  }

  // Sidebar Resizer
  if (sidebar && sidebarDivider) {
    let isDragging = false
    let startX = 0
    let startWidth = 0

    sidebarDivider.addEventListener('mousedown', e => {
      isDragging = true
      startX = e.clientX
      startWidth = sidebar.offsetWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      sidebarDivider.classList.add('dragging')
      e.preventDefault()
    })

    document.addEventListener('mousemove', e => {
      if (!isDragging) return
      const deltaX = e.clientX - startX
      const newWidth = Math.max(MIN_SIDEBAR, startWidth + deltaX)
      sidebar.style.width = `${newWidth}px`
    })

    document.addEventListener('mouseup', () => {
      if (!isDragging) return
      isDragging = false
      sidebarDivider.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      saveSizes()
    })

    log('Sidebar divider ready')
  }

  // Components Panel Resizer
  if (componentsPanel && componentsDivider) {
    let isDragging = false
    let startX = 0
    let startWidth = 0

    componentsDivider.addEventListener('mousedown', e => {
      isDragging = true
      startX = e.clientX
      startWidth = componentsPanel.offsetWidth
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      componentsDivider.classList.add('dragging')
      e.preventDefault()
    })

    document.addEventListener('mousemove', e => {
      if (!isDragging) return
      const deltaX = e.clientX - startX
      const newWidth = Math.max(MIN_COMPONENTS, startWidth + deltaX)
      componentsPanel.style.width = `${newWidth}px`
    })

    document.addEventListener('mouseup', () => {
      if (!isDragging) return
      isDragging = false
      componentsDivider.classList.remove('dragging')
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      saveSizes()
    })

    log('Components divider ready')
  }

  // Editor/Preview Resizer
  let isEditorDragging = false
  let editorStartX = 0
  let startEditorWidth = 0
  let startPreviewWidth = 0

  editorDivider.addEventListener('mousedown', e => {
    isEditorDragging = true
    editorStartX = e.clientX
    startEditorWidth = editorPanel.offsetWidth
    startPreviewWidth = previewPanel.offsetWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    editorDivider.classList.add('dragging')
    e.preventDefault()
  })

  document.addEventListener('mousemove', e => {
    if (!isEditorDragging) return
    const deltaX = e.clientX - editorStartX
    const newEditorWidth = Math.max(MIN_PANEL, startEditorWidth + deltaX)
    const newPreviewWidth = Math.max(MIN_PANEL, startPreviewWidth - deltaX)
    if (newEditorWidth >= MIN_PANEL && newPreviewWidth >= MIN_PANEL) {
      editorPanel.style.width = `${newEditorWidth}px`
      previewPanel.style.width = `${newPreviewWidth}px`
    }
  })

  document.addEventListener('mouseup', () => {
    if (!isEditorDragging) return
    isEditorDragging = false
    editorDivider.classList.remove('dragging')
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    saveSizes()

    // Invalidate layout cache and refresh resize handles after panel resize
    const studio = getStudio()
    studio?.actions?.invalidateLayoutInfo?.('resize')
    studio?.getPreviewController?.()?.getResizeManager?.()?.refresh?.()
  })

  // Load saved sizes after a short delay to ensure state is initialized
  setTimeout(loadSavedSizes, 100)

  log('Editor/Preview divider ready')
}
