/**
 * DOM Runtime als einbettbarer JavaScript-String
 *
 * Diese Datei exportiert den Runtime-Code als String,
 * damit der Generator ihn einbetten kann.
 */

export const DOM_RUNTIME_CODE = `
// Mirror DOM Runtime
const _runtime = {
  // Property mapping
  _propMap: {
    'bg': 'background',
    'col': 'color',
    'pad': 'padding',
    'rad': 'borderRadius',
    'gap': 'gap',
    'w': 'width',
    'h': 'height',
    'opacity': 'opacity',
  },

  // Alignment helpers
  _alignToCSS(el, prop, value) {
    const dir = el.style.flexDirection || 'column'
    const isRow = dir === 'row'
    const alignMap = { 'left': 'flex-start', 'right': 'flex-end', 'center': 'center', 'top': 'flex-start', 'bottom': 'flex-end' }
    const cssVal = alignMap[value] || value

    if (prop === 'align' || prop === 'hor-align') {
      if (isRow) { el.style.justifyContent = cssVal }
      else { el.style.alignItems = cssVal }
    } else if (prop === 'ver-align') {
      if (isRow) { el.style.alignItems = cssVal }
      else { el.style.justifyContent = cssVal }
    }
  },

  _getAlign(el, prop) {
    const dir = el.style.flexDirection || 'column'
    const isRow = dir === 'row'
    const reverseMap = { 'flex-start': 'left', 'flex-end': 'right', 'center': 'center' }

    if (prop === 'align' || prop === 'hor-align') {
      const val = isRow ? el.style.justifyContent : el.style.alignItems
      return reverseMap[val] || val
    } else if (prop === 'ver-align') {
      const val = isRow ? el.style.alignItems : el.style.justifyContent
      const vertMap = { 'flex-start': 'top', 'flex-end': 'bottom', 'center': 'center' }
      return vertMap[val] || val
    }
  },

  // Element wrapper
  wrap(el) {
    if (!el) return null
    const self = this
    return {
      _el: el,
      get text() { return el.textContent },
      set text(v) { el.textContent = v },
      get value() { return el.value },
      set value(v) { el.value = v },
      get visible() { return el.style.display !== 'none' },
      set visible(v) { el.style.display = v ? '' : 'none' },
      get hidden() { return el.hidden },
      set hidden(v) { el.hidden = v; el.style.display = v ? 'none' : '' },
      get align() { return self._getAlign(el, 'align') },
      set align(v) { self._alignToCSS(el, 'align', v) },
      get verAlign() { return self._getAlign(el, 'ver-align') },
      set verAlign(v) { self._alignToCSS(el, 'ver-align', v) },
      get bg() { return el.style.background },
      set bg(v) { el.style.background = v },
      get col() { return el.style.color },
      set col(v) { el.style.color = v },
      get pad() { return el.style.padding },
      set pad(v) { el.style.padding = typeof v === 'number' ? v + 'px' : v },
      get gap() { return el.style.gap },
      set gap(v) { el.style.gap = typeof v === 'number' ? v + 'px' : v },
      get rad() { return el.style.borderRadius },
      set rad(v) { el.style.borderRadius = typeof v === 'number' ? v + 'px' : v },
      get w() { return el.style.width },
      set w(v) { el.style.width = typeof v === 'number' ? v + 'px' : v },
      get h() { return el.style.height },
      set h(v) { el.style.height = typeof v === 'number' ? v + 'px' : v },
      get opacity() { return el.style.opacity },
      set opacity(v) { el.style.opacity = v },
      get state() { return el.dataset.state || 'default' },
      set state(v) { self.setState(el, v) },
      set onclick(fn) { el.addEventListener('click', fn) },
      set onchange(fn) { el.addEventListener('change', fn) },
      addClass(c) { el.classList.add(c) },
      removeClass(c) { el.classList.remove(c) },
      toggleClass(c) { el.classList.toggle(c) },
      setStyle(prop, val) { el.style[prop] = val },
      getStyle(prop) { return el.style[prop] },
    }
  },

  // Visibility
  toggle(el) {
    if (!el) return
    const currentState = el.dataset.state || el._initialState
    if (currentState === 'closed' || currentState === 'open') {
      const newState = currentState === 'closed' ? 'open' : 'closed'
      this.setState(el, newState)
    } else if (currentState === 'collapsed' || currentState === 'expanded') {
      const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed'
      this.setState(el, newState)
    } else {
      el.hidden = !el.hidden
      this.applyState(el, el.hidden ? 'off' : 'on')
    }
  },

  show(el) {
    if (!el) return
    el.hidden = false
    // Restore saved display value or clear inline style
    el.style.display = el._savedDisplay || ''
  },

  hide(el) {
    if (!el) return
    // Save current display before hiding (unless already hidden)
    if (el.style.display !== 'none') {
      el._savedDisplay = el.style.display
    }
    el.hidden = true
    el.style.display = 'none'
  },

  close(el) {
    if (!el) return
    const initialState = el._initialState
    if (initialState === 'closed' || initialState === 'open' || el.dataset.state === 'open' || el.dataset.state === 'closed') {
      this.setState(el, 'closed')
    } else if (initialState === 'expanded' || initialState === 'collapsed' || el.dataset.state === 'expanded' || el.dataset.state === 'collapsed') {
      this.setState(el, 'collapsed')
    } else {
      this.hide(el)
    }
  },

  // Selection
  select(el) {
    if (!el) return
    if (el.parentElement) {
      Array.from(el.parentElement.children).forEach(sibling => {
        if (sibling !== el && sibling.dataset.selected) {
          this.deselect(sibling)
        }
      })
    }
    el.dataset.selected = 'true'
    this.applyState(el, 'selected')
    this.updateSelectionBinding(el)
  },

  deselect(el) {
    if (!el) return
    delete el.dataset.selected
    this.removeState(el, 'selected')
  },

  // Highlighting
  highlight(el) {
    if (!el) return
    if (el.parentElement) {
      Array.from(el.parentElement.children).forEach(sibling => {
        if (sibling !== el && sibling.dataset.highlighted) {
          this.unhighlight(sibling)
        }
      })
    }
    el.dataset.highlighted = 'true'
    this.applyState(el, 'highlighted')
  },

  unhighlight(el) {
    if (!el) return
    delete el.dataset.highlighted
    this.removeState(el, 'highlighted')
  },

  highlightNext(container) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (!items.length) return
    const current = items.findIndex(el => el.dataset.highlighted === 'true')
    const next = current === -1 ? 0 : Math.min(current + 1, items.length - 1)
    this.highlight(items[next])
  },

  highlightPrev(container) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (!items.length) return
    const current = items.findIndex(el => el.dataset.highlighted === 'true')
    const prev = current === -1 ? items.length - 1 : Math.max(current - 1, 0)
    this.highlight(items[prev])
  },

  highlightFirst(container) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (items.length) this.highlight(items[0])
  },

  highlightLast(container) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    if (items.length) this.highlight(items[items.length - 1])
  },

  getHighlightableItems(container) {
    const findItems = (el, requireHighlightState) => {
      const items = []
      for (const child of el.children) {
        if (child._stateStyles?.highlighted) {
          items.push(child)
        } else if (!requireHighlightState && child.style.cursor === 'pointer') {
          items.push(child)
        } else {
          items.push(...findItems(child, requireHighlightState))
        }
      }
      return items
    }
    let items = findItems(container, true)
    if (!items.length) items = findItems(container, false)
    return items
  },

  selectHighlighted(container) {
    if (!container) return
    const items = this.getHighlightableItems(container)
    const highlighted = items.find(el => el.dataset.highlighted === 'true')
    if (highlighted) this.select(highlighted)
  },

  // Activation
  activate(el) {
    if (!el) return
    el.dataset.active = 'true'
    this.applyState(el, 'active')
  },

  deactivate(el) {
    if (!el) return
    delete el.dataset.active
    this.removeState(el, 'active')
  },

  // State management
  applyState(el, state) {
    if (!el?._stateStyles || !el._stateStyles[state]) return
    Object.assign(el.style, el._stateStyles[state])
  },

  removeState(el, state) {
    if (!el?._baseStyles) return
    Object.assign(el.style, el._baseStyles)
  },

  setState(el, stateName) {
    if (!el) return
    if (!el._baseStyles && el._stateStyles) {
      el._baseStyles = {}
      const stateProps = new Set()
      for (const state of Object.values(el._stateStyles)) {
        for (const prop of Object.keys(state)) stateProps.add(prop)
      }
      for (const prop of stateProps) {
        el._baseStyles[prop] = el.style[prop] || ''
      }
    }
    if (el._baseStyles) Object.assign(el.style, el._baseStyles)
    el.dataset.state = stateName
    if (stateName !== 'default' && el._stateStyles && el._stateStyles[stateName]) {
      Object.assign(el.style, el._stateStyles[stateName])
    }
    this.updateVisibility(el)
  },

  toggleState(el, state1, state2) {
    if (!el) return
    state2 = state2 || 'default'
    const current = el.dataset.state || state2
    const next = current === state1 ? state2 : state1
    this.setState(el, next)
  },

  updateVisibility(el) {
    if (!el) return
    const state = el.dataset.state
    const children = el.querySelectorAll('[data-mirror-id]')
    children.forEach(child => {
      if (child._visibleWhen) {
        const condition = child._visibleWhen
        let visible = false
        if (condition.includes('&&') || condition.includes('||')) {
          try {
            const open = state === 'open'
            const closed = state === 'closed'
            const expanded = state === 'expanded'
            const collapsed = state === 'collapsed'
            visible = eval(condition)
          } catch (e) { visible = false }
        } else {
          visible = state === condition
        }
        child.style.display = visible ? '' : 'none'
      }
    })
  },

  // Navigation
  navigate(targetName, clickedElement) {
    if (!targetName) return
    const target = document.querySelector(\`[data-component="\${targetName}"]\`)
    if (!target) return
    if (target.parentElement) {
      Array.from(target.parentElement.children).forEach(sibling => {
        if (sibling.dataset && sibling.dataset.component) {
          sibling.style.display = sibling === target ? '' : 'none'
        }
      })
    }
    this.updateNavSelection(clickedElement)
  },

  updateNavSelection(clickedElement) {
    if (!clickedElement) return
    const nav = clickedElement.closest('nav')
    if (!nav) return
    const navItems = nav.querySelectorAll('[data-route]')
    navItems.forEach(item => {
      if (item === clickedElement) {
        item.dataset.selected = 'true'
        this.applyState(item, 'selected')
      } else {
        delete item.dataset.selected
        this.removeState(item, 'selected')
      }
    })
  },

  navigateToPage(pageName, clickedElement) {
    if (!pageName) return
    const filename = pageName.endsWith('.mirror') ? pageName : pageName + '.mirror'
    const readFile = this._readFile || window._mirrorReadFile
    if (!readFile) {
      console.warn('No readFile callback available for page navigation')
      return
    }
    const content = readFile(filename)
    if (!content) {
      console.warn(\`Page not found: \${filename}\`)
      return
    }
    if (typeof Mirror === 'undefined' || !Mirror.compile) {
      console.warn('Mirror compiler not available for dynamic page loading')
      return
    }
    try {
      const pageCode = Mirror.compile(content, { readFile })
      const container = this.getPageContainer()
      if (!container) {
        console.warn('No page container found for rendering')
        return
      }
      container.innerHTML = ''
      const execCode = pageCode.replace('export function createUI', 'function createUI')
      const fn = new Function(execCode + '\\nreturn createUI();')
      const ui = fn()
      if (ui && ui.root) {
        while (ui.root.firstChild) {
          container.appendChild(ui.root.firstChild)
        }
      }
    } catch (err) {
      console.error(\`Failed to load page \${filename}:\`, err)
    }
    this.updateNavSelection(clickedElement)
  },

  getPageContainer() {
    let container = document.querySelector('[data-page-container]')
    if (container) return container
    container = document.querySelector('[data-instance-name="PageContent"]')
    if (container) return container
    container = document.querySelector('[data-instance-name="Content"]')
    if (container) return container
    const nav = document.querySelector('nav')
    if (nav && nav.parentElement) {
      for (const sibling of nav.parentElement.children) {
        if (sibling !== nav && sibling.tagName !== 'NAV') {
          return sibling
        }
      }
    }
    return null
  },

  // Selection binding
  updateSelectionBinding(el) {
    if (!el) return
    let parent = el.parentElement
    while (parent) {
      if (parent._selectionBinding) {
        const value = el.textContent?.trim() || ''
        const varName = parent._selectionBinding
        window._mirrorState = window._mirrorState || {}
        window._mirrorState[varName] = value
        this.updateBoundElements(varName, value)
        return
      }
      parent = parent.parentElement
    }
  },

  updateBoundElements(varName, value) {
    document.querySelectorAll('[data-mirror-id]').forEach(el => {
      if (el._textBinding === varName) {
        el.textContent = value || el._textPlaceholder || ''
      }
    })
  },

  // Cleanup
  destroy(el) {
    if (!el) return
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler)
      delete el._clickOutsideHandler
    }
    if (el.children) {
      Array.from(el.children).forEach(child => this.destroy(child))
    }
  },

  // Zag component initialization
  initZagComponent(el) {
    if (!el || !el._zagConfig) return

    const config = el._zagConfig
    const trigger = el.querySelector('[data-slot="Trigger"]')
    const content = el.querySelector('[data-slot="Content"]')

    if (!trigger || !content) return

    // Set initial state
    content.hidden = true
    content.style.display = 'none'

    // Track state
    el._zagState = { open: false, value: [], highlightedIndex: -1 }

    // Get config values
    const isDisabled = config.machineConfig?.disabled
    const placeholder = config.machineConfig?.placeholder
    const defaultValue = config.machineConfig?.defaultValue
    const value = config.machineConfig?.value
    const isMultiple = config.machineConfig?.multiple
    // Default: closeOnSelect=true for single, closeOnSelect=false for multiple (keepOpen)
    const closeOnSelect = isMultiple
      ? config.machineConfig?.closeOnSelect === true
      : config.machineConfig?.closeOnSelect !== false
    const isSearchable = config.machineConfig?.searchable
    const isClearable = config.machineConfig?.clearable
    const isDeselectable = config.machineConfig?.deselectable
    const placement = config.machineConfig?.placement || 'bottom-start'
    const offset = config.machineConfig?.offset ?? 4
    const items = content.querySelectorAll('[data-mirror-item]')

    // ========================================
    // DEFAULT STYLING (Tutorial-konform)
    // ========================================

    // Trigger Styling
    if (!trigger.hasAttribute('data-styled')) {
      Object.assign(trigger.style, {
        background: '#1a1a1a',
        padding: '7px 10px',
        borderRadius: '5px',
        height: '34px',
        boxSizing: 'border-box',
        border: '1px solid #333',
        minWidth: '160px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#e0e0e0',
        transition: 'border-color 0.15s',
        position: 'relative',
        textAlign: 'left',
        fontFamily: 'inherit',
      })
    }

    // Content/Dropdown Styling with placement support
    if (!content.hasAttribute('data-styled')) {
      const placementStyles = {
        position: 'absolute',
        zIndex: '1000',
      }
      // Apply placement-based positioning
      if (placement.startsWith('top')) {
        placementStyles.bottom = '100%'
        placementStyles.marginBottom = offset + 'px'
      } else {
        placementStyles.top = '100%'
        placementStyles.marginTop = offset + 'px'
      }
      if (placement.endsWith('-start') || placement.endsWith('-left')) {
        placementStyles.left = '0'
      } else if (placement.endsWith('-end') || placement.endsWith('-right')) {
        placementStyles.right = '0'
      } else {
        placementStyles.left = '0' // default
      }

      Object.assign(content.style, {
        background: '#1a1a1a',
        borderRadius: '6px',
        border: '1px solid #333',
        boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        padding: '3px',
        maxHeight: '200px',
        overflow: 'auto',
        minWidth: '160px',
        ...placementStyles,
      })
      content.dataset.placement = placement
    }

    // Item Styling
    items.forEach(item => {
      if (!item.hasAttribute('data-styled')) {
        // Only set alignItems if not already set by compiler (e.g., via center, ver, etc.)
        const hasAlignItems = item.style.alignItems !== ''
        const baseStyles = {
          padding: '6px 10px',
          borderRadius: '4px',
          display: 'flex',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '13px',
          color: '#e0e0e0',
        }
        // Only add alignItems default if not already set
        if (!hasAlignItems) {
          baseStyles.alignItems = 'center'
        }
        Object.assign(item.style, baseStyles)
      }
    })

    // Group & GroupLabel Styling
    const groups = content.querySelectorAll('[data-slot="Group"]')
    groups.forEach(group => {
      if (!group.hasAttribute('data-styled')) {
        Object.assign(group.style, {
          display: 'flex',
          flexDirection: 'column',
        })
        // Add margin-top for groups after the first one
        if (group.previousElementSibling) {
          group.style.marginTop = '8px'
        }
      }
      // Style GroupLabel
      const groupLabel = group.querySelector('[data-slot="GroupLabel"]')
      if (groupLabel && !groupLabel.hasAttribute('data-styled')) {
        Object.assign(groupLabel.style, {
          padding: '6px 10px 4px',
          fontSize: '11px',
          fontWeight: '600',
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        })
      }
    })

    // ========================================
    // DEFAULT ICONS
    // ========================================

    // Create or find ValueText
    let triggerText = trigger.querySelector('[data-slot="ValueText"]')
    if (!triggerText) {
      triggerText = document.createElement('span')
      triggerText.dataset.slot = 'ValueText'
      triggerText.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'
      trigger.insertBefore(triggerText, trigger.firstChild)
    }
    el._zagTriggerText = triggerText

    // Create or find Indicator (chevron-down)
    let indicator = trigger.querySelector('[data-slot="Indicator"]')
    if (!indicator) {
      indicator = document.createElement('span')
      indicator.dataset.slot = 'Indicator'
      indicator.style.cssText = 'color:#666;display:flex;transition:transform 0.15s;flex-shrink:0;'
      indicator.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>'
      trigger.appendChild(indicator)
    }
    el._zagIndicator = indicator

    // Create ItemIndicator (check/checkbox) for each item
    items.forEach(item => {
      let check = item.querySelector('[data-slot="ItemIndicator"]')
      if (!check) {
        check = document.createElement('span')
        check.dataset.slot = 'ItemIndicator'

        if (isMultiple) {
          // Multiple: Checkbox style (box with border, filled when selected)
          check.style.cssText = 'width:15px;height:15px;border-radius:3px;border:1px solid #444;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;'
          check.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="opacity:0;color:#fff;"><polyline points="20 6 9 17 4 12"></polyline></svg>'
          // Insert at beginning for checkbox
          item.insertBefore(check, item.firstChild)
        } else {
          // Single: Checkmark style (appears on right when selected)
          check.style.cssText = 'margin-left:auto;display:none;color:#4f46e5;flex-shrink:0;'
          check.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
          item.appendChild(check)
        }
      }
    })

    // ========================================
    // CLEAR BUTTON
    // ========================================

    let clearButton = null
    if (isClearable) {
      clearButton = trigger.querySelector('[data-slot="ClearButton"]')
      if (!clearButton) {
        clearButton = document.createElement('button')
        clearButton.type = 'button'
        clearButton.dataset.slot = 'ClearButton'
        clearButton.style.cssText = 'color:#666;padding:2px;border-radius:4px;cursor:pointer;display:none;background:none;border:none;flex-shrink:0;align-items:center;justify-content:center;'
        clearButton.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        clearButton.title = 'Auswahl löschen'
        // Insert before indicator
        trigger.insertBefore(clearButton, indicator)
      }

      clearButton.addEventListener('mouseenter', () => {
        clearButton.style.color = '#fff'
        clearButton.style.background = '#333'
      })
      clearButton.addEventListener('mouseleave', () => {
        clearButton.style.color = '#666'
        clearButton.style.background = 'none'
      })
      clearButton.addEventListener('click', (e) => {
        e.stopPropagation()
        el._zagState.value = []
        items.forEach(i => {
          i.removeAttribute('data-selected')
          const ind = i.querySelector('[data-slot="ItemIndicator"]')
          if (ind) ind.style.display = 'none'
        })
        renderTriggerValue()
        clearButton.style.display = 'none'
      })

      el._zagClearButton = clearButton
    }

    // ========================================
    // SEARCH INPUT
    // ========================================

    let searchInput = null
    let emptyElement = null
    if (isSearchable) {
      searchInput = content.querySelector('[data-slot="Input"]')
      if (!searchInput) {
        searchInput = document.createElement('input')
        searchInput.type = 'text'
        searchInput.placeholder = 'Suchen...'
        searchInput.dataset.slot = 'Input'
        searchInput.style.cssText = 'background:transparent;border:none;border-bottom:1px solid #333;padding:7px 10px;color:#fff;width:100%;font-size:13px;outline:none;'
        content.insertBefore(searchInput, content.firstChild)
      }

      // Create Empty element for no results
      emptyElement = content.querySelector('[data-slot="Empty"]')
      if (!emptyElement) {
        emptyElement = document.createElement('div')
        emptyElement.dataset.slot = 'Empty'
        emptyElement.textContent = 'Keine Ergebnisse'
        emptyElement.style.cssText = 'padding:16px;text-align:center;color:#666;font-size:12px;display:none;'
        content.appendChild(emptyElement)
      }
      el._zagEmptyElement = emptyElement

      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase()
        items.forEach(item => {
          const text = item.textContent.toLowerCase()
          // Use 'flex' instead of '' to preserve horizontal layout
          item.style.display = text.includes(query) ? 'flex' : 'none'
        })
        const visibleItems = Array.from(items).filter(i => i.style.display !== 'none')

        // Show/hide empty state
        if (emptyElement) {
          emptyElement.style.display = visibleItems.length === 0 ? '' : 'none'
        }

        el._zagState.highlightedIndex = 0
        if (visibleItems.length > 0) {
          this._updateZagHighlight(el, visibleItems)
        }
      })

      el._zagSearchInput = searchInput
    }

    // ========================================
    // HELPER FUNCTIONS
    // ========================================

    // Event dispatching helpers
    const fireOpenEvent = () => {
      el.dispatchEvent(new CustomEvent('open', { detail: { value: el._zagState.value } }))
    }
    const fireCloseEvent = () => {
      el.dispatchEvent(new CustomEvent('close', { detail: { value: el._zagState.value } }))
    }
    const fireChangeEvent = (newValue, previousValue) => {
      el.dispatchEvent(new CustomEvent('change', {
        detail: { value: newValue, previousValue },
        bubbles: true
      }))
    }

    const getItemLabel = (item) => {
      // First check for explicit ItemText slot
      const textEl = item.querySelector('[data-slot="ItemText"]')
      if (textEl) return textEl.textContent

      // For items with multiple child elements, collect text from span elements
      const childElements = item.children
      if (childElements.length > 1) {
        const texts = []
        for (const child of childElements) {
          // Skip indicators and icons
          if (child.dataset?.slot === 'ItemIndicator') continue
          if (child.querySelector('svg')) continue
          // Collect text from span elements
          const text = child.textContent?.trim()
          if (text) texts.push(text)
        }
        if (texts.length > 0) return texts.join(' ')
      }

      // Simple items: use all text content
      return item.textContent?.trim() || ''
    }

    const updateCheckIcons = () => {
      items.forEach(item => {
        const ind = item.querySelector('[data-slot="ItemIndicator"]')
        if (ind) {
          const isSelected = el._zagState.value.includes(item.dataset.mirrorItem)

          if (isMultiple) {
            // Checkbox style: fill background and show checkmark when selected
            if (isSelected) {
              ind.style.background = '#4f46e5'
              ind.style.borderColor = '#4f46e5'
              const svg = ind.querySelector('svg')
              if (svg) svg.style.opacity = '1'
            } else {
              ind.style.background = ''
              ind.style.borderColor = '#444'
              const svg = ind.querySelector('svg')
              if (svg) svg.style.opacity = '0'
            }
          } else {
            // Checkmark style: show/hide
            ind.style.display = isSelected ? '' : 'none'
          }
        }
      })
    }

    // Render tags for multiple mode
    const renderTags = () => {
      // Remove existing tag group
      const existingTags = trigger.querySelector('[data-slot="TagGroup"]')
      if (existingTags) existingTags.remove()

      if (!isMultiple || el._zagState.value.length === 0) {
        triggerText.style.display = ''
        return
      }

      // Hide text, show tags
      triggerText.style.display = 'none'

      const tagGroup = document.createElement('div')
      tagGroup.dataset.slot = 'TagGroup'
      tagGroup.style.cssText = 'display:flex;flex-wrap:nowrap;gap:4px;overflow:hidden;flex:1;'

      for (const val of el._zagState.value) {
        const matchItem = Array.from(items).find(i => i.dataset.mirrorItem === val)
        const label = matchItem ? getItemLabel(matchItem) : val

        const tag = document.createElement('span')
        tag.dataset.slot = 'Pill'
        tag.dataset.value = val
        tag.style.cssText = 'background:#333;color:#e0e0e0;padding:2px 6px;border-radius:3px;font-size:12px;display:flex;align-items:center;gap:4px;flex-shrink:0;white-space:nowrap;'
        tag.textContent = label

        const removeBtn = document.createElement('span')
        removeBtn.dataset.slot = 'PillRemove'
        removeBtn.style.cssText = 'color:#888;cursor:pointer;display:flex;'
        removeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
        removeBtn.addEventListener('mouseenter', () => removeBtn.style.color = '#fff')
        removeBtn.addEventListener('mouseleave', () => removeBtn.style.color = '#888')
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          const idx = el._zagState.value.indexOf(val)
          if (idx > -1) el._zagState.value.splice(idx, 1)
          const matchItem = Array.from(items).find(i => i.dataset.mirrorItem === val)
          if (matchItem) matchItem.removeAttribute('data-selected')
          updateCheckIcons()
          renderTags()
          renderTriggerValue()
        })
        tag.appendChild(removeBtn)
        tagGroup.appendChild(tag)
      }

      // Insert before clear button or indicator
      const insertBefore = clearButton || indicator
      trigger.insertBefore(tagGroup, insertBefore)
    }

    const renderTriggerValue = () => {
      if (isMultiple) {
        if (el._zagState.value.length === 0) {
          triggerText.style.display = ''
          triggerText.textContent = placeholder || 'Auswählen...'
          triggerText.style.color = '#666'
          if (clearButton) clearButton.style.display = 'none'
        } else {
          renderTags()
          if (clearButton) clearButton.style.display = 'flex'
        }
      } else {
        if (el._zagState.value.length === 0) {
          triggerText.textContent = placeholder || 'Auswählen...'
          triggerText.style.color = '#666'
          if (clearButton) clearButton.style.display = 'none'
        } else {
          const matchItem = Array.from(items).find(i => i.dataset.mirrorItem === el._zagState.value[0])
          triggerText.textContent = matchItem ? getItemLabel(matchItem) : el._zagState.value[0]
          triggerText.style.color = '#e0e0e0'
          if (clearButton) clearButton.style.display = 'flex'
        }
      }
    }

    // ========================================
    // DISABLED STATE
    // ========================================

    if (isDisabled) {
      trigger.setAttribute('disabled', 'true')
      trigger.style.opacity = '0.5'
      trigger.style.cursor = 'not-allowed'
      trigger.style.pointerEvents = 'none'
    }

    // ========================================
    // TRACK STATE
    // ========================================

    el._zagState.multiple = isMultiple
    el._zagPlaceholder = placeholder || 'Auswählen...'

    // Pre-select value
    const preselect = value || defaultValue
    if (preselect) {
      const preselectArr = Array.isArray(preselect) ? preselect : [preselect]
      el._zagState.value = preselectArr
      items.forEach(item => {
        if (preselectArr.includes(item.dataset.mirrorItem)) {
          item.setAttribute('data-selected', 'true')
        }
      })
      updateCheckIcons()
    }
    renderTriggerValue()

    // If disabled, don't set up interactions
    if (isDisabled) return

    // ========================================
    // TRIGGER CLICK
    // ========================================

    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      const wasOpen = el._zagState.open
      el._zagState.open = !wasOpen
      content.hidden = !el._zagState.open
      content.style.display = el._zagState.open ? '' : 'none'
      trigger.setAttribute('aria-expanded', el._zagState.open)

      // Fire open/close events
      if (el._zagState.open) {
        fireOpenEvent()
      } else {
        fireCloseEvent()
      }

      // Update styles
      trigger.style.borderColor = el._zagState.open ? '#4f46e5' : '#333'
      if (indicator) {
        indicator.style.transform = el._zagState.open ? 'rotate(180deg)' : ''
        indicator.style.color = el._zagState.open ? '#4f46e5' : '#666'
      }

      if (el._zagState.open) {
        if (searchInput) {
          searchInput.value = ''
          searchInput.focus()
          // Use 'flex' to preserve horizontal layout
          items.forEach(item => item.style.display = 'flex')
        }
        el._zagState.highlightedIndex = 0
        this._updateZagHighlight(el, items)
      }
    })

    // Hover effect
    trigger.addEventListener('mouseenter', () => {
      if (!el._zagState.open) trigger.style.borderColor = '#444'
    })
    trigger.addEventListener('mouseleave', () => {
      if (!el._zagState.open) trigger.style.borderColor = '#333'
    })

    // ========================================
    // CLICK OUTSIDE
    // ========================================

    document.addEventListener('click', (e) => {
      if (el._zagState.open && !el.contains(e.target)) {
        el._zagState.open = false
        content.hidden = true
        content.style.display = 'none'
        trigger.setAttribute('aria-expanded', 'false')
        trigger.style.borderColor = '#333'
        if (indicator) {
          indicator.style.transform = ''
          indicator.style.color = '#666'
        }
        fireCloseEvent()
      }
    })

    // ========================================
    // ITEM INTERACTIONS
    // ========================================

    items.forEach((item, index) => {
      const isItemDisabled = item.dataset.disabled === 'true'

      if (isItemDisabled) {
        item.style.opacity = '0.4'
        item.style.cursor = 'not-allowed'
        return
      }

      item.addEventListener('click', (e) => {
        e.stopPropagation()
        const itemValue = item.dataset.mirrorItem
        const previousValue = [...el._zagState.value]

        if (isMultiple) {
          const idx = el._zagState.value.indexOf(itemValue)
          if (idx > -1) {
            el._zagState.value.splice(idx, 1)
            item.removeAttribute('data-selected')
          } else {
            el._zagState.value.push(itemValue)
            item.setAttribute('data-selected', 'true')
          }
          updateCheckIcons()
          renderTriggerValue()
          fireChangeEvent([...el._zagState.value], previousValue)
        } else {
          // Single select mode
          const isCurrentlySelected = el._zagState.value.includes(itemValue)

          if (isCurrentlySelected && isDeselectable) {
            // Deselect if already selected and deselectable is enabled
            el._zagState.value = []
            item.removeAttribute('data-selected')
          } else {
            // Select new item
            el._zagState.value = [itemValue]
            items.forEach(i => i.removeAttribute('data-selected'))
            item.setAttribute('data-selected', 'true')
          }
          updateCheckIcons()
          renderTriggerValue()
          fireChangeEvent([...el._zagState.value], previousValue)

          if (closeOnSelect) {
            el._zagState.open = false
            content.hidden = true
            content.style.display = 'none'
            trigger.setAttribute('aria-expanded', 'false')
            trigger.style.borderColor = '#333'
            if (indicator) {
              indicator.style.transform = ''
              indicator.style.color = '#666'
            }
            fireCloseEvent()
          }
        }
      })

      item.addEventListener('mouseenter', () => {
        el._zagState.highlightedIndex = index
        this._updateZagHighlight(el, items)
      })
    })

    // ========================================
    // KEYBOARD NAVIGATION
    // ========================================

    el.addEventListener('keydown', (e) => {
      if (!el._zagState.open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          trigger.click()
        }
        return
      }

      const visibleItems = Array.from(content.querySelectorAll('[data-mirror-item]')).filter(i => i.style.display !== 'none')
      const count = visibleItems.length

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          el._zagState.highlightedIndex = (el._zagState.highlightedIndex + 1) % count
          this._updateZagHighlight(el, visibleItems)
          break
        case 'ArrowUp':
          e.preventDefault()
          el._zagState.highlightedIndex = (el._zagState.highlightedIndex - 1 + count) % count
          this._updateZagHighlight(el, visibleItems)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (el._zagState.highlightedIndex >= 0 && visibleItems[el._zagState.highlightedIndex]) {
            visibleItems[el._zagState.highlightedIndex].click()
          }
          break
        case 'Escape':
          e.preventDefault()
          el._zagState.open = false
          content.hidden = true
          content.style.display = 'none'
          trigger.setAttribute('aria-expanded', 'false')
          trigger.style.borderColor = '#333'
          if (indicator) {
            indicator.style.transform = ''
            indicator.style.color = '#666'
          }
          trigger.focus()
          fireCloseEvent()
          break
      }
    })

    // ========================================
    // ACCESSIBILITY
    // ========================================

    trigger.setAttribute('tabindex', '0')
    trigger.setAttribute('role', 'combobox')
    trigger.setAttribute('aria-haspopup', 'listbox')
    trigger.setAttribute('aria-expanded', 'false')
    content.setAttribute('role', 'listbox')
  },

  _updateZagHighlight(el, items) {
    items.forEach((item, i) => {
      if (i === el._zagState.highlightedIndex) {
        item.setAttribute('data-highlighted', 'true')
        item.style.background = '#252525'
      } else {
        item.removeAttribute('data-highlighted')
        item.style.background = ''
      }
    })
  },

  // Icon loading
  async loadIcon(el, iconName) {
    if (!el || !iconName) return
    const size = el.dataset.iconSize || '16'
    const color = el.dataset.iconColor || 'currentColor'
    const strokeWidth = el.dataset.iconWeight || '2'
    try {
      const url = \`https://unpkg.com/lucide-static/icons/\${iconName}.svg\`
      const res = await fetch(url)
      if (!res.ok) {
        console.warn(\`Icon "\${iconName}" not found\`)
        el.textContent = iconName
        return
      }
      const svgText = await res.text()
      el.innerHTML = svgText
      const svg = el.querySelector('svg')
      if (svg) {
        svg.style.width = size + 'px'
        svg.style.height = size + 'px'
        svg.style.color = color
        svg.setAttribute('stroke-width', strokeWidth)
        svg.style.display = 'block'
      }
    } catch (err) {
      console.warn(\`Failed to load icon "\${iconName}":\`, err)
      el.textContent = iconName
    }
  },

  // Animation registry
  _animations: new Map(),

  registerAnimation(animation) {
    if (!animation || !animation.name) return
    this._animations.set(animation.name, animation)
  },

  getAnimation(name) {
    return this._animations.get(name)
  },

  animate(animationName, elements, options = {}) {
    const animation = this._animations.get(animationName)
    if (!animation) {
      console.warn(\`Animation "\${animationName}" not found\`)
      return null
    }

    // Normalize elements to array
    let targets = []
    if (!elements) {
      return null
    } else if (Array.isArray(elements)) {
      targets = elements.map(e => e._el || e)
    } else {
      targets = [elements._el || elements]
    }

    const { delay = 0, stagger = 0, loop = false, reverse = false } = options
    const results = []

    // Easing curves
    const easingMap = {
      'linear': 'linear',
      'ease': 'ease',
      'ease-in': 'ease-in',
      'ease-out': 'ease-out',
      'ease-in-out': 'ease-in-out',
    }

    targets.forEach((el, index) => {
      if (!el) return

      const elementDelay = delay + (index * stagger)

      // Build keyframes from animation definition
      const keyframes = []
      const propertyTimelines = new Map()

      // Group properties by name to build proper keyframe sequence
      animation.keyframes.forEach(kf => {
        kf.properties.forEach(prop => {
          if (!propertyTimelines.has(prop.name)) {
            propertyTimelines.set(prop.name, [])
          }
          propertyTimelines.get(prop.name).push({
            time: kf.time,
            value: prop.value,
            easing: prop.easing || animation.easing || 'ease-out'
          })
        })
      })

      // Convert to Web Animations API format
      const duration = animation.duration * 1000
      const allTimes = [...new Set(animation.keyframes.map(kf => kf.time))].sort((a, b) => a - b)

      allTimes.forEach(time => {
        const kf = { offset: time / animation.duration }
        propertyTimelines.forEach((timeline, propName) => {
          const point = timeline.find(p => p.time === time)
          if (point) {
            // Map Mirror property names to CSS
            const cssName = this._animPropMap(propName)
            kf[cssName] = this._animValueMap(propName, point.value)
          }
        })
        keyframes.push(kf)
      })

      if (reverse) {
        keyframes.reverse()
        keyframes.forEach((kf, i) => {
          kf.offset = i / (keyframes.length - 1)
        })
      }

      const timing = {
        duration,
        delay: elementDelay,
        easing: easingMap[animation.easing] || 'ease-out',
        iterations: loop === true ? Infinity : (typeof loop === 'number' ? loop : 1),
        fill: 'forwards'
      }

      try {
        const anim = el.animate(keyframes, timing)
        results.push(anim)
      } catch (err) {
        console.warn('Animation error:', err)
      }
    })

    return results
  },

  _animPropMap(name) {
    const map = {
      'opacity': 'opacity',
      'x-offset': 'translateX',
      'y-offset': 'translateY',
      'scale': 'scale',
      'scale-x': 'scaleX',
      'scale-y': 'scaleY',
      'rotate': 'rotate',
      'background': 'backgroundColor',
      'bg': 'backgroundColor',
      'color': 'color',
      'col': 'color',
      'width': 'width',
      'height': 'height',
      'padding': 'padding',
      'pad': 'padding',
      'radius': 'borderRadius',
      'rad': 'borderRadius',
    }
    return map[name] || name
  },

  _animValueMap(propName, value) {
    if (propName === 'x-offset' || propName === 'y-offset') {
      return typeof value === 'number' ? value + 'px' : value
    }
    if (propName === 'rotate') {
      return typeof value === 'number' ? value + 'deg' : value
    }
    if (propName === 'width' || propName === 'height' || propName === 'padding' || propName === 'pad' || propName === 'radius' || propName === 'rad') {
      return typeof value === 'number' ? value + 'px' : value
    }
    return value
  },

  setupEnterExitObserver(el, onEnter, onExit) {
    if (!el) return null
    const element = el._el || el

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (onEnter) onEnter()
        } else {
          if (onExit) onExit()
        }
      })
    }, { threshold: 0.1 })

    observer.observe(element)
    return observer
  },
}
`

/**
 * Gibt die Anzahl der Zeilen im Runtime-Code zurück
 */
export function getRuntimeLineCount(): number {
  return DOM_RUNTIME_CODE.split('\n').length
}
