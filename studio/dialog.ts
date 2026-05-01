/**
 * Custom Dialog Module
 *
 * Mirror-styled dialogs to replace native browser dialogs.
 * All functions return Promises for async/await usage.
 */

// =============================================================================
// Styles
// =============================================================================

const dialogStyles = `
.mirror-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  opacity: 0;
  transition: opacity 0.15s ease-out;
}

.mirror-dialog-overlay.visible {
  opacity: 1;
}

.mirror-dialog {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  min-width: 320px;
  max-width: 480px;
  transform: scale(0.95) translateY(-10px);
  transition: transform 0.15s ease-out;
}

.mirror-dialog-overlay.visible .mirror-dialog {
  transform: scale(1) translateY(0);
}

.mirror-dialog-header {
  padding: 20px 24px 0;
}

.mirror-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.mirror-dialog-body {
  padding: 16px 24px;
}

.mirror-dialog-message {
  font-size: 14px;
  color: #888;
  line-height: 1.5;
  margin: 0;
  white-space: pre-wrap;
}

.mirror-dialog-input {
  width: 100%;
  padding: 10px 12px;
  margin-top: 12px;
  background: #0a0a0a;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.mirror-dialog-input:focus {
  border-color: #5BA8F5;
}

.mirror-dialog-input::placeholder {
  color: #666;
}

.mirror-dialog-footer {
  padding: 16px 24px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mirror-dialog-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  font-family: inherit;
}

.mirror-dialog-btn-secondary {
  background: #333;
  color: #ccc;
}

.mirror-dialog-btn-secondary:hover {
  background: #444;
  color: #fff;
}

.mirror-dialog-btn-primary {
  background: #5BA8F5;
  color: #fff;
}

.mirror-dialog-btn-primary:hover {
  background: #2271C1;
}

.mirror-dialog-btn-danger {
  background: #ef4444;
  color: #fff;
}

.mirror-dialog-btn-danger:hover {
  background: #dc2626;
}
`

let stylesInjected = false
function injectStyles(): void {
  if (stylesInjected) return
  const style = document.createElement('style')
  style.textContent = dialogStyles
  document.head.appendChild(style)
  stylesInjected = true
}

// =============================================================================
// Internal types
// =============================================================================

interface DialogButton {
  label: string
  /** Value passed to onClose when this button is clicked. */
  value: unknown
  /** Marks the button as primary (focused, picked up by Enter key). */
  primary?: boolean
  /** Visual variant — currently `'danger'` for destructive confirms. */
  variant?: 'danger'
}

interface DialogInputConfig {
  placeholder?: string
  defaultValue?: string
}

interface DialogConfig {
  title?: string
  message: string
  input?: DialogInputConfig
  buttons: DialogButton[]
  onClose: (result: unknown) => void
}

interface DialogHandle {
  overlay: HTMLDivElement
  dialog: HTMLDivElement
  close: (result: unknown) => void
}

// =============================================================================
// Dialog Creation
// =============================================================================

function createDialog(config: DialogConfig): DialogHandle {
  injectStyles()

  const overlay = document.createElement('div')
  overlay.className = 'mirror-dialog-overlay'

  const dialog = document.createElement('div')
  dialog.className = 'mirror-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')

  let html = ''

  if (config.title) {
    html += `<div class="mirror-dialog-header"><h2 class="mirror-dialog-title">${escapeHtml(config.title)}</h2></div>`
  }

  html += `<div class="mirror-dialog-body">`
  html += `<p class="mirror-dialog-message">${escapeHtml(config.message)}</p>`

  if (config.input) {
    html += `<input type="text" class="mirror-dialog-input" placeholder="${escapeHtml(config.input.placeholder || '')}" value="${escapeHtml(config.input.defaultValue || '')}">`
  }

  html += `</div>`

  html += `<div class="mirror-dialog-footer">`
  config.buttons.forEach((btn, i) => {
    const btnClass =
      btn.variant === 'danger'
        ? 'mirror-dialog-btn-danger'
        : btn.primary
          ? 'mirror-dialog-btn-primary'
          : 'mirror-dialog-btn-secondary'
    html += `<button class="mirror-dialog-btn ${btnClass}" data-index="${i}">${escapeHtml(btn.label)}</button>`
  })
  html += `</div>`

  dialog.innerHTML = html
  overlay.appendChild(dialog)
  document.body.appendChild(overlay)

  const inputEl = dialog.querySelector<HTMLInputElement>('.mirror-dialog-input')
  const firstBtn = dialog.querySelector<HTMLButtonElement>('.mirror-dialog-btn')

  requestAnimationFrame(() => {
    overlay.classList.add('visible')
    if (inputEl) {
      inputEl.focus()
      inputEl.select()
    } else if (firstBtn) {
      const primaryBtn =
        dialog.querySelector<HTMLButtonElement>('.mirror-dialog-btn-primary') || firstBtn
      primaryBtn.focus()
    }
  })

  const close = (result: unknown): void => {
    overlay.classList.remove('visible')
    document.removeEventListener('keydown', handleKeydown)
    setTimeout(() => {
      overlay.remove()
      config.onClose(result)
    }, 150)
  }

  dialog.querySelectorAll<HTMLButtonElement>('.mirror-dialog-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index || '0', 10)
      const buttonDef = config.buttons[index]
      if (config.input && buttonDef.primary && inputEl) {
        close(inputEl.value)
      } else {
        close(buttonDef.value)
      }
    })
  })

  if (inputEl) {
    inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        close(inputEl.value)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        close(null)
      }
    })
  }

  const handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      const cancelBtn = config.buttons.find(b => !b.primary)
      close(cancelBtn ? cancelBtn.value : null)
    }
  }
  document.addEventListener('keydown', handleKeydown)

  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      const cancelBtn = config.buttons.find(b => !b.primary)
      close(cancelBtn ? cancelBtn.value : null)
    }
  })

  return { overlay, dialog, close }
}

function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// =============================================================================
// Public API
// =============================================================================

export interface AlertOptions {
  title?: string
  buttonLabel?: string
}

/** Show an alert dialog. Resolves once dismissed. */
export function alert(message: string, options: AlertOptions = {}): Promise<void> {
  return new Promise(resolve => {
    createDialog({
      title: options.title,
      message,
      buttons: [{ label: options.buttonLabel || 'OK', primary: true, value: true }],
      onClose: () => resolve(),
    })
  })
}

export interface ConfirmOptions {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Render the confirm button in the destructive (red) variant. */
  danger?: boolean
}

/** Show a confirm dialog. Resolves true if confirmed, false otherwise. */
export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise(resolve => {
    createDialog({
      title: options.title,
      message,
      buttons: [
        { label: options.cancelLabel || 'Abbrechen', primary: false, value: false },
        {
          label: options.confirmLabel || 'OK',
          primary: true,
          value: true,
          variant: options.danger ? 'danger' : undefined,
        },
      ],
      onClose: result => resolve(result === true),
    })
  })
}

export interface PromptOptions {
  title?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

/**
 * Show a prompt dialog. Resolves the entered string or null if cancelled.
 *
 * Legacy signature `prompt(message, defaultValueString)` is still supported:
 * if `options` is a string it's treated as `{ defaultValue: <string> }`.
 */
export function prompt(
  message: string,
  options: PromptOptions | string = {}
): Promise<string | null> {
  const opts: PromptOptions = typeof options === 'string' ? { defaultValue: options } : options

  return new Promise(resolve => {
    createDialog({
      title: opts.title,
      message,
      input: {
        defaultValue: opts.defaultValue || '',
        placeholder: opts.placeholder || '',
      },
      buttons: [
        { label: opts.cancelLabel || 'Abbrechen', primary: false, value: null },
        { label: opts.confirmLabel || 'OK', primary: true, value: true },
      ],
      onClose: result => resolve(result === null ? null : (result as string)),
    })
  })
}

export interface ConfirmDeleteOptions {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
}

/** Show a delete-confirmation dialog (danger variant by default). */
export function confirmDelete(
  itemName: string,
  options: ConfirmDeleteOptions = {}
): Promise<boolean> {
  return confirm(options.message || `"${itemName}" wirklich löschen?`, {
    title: options.title || 'Löschen bestätigen',
    confirmLabel: options.confirmLabel || 'Löschen',
    cancelLabel: options.cancelLabel || 'Abbrechen',
    danger: true,
  })
}

export interface Choice<T> {
  label: string
  value: T
  primary?: boolean
}

export interface ChooseOptions {
  title?: string
  cancelLabel?: string
}

/** Show a multi-choice dialog. Resolves the selected value or null if cancelled. */
export function choose<T>(
  message: string,
  choices: Choice<T>[],
  options: ChooseOptions = {}
): Promise<T | null> {
  return new Promise(resolve => {
    const buttons: DialogButton[] = [
      { label: options.cancelLabel || 'Abbrechen', primary: false, value: null },
      ...choices.map(c => ({
        label: c.label,
        primary: c.primary || false,
        value: c.value,
      })),
    ]

    createDialog({
      title: options.title,
      message,
      buttons,
      onClose: result => resolve(result as T | null),
    })
  })
}

// =============================================================================
// Global window export for non-module scripts
// =============================================================================

interface MirrorDialogGlobal {
  alert: typeof alert
  confirm: typeof confirm
  prompt: typeof prompt
  confirmDelete: typeof confirmDelete
  choose: typeof choose
}

declare global {
  interface Window {
    MirrorDialog?: MirrorDialogGlobal
  }
}

if (typeof window !== 'undefined') {
  window.MirrorDialog = { alert, confirm, prompt, confirmDelete, choose }
}
