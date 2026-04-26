/**
 * Batch Replace Confirmation Dialog
 *
 * After `::` Component-Extract triggers and findProjectMatches returns
 * matches, this dialog presents the user with the list and lets them
 * opt-out specific matches. Click [Anwenden] applies; [Abbrechen]
 * leaves the original extraction in place but skips batch-replace.
 *
 * Native HTML <dialog> + minimal inline styles. No framework deps.
 */

import type { MatchResult } from './pattern-match'

export interface DialogConfig {
  componentName: string
  matches: MatchResult[]
  onApply: (selected: MatchResult[]) => void
  onCancel?: () => void
}

export function showBatchReplaceDialog(config: DialogConfig): void {
  if (config.matches.length === 0) {
    config.onApply([])
    return
  }

  const dialog = document.createElement('dialog')
  dialog.className = 'mirror-batch-replace-dialog'
  Object.assign(dialog.style, {
    border: 'none',
    borderRadius: '12px',
    padding: '0',
    maxWidth: '560px',
    minWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    background: '#1a1a1a',
    color: '#e4e4e7',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
  })

  // Backdrop
  const backdropStyle = document.createElement('style')
  backdropStyle.textContent = `
    .mirror-batch-replace-dialog::backdrop {
      background: rgba(0, 0, 0, 0.6);
    }
  `
  dialog.appendChild(backdropStyle)

  // Header
  const header = document.createElement('div')
  Object.assign(header.style, {
    padding: '16px 20px 12px',
    borderBottom: '1px solid #333',
  })
  const title = document.createElement('div')
  Object.assign(title.style, { fontSize: '14px', fontWeight: '600', marginBottom: '4px' })
  title.textContent = `${config.componentName} extrahiert`
  const subtitle = document.createElement('div')
  Object.assign(subtitle.style, { fontSize: '12px', color: '#888' })
  subtitle.textContent = `${config.matches.length} weitere ähnliche Pattern gefunden — auch ersetzen?`
  header.appendChild(title)
  header.appendChild(subtitle)
  dialog.appendChild(header)

  // List
  const list = document.createElement('div')
  Object.assign(list.style, {
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '8px 0',
  })
  const checkboxes: HTMLInputElement[] = []
  for (const match of config.matches) {
    const item = document.createElement('label')
    Object.assign(item.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '6px 20px',
      cursor: 'pointer',
      gap: '10px',
    })
    item.addEventListener('mouseenter', () => (item.style.background = '#222'))
    item.addEventListener('mouseleave', () => (item.style.background = 'transparent'))

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = true
    Object.assign(cb.style, { cursor: 'pointer' })
    checkboxes.push(cb)

    const meta = document.createElement('span')
    Object.assign(meta.style, {
      color: '#888',
      fontFamily: 'monospace',
      fontSize: '12px',
      minWidth: '120px',
      flexShrink: '0',
    })
    meta.textContent = `${match.filename}:${match.lineNumber}`

    const preview = document.createElement('span')
    Object.assign(preview.style, {
      color: '#bbb',
      fontFamily: 'monospace',
      fontSize: '12px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    })
    preview.textContent = match.originalText.trim()

    item.appendChild(cb)
    item.appendChild(meta)
    item.appendChild(preview)
    list.appendChild(item)
  }
  dialog.appendChild(list)

  // Buttons
  const buttons = document.createElement('div')
  Object.assign(buttons.style, {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 20px 16px',
    borderTop: '1px solid #333',
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = 'Abbrechen'
  Object.assign(cancelBtn.style, {
    padding: '6px 14px',
    background: 'transparent',
    color: '#bbb',
    border: '1px solid #444',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
  })

  const applyBtn = document.createElement('button')
  applyBtn.textContent = 'Anwenden'
  Object.assign(applyBtn.style, {
    padding: '6px 14px',
    background: '#2271C1',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
  })

  buttons.appendChild(cancelBtn)
  buttons.appendChild(applyBtn)
  dialog.appendChild(buttons)

  document.body.appendChild(dialog)
  dialog.showModal()

  const close = () => {
    dialog.close()
    dialog.remove()
  }

  cancelBtn.addEventListener('click', () => {
    close()
    config.onCancel?.()
  })
  applyBtn.addEventListener('click', () => {
    const selected = config.matches.filter((_, i) => checkboxes[i].checked)
    close()
    config.onApply(selected)
  })
  dialog.addEventListener('cancel', e => {
    e.preventDefault()
    close()
    config.onCancel?.()
  })
}
