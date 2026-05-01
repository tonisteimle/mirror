/**
 * Batch Replace Confirmation Dialog
 *
 * After `::` extraction (Component or Token), this dialog presents the
 * user with the list of matches found in the project and lets them
 * opt-out specific entries. Two sections:
 *   - Exact matches (default checked)
 *   - Near-matches with overrides (default UNchecked, opt-in)
 *
 * Native HTML <dialog> + minimal inline styles. No framework deps.
 */

import type { MatchResult, NearMatchResult } from './pattern-match'

export interface DialogConfig {
  componentName: string
  matches: MatchResult[]
  /** Optional near-matches that would become instance-overrides. */
  nearMatches?: NearMatchResult[]
  onApply: (selected: { exact: MatchResult[]; near: NearMatchResult[] }) => void
  onCancel?: () => void
}

export function showBatchReplaceDialog(config: DialogConfig): void {
  const exact = config.matches
  const near = config.nearMatches ?? []
  if (exact.length === 0 && near.length === 0) {
    config.onApply({ exact: [], near: [] })
    return
  }

  const dialog = document.createElement('dialog')
  dialog.className = 'mirror-batch-replace-dialog'
  Object.assign(dialog.style, {
    border: 'none',
    borderRadius: '12px',
    padding: '0',
    maxWidth: '640px',
    minWidth: '460px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    background: '#1a1a1a',
    color: '#e4e4e7',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '13px',
  })

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
  const subtitleParts: string[] = []
  if (exact.length > 0)
    subtitleParts.push(`${exact.length} exakte${exact.length === 1 ? 'r' : ''} Match`)
  if (near.length > 0) subtitleParts.push(`${near.length} ähnliche${near.length === 1 ? 'r' : ''}`)
  const subtitle = document.createElement('div')
  Object.assign(subtitle.style, { fontSize: '12px', color: '#888' })
  subtitle.textContent = `${subtitleParts.join(' + ')} im Projekt — auch ersetzen?`
  header.appendChild(title)
  header.appendChild(subtitle)
  dialog.appendChild(header)

  // Lists
  const listContainer = document.createElement('div')
  Object.assign(listContainer.style, {
    maxHeight: '380px',
    overflowY: 'auto',
    padding: '8px 0',
  })

  const exactCheckboxes: HTMLInputElement[] = []
  const nearCheckboxes: HTMLInputElement[] = []

  if (exact.length > 0) {
    appendSectionHeader(listContainer, `Exakt (${exact.length})`, '#10b981')
    for (const match of exact) {
      const cb = appendListItem(
        listContainer,
        `${match.filename}:${match.lineNumber}`,
        match.originalText.trim(),
        true,
        'exact'
      )
      exactCheckboxes.push(cb)
    }
  }

  if (near.length > 0) {
    appendSectionHeader(listContainer, `Ähnlich (${near.length}) — mit Override`, '#f59e0b')
    for (const match of near) {
      const overrideText = match.overrides.map(o => `${o.name} ${o.rawValue}`).join(', ')
      const preview = `${match.originalText.trim()}  →  ${config.componentName} ${overrideText}`
      const cb = appendListItem(
        listContainer,
        `${match.filename}:${match.lineNumber}`,
        preview,
        false, // opt-in for near-matches
        'near'
      )
      nearCheckboxes.push(cb)
    }
  }
  dialog.appendChild(listContainer)

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
    const selectedExact = exact.filter((_, i) => exactCheckboxes[i].checked)
    const selectedNear = near.filter((_, i) => nearCheckboxes[i].checked)
    close()
    config.onApply({ exact: selectedExact, near: selectedNear })
  })
  dialog.addEventListener('cancel', e => {
    e.preventDefault()
    close()
    config.onCancel?.()
  })
}

// ---------------------------------------------------------------------------

function appendSectionHeader(parent: HTMLElement, label: string, color: string): void {
  const h = document.createElement('div')
  Object.assign(h.style, {
    padding: '10px 20px 4px',
    fontSize: '11px',
    fontWeight: '600',
    color,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  })
  h.textContent = label
  parent.appendChild(h)
}

function appendListItem(
  parent: HTMLElement,
  meta: string,
  preview: string,
  defaultChecked: boolean,
  matchKind: 'exact' | 'near'
): HTMLInputElement {
  const item = document.createElement('label')
  item.setAttribute('data-match-kind', matchKind)
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
  cb.checked = defaultChecked
  Object.assign(cb.style, { cursor: 'pointer' })

  const metaEl = document.createElement('span')
  Object.assign(metaEl.style, {
    color: '#888',
    fontFamily: 'monospace',
    fontSize: '12px',
    minWidth: '120px',
    flexShrink: '0',
  })
  metaEl.textContent = meta

  const previewEl = document.createElement('span')
  Object.assign(previewEl.style, {
    color: '#bbb',
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  })
  previewEl.textContent = preview

  item.appendChild(cb)
  item.appendChild(metaEl)
  item.appendChild(previewEl)
  parent.appendChild(item)
  return cb
}
