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

// Inject styles once
let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  const style = document.createElement('style')
  style.textContent = dialogStyles
  document.head.appendChild(style)
  stylesInjected = true
}

// =============================================================================
// Dialog Creation
// =============================================================================

function createDialog({ title, message, input, buttons, onClose }) {
  injectStyles()

  const overlay = document.createElement('div')
  overlay.className = 'mirror-dialog-overlay'

  const dialog = document.createElement('div')
  dialog.className = 'mirror-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')

  let html = ''

  if (title) {
    html += `<div class="mirror-dialog-header"><h2 class="mirror-dialog-title">${escapeHtml(title)}</h2></div>`
  }

  html += `<div class="mirror-dialog-body">`
  html += `<p class="mirror-dialog-message">${escapeHtml(message)}</p>`

  if (input) {
    html += `<input type="text" class="mirror-dialog-input" placeholder="${escapeHtml(input.placeholder || '')}" value="${escapeHtml(input.defaultValue || '')}">`
  }

  html += `</div>`

  html += `<div class="mirror-dialog-footer">`
  buttons.forEach((btn, i) => {
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

  // Focus management
  const inputEl = dialog.querySelector('.mirror-dialog-input')
  const firstBtn = dialog.querySelector('.mirror-dialog-btn')

  requestAnimationFrame(() => {
    overlay.classList.add('visible')
    if (inputEl) {
      inputEl.focus()
      inputEl.select()
    } else if (firstBtn) {
      // Focus the primary button if exists, otherwise first button
      const primaryBtn = dialog.querySelector('.mirror-dialog-btn-primary') || firstBtn
      primaryBtn.focus()
    }
  })

  // Event handlers
  const close = result => {
    overlay.classList.remove('visible')
    setTimeout(() => {
      overlay.remove()
      onClose(result)
    }, 150)
  }

  // Button clicks
  dialog.querySelectorAll('.mirror-dialog-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index)
      const buttonDef = buttons[index]
      if (input && buttonDef.primary) {
        close(inputEl.value)
      } else {
        close(buttonDef.value)
      }
    })
  })

  // Enter key in input
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

  // Escape key
  const handleKeydown = e => {
    if (e.key === 'Escape') {
      e.preventDefault()
      const cancelBtn = buttons.find(b => !b.primary)
      close(cancelBtn ? cancelBtn.value : null)
    }
  }
  document.addEventListener('keydown', handleKeydown)

  // Click outside
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      const cancelBtn = buttons.find(b => !b.primary)
      close(cancelBtn ? cancelBtn.value : null)
    }
  })

  return { overlay, dialog, close }
}

function escapeHtml(str) {
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

/**
 * Show an alert dialog
 * @param {string} message - The message to display
 * @param {Object} options - Optional settings
 * @param {string} options.title - Dialog title
 * @param {string} options.buttonLabel - OK button label (default: "OK")
 * @returns {Promise<void>}
 */
export function alert(message, options = {}) {
  return new Promise(resolve => {
    createDialog({
      title: options.title,
      message,
      buttons: [{ label: options.buttonLabel || 'OK', primary: true, value: true }],
      onClose: () => resolve(),
    })
  })
}

/**
 * Show a confirm dialog
 * @param {string} message - The message to display
 * @param {Object} options - Optional settings
 * @param {string} options.title - Dialog title
 * @param {string} options.confirmLabel - Confirm button label (default: "OK")
 * @param {string} options.cancelLabel - Cancel button label (default: "Abbrechen")
 * @param {boolean} options.danger - Show confirm button as danger/red
 * @returns {Promise<boolean>}
 */
export function confirm(message, options = {}) {
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

/**
 * Show a prompt dialog
 * @param {string} message - The message to display
 * @param {Object} options - Optional settings
 * @param {string} options.title - Dialog title
 * @param {string} options.defaultValue - Default input value
 * @param {string} options.placeholder - Input placeholder
 * @param {string} options.confirmLabel - Confirm button label (default: "OK")
 * @param {string} options.cancelLabel - Cancel button label (default: "Abbrechen")
 * @returns {Promise<string|null>}
 */
export function prompt(message, options = {}) {
  // Support legacy signature: prompt(message, defaultValue)
  if (typeof options === 'string') {
    options = { defaultValue: options }
  }

  return new Promise(resolve => {
    createDialog({
      title: options.title,
      message,
      input: {
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || '',
      },
      buttons: [
        { label: options.cancelLabel || 'Abbrechen', primary: false, value: null },
        { label: options.confirmLabel || 'OK', primary: true, value: true },
      ],
      onClose: result => resolve(result === null ? null : result),
    })
  })
}

/**
 * Show a delete confirmation dialog
 * @param {string} itemName - Name of item being deleted
 * @param {Object} options - Optional settings
 * @returns {Promise<boolean>}
 */
export function confirmDelete(itemName, options = {}) {
  return confirm(options.message || `"${itemName}" wirklich löschen?`, {
    title: options.title || 'Löschen bestätigen',
    confirmLabel: options.confirmLabel || 'Löschen',
    cancelLabel: options.cancelLabel || 'Abbrechen',
    danger: true,
  })
}

/**
 * Show a choice dialog with multiple options
 * @param {string} message - The message to display
 * @param {Array<{label: string, value: any, primary?: boolean}>} choices - The options to choose from
 * @param {Object} options - Optional settings
 * @param {string} options.title - Dialog title
 * @param {string} options.cancelLabel - Cancel button label (default: "Abbrechen")
 * @returns {Promise<any|null>} - The value of the selected choice, or null if cancelled
 */
export function choose(message, choices, options = {}) {
  return new Promise(resolve => {
    const buttons = [
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
      onClose: result => resolve(result),
    })
  })
}

// Make available globally for non-module scripts
if (typeof window !== 'undefined') {
  window.MirrorDialog = { alert, confirm, prompt, confirmDelete, choose }
}
