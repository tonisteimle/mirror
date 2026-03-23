import * as select from 'https://esm.sh/@zag-js/select@0.74.2'

// Theme Options
const items = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
]

// Create Collection
const collection = select.collection({
  items,
  itemToString: (item) => item.label,
  itemToValue: (item) => item.value
})

// Create UI Elements
function createUI() {
  const card = document.createElement('div')
  card.className = 'card'

  // H3
  const title = document.createElement('h3')
  title.textContent = 'Theme auswählen'
  card.appendChild(title)

  // Select Root
  const root = document.createElement('div')
  root.id = 'theme-select'

  // Control (wrapper for trigger)
  const control = document.createElement('div')

  // Trigger Button
  const trigger = document.createElement('button')
  trigger.type = 'button'

  const valueText = document.createElement('span')
  valueText.className = 'select-value'
  valueText.textContent = 'Light'
  trigger.appendChild(valueText)

  const indicator = document.createElement('span')
  indicator.innerHTML = '▼'
  indicator.style.fontSize = '10px'
  trigger.appendChild(indicator)

  control.appendChild(trigger)
  root.appendChild(control)

  // Positioner
  const positioner = document.createElement('div')

  // Content
  const content = document.createElement('ul')
  content.setAttribute('role', 'listbox')

  // Items
  items.forEach(item => {
    const li = document.createElement('li')
    li.setAttribute('role', 'option')
    li.setAttribute('data-value', item.value)

    const label = document.createElement('span')
    label.textContent = item.label
    li.appendChild(label)

    const check = document.createElement('span')
    check.className = 'item-check'
    check.textContent = '✓'
    li.appendChild(check)

    content.appendChild(li)
  })

  positioner.appendChild(content)
  root.appendChild(positioner)
  card.appendChild(root)

  // Selection Text
  const selectionText = document.createElement('span')
  selectionText.className = 'selection-text'
  selectionText.id = 'selection-text'
  selectionText.textContent = 'Ausgewählt: Light'
  card.appendChild(selectionText)

  return {
    card,
    root,
    control,
    trigger,
    valueText,
    indicator,
    positioner,
    content,
    items: content.querySelectorAll('li'),
    selectionText
  }
}

// Apply Zag props to element
function spreadProps(el, props) {
  if (!props) return

  for (const [key, value] of Object.entries(props)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value)
    } else if (key.startsWith('on')) {
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, value)
    } else if (value === true) {
      el.setAttribute(key, '')
    } else if (value === false || value == null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, value)
    }
  }
}

// Clean previous event listeners by cloning
function updateProps(el, props) {
  if (!props) return

  for (const [key, value] of Object.entries(props)) {
    if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value)
    } else if (key.startsWith('on')) {
      // Skip event handlers on update (already bound)
    } else if (value === true) {
      el.setAttribute(key, '')
    } else if (value === false || value == null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, value)
    }
  }
}

// Initialize Zag Machine
function initSelect(ui) {
  const service = select.machine({
    id: 'theme-select',
    collection,
    value: ['light'],
    onValueChange: (details) => {
      const selected = details.items[0]
      if (selected) {
        ui.selectionText.textContent = `Ausgewählt: ${selected.label}`
      }
    }
  })

  service.start()

  // Initial render
  const api = select.connect(service.getState(), service.send)
  render(api, ui)

  // Subscribe to state changes
  service.subscribe((state) => {
    const api = select.connect(state, service.send)
    render(api, ui)
  })

  return service
}

// Render function
let isFirstRender = true

function render(api, ui) {
  if (isFirstRender) {
    // First render: apply all props including event handlers
    spreadProps(ui.root, api.getRootProps())
    spreadProps(ui.control, api.getControlProps())
    spreadProps(ui.trigger, api.getTriggerProps())
    spreadProps(ui.indicator, api.getIndicatorProps())
    spreadProps(ui.positioner, api.getPositionerProps())
    spreadProps(ui.content, api.getContentProps())

    ui.items.forEach((item, index) => {
      const itemData = items[index]
      spreadProps(item, api.getItemProps({ item: itemData }))
      const check = item.querySelector('.item-check')
      if (check) {
        spreadProps(check, api.getItemIndicatorProps({ item: itemData }))
      }
    })

    // Hidden select for form compatibility
    const hiddenSelect = document.createElement('select')
    spreadProps(hiddenSelect, api.getHiddenSelectProps())
    ui.root.appendChild(hiddenSelect)

    isFirstRender = false
  } else {
    // Subsequent renders: update attributes only
    updateProps(ui.root, api.getRootProps())
    updateProps(ui.control, api.getControlProps())
    updateProps(ui.trigger, api.getTriggerProps())
    updateProps(ui.indicator, api.getIndicatorProps())
    updateProps(ui.positioner, api.getPositionerProps())
    updateProps(ui.content, api.getContentProps())

    ui.items.forEach((item, index) => {
      const itemData = items[index]
      updateProps(item, api.getItemProps({ item: itemData }))
    })
  }

  // Update value text
  ui.valueText.textContent = api.valueAsString || 'Auswählen...'
}

// Start App
const ui = createUI()
document.getElementById('app').appendChild(ui.card)
initSelect(ui)
