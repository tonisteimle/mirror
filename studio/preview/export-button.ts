/**
 * Export Button — Mirror → Framework Code via AI
 *
 * Toolbar button that opens a dialog asking target/snapshot, posts the
 * current Studio file-set to the AI-bridge `/export` endpoint (NDJSON
 * streaming), and shows phase-by-phase progress live. After successful
 * export, the user can either copy the claude command or click "Run
 * Claude" to invoke it directly.
 *
 * Two execution paths for the "Run Claude" step:
 *
 *   Browser   → /agent/run via the AI-Bridge HTTP server
 *               (`npm run ai-bridge`). Requires the bridge running.
 *   Tauri app → TauriAgent.runAgent — invokes the user's local
 *               `claude` CLI directly. No HTTP server needed.
 *
 * Tracked in docs/concepts/tauri-strategy.md ("Export-Button →
 * TauriAgent migration"). Bundle-build migration (the /export
 * endpoint) is Node-only and stays HTTP today; its browser/Tauri
 * port is the queued follow-up slice.
 */

import { state } from '../core'
import { createLogger } from '../../compiler/utils/logger'
import { escapeHtml as escape } from '../../compiler/utils/escape-html'

const log = createLogger('ExportButton')

const BRIDGE_URL = 'http://localhost:3456'

interface TauriAgentBridge {
  checkClaudeCli(): Promise<boolean>
  runAgent(
    prompt: string,
    agentType: string,
    projectPath?: string,
    sessionId?: string | null
  ): Promise<{ session_id: string; success: boolean; output: string; error: string | null }>
}

/** Resolve TauriBridge.agent if running inside the Tauri shell. Returns
 *  null in the browser so callers fall back to the HTTP path. */
function getTauriAgent(): TauriAgentBridge | null {
  const tb = (
    window as unknown as {
      TauriBridge?: { isTauri?: () => boolean; agent?: TauriAgentBridge }
    }
  ).TauriBridge
  if (!tb?.isTauri?.() || !tb.agent) return null
  return tb.agent
}

type Target = 'react' | 'vue' | 'svelte' | 'vanilla'

interface StreamEvent {
  phase: 'init' | 'write-files' | 'export' | 'snapshot' | 'log' | 'done' | 'error'
  message?: string
  error?: string
  bundlePath?: string
  command?: string
  target?: string
  snapshot?: boolean
  fileCount?: number
  step?: string
  stream?: 'stdout' | 'stderr'
}

export function initExportButton(): void {
  const btn = document.getElementById('export-btn')
  if (!btn) return
  btn.addEventListener('click', openExportDialog)
}

function openExportDialog(): void {
  const overlay = buildOverlay()
  document.body.appendChild(overlay)
  setTimeout(() => overlay.querySelector<HTMLElement>('select')?.focus(), 0)
}

function buildOverlay(): HTMLDivElement {
  const overlay = document.createElement('div')
  overlay.className = 'export-dialog-overlay'
  overlay.innerHTML = `
    <div class="export-dialog">
      <div class="export-dialog-header">
        <h3>Export Mirror-Projekt</h3>
        <button class="export-dialog-close" type="button" aria-label="Schliessen">×</button>
      </div>
      <div class="export-dialog-body">
        <p class="export-dialog-intro">
          Bündelt das aktuelle Projekt + Brief + Pipeline-Instructions
          und übergibt es an Claude Code zur Konvertierung in echten
          Framework-Code.
        </p>
        <label class="export-field">
          <span>Target</span>
          <select name="target">
            <option value="react">React 18 + TypeScript + Tailwind</option>
            <option value="vue">Vue 3 + TypeScript + Tailwind</option>
            <option value="svelte">Svelte 5 + TypeScript + Tailwind</option>
            <option value="vanilla">Vanilla HTML + CSS</option>
          </select>
        </label>
        <label class="export-field export-field-checkbox">
          <input type="checkbox" name="snapshot" checked />
          <span>Render-Snapshot mit erfassen <small>(empfohlen, +10 s)</small></span>
        </label>
      </div>
      <div class="export-dialog-progress" hidden>
        <div class="export-dialog-progress-header">
          <span class="export-dialog-progress-phase">Bereit</span>
          <span class="export-dialog-progress-time">0.0 s</span>
        </div>
        <div class="export-dialog-progress-bar">
          <div class="export-dialog-progress-bar-fill"></div>
        </div>
        <pre class="export-dialog-progress-log" aria-live="polite"></pre>
      </div>
      <div class="export-dialog-result" hidden></div>
      <div class="export-dialog-footer">
        <button class="export-dialog-cancel" type="button">Abbrechen</button>
        <button class="export-dialog-submit" type="button">Export starten</button>
      </div>
    </div>
  `

  // Restore last-selected target from localStorage so the dialog opens
  // showing the user's persistent choice. This is the same key that
  // app.ts:compile() reads each compile to surface W130 BACKEND_UNSUPPORTED
  // warnings — single source of truth for "what backend am I targeting?".
  const targetSelEl = overlay.querySelector<HTMLSelectElement>('select[name="target"]')
  const LINTER_TARGET_KEY = 'mirror.linter-target'
  if (targetSelEl) {
    try {
      const saved = localStorage.getItem(LINTER_TARGET_KEY)
      if (saved && Array.from(targetSelEl.options).some(o => o.value === saved)) {
        targetSelEl.value = saved
      }
    } catch {
      // localStorage unavailable — keep dialog default.
    }
    // On change: persist + trigger a fresh compile so the editor's W130
    // markers update immediately. User can preview "what would break in
    // target X" before actually starting the export.
    targetSelEl.addEventListener('change', () => {
      const v = targetSelEl.value
      try {
        if (v) localStorage.setItem(LINTER_TARGET_KEY, v)
        else localStorage.removeItem(LINTER_TARGET_KEY)
      } catch {
        // localStorage unavailable — value lives only for this dialog session.
      }
      // Re-compile so validator runs against the new target.
      const compile = (window as { __compileRealNow?: (code?: string) => void }).__compileRealNow
      compile?.()
    })
  }

  const close = () => overlay.remove()
  overlay.querySelector('.export-dialog-close')?.addEventListener('click', close)
  overlay.querySelector('.export-dialog-cancel')?.addEventListener('click', close)
  overlay.addEventListener('click', e => {
    if (e.target === overlay) close()
  })
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      close()
      document.removeEventListener('keydown', onEsc)
    }
  })

  overlay.querySelector('.export-dialog-submit')?.addEventListener('click', () => {
    runExport(overlay)
  })

  return overlay
}

async function runExport(overlay: HTMLElement): Promise<void> {
  const targetSel = overlay.querySelector<HTMLSelectElement>('select[name="target"]')
  const snapshotCb = overlay.querySelector<HTMLInputElement>('input[name="snapshot"]')
  const submitBtn = overlay.querySelector<HTMLButtonElement>('.export-dialog-submit')
  const cancelBtn = overlay.querySelector<HTMLButtonElement>('.export-dialog-cancel')
  const bodyEl = overlay.querySelector<HTMLElement>('.export-dialog-body')
  const progressEl = overlay.querySelector<HTMLElement>('.export-dialog-progress')
  const phaseEl = overlay.querySelector<HTMLElement>('.export-dialog-progress-phase')
  const timeEl = overlay.querySelector<HTMLElement>('.export-dialog-progress-time')
  const fillEl = overlay.querySelector<HTMLElement>('.export-dialog-progress-bar-fill')
  const logEl = overlay.querySelector<HTMLElement>('.export-dialog-progress-log')
  const resultEl = overlay.querySelector<HTMLElement>('.export-dialog-result')
  if (
    !targetSel ||
    !snapshotCb ||
    !submitBtn ||
    !cancelBtn ||
    !bodyEl ||
    !progressEl ||
    !phaseEl ||
    !timeEl ||
    !fillEl ||
    !logEl ||
    !resultEl
  )
    return

  const target = targetSel.value as Target
  const snapshot = snapshotCb.checked

  // state.files is only populated by tests; in production the file map
  // lives at window.files (mirroring the in-module `files` constant in
  // app.ts — declared on Window in app.ts:declare global). Read state
  // first, fall back to window.files.
  const stateFiles = state.get().files as Record<string, string> | undefined
  const winFiles = window.files
  const files: Record<string, string> =
    stateFiles && Object.keys(stateFiles).length > 0 ? stateFiles : (winFiles ?? {})

  if (!files || Object.keys(files).length === 0) {
    setPhase(phaseEl, fillEl, 'Keine Dateien im Projekt', 'error', 0)
    progressEl.hidden = false
    bodyEl.hidden = true
    return
  }

  // UI: hide form, show progress
  bodyEl.hidden = true
  progressEl.hidden = false
  submitBtn.disabled = true
  submitBtn.textContent = 'Läuft...'
  cancelBtn.textContent = 'Schliessen'

  const start = performance.now()
  const tick = setInterval(() => {
    timeEl.textContent = `${((performance.now() - start) / 1000).toFixed(1)} s`
  }, 100)

  const projectName = derivProjectName(files)
  let lastEvent: StreamEvent | null = null

  try {
    const res = await fetch(`${BRIDGE_URL}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files, target, snapshot, projectName }),
    })
    if (!res.body) throw new Error('no response body')

    for await (const event of readNdjsonStream(res.body)) {
      lastEvent = event
      handleEvent(event, { phaseEl, fillEl, logEl })
    }

    clearInterval(tick)
    if (lastEvent?.phase === 'done') {
      showSuccess(progressEl, resultEl, lastEvent, submitBtn)
    } else if (lastEvent?.phase === 'error') {
      setPhase(phaseEl, fillEl, `Fehler: ${lastEvent.error}`, 'error', 1)
      submitBtn.disabled = false
      submitBtn.textContent = 'Erneut versuchen'
      submitBtn.onclick = () => runExport(overlay)
    } else {
      setPhase(phaseEl, fillEl, 'Stream abrupt beendet', 'error', 1)
    }
  } catch (err) {
    clearInterval(tick)
    setPhase(
      phaseEl,
      fillEl,
      `Bridge nicht erreichbar (${BRIDGE_URL}). Läuft \`npm run ai-bridge\`?`,
      'error',
      1
    )
    submitBtn.disabled = false
    submitBtn.textContent = 'Erneut versuchen'
    log.error('export failed', err)
  }
}

const PHASE_ORDER: Record<string, { label: string; progress: number }> = {
  init: { label: 'Initialisieren', progress: 0.05 },
  'write-files': { label: 'Dateien schreiben', progress: 0.15 },
  export: { label: 'Bundle bauen', progress: 0.3 },
  snapshot: { label: 'Snapshot erfassen', progress: 0.7 },
  done: { label: 'Fertig', progress: 1 },
}

function handleEvent(
  event: StreamEvent,
  els: { phaseEl: HTMLElement; fillEl: HTMLElement; logEl: HTMLElement }
): void {
  if (event.phase === 'log') {
    appendLog(els.logEl, event.message || '', event.stream === 'stderr')
    return
  }
  if (event.phase === 'snapshot' && event.step) {
    const prog = event.step === 'mobile' ? 0.55 : event.step === 'tablet' ? 0.65 : 0.8
    setPhase(els.phaseEl, els.fillEl, `Snapshot ${event.step}…`, 'info', prog)
    return
  }
  const def = PHASE_ORDER[event.phase]
  if (def) {
    let label = def.label
    if (event.message) label = event.message
    if (event.target && event.fileCount !== undefined) {
      label = `${event.target} · ${event.fileCount} Dateien${event.snapshot ? ' · mit Snapshot' : ''}`
    }
    setPhase(
      els.phaseEl,
      els.fillEl,
      label,
      event.phase === 'done' ? 'success' : 'info',
      def.progress
    )
  }
}

function appendLog(logEl: HTMLElement, line: string, isErr: boolean): void {
  const prefix = isErr ? '⚠ ' : ''
  logEl.textContent += prefix + line + '\n'
  logEl.scrollTop = logEl.scrollHeight
}

function setPhase(
  phaseEl: HTMLElement,
  fillEl: HTMLElement,
  label: string,
  kind: 'info' | 'success' | 'error',
  progress: number
): void {
  phaseEl.textContent = label
  phaseEl.className = `export-dialog-progress-phase export-dialog-progress-phase-${kind}`
  fillEl.style.width = `${Math.round(progress * 100)}%`
  fillEl.className = `export-dialog-progress-bar-fill export-dialog-progress-bar-fill-${kind}`
}

function showSuccess(
  progressEl: HTMLElement,
  resultEl: HTMLElement,
  data: StreamEvent,
  submitBtn: HTMLButtonElement
): void {
  resultEl.hidden = false
  resultEl.innerHTML = `
    <div class="export-dialog-result-section">
      <label>Bundle-Pfad</label>
      <code class="export-dialog-result-code">${escape(data.bundlePath || '')}</code>
      <button class="export-dialog-copy" data-copy-text="${escape(data.bundlePath || '')}">Pfad kopieren</button>
    </div>
    <div class="export-dialog-result-section">
      <label>Claude-Command</label>
      <code class="export-dialog-result-code export-dialog-result-multiline">${escape(data.command || '')}</code>
      <div class="export-dialog-result-actions">
        <button class="export-dialog-copy" data-copy-text="${escape(data.command || '')}">Command kopieren</button>
        <button class="export-dialog-run-claude">Claude jetzt ausführen</button>
      </div>
    </div>
    <p class="export-dialog-result-hint">
      Generierter Code landet unter <code>${escape(data.bundlePath || '')}/generated/</code>.
    </p>
    <div class="export-dialog-claude-output" hidden></div>
  `
  resultEl.querySelectorAll<HTMLButtonElement>('.export-dialog-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copyText || '').then(() => {
        const orig = btn.textContent
        btn.textContent = '✓ Kopiert'
        setTimeout(() => (btn.textContent = orig || 'Kopieren'), 1500)
      })
    })
  })
  resultEl
    .querySelector<HTMLButtonElement>('.export-dialog-run-claude')
    ?.addEventListener('click', () => {
      runClaudeOnBundle(data.bundlePath || '', resultEl)
    })
  submitBtn.hidden = true
}

async function runClaudeOnBundle(bundlePath: string, resultEl: HTMLElement): Promise<void> {
  const outEl = resultEl.querySelector<HTMLElement>('.export-dialog-claude-output')
  const runBtn = resultEl.querySelector<HTMLButtonElement>('.export-dialog-run-claude')
  if (!outEl || !runBtn) return
  outEl.hidden = false
  runBtn.disabled = true
  runBtn.textContent = 'Läuft…'

  const start = performance.now()
  const tick = setInterval(() => {
    runBtn.textContent = `Läuft… (${((performance.now() - start) / 1000).toFixed(0)} s)`
  }, 1000)

  const prompt = [
    `cd ${bundlePath}`,
    'Read INSTRUCTIONS.md, MIRROR-BRIEF.md, target.json, source/*.',
    'Execute the pipeline in INSTRUCTIONS.md, gating on each step.',
    'Use Write/Edit/Bash to create files in ./generated/.',
  ].join('\n')

  // Tauri path — call the user's local claude CLI directly. No HTTP
  // server required. The Tauri runAgent doesn't stream by design (the
  // Rust command captures the full output before resolving), so the
  // user-visible behaviour matches the HTTP path: no live stream,
  // output arrives at the end. The migration to per-line streaming
  // would use TauriAgent.onAgentOutput + an event-driven append.
  const tauriAgent = getTauriAgent()
  if (tauriAgent) {
    outEl.textContent = 'Claude läuft… (Tauri direct-spawn, Output am Ende)'
    try {
      const data = await tauriAgent.runAgent(prompt, 'export', bundlePath, null)
      clearInterval(tick)
      if (data.success) {
        outEl.textContent = `✓ Fertig (${((performance.now() - start) / 1000).toFixed(1)} s)\n\n${data.output || ''}`
        runBtn.textContent = 'Fertig'
      } else {
        outEl.textContent = `✗ Fehler: ${data.error || 'unbekannt'}\n\n${data.output || ''}`
        runBtn.disabled = false
        runBtn.textContent = 'Erneut'
      }
    } catch (err) {
      clearInterval(tick)
      outEl.textContent = `TauriAgent-Fehler: ${err instanceof Error ? err.message : String(err)}`
      runBtn.disabled = false
      runBtn.textContent = 'Erneut'
    }
    return
  }

  // Browser path — go through the AI-Bridge HTTP server.
  outEl.textContent = 'Claude läuft… (kein Live-Stream — Output erscheint am Ende)'
  try {
    const res = await fetch(`${BRIDGE_URL}/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, projectPath: bundlePath }),
    })
    const data = await res.json()
    clearInterval(tick)
    if (data.success) {
      outEl.textContent = `✓ Fertig (${((performance.now() - start) / 1000).toFixed(1)} s)\n\n${data.output || ''}`
      runBtn.textContent = 'Fertig'
    } else {
      outEl.textContent = `✗ Fehler: ${data.error || 'unbekannt'}\n\n${data.output || ''}`
      runBtn.disabled = false
      runBtn.textContent = 'Erneut'
    }
  } catch (err) {
    clearInterval(tick)
    outEl.textContent = `Bridge-Fehler: ${err}`
    runBtn.disabled = false
    runBtn.textContent = 'Erneut'
  }
}

async function* readNdjsonStream(body: ReadableStream<Uint8Array>): AsyncIterable<StreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        yield JSON.parse(line) as StreamEvent
      } catch {
        // ignore parse errors on individual lines
      }
    }
  }
}

function derivProjectName(files: Record<string, string>): string {
  const names = Object.keys(files)
  const layout = names.find(n => n.endsWith('.mir') || n.endsWith('.mirror'))
  if (!layout) return 'mirror-project'
  const parts = layout.split('/').filter(Boolean)
  return parts.length > 1 ? parts[0] : 'mirror-project'
}
