/**
 * Play Mode (Component Testing)
 *
 * Wires the toolbar play button, reset button, device selector, and
 * play-mode-related preview-panel styling to the studio state. When
 * play mode is active, the preview becomes interactive (selection /
 * hover / handles disabled) and an optional device frame can be
 * applied.
 *
 * Extracted from studio/app.js (legacy IIFE) so the glue is typed.
 */

import { state, actions, events } from '../core'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('PlayMode')

/**
 * Device presets for play-mode simulation.
 * - `fixed`: exact size, preview is centered.
 * - `max`: only max-width/height, panel still controls outer size.
 */
const DEVICE_PRESETS: Record<string, { width: number; height: number; mode: 'fixed' | 'max' }> = {
  'iPhone SE': { width: 375, height: 667, mode: 'fixed' },
  'iPhone 14': { width: 390, height: 844, mode: 'fixed' },
  'iPhone 14 Pro Max': { width: 430, height: 932, mode: 'fixed' },
  'iPad Mini': { width: 768, height: 1024, mode: 'fixed' },
  'iPad Pro': { width: 1024, height: 1366, mode: 'max' },
  Desktop: { width: 1440, height: 900, mode: 'max' },
}

export interface PlayModeDeps {
  /**
   * Recompile the editor source — invoked by the reset button to
   * reset all component state by recompiling from scratch.
   */
  recompile: (source: string) => void
  /** Returns the current editor source. */
  getEditorSource: () => string
}

/**
 * Wire up Play Mode controls.
 *
 * Idempotent — if the required DOM elements are missing, logs a
 * warning and exits without throwing.
 */
export function initPlayMode(deps: PlayModeDeps): void {
  const playBtn = document.getElementById('play-btn')
  const previewPanel = document.querySelector<HTMLElement>('.preview-panel')
  const resetBtn = document.getElementById('play-reset-btn')
  const deviceSelect = document.getElementById('device-select') as HTMLSelectElement | null
  const preview = document.getElementById('preview')

  if (!playBtn || !previewPanel) {
    log.warn('[PlayMode] Missing required elements')
    return
  }

  playBtn.addEventListener('click', () => {
    actions.togglePlayMode()
  })

  resetBtn?.addEventListener('click', () => {
    log.debug('[PlayMode] Resetting state via recompile')
    deps.recompile(deps.getEditorSource())
  })

  if (deviceSelect && preview) {
    deviceSelect.addEventListener('change', () => {
      const preset = DEVICE_PRESETS[deviceSelect.value]
      if (preset) {
        preview.style.setProperty('--device-width', `${preset.width}px`)
        preview.style.setProperty('--device-height', `${preset.height}px`)
        preview.classList.remove('device-mode', 'device-mode-max')
        preview.classList.add(preset.mode === 'max' ? 'device-mode-max' : 'device-mode')
        log.debug(
          `[PlayMode] Device set to ${deviceSelect.value} (${preset.width}×${preset.height}, ${preset.mode})`
        )
      } else {
        preview.classList.remove('device-mode', 'device-mode-max')
        preview.style.removeProperty('--device-width')
        preview.style.removeProperty('--device-height')
        log.debug('[PlayMode] Device set to Responsive')
      }
    })
  }

  events.on('preview:playmode', ({ active }: { active: boolean }) => {
    playBtn.classList.toggle('active', active)
    previewPanel.classList.toggle('play-mode', active)

    if (active) {
      actions.setSelection(null, 'preview')
    }

    if (!active && deviceSelect && preview) {
      deviceSelect.value = ''
      preview.classList.remove('device-mode', 'device-mode-max')
      preview.style.removeProperty('--device-width')
      preview.style.removeProperty('--device-height')
    }
  })

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.get().playMode) {
      actions.setPlayMode(false)
    }
  })

  log.debug('[PlayMode] Initialized')
}
