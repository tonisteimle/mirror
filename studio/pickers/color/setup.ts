/**
 * Color Picker — install + global wiring
 *
 * Owns the studio-side glue around `FullColorPicker`:
 * - module-local picker state (visible flag, insert/replace positions,
 *   hash-trigger state, callback-mode)
 * - token extraction from the project files
 * - keyboard (Escape / Enter / Arrow) and outside-click handlers
 * - the `window.showColorPicker` / `window.showColorPickerForProperty`
 *   / `window.hideColorPicker` API consumed by editor triggers and
 *   the property panel
 *
 * Extracted from studio/app.js so the glue is typed.
 */

import { Transaction, type ChangeSet } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { createFullColorPicker, type FullColorPickerConfig } from './full-picker'

/** Property → token suffix mapping for filtering. */
const COLOR_PROPERTY_SUFFIXES: Record<string, string> = {
  bg: '.bg',
  background: '.bg',
  col: '.col',
  color: '.col',
  boc: '.boc',
  'border-color': '.boc',
  'hover-bg': '.bg',
  'hover-col': '.col',
  'hover-boc': '.boc',
  ic: '.col',
  'icon-color': '.col',
}

interface ReplaceRange {
  from: number
  to: number
}

interface ColorToken {
  name: string
  value: string
}

export type ColorPickerCallback = (hex: string) => void

export interface ColorPickerSetupDeps {
  /** Returns the active project files map for token extraction. */
  getFiles: () => Record<string, string | null | undefined>
  /** Returns the active CodeMirror editor (may be null at install time). */
  getEditor: () => EditorView | null
}

export interface ShowColorPickerOptions {
  insertPos: number | null
  replaceRange?: ReplaceRange | null
  initialColor?: string | null
  isHashTrigger?: boolean
  hashStartPos?: number | null
  property?: string | null
  callback?: ColorPickerCallback | null
}

interface MirrorWindow {
  showColorPicker?: (
    x: number,
    y: number,
    insertPos: number | null,
    replaceRange?: ReplaceRange | null,
    initialColor?: string | null,
    isHashTrigger?: boolean,
    hashStartPos?: number | null,
    property?: string | null,
    callback?: ColorPickerCallback | null
  ) => void
  showColorPickerForProperty?: (
    x: number,
    y: number,
    property: string,
    currentValue: string | null,
    callback: ColorPickerCallback
  ) => void
  hideColorPicker?: () => void
}

export interface ColorPickerHandle {
  /**
   * Re-map all internal picker positions through a CodeMirror ChangeSet.
   * Call this from the editor's update listener so the picker stays
   * anchored to the right place when the user types while it's open.
   */
  mapChanges: (changes: ChangeSet) => void
  /** Whether the picker is currently visible. */
  isVisible: () => boolean
}

/**
 * Wire up the FullColorPicker for the studio.
 *
 * Idempotent — calling twice will install duplicate listeners, so
 * call only once during studio bootstrap. The public picker API is
 * exposed via `window.showColorPicker` etc; the returned handle is
 * for editor-update integration (position tracking).
 */
export function initColorPicker(deps: ColorPickerSetupDeps): ColorPickerHandle {
  // ===========================================================================
  // Module-local state
  // ===========================================================================
  let visible = false
  let insertPos: number | null = null
  let replaceRange: ReplaceRange | null = null
  let property: string | null = null
  let callback: ColorPickerCallback | null = null
  let hashTriggerActive = false
  let hashTriggerStartPos: number | null = null

  // ===========================================================================
  // FullColorPicker init
  // ===========================================================================
  const config: FullColorPickerConfig = {
    onSelect: hex => selectColor(hex),
    onClose: () => {
      visible = false
    },
  }
  const fullColorPicker = createFullColorPicker(config)
  fullColorPicker.render('color-picker')

  // DOM references (resolved lazily so re-renders are tolerated)
  const colorPicker = document.getElementById('color-picker')
  const colorPickerTokenGrid = document.getElementById('color-picker-token-grid')
  const colorPreview = document.getElementById('color-preview')
  const colorHex = document.getElementById('color-hex')

  // ===========================================================================
  // Token extraction + token-grid rendering
  // ===========================================================================
  function extractColorTokens(): ColorToken[] {
    const tokens: ColorToken[] = []
    const files = deps.getFiles()
    for (const content of Object.values(files)) {
      if (!content) continue
      for (const line of content.split('\n')) {
        // Match: "$name: #hex" or "name: #hex"
        const m = line.match(/^\s*\$?([\w.-]+)\s*:\s*(#[0-9A-Fa-f]{3,8})\s*(?:\/\/.*)?$/)
        if (m) tokens.push({ name: '$' + m[1], value: m[2].toUpperCase() })
      }
    }
    return tokens
  }

  function buildTokenColors(prop: string | null): void {
    if (!colorPickerTokenGrid) return
    colorPickerTokenGrid.innerHTML = ''

    const suffix = prop ? COLOR_PROPERTY_SUFFIXES[prop] : null
    const allTokens = extractColorTokens()

    const sortedTokens = [...allTokens]
    if (suffix) {
      sortedTokens.sort((a, b) => {
        const aMatches = a.name.endsWith(suffix) ? 0 : 1
        const bMatches = b.name.endsWith(suffix) ? 0 : 1
        if (aMatches !== bMatches) return aMatches - bMatches
        return a.name.localeCompare(b.name)
      })
    }

    const label = colorPicker?.querySelector<HTMLElement>('.color-picker-label')
    if (label) {
      const matchCount = suffix ? allTokens.filter(t => t.name.endsWith(suffix)).length : 0
      if (suffix && matchCount > 0) {
        label.textContent = `Tokens (${matchCount} ${suffix})`
      } else {
        label.textContent = `Tokens (${allTokens.length})`
      }
    }

    // Group tokens by prefix (part before the dot)
    const groups = new Map<string, ColorToken[]>()
    for (const token of sortedTokens) {
      const name = token.name.startsWith('$') ? token.name.slice(1) : token.name
      const dotIndex = name.lastIndexOf('.')
      const prefix = dotIndex > 0 ? name.slice(0, dotIndex) : '_ungrouped'
      const list = groups.get(prefix) ?? []
      list.push(token)
      groups.set(prefix, list)
    }

    for (const [prefix, tokens] of groups) {
      const groupEl = document.createElement('div')
      groupEl.className = 'token-group'

      // Group label is clickable and inserts the base token (e.g. "$primary")
      if (prefix !== '_ungrouped' && tokens.length > 1) {
        const groupLabel = document.createElement('span')
        groupLabel.className = 'token-group-label'
        groupLabel.textContent = prefix
        groupLabel.title = `$${prefix}`
        groupLabel.addEventListener('click', () => selectColor('$' + prefix))
        groupEl.appendChild(groupLabel)
      }

      const swatchContainer = document.createElement('div')
      swatchContainer.className = 'token-group-swatches'

      for (const token of tokens) {
        const btn = document.createElement('button')
        btn.className = 'token-swatch'
        if (suffix && token.name.endsWith(suffix)) {
          btn.classList.add('token-swatch-match')
        }
        btn.style.backgroundColor = token.value
        btn.dataset.token = token.name
        btn.dataset.color = token.value
        btn.title = token.name

        btn.addEventListener('mouseenter', () => {
          if (colorPreview) colorPreview.style.backgroundColor = token.value
          if (colorHex) colorHex.textContent = token.name
        })
        btn.addEventListener('click', e => {
          e.preventDefault()
          selectColor(token.name)
        })

        swatchContainer.appendChild(btn)
      }

      groupEl.appendChild(swatchContainer)
      colorPickerTokenGrid.appendChild(groupEl)
    }

    const section = document.getElementById('color-picker-tokens')
    if (section) {
      section.style.display = allTokens.length > 0 ? 'block' : 'none'
    }
  }

  // ===========================================================================
  // show / hide
  // ===========================================================================
  function showColorPicker(
    x: number,
    y: number,
    nextInsertPos: number | null,
    nextReplaceRange: ReplaceRange | null = null,
    initialColor: string | null = null,
    isHashTrigger = false,
    hashStartPos: number | null = null,
    nextProperty: string | null = null,
    nextCallback: ColorPickerCallback | null = null
  ): void {
    insertPos = nextInsertPos
    replaceRange = nextReplaceRange
    hashTriggerActive = isHashTrigger
    hashTriggerStartPos = hashStartPos
    property = nextProperty
    callback = nextCallback

    // Smart positioning: flip into viewport if it would overflow.
    const pickerHeight = 400
    const pickerWidth = 260
    const margin = 8
    let finalX = x
    let finalY = y
    if (y + pickerHeight > window.innerHeight - margin) {
      finalY = Math.max(margin, y - pickerHeight - 36)
    }
    if (x + pickerWidth > window.innerWidth - margin) {
      finalX = Math.max(margin, x - pickerWidth - 8)
    }

    const displayColor = initialColor || '#5BA8F5'
    fullColorPicker.setColor(displayColor)
    fullColorPicker.show(finalX, finalY, displayColor)
    visible = true

    buildTokenColors(property)

    // Callback mode: focus the hex input so the user can type immediately.
    if (callback) {
      const hexInput = document.getElementById('color-picker-hex-input') as HTMLInputElement | null
      if (hexInput) {
        setTimeout(() => {
          hexInput.focus()
          hexInput.select()
        }, 50)
      }
    }
  }

  function hideColorPicker(): void {
    fullColorPicker.hide()
    visible = false
    insertPos = null
    replaceRange = null
    callback = null
    hashTriggerActive = false
    hashTriggerStartPos = null
  }

  // ===========================================================================
  // selectColor — insert into editor with defensive position handling
  // ===========================================================================
  function validatePosition(pos: number, docLength: number, ctx: string): number {
    if (pos < 0 || pos > docLength) {
      console.warn(
        `[ColorPicker] ${ctx}: Position ${pos} out of bounds [0, ${docLength}], clamping`
      )
      return Math.max(0, Math.min(pos, docLength))
    }
    return pos
  }

  function insertColorAt(editor: EditorView, from: number, to: number, hex: string): void {
    editor.dispatch({
      changes: { from, to, insert: hex },
      selection: { anchor: from + hex.length },
      annotations: Transaction.userEvent.of('input.color'),
    })
  }

  function selectColor(hex: string): void {
    // Property panel callback mode — direct callback, no editor touch.
    if (callback) {
      const cb = callback
      hideColorPicker()
      cb(hex)
      return
    }

    const editor = deps.getEditor()
    if (editor) {
      const docLength = editor.state.doc.length
      const cursorPos = editor.state.selection.main.head

      if (hashTriggerActive && hashTriggerStartPos !== null) {
        // Hash trigger: replace from `#` to cursor.
        const safeFrom = validatePosition(hashTriggerStartPos, docLength, 'Hash trigger from')
        const safeTo = validatePosition(cursorPos, docLength, 'Hash trigger to')

        // Verify `#` still exists at the expected position.
        const charAtFrom = editor.state.doc.sliceString(safeFrom, safeFrom + 1)
        if (charAtFrom !== '#') {
          console.warn(
            `[ColorPicker] Hash trigger: Expected # at position ${safeFrom}, found '${charAtFrom}'. Inserting at cursor instead.`
          )
          insertColorAt(editor, cursorPos, cursorPos, hex)
        } else {
          insertColorAt(editor, safeFrom, safeTo, hex)
        }
      } else if (replaceRange) {
        let safeFrom = validatePosition(replaceRange.from, docLength, 'Replace from')
        let safeTo = validatePosition(replaceRange.to, docLength, 'Replace to')

        // Sanity check: a color value shouldn't span more than ~20 chars.
        const rangeSize = safeTo - safeFrom
        if (rangeSize > 20 || rangeSize < 0) {
          console.warn(
            `[ColorPicker] Replace mode: Invalid range size ${rangeSize} (${safeFrom}-${safeTo}). Using cursor position.`
          )
          safeFrom = cursorPos
          safeTo = cursorPos
        }
        insertColorAt(editor, safeFrom, safeTo, hex)
      } else if (insertPos !== null) {
        let safePos = validatePosition(insertPos, docLength, 'Insert')
        // Drift detection: position-tracking should keep insertPos near the cursor.
        const drift = Math.abs(safePos - cursorPos)
        if (drift > 100) {
          console.warn(
            `[ColorPicker] Insert mode: Position drifted ${drift} chars from cursor (${safePos} vs ${cursorPos}). Using cursor.`
          )
          safePos = cursorPos
        }
        insertColorAt(editor, safePos, safePos, hex)
      }
      editor.focus()
    }
    hideColorPicker()
  }

  // ===========================================================================
  // Keyboard + outside-click
  // ===========================================================================
  // Capturing phase so we get keys before CodeMirror.
  document.addEventListener(
    'keydown',
    e => {
      if (!visible) return

      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        hideColorPicker()
        deps.getEditor()?.focus()
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        const colorToSelect = fullColorPicker.getColor()
        if (colorToSelect) selectColor(colorToSelect.toUpperCase())
        return
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        const direction = e.key.replace('Arrow', '').toLowerCase() as
          | 'up'
          | 'down'
          | 'left'
          | 'right'
        fullColorPicker.navigate(direction)
        return
      }
    },
    true
  )

  document.addEventListener('mousedown', e => {
    if (!visible) return
    const pickerEl = document.getElementById('color-picker')
    if (!pickerEl || !(e.target instanceof Node) || !pickerEl.contains(e.target)) {
      hideColorPicker()
    }
  })

  // ===========================================================================
  // Public window globals (consumed by editor triggers + property panel)
  // ===========================================================================
  const w = window as MirrorWindow
  w.showColorPicker = showColorPicker
  w.hideColorPicker = hideColorPicker
  w.showColorPickerForProperty = (x, y, prop, currentValue, cb) => {
    showColorPicker(x, y, null, null, currentValue, false, null, prop, cb)
  }

  // ===========================================================================
  // Editor-update integration — keep stored positions in sync as the user
  // types while the picker is open.
  // ===========================================================================
  function mapChanges(changes: ChangeSet): void {
    if (!visible) return
    if (insertPos !== null) {
      const oldPos = insertPos
      insertPos = changes.mapPos(insertPos)
      if (oldPos !== insertPos) {
        console.debug(`[ColorPicker] Insert pos tracked: ${oldPos} → ${insertPos}`)
      }
    }
    if (replaceRange) {
      const oldFrom = replaceRange.from
      const oldTo = replaceRange.to
      replaceRange = {
        from: changes.mapPos(replaceRange.from),
        to: changes.mapPos(replaceRange.to),
      }
      if (oldFrom !== replaceRange.from || oldTo !== replaceRange.to) {
        console.debug(
          `[ColorPicker] Replace range tracked: [${oldFrom}, ${oldTo}] → [${replaceRange.from}, ${replaceRange.to}]`
        )
      }
    }
    if (hashTriggerStartPos !== null) {
      const oldPos = hashTriggerStartPos
      hashTriggerStartPos = changes.mapPos(hashTriggerStartPos)
      if (oldPos !== hashTriggerStartPos) {
        console.debug(`[ColorPicker] Hash pos tracked: ${oldPos} → ${hashTriggerStartPos}`)
      }
    }
  }

  return {
    mapChanges,
    isVisible: () => visible,
  }
}
