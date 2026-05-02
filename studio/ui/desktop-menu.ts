/**
 * Desktop Menu Event Handler (Tauri)
 *
 * Wires the native macOS/Windows app menu (File / View) to studio
 * actions. Polls for `window.TauriBridge.menu` for up to 5s, then
 * registers a single click handler that dispatches by `menuId`.
 *
 * No-op outside the Tauri shell.
 */

import type { PanelVisibility } from '../core/state'

interface TauriMenuBridge {
  onMenuClick: (cb: (menuId: string) => Promise<void>) => Promise<void>
}

function getMenuBridge(): TauriMenuBridge | undefined {
  return (window as unknown as { TauriBridge?: { menu?: TauriMenuBridge } }).TauriBridge?.menu
}

interface DesktopFilesAPI {
  openFolder: () => Promise<string | null>
  getCurrentFolder: () => string | null
  getCurrentFile: () => string | null
  getFiles: () => Record<string, string>
  createFile: (name: string) => Promise<void>
  createFolder: (name: string) => Promise<void>
  saveFile: (path: string, content: string) => Promise<void>
}

interface PanelActions {
  setPanelVisibility: (panel: keyof PanelVisibility, visible: boolean) => void
  getPanelVisibility?: (panel: string) => boolean | undefined
}

export interface DesktopMenuDeps {
  /** True iff running inside the Tauri shell. No-op otherwise. */
  isTauriDesktop: () => boolean
  /** Returns the current editor source for save operations. */
  getEditorContent: () => string
  /** Studio actions for panel visibility toggles. */
  studioActions: PanelActions
  /** Native-style alert (from studio/dialog.js). */
  alert: (msg: string, opts?: { title?: string }) => Promise<void>
}

import { createLogger } from '../../compiler/utils/logger'
const menuLog = createLogger('Menu')
const log = (...args: unknown[]): void => menuLog.debug(...(args as [unknown, ...unknown[]]))
const errLog = (...args: unknown[]): void => menuLog.error(...(args as [unknown, ...unknown[]]))

const FOLDER_ALERT = 'Bitte zuerst einen Ordner öffnen (File → Open Folder oder ⌘O)'
const FOLDER_ALERT_TITLE = 'Kein Projekt'

const PANEL_TOGGLE_PREFIX = 'toggle_'
const PANEL_TOGGLE_IDS = [
  'toggle_prompt',
  'toggle_files',
  'toggle_code',
  'toggle_components',
  'toggle_preview',
  'toggle_property',
] as const

function getDesktopFiles(): DesktopFilesAPI | undefined {
  return (window as unknown as { desktopFiles?: DesktopFilesAPI }).desktopFiles
}

export async function setupDesktopMenuHandler(deps: DesktopMenuDeps): Promise<void> {
  if (!deps.isTauriDesktop()) return

  let attempts = 0
  let menuBridge = getMenuBridge()
  while (!menuBridge && attempts < 50) {
    await new Promise(r => setTimeout(r, 100))
    attempts++
    menuBridge = getMenuBridge()
  }

  if (!menuBridge) {
    errLog('TauriBridge.menu not available after waiting')
    return
  }

  try {
    await menuBridge.onMenuClick(async menuId => {
      log('Event:', menuId)
      const desktopFiles = getDesktopFiles()

      switch (menuId) {
        case 'open_folder':
          if (desktopFiles) {
            const path = await desktopFiles.openFolder()
            if (path) log('Opened folder:', path)
          }
          break

        case 'new_file': {
          log('new_file - currentFolder:', desktopFiles?.getCurrentFolder())
          if (!desktopFiles?.getCurrentFolder()) {
            await deps.alert(FOLDER_ALERT, { title: FOLDER_ALERT_TITLE })
            break
          }
          const existingFiles = Object.keys(desktopFiles.getFiles() || {})
          let counter = 1
          let fileName = 'new.mirror'
          while (existingFiles.some(f => f.endsWith(fileName))) {
            fileName = `new-${counter}.mirror`
            counter++
          }
          log('new_file - creating:', fileName)
          await desktopFiles.createFile(fileName)
          break
        }

        case 'new_folder': {
          log('new_folder - currentFolder:', desktopFiles?.getCurrentFolder())
          if (!desktopFiles?.getCurrentFolder()) {
            await deps.alert(FOLDER_ALERT, { title: FOLDER_ALERT_TITLE })
            break
          }
          const folderName = 'new-folder'
          log('new_folder - creating:', folderName)
          await desktopFiles.createFolder(folderName)
          break
        }

        case 'save': {
          const file = desktopFiles?.getCurrentFile()
          if (file && desktopFiles) {
            await desktopFiles.saveFile(file, deps.getEditorContent())
          }
          break
        }

        case 'save_all': {
          const files = desktopFiles?.getFiles() || {}
          for (const [path, content] of Object.entries(files)) {
            await desktopFiles?.saveFile(path, content)
          }
          break
        }

        case 'new_project':
          break

        default:
          if ((PANEL_TOGGLE_IDS as readonly string[]).includes(menuId)) {
            const panelKey = menuId.slice(PANEL_TOGGLE_PREFIX.length) as keyof PanelVisibility
            const visible = !deps.studioActions.getPanelVisibility?.(panelKey)
            deps.studioActions.setPanelVisibility(panelKey, visible)
          } else {
            log('Unhandled:', menuId)
          }
      }
    })
    log('Desktop menu handler registered')
  } catch (e) {
    errLog('Failed to register handler:', e)
  }
}
