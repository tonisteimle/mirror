// ============================================
// Settings Panel - Mirror to Zag Implementation
// ============================================

import * as zagSwitch from 'https://esm.sh/@zag-js/switch@0.74.1'
import * as zagSelect from 'https://esm.sh/@zag-js/select@0.74.1'

// ============================================
// DOM Creation Helpers
// ============================================

function el(tag, classes = '', attrs = {}) {
  const element = document.createElement(tag)
  if (classes) element.className = classes
  Object.entries(attrs).forEach(([k, v]) => element.setAttribute(k, v))
  return element
}

function text(content, classes = 'text') {
  const span = el('span', classes)
  span.textContent = content
  return span
}

// ============================================
// Toggle Component (uses Zag Switch)
// ============================================

function createToggle(id) {
  const root = el('button', 'toggle', { type: 'button' })
  const thumb = el('span', 'toggle-thumb')
  root.appendChild(thumb)

  // Create Zag switch machine
  const service = zagSwitch.machine({ id })
  service.start()

  // Connect API
  function render() {
    const api = zagSwitch.connect(service.getState(), service.send)

    // Apply root props
    const rootProps = api.getRootProps()
    Object.entries(rootProps).forEach(([key, value]) => {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        root['_' + eventName] && root.removeEventListener(eventName, root['_' + eventName])
        root['_' + eventName] = value
        root.addEventListener(eventName, value)
      } else if (key === 'style') {
        Object.assign(root.style, value)
      } else {
        root.setAttribute(key, value)
      }
    })

    // Apply thumb props
    const thumbProps = api.getThumbProps()
    Object.entries(thumbProps).forEach(([key, value]) => {
      if (key === 'style') {
        Object.assign(thumb.style, value)
      } else if (!key.startsWith('on')) {
        thumb.setAttribute(key, value)
      }
    })
  }

  service.subscribe(render)
  render()

  return { element: root, service }
}

// ============================================
// Select Component (uses Zag Select)
// ============================================

function createSelect(id, options) {
  // Create collection
  const collection = zagSelect.collection({
    items: options.map(opt => ({ value: opt.toLowerCase(), label: opt })),
    itemToString: item => item.label,
    itemToValue: item => item.value,
  })

  // Container
  const root = el('div', 'select-root')

  // Trigger button
  const trigger = el('button', 'select-trigger', { type: 'button' })
  const valueText = el('span', 'select-value')
  valueText.textContent = options[0]
  const indicator = el('span', 'select-indicator')
  trigger.appendChild(valueText)
  trigger.appendChild(indicator)

  // Positioner & Content
  const positioner = el('div', 'select-positioner')
  const content = el('div', 'select-content')
  content.setAttribute('data-state', 'closed')

  // Items
  const items = options.map((opt, i) => {
    const item = el('div', 'select-item')
    item.textContent = opt
    item.setAttribute('data-value', opt.toLowerCase())
    return item
  })
  items.forEach(item => content.appendChild(item))

  positioner.appendChild(content)
  root.appendChild(trigger)
  root.appendChild(positioner)

  // Create Zag select machine
  const service = zagSelect.machine({
    id,
    collection,
    value: [options[0].toLowerCase()],
  })
  service.start()

  // Connect API
  function render() {
    const api = zagSelect.connect(service.getState(), service.send)

    // Root props
    applyProps(root, api.getRootProps())

    // Trigger props
    applyProps(trigger, api.getTriggerProps())

    // Update value text
    valueText.textContent = api.valueAsString || options[0]

    // Content props
    const contentProps = api.getContentProps()
    applyProps(content, contentProps)
    content.setAttribute('data-state', api.open ? 'open' : 'closed')

    // Item props
    items.forEach((item, i) => {
      const value = options[i].toLowerCase()
      const itemProps = api.getItemProps({ item: { value, label: options[i] } })
      applyProps(item, itemProps)
    })
  }

  function applyProps(element, props) {
    Object.entries(props).forEach(([key, value]) => {
      if (key.startsWith('on')) {
        const eventName = key.slice(2).toLowerCase()
        // Remove old listener
        if (element['_listener_' + eventName]) {
          element.removeEventListener(eventName, element['_listener_' + eventName])
        }
        element['_listener_' + eventName] = value
        element.addEventListener(eventName, value)
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value)
      } else if (value === false || value === null || value === undefined) {
        element.removeAttribute(key)
      } else {
        element.setAttribute(key, String(value))
      }
    })
  }

  service.subscribe(render)
  render()

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) {
      const api = zagSelect.connect(service.getState(), service.send)
      if (api.open) {
        service.send({ type: 'BLUR' })
      }
    }
  })

  return { element: root, service }
}

// ============================================
// Build UI
// ============================================

function createSettingsPanel() {
  // Card
  const card = el('div', 'card')

  // Main Column
  const mainColumn = el('div', 'column gap-lg')

  // Header
  const header = el('h3', 'h3')
  header.textContent = 'Settings'
  mainColumn.appendChild(header)

  // Divider 1
  mainColumn.appendChild(el('hr', 'divider'))

  // Appearance Section
  const appearanceSection = el('div', 'column gap-md')
  appearanceSection.appendChild(text('APPEARANCE', 'label'))

  // Dark Mode Row
  const darkModeRow = el('div', 'row spread')
  darkModeRow.appendChild(text('Dark Mode'))
  const darkModeToggle = createToggle('dark-mode-toggle')
  darkModeRow.appendChild(darkModeToggle.element)
  appearanceSection.appendChild(darkModeRow)

  // Theme Row
  const themeRow = el('div', 'row spread')
  themeRow.appendChild(text('Theme'))
  const themeSelect = createSelect('theme-select', ['Light', 'Dark', 'System'])
  themeRow.appendChild(themeSelect.element)
  appearanceSection.appendChild(themeRow)

  mainColumn.appendChild(appearanceSection)

  // Divider 2
  mainColumn.appendChild(el('hr', 'divider'))

  // Notifications Section
  const notificationsSection = el('div', 'column gap-md')
  notificationsSection.appendChild(text('NOTIFICATIONS', 'label'))

  // Email Notifications Row
  const emailRow = el('div', 'row spread')
  emailRow.appendChild(text('Email Notifications'))
  const emailToggle = createToggle('email-toggle')
  emailRow.appendChild(emailToggle.element)
  notificationsSection.appendChild(emailRow)

  // Push Notifications Row
  const pushRow = el('div', 'row spread')
  pushRow.appendChild(text('Push Notifications'))
  const pushToggle = createToggle('push-toggle')
  pushRow.appendChild(pushToggle.element)
  notificationsSection.appendChild(pushRow)

  mainColumn.appendChild(notificationsSection)

  // Divider 3
  mainColumn.appendChild(el('hr', 'divider'))

  // Footer
  const footer = el('div', 'row right gap-sm')

  const cancelBtn = el('button', 'button')
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', () => console.log('Cancel clicked'))

  const saveBtn = el('button', 'button primary')
  saveBtn.textContent = 'Save'
  saveBtn.addEventListener('click', () => console.log('Save clicked'))

  footer.appendChild(cancelBtn)
  footer.appendChild(saveBtn)
  mainColumn.appendChild(footer)

  card.appendChild(mainColumn)
  return card
}

// ============================================
// Initialize
// ============================================

const app = document.getElementById('app')
app.appendChild(createSettingsPanel())
