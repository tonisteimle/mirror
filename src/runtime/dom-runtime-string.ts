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
    el.style.display = ''
  },

  hide(el) {
    if (!el) return
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

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      el._zagState.open = !el._zagState.open
      content.hidden = !el._zagState.open
      content.style.display = el._zagState.open ? '' : 'none'
      trigger.setAttribute('aria-expanded', el._zagState.open)

      if (el._zagState.open) {
        // Highlight first item
        const items = content.querySelectorAll('[data-mirror-item]')
        if (items.length > 0) {
          el._zagState.highlightedIndex = 0
          this._updateZagHighlight(el, items)
        }
      }
    })

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (el._zagState.open && !el.contains(e.target)) {
        el._zagState.open = false
        content.hidden = true
        content.style.display = 'none'
        trigger.setAttribute('aria-expanded', 'false')
      }
    })

    // Item selection
    const items = content.querySelectorAll('[data-mirror-item]')
    items.forEach((item, index) => {
      item.style.cursor = 'pointer'

      item.addEventListener('click', (e) => {
        e.stopPropagation()
        const value = item.dataset.mirrorItem
        el._zagState.value = [value]

        // Update trigger text
        trigger.textContent = item.textContent

        // Mark selected
        items.forEach(i => i.removeAttribute('data-selected'))
        item.setAttribute('data-selected', 'true')

        // Close dropdown
        el._zagState.open = false
        content.hidden = true
        content.style.display = 'none'
        trigger.setAttribute('aria-expanded', 'false')
      })

      item.addEventListener('mouseenter', () => {
        el._zagState.highlightedIndex = index
        this._updateZagHighlight(el, items)
      })
    })

    // Keyboard navigation
    el.addEventListener('keydown', (e) => {
      if (!el._zagState.open) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          trigger.click()
        }
        return
      }

      const items = content.querySelectorAll('[data-mirror-item]')
      const count = items.length

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          el._zagState.highlightedIndex = (el._zagState.highlightedIndex + 1) % count
          this._updateZagHighlight(el, items)
          break
        case 'ArrowUp':
          e.preventDefault()
          el._zagState.highlightedIndex = (el._zagState.highlightedIndex - 1 + count) % count
          this._updateZagHighlight(el, items)
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (el._zagState.highlightedIndex >= 0) {
            items[el._zagState.highlightedIndex].click()
          }
          break
        case 'Escape':
          e.preventDefault()
          el._zagState.open = false
          content.hidden = true
          content.style.display = 'none'
          trigger.setAttribute('aria-expanded', 'false')
          trigger.focus()
          break
      }
    })

    // Make trigger focusable
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
      } else {
        item.removeAttribute('data-highlighted')
      }
    })
  },

  // Icon loading
  async loadIcon(el, iconName) {
    if (!el || !iconName) return
    const size = el.dataset.iconSize || '24'
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
