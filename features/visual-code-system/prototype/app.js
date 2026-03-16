/**
 * Visual Code System Prototype v3
 *
 * Unified Container Model:
 * - Alles ist ein Container
 * - Jeder Container kann Kinder haben
 * - Drop direkt auf jeden sichtbaren Container (keine Navigation nötig)
 * - 9-Zonen-Positionierung für jeden Container
 */

// ============================================================================
// Layout Definitions
// ============================================================================

const LAYOUTS = {
  'horizontal': {
    name: 'HStack',
    direction: 'horizontal',
    slots: [
      { id: 'slot1', name: 'Slot 1', flex: 1 },
      { id: 'slot2', name: 'Slot 2', flex: 1 }
    ]
  },
  'vertical': {
    name: 'VStack',
    direction: 'vertical',
    slots: [
      { id: 'slot1', name: 'Slot 1', flex: 1 },
      { id: 'slot2', name: 'Slot 2', flex: 1 }
    ]
  },
  'sidebar-layout': {
    name: 'SidebarLayout',
    direction: 'horizontal',
    slots: [
      { id: 'sidebar', name: 'Sidebar', width: '240px' },
      { id: 'content', name: 'Content', flex: 1 }
    ]
  },
  'header-content': {
    name: 'HeaderContent',
    direction: 'vertical',
    slots: [
      { id: 'header', name: 'Header', height: '60px' },
      { id: 'content', name: 'Content', flex: 1 }
    ]
  },
  'three-column': {
    name: 'ThreeColumn',
    direction: 'horizontal',
    slots: [
      { id: 'left', name: 'Left', flex: 1 },
      { id: 'center', name: 'Center', flex: 2 },
      { id: 'right', name: 'Right', flex: 1 }
    ]
  },
  'holy-grail': {
    name: 'HolyGrail',
    direction: 'vertical',
    slots: [
      { id: 'header', name: 'Header', height: '60px' },
      { id: 'body', name: 'Body', flex: 1, direction: 'horizontal', slots: [
        { id: 'sidebar', name: 'Sidebar', width: '180px' },
        { id: 'main', name: 'Main', flex: 1 },
        { id: 'aside', name: 'Aside', width: '180px' }
      ]},
      { id: 'footer', name: 'Footer', height: '50px' }
    ]
  }
}

// ============================================================================
// State
// ============================================================================

const state = {
  // Alle Container (flache Map für einfachen Zugriff)
  containers: {
    root: {
      id: 'root',
      name: 'App',
      type: 'root',
      direction: 'vertical',  // Root stacks vertically by default
      children: []
    }
  },
  // Berechnete Bounds für jeden Container (wird bei jedem Render aktualisiert)
  containerBounds: {},
  // Aktuell in Breadcrumb angezeigter Container
  viewContainer: 'root',
  // Ausgewählte Elemente (Array für Multi-Select)
  selectedElements: [],
  // Drag State
  drag: {
    active: false,
    data: null,
    targetContainer: null,
    targetZone: 'mid-center',
    siblingInsert: null  // { refId, position: 'before'|'after' }
  }
}

// ============================================================================
// DOM References
// ============================================================================

const $ = id => document.getElementById(id)

const dom = {
  canvas: $('canvas'),
  gridOverlay: $('gridOverlay'),
  dropZones: $('slotIndicators'),
  dropIndicator: $('dropIndicator'),
  elements: $('placedElements'),
  zoneIndicator: $('zoneIndicator'),
  codeOutput: $('codeOutput'),
  breadcrumb: $('breadcrumb'),
  clearButton: $('clearCanvas'),
  gridControls: $('gridControls'),
  gridColumns: $('gridColumns'),
  gridRows: $('gridRows'),
  gridGap: $('gridGap'),
  toolbarHint: $('toolbarHint')
}

// ============================================================================
// Container Helpers
// ============================================================================

function getContainer(id) {
  return state.containers[id]
}

function createContainer(data) {
  const id = `c-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
  state.containers[id] = { id, children: [], ...data }
  return id
}

function addChild(parentId, childId) {
  const parent = getContainer(parentId)
  if (parent && !parent.children.includes(childId)) {
    parent.children.push(childId)
  }
}

function insertChildAt(parentId, childId, refId, position) {
  const parent = getContainer(parentId)
  if (!parent) return

  // Remove if already exists
  parent.children = parent.children.filter(id => id !== childId)

  const refIndex = parent.children.indexOf(refId)
  if (refIndex === -1) {
    // Reference not found, just add at end
    parent.children.push(childId)
  } else {
    // Insert before or after reference
    const insertIndex = position === 'before' ? refIndex : refIndex + 1
    parent.children.splice(insertIndex, 0, childId)
  }
}

function removeContainer(id) {
  const container = getContainer(id)
  if (!container) return

  // Remove children recursively
  container.children?.forEach(childId => removeContainer(childId))

  // Remove from parent
  Object.values(state.containers).forEach(c => {
    if (c.children) {
      c.children = c.children.filter(cid => cid !== id)
    }
  })

  delete state.containers[id]
  delete state.containerBounds[id]
}

function findParent(childId) {
  for (const [id, container] of Object.entries(state.containers)) {
    if (container.children?.includes(childId)) {
      return id
    }
  }
  return null
}

function isDescendant(parentId, childId) {
  const parent = getContainer(parentId)
  if (!parent?.children?.length) return false
  if (parent.children.includes(childId)) return true
  return parent.children.some(id => isDescendant(id, childId))
}

function deepCloneContainer(containerId) {
  const container = getContainer(containerId)
  if (!container) return null

  // Clone without id and children (will be regenerated)
  const { id, children, ...rest } = container
  const newId = createContainer({ ...rest })

  // Recursively clone children
  children?.forEach(childId => {
    const clonedChildId = deepCloneContainer(childId)
    if (clonedChildId) {
      addChild(newId, clonedChildId)
    }
  })

  return newId
}

function duplicateContainer(containerId) {
  const container = getContainer(containerId)
  if (!container || container.type === 'root') return null

  const parentId = findParent(containerId)
  if (!parentId) return null

  const cloneId = deepCloneContainer(containerId)
  if (!cloneId) return null

  // Insert after original
  const parent = getContainer(parentId)
  const originalIndex = parent.children.indexOf(containerId)
  parent.children.splice(originalIndex + 1, 0, cloneId)
  // Remove from end (addChild already added it)
  parent.children = parent.children.filter((id, i, arr) =>
    id !== cloneId || i === originalIndex + 1
  )

  return cloneId
}

function groupSelectedElements() {
  if (state.selectedElements.length < 2) return

  // All selected elements must have the same parent
  const parents = state.selectedElements.map(id => findParent(id))
  const uniqueParents = [...new Set(parents)]
  if (uniqueParents.length !== 1 || !uniqueParents[0]) {
    console.warn('Can only group siblings (same parent)')
    return
  }

  const parentId = uniqueParents[0]
  const parent = getContainer(parentId)

  // Get indices of selected elements in parent's children array
  const indices = state.selectedElements
    .map(id => parent.children.indexOf(id))
    .filter(i => i !== -1)
    .sort((a, b) => a - b)

  if (indices.length === 0) return

  const firstIndex = indices[0]

  // Create new container with parent's direction
  const groupId = createContainer({
    type: 'container',
    name: parent.direction === 'horizontal' ? 'HBox' : 'VBox',
    component: 'box',
    direction: parent.direction || 'vertical',
    sizing: { width: 'fill', height: 'fill' }
  })

  // Move selected elements into the group (in order)
  indices.forEach(i => {
    const childId = parent.children[i]
    addChild(groupId, childId)
  })

  // Remove selected elements from parent
  parent.children = parent.children.filter(id => !state.selectedElements.includes(id))

  // Insert group at position of first element
  parent.children.splice(firstIndex, 0, groupId)

  // Select the new group
  state.selectedElements = [groupId]

  render()
  updateGridControls()
}

// ============================================================================
// Layout Creation
// ============================================================================

function createLayoutWithSlots(parentId, layoutType, position) {
  const layoutDef = LAYOUTS[layoutType]
  if (!layoutDef) return null

  const layoutId = createContainer({
    type: 'layout',
    layoutType,
    name: layoutDef.name,
    direction: layoutDef.direction,
    zone: position.zone
  })

  addChild(parentId, layoutId)

  // Create slots recursively
  createSlots(layoutId, layoutDef.slots)

  return layoutId
}

function createSlots(parentId, slots) {
  slots.forEach(slot => {
    const slotId = createContainer({
      type: 'slot',
      name: slot.name,
      slotConfig: {
        width: slot.width,
        height: slot.height,
        flex: slot.flex
      },
      direction: slot.direction
    })
    addChild(parentId, slotId)

    // Nested slots (e.g., holy-grail body)
    if (slot.slots) {
      createSlots(slotId, slot.slots)
    }
  })
}

// ============================================================================
// Bounds Calculation
// ============================================================================

function getCanvasRect() {
  return dom.canvas.getBoundingClientRect()
}

function calculateAllBounds() {
  state.containerBounds = {}
  const canvasRect = getCanvasRect()

  // Root bounds = full canvas
  state.containerBounds.root = {
    left: 0,
    top: 0,
    width: canvasRect.width,
    height: canvasRect.height
  }

  // Calculate bounds for all children of root
  const root = getContainer('root')
  if (root.children.length > 0) {
    calculateChildBounds('root', state.containerBounds.root)
  }
}

function calculateChildBounds(parentId, parentBounds) {
  const parent = getContainer(parentId)
  if (!parent?.children?.length) return

  const padding = 16
  const gap = 8
  const direction = parent.direction || 'vertical'

  // For layouts/slots, calculate based on flex/fixed sizes
  const children = parent.children.map(id => getContainer(id)).filter(Boolean)

  // Separate slot children from component children
  const slotChildren = children.filter(c => c.type === 'slot')
  const componentChildren = children.filter(c => c.type === 'component' || c.type === 'container' || c.type === 'layout')

  // Calculate bounds for slot children (flex/fixed layout)
  if (slotChildren.length > 0) {
    let totalFlex = 0
    let fixedSize = 0

    slotChildren.forEach(child => {
      const config = child.slotConfig || {}
      if (config.flex) {
        totalFlex += config.flex
      } else if (direction === 'horizontal' && config.width) {
        fixedSize += parseInt(config.width) || 0
      } else if (direction === 'vertical' && config.height) {
        fixedSize += parseInt(config.height) || 0
      }
    })

    const availableSize = (direction === 'horizontal'
      ? parentBounds.width - 2 * padding
      : parentBounds.height - 2 * padding
    ) - fixedSize - (slotChildren.length - 1) * gap

    let offset = padding

    slotChildren.forEach(child => {
      const config = child.slotConfig || {}
      let width, height

      if (direction === 'horizontal') {
        width = config.flex
          ? (availableSize * config.flex / totalFlex)
          : (parseInt(config.width) || 100)
        height = parentBounds.height - 2 * padding
      } else {
        width = parentBounds.width - 2 * padding
        height = config.flex
          ? (availableSize * config.flex / totalFlex)
          : (parseInt(config.height) || 60)
      }

      const bounds = {
        left: parentBounds.left + (direction === 'horizontal' ? offset : padding),
        top: parentBounds.top + (direction === 'vertical' ? offset : padding),
        width,
        height
      }

      state.containerBounds[child.id] = bounds

      // Recurse for nested containers
      if (child.children?.length > 0) {
        calculateChildBounds(child.id, bounds)
      }

      offset += (direction === 'horizontal' ? width : height) + gap
    })
  }

  // Components/containers: stack according to parent direction and apply sizing
  if (componentChildren.length > 0) {
    const availableWidth = parentBounds.width - 2 * padding
    const availableHeight = parentBounds.height - 2 * padding
    const totalGap = (componentChildren.length - 1) * gap

    // Calculate sizes for fill children in stacking direction
    let fixedSize = 0
    let fillCount = 0

    componentChildren.forEach(child => {
      const sizing = child.sizing || { width: 'fill', height: 'fill' }
      if (direction === 'vertical') {
        if (typeof sizing.height === 'number') {
          fixedSize += sizing.height
        } else if (sizing.height === 'hug') {
          fixedSize += 100 // min size for hug
        } else {
          fillCount++
        }
      } else {
        if (typeof sizing.width === 'number') {
          fixedSize += sizing.width
        } else if (sizing.width === 'hug') {
          fixedSize += 100
        } else {
          fillCount++
        }
      }
    })

    const fillSize = fillCount > 0
      ? ((direction === 'vertical' ? availableHeight : availableWidth) - fixedSize - totalGap) / fillCount
      : 0

    let offset = padding

    componentChildren.forEach(child => {
      const sizing = child.sizing || { width: 'fill', height: 'fill' }

      let width, height

      if (direction === 'vertical') {
        // Width: apply sizing
        if (typeof sizing.width === 'number') {
          width = sizing.width
        } else if (sizing.width === 'hug') {
          width = Math.min(availableWidth, 100)
        } else {
          width = availableWidth
        }

        // Height: stack
        if (typeof sizing.height === 'number') {
          height = sizing.height
        } else if (sizing.height === 'hug') {
          height = 100
        } else {
          height = Math.max(40, fillSize)
        }
      } else {
        // Width: stack
        if (typeof sizing.width === 'number') {
          width = sizing.width
        } else if (sizing.width === 'hug') {
          width = 100
        } else {
          width = Math.max(40, fillSize)
        }

        // Height: apply sizing
        if (typeof sizing.height === 'number') {
          height = sizing.height
        } else if (sizing.height === 'hug') {
          height = Math.min(availableHeight, 100)
        } else {
          height = availableHeight
        }
      }

      const bounds = {
        left: parentBounds.left + (direction === 'horizontal' ? offset : padding),
        top: parentBounds.top + (direction === 'vertical' ? offset : padding),
        width,
        height
      }

      state.containerBounds[child.id] = bounds

      // Recurse for nested containers
      if (child.children?.length > 0) {
        calculateChildBounds(child.id, bounds)
      }

      offset += (direction === 'vertical' ? height : width) + gap
    })
  }
}

// ============================================================================
// Hit Testing - Find deepest container at position
// ============================================================================

function findContainerAt(x, y) {
  const canvasRect = getCanvasRect()
  const relX = x - canvasRect.left
  const relY = y - canvasRect.top

  // Start from root and find deepest matching container
  return findDeepestContainer('root', relX, relY)
}

function findDeepestContainer(containerId, x, y) {
  const bounds = state.containerBounds[containerId]
  if (!bounds) return null

  // Check if point is inside this container
  if (x < bounds.left || x > bounds.left + bounds.width ||
      y < bounds.top || y > bounds.top + bounds.height) {
    return null
  }

  // Check children (deeper containers have priority)
  // In Mirror, EVERY element is a container that can have children
  const container = getContainer(containerId)
  if (container?.children?.length) {
    for (const childId of container.children) {
      const deeper = findDeepestContainer(childId, x, y)
      if (deeper) return deeper
    }
  }

  // No deeper container found, return this one
  return { id: containerId, bounds }
}

function getZoneAt(x, y, bounds) {
  const canvasRect = getCanvasRect()
  const relX = (x - canvasRect.left - bounds.left) / bounds.width
  const relY = (y - canvasRect.top - bounds.top) / bounds.height

  let zoneX = relX < 0.33 ? 'left' : relX > 0.66 ? 'right' : 'center'
  let zoneY = relY < 0.33 ? 'top' : relY > 0.66 ? 'bot' : 'mid'

  return `${zoneY}-${zoneX}`
}

// ============================================================================
// Rendering
// ============================================================================

function render() {
  calculateAllBounds()
  renderBreadcrumb()
  renderContainers()
  renderDropZones()
  generateCode()
}

function renderBreadcrumb() {
  // Simple breadcrumb showing root
  dom.breadcrumb.innerHTML = `
    <span class="breadcrumb-item active" data-id="root">App</span>
  `
}

function renderContainers() {
  dom.elements.innerHTML = ''

  const root = getContainer('root')
  root.children.forEach(childId => {
    renderContainer(childId)
  })
}

function renderContainer(containerId) {
  const container = getContainer(containerId)
  const bounds = state.containerBounds[containerId]
  if (!container || !bounds) return

  const el = document.createElement('div')
  el.className = `container-element ${container.type}`
  el.dataset.id = containerId
  el.style.left = `${bounds.left}px`
  el.style.top = `${bounds.top}px`
  el.style.width = `${bounds.width}px`
  el.style.height = `${bounds.height}px`

  // Make draggable for moving
  el.draggable = true

  const isSelected = state.selectedElements.includes(containerId)
  if (isSelected) {
    el.classList.add('selected')
  }

  // Add grid class for grid containers
  if (container.grid) {
    el.classList.add('grid-container')
  }

  // Render grid lines for grid containers
  if (container.grid) {
    renderGridLines(el, container.grid, bounds)
  }

  // For components, show the visual
  if (container.type === 'component') {
    el.classList.add(container.component)

    // Position fixed-size components within their zone
    if (container.sizing === 'fixed') {
      const size = getComponentSize(container.component)
      if (size) {
        const zonePos = calculateZonePosition(container.zone, bounds.width, bounds.height, size.width, size.height)
        el.style.width = `${size.width}px`
        el.style.height = `${size.height}px`
        el.style.left = `${bounds.left + zonePos.x}px`
        el.style.top = `${bounds.top + zonePos.y}px`
      }
    }
  }

  // Render resize handles for selected element (subtle design)
  if (isSelected && container.type !== 'root' && container.type !== 'slot') {
    renderResizeHandles(el, container)
  }

  dom.elements.appendChild(el)

  // Render children
  container.children?.forEach(childId => {
    renderContainer(childId)
  })
}

function renderResizeHandles(el, container) {
  // 8 small dots: 4 corners + 4 edge centers
  const positions = [
    { pos: 'nw', cursor: 'nwse-resize' },
    { pos: 'n', cursor: 'ns-resize' },
    { pos: 'ne', cursor: 'nesw-resize' },
    { pos: 'e', cursor: 'ew-resize' },
    { pos: 'se', cursor: 'nwse-resize' },
    { pos: 's', cursor: 'ns-resize' },
    { pos: 'sw', cursor: 'nesw-resize' },
    { pos: 'w', cursor: 'ew-resize' }
  ]

  positions.forEach(({ pos, cursor }) => {
    const dot = document.createElement('div')
    dot.className = `resize-dot ${pos}`
    dot.dataset.pos = pos
    dot.dataset.id = container.id
    dot.style.cursor = cursor
    el.appendChild(dot)
  })
}

function renderGridLines(el, grid, bounds) {
  const { columns, rows, gap } = grid
  const gridOverlay = document.createElement('div')
  gridOverlay.className = 'grid-lines-overlay'

  const padding = 16
  const availableWidth = bounds.width - 2 * padding
  const availableHeight = bounds.height - 2 * padding

  const cellWidth = (availableWidth - (columns - 1) * gap) / columns
  const cellHeight = (availableHeight - (rows - 1) * gap) / rows

  // Vertical lines
  for (let i = 1; i < columns; i++) {
    const x = padding + i * cellWidth + (i - 0.5) * gap
    const line = document.createElement('div')
    line.className = 'grid-line vertical'
    line.style.left = `${x}px`
    line.style.top = `${padding}px`
    line.style.height = `${availableHeight}px`
    gridOverlay.appendChild(line)
  }

  // Horizontal lines
  for (let i = 1; i < rows; i++) {
    const y = padding + i * cellHeight + (i - 0.5) * gap
    const line = document.createElement('div')
    line.className = 'grid-line horizontal'
    line.style.top = `${y}px`
    line.style.left = `${padding}px`
    line.style.width = `${availableWidth}px`
    gridOverlay.appendChild(line)
  }

  el.appendChild(gridOverlay)
}

function getComponentSize(component) {
  const sizes = {
    'icon': { width: 48, height: 48 },
    'avatar': { width: 64, height: 64 },
    'button': { width: 120, height: 40 },
    'card-small': { width: 200, height: 150 }
  }
  return sizes[component]
}

function calculateZonePosition(zone, areaW, areaH, elemW, elemH) {
  const pad = 8
  let x = 0, y = 0

  if (zone?.includes('left')) x = pad
  else if (zone?.includes('right')) x = areaW - elemW - pad
  else x = (areaW - elemW) / 2

  if (zone?.includes('top')) y = pad
  else if (zone?.includes('bot')) y = areaH - elemH - pad
  else y = (areaH - elemH) / 2

  return { x: Math.max(0, x), y: Math.max(0, y) }
}

// ============================================================================
// Drop Zones Rendering
// ============================================================================

function renderDropZones() {
  dom.dropZones.innerHTML = ''

  if (!state.drag.active) return

  // Render drop zone for target container
  const targetId = state.drag.targetContainer
  if (!targetId) return

  const bounds = state.containerBounds[targetId]
  if (!bounds) return

  const zoneEl = document.createElement('div')
  zoneEl.className = 'drop-zone active'
  zoneEl.style.left = `${bounds.left}px`
  zoneEl.style.top = `${bounds.top}px`
  zoneEl.style.width = `${bounds.width}px`
  zoneEl.style.height = `${bounds.height}px`

  // Add 9-zone dots
  const zones = [
    'top-left', 'top-center', 'top-right',
    'mid-left', 'mid-center', 'mid-right',
    'bot-left', 'bot-center', 'bot-right'
  ]

  zones.forEach(zone => {
    const dot = document.createElement('div')
    dot.className = `zone-dot ${zone}`
    if (zone === state.drag.targetZone) {
      dot.classList.add('active')
    }
    zoneEl.appendChild(dot)
  })

  dom.dropZones.appendChild(zoneEl)
}

function showZoneIndicator(containerName, zone) {
  const zoneName = formatZoneName(zone)
  dom.zoneIndicator.querySelector('.zone-name').textContent =
    `${containerName} | ${zoneName}`
  dom.zoneIndicator.classList.add('visible')
}

function hideZoneIndicator() {
  dom.zoneIndicator.classList.remove('visible')
}

function formatZoneName(zone) {
  const names = {
    'top-left': 'TOP-LEFT', 'top-center': 'TOP-CENTER', 'top-right': 'TOP-RIGHT',
    'mid-left': 'MID-LEFT', 'mid-center': 'MID-CENTER', 'mid-right': 'MID-RIGHT',
    'bot-left': 'BOT-LEFT', 'bot-center': 'BOT-CENTER', 'bot-right': 'BOT-RIGHT'
  }
  return names[zone] || zone
}

// ============================================================================
// Drag & Drop
// ============================================================================

function initDragAndDrop() {
  // Palette items
  document.querySelectorAll('.palette-item').forEach(item => {
    item.addEventListener('dragstart', onPaletteDragStart)
    item.addEventListener('dragend', onDragEnd)
  })

  // Canvas - use event delegation for dynamically created elements
  dom.canvas.addEventListener('dragstart', onCanvasDragStart)
  dom.canvas.addEventListener('dragend', onDragEnd)
  dom.canvas.addEventListener('dragover', onDragOver)
  dom.canvas.addEventListener('dragleave', onDragLeave)
  dom.canvas.addEventListener('drop', onDrop)
}

function onPaletteDragStart(e) {
  const item = e.target.closest('.palette-item')

  state.drag = {
    active: true,
    data: {
      type: item.dataset.type,
      component: item.dataset.component,
      layout: item.dataset.layout,
      direction: item.dataset.direction,
      sizing: item.dataset.sizing || 'fill',
      width: item.dataset.width,
      height: item.dataset.height
    },
    targetContainer: null,
    targetZone: 'mid-center'
  }

  e.dataTransfer.effectAllowed = 'copy'
  e.dataTransfer.setData('text/plain', item.dataset.type)
  item.style.opacity = '0.5'
}

function onCanvasDragStart(e) {
  const el = e.target.closest('.container-element')
  if (!el) return

  const containerId = el.dataset.id
  const container = getContainer(containerId)
  if (!container || container.type === 'root') return

  state.drag = {
    active: true,
    data: {
      moveId: containerId,  // This indicates a move operation
      type: container.type,
      component: container.component,
      name: container.name
    },
    targetContainer: null,
    targetZone: 'mid-center'
  }

  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', containerId)
  el.style.opacity = '0.5'
}

function onDragEnd(e) {
  e.target.style.opacity = ''
  state.drag = { active: false, data: null, targetContainer: null, targetZone: 'mid-center', siblingInsert: null }
  hideZoneIndicator()
  hideSiblingIndicator()
  render()
}

function onDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = state.drag.data?.moveId ? 'move' : 'copy'

  if (!state.drag.active) return

  // Find deepest container at mouse position
  const hit = findContainerAt(e.clientX, e.clientY)

  if (hit) {
    const container = getContainer(hit.id)
    const parentId = findParent(hit.id)
    const parent = parentId ? getContainer(parentId) : null

    // Check if we're near the edge (for sibling insertion)
    const siblingDrop = checkSiblingDrop(e.clientX, e.clientY, hit, parent)

    if (siblingDrop && parentId) {
      // Sibling mode: insert before/after this container
      state.drag.targetContainer = parentId
      state.drag.targetZone = 'mid-center'
      state.drag.siblingInsert = {
        refId: hit.id,
        position: siblingDrop.position // 'before' or 'after'
      }
      showZoneIndicator(`${parent?.name || 'Parent'} (als Schwester)`, siblingDrop.position)
      showSiblingIndicator(hit.bounds, siblingDrop.position, parent?.direction || 'vertical')
    } else {
      // Child mode: insert into this container
      state.drag.targetContainer = hit.id
      state.drag.targetZone = getZoneAt(e.clientX, e.clientY, hit.bounds)
      state.drag.siblingInsert = null
      showZoneIndicator(container?.name || 'Container', state.drag.targetZone)
      hideSiblingIndicator()
    }
  } else {
    state.drag.targetContainer = 'root'
    state.drag.targetZone = 'mid-center'
    state.drag.siblingInsert = null
    hideSiblingIndicator()
  }

  renderDropZones()
}

function checkSiblingDrop(x, y, hit, parent) {
  if (!parent) return null

  const canvasRect = getCanvasRect()
  const bounds = hit.bounds

  const relX = x - canvasRect.left - bounds.left
  const relY = y - canvasRect.top - bounds.top

  const direction = parent.direction || 'vertical'

  if (direction === 'horizontal') {
    // Edge threshold: 15% of width, min 6px, max 12px
    const threshold = Math.min(12, Math.max(6, bounds.width * 0.15))
    if (relX < threshold) {
      return { position: 'before' }
    } else if (relX > bounds.width - threshold) {
      return { position: 'after' }
    }
  } else {
    // Edge threshold: 15% of height, min 6px, max 12px
    const threshold = Math.min(12, Math.max(6, bounds.height * 0.15))
    if (relY < threshold) {
      return { position: 'before' }
    } else if (relY > bounds.height - threshold) {
      return { position: 'after' }
    }
  }

  return null
}

function showSiblingIndicator(bounds, position, direction) {
  let indicator = document.getElementById('siblingIndicator')
  if (!indicator) {
    indicator = document.createElement('div')
    indicator.id = 'siblingIndicator'
    indicator.className = 'sibling-indicator'
    dom.canvas.appendChild(indicator)
  }

  indicator.style.display = 'block'

  if (direction === 'horizontal') {
    // Vertical line
    indicator.style.width = '3px'
    indicator.style.height = `${bounds.height}px`
    indicator.style.top = `${bounds.top}px`
    indicator.style.left = position === 'before'
      ? `${bounds.left - 2}px`
      : `${bounds.left + bounds.width - 1}px`
  } else {
    // Horizontal line
    indicator.style.width = `${bounds.width}px`
    indicator.style.height = '3px'
    indicator.style.left = `${bounds.left}px`
    indicator.style.top = position === 'before'
      ? `${bounds.top - 2}px`
      : `${bounds.top + bounds.height - 1}px`
  }
}

function hideSiblingIndicator() {
  const indicator = document.getElementById('siblingIndicator')
  if (indicator) {
    indicator.style.display = 'none'
  }
}

function onDragLeave(e) {
  const rect = getCanvasRect()
  if (e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top || e.clientY > rect.bottom) {
    state.drag.targetContainer = null
    state.drag.siblingInsert = null
    hideZoneIndicator()
    hideSiblingIndicator()
    renderDropZones()
  }
}

function onDrop(e) {
  e.preventDefault()

  if (!state.drag.active || !state.drag.data) return

  const targetId = state.drag.targetContainer || 'root'
  const zone = state.drag.targetZone
  const data = state.drag.data
  const siblingInsert = state.drag.siblingInsert
  let newElementId = null

  // Helper to add child (either as sibling or as child)
  function addToTarget(childId) {
    if (siblingInsert) {
      insertChildAt(targetId, childId, siblingInsert.refId, siblingInsert.position)
    } else {
      addChild(targetId, childId)
    }
  }

  // Move operation - relocate existing element
  if (data.moveId) {
    const moveId = data.moveId
    const currentParent = findParent(moveId)

    // Don't move into itself or its children
    if (moveId === targetId || isDescendant(moveId, targetId)) {
      state.drag = { active: false, data: null, targetContainer: null, targetZone: 'mid-center', siblingInsert: null }
      hideZoneIndicator()
      hideSiblingIndicator()
      render()
      return
    }

    // Remove from current parent
    if (currentParent) {
      const parent = getContainer(currentParent)
      parent.children = parent.children.filter(id => id !== moveId)
    }

    // Add to new parent (or as sibling)
    addToTarget(moveId)

    // Update zone if needed
    const container = getContainer(moveId)
    if (container) {
      container.zone = zone
    }

    newElementId = moveId
  } else if (data.type === 'layout') {
    newElementId = createLayoutWithSlots(targetId, data.layout, { zone })
  } else if (data.type === 'container') {
    const isGrid = data.component === 'grid-container'
    const targetContainer = getContainer(targetId)
    const parentDirection = targetContainer?.direction || 'vertical'
    const residual = getResidualSpace(targetId)

    // Smart sizing based on residual space (after existing siblings):
    // - Cross direction: fill
    // - Stack direction: half of remaining space
    let sizing
    if (parentDirection === 'horizontal') {
      const stackSize = Math.max(40, Math.round(residual.width / 2))
      sizing = { width: stackSize, height: 'fill' }
    } else {
      const stackSize = Math.max(40, Math.round(residual.height / 2))
      sizing = { width: 'fill', height: stackSize }
    }

    // Determine name based on direction
    let name = 'Box'
    if (isGrid) {
      name = 'Grid'
      sizing = { width: 'fill', height: 'fill' }  // Grid fills both
    } else if (data.direction === 'vertical') {
      name = 'VBox'
    } else if (data.direction === 'horizontal') {
      name = 'HBox'
    }

    const containerId = createContainer({
      type: 'container',
      name,
      component: data.component,
      direction: data.direction || 'vertical',
      zone,
      sizing,
      // Grid settings
      grid: isGrid ? { columns: 4, rows: 3, gap: 8 } : null
    })
    addToTarget(containerId)
    newElementId = containerId
  } else {
    // Component
    const targetContainer = getContainer(targetId)
    const parentDirection = targetContainer?.direction || 'vertical'
    const residual = getResidualSpace(targetId)

    // Smart sizing based on residual space
    let sizing
    if (data.sizing === 'fixed' && data.width && data.height) {
      // Fixed size component (e.g. icon, button)
      sizing = { width: parseInt(data.width), height: parseInt(data.height) }
    } else if (data.sizing === 'fill-x' && data.height) {
      // Fill width, fixed height (e.g. header)
      sizing = { width: 'fill', height: parseInt(data.height) }
    } else if (data.sizing === 'fill-both') {
      // Fill both (e.g. panel)
      sizing = { width: 'fill', height: 'fill' }
    } else {
      // Smart default: half of remaining space in stack direction
      if (parentDirection === 'horizontal') {
        const stackSize = Math.max(40, Math.round(residual.width / 2))
        sizing = { width: stackSize, height: 'fill' }
      } else {
        const stackSize = Math.max(40, Math.round(residual.height / 2))
        sizing = { width: 'fill', height: stackSize }
      }
    }

    const componentId = createContainer({
      type: 'component',
      name: formatComponentName(data.component),
      component: data.component,
      sizing,
      zone
    })
    addToTarget(componentId)
    newElementId = componentId
  }

  // Auto-select the new element (especially useful for grid containers)
  state.selectedElements = [newElementId]

  // Reset drag state
  state.drag = { active: false, data: null, targetContainer: null, targetZone: 'mid-center', siblingInsert: null }
  hideZoneIndicator()
  hideSiblingIndicator()
  render()
  updateGridControls()
}

function formatComponentName(component) {
  return component?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') || 'Component'
}

// ============================================================================
// Selection & Interaction
// ============================================================================

function initInteraction() {
  dom.canvas.addEventListener('click', e => {
    const el = e.target.closest('.container-element')
    if (el) {
      const id = el.dataset.id
      if (e.shiftKey) {
        // Multi-select with Shift
        if (state.selectedElements.includes(id)) {
          state.selectedElements = state.selectedElements.filter(x => x !== id)
        } else {
          state.selectedElements.push(id)
        }
      } else {
        // Single select
        state.selectedElements = [id]
      }
    } else {
      state.selectedElements = []
    }
    render()
    updateGridControls()
  })

  document.addEventListener('keydown', e => {
    // Delete
    if ((e.key === 'Backspace' || e.key === 'Delete') && state.selectedElements.length > 0) {
      e.preventDefault()
      state.selectedElements.forEach(id => removeContainer(id))
      state.selectedElements = []
      render()
      updateGridControls()
    }

    // Duplicate (Cmd+D / Ctrl+D)
    if (e.key === 'd' && (e.metaKey || e.ctrlKey) && state.selectedElements.length > 0) {
      e.preventDefault()
      const newSelection = []
      state.selectedElements.forEach(id => {
        const cloneId = duplicateContainer(id)
        if (cloneId) newSelection.push(cloneId)
      })
      state.selectedElements = newSelection
      render()
      updateGridControls()
    }

    // Group (Cmd+G / Ctrl+G)
    if (e.key === 'g' && (e.metaKey || e.ctrlKey) && state.selectedElements.length > 1) {
      e.preventDefault()
      groupSelectedElements()
    }
  })

  dom.clearButton.addEventListener('click', () => {
    // Clear all children of root
    const root = getContainer('root')
    root.children.forEach(id => removeContainer(id))
    root.children = []
    state.selectedElements = []
    render()
    updateGridControls()
  })

  // Grid control event handlers
  dom.gridColumns.addEventListener('input', onGridSettingChange)
  dom.gridRows.addEventListener('input', onGridSettingChange)
  dom.gridGap.addEventListener('input', onGridSettingChange)

  // Resize dot drag
  initResizeDrag()
}

function getParentBounds(containerId) {
  const parentId = findParent(containerId)
  if (!parentId) return null
  return state.containerBounds[parentId]
}

function getChildrenMinSize(containerId) {
  const container = getContainer(containerId)
  if (!container?.children?.length) return { width: 40, height: 40 }

  let maxW = 40, maxH = 40
  container.children.forEach(childId => {
    const childBounds = state.containerBounds[childId]
    if (childBounds) {
      maxW = Math.max(maxW, childBounds.width)
      maxH = Math.max(maxH, childBounds.height)
    }
  })
  return { width: maxW, height: maxH }
}

function getResidualSpace(containerId, excludeChildId = null) {
  const container = getContainer(containerId)
  const bounds = state.containerBounds[containerId]
  if (!container || !bounds) return { width: 200, height: 200 }

  const direction = container.direction || 'vertical'
  const padding = 16
  const gap = 8

  let usedSpace = 0
  const children = container.children || []

  children.forEach(childId => {
    // Skip the element we're calculating space for
    if (childId === excludeChildId) return

    const child = getContainer(childId)
    const childBounds = state.containerBounds[childId]
    if (!child || !childBounds) return

    const sizing = child.sizing || { width: 'fill', height: 'fill' }

    if (direction === 'horizontal') {
      // Count fixed width children
      if (typeof sizing.width === 'number') {
        usedSpace += sizing.width + gap
      }
    } else {
      // Count fixed height children
      if (typeof sizing.height === 'number') {
        usedSpace += sizing.height + gap
      }
    }
  })

  const totalSpace = direction === 'horizontal'
    ? bounds.width - 2 * padding
    : bounds.height - 2 * padding

  const residual = Math.max(40, totalSpace - usedSpace)

  return {
    width: direction === 'horizontal' ? residual : bounds.width - 2 * padding,
    height: direction === 'vertical' ? residual : bounds.height - 2 * padding
  }
}

function getAvailableSpaceForElement(elementId) {
  const parentId = findParent(elementId)
  if (!parentId) return { width: 400, height: 400 }

  const parent = getContainer(parentId)
  const residual = getResidualSpace(parentId, elementId)
  const direction = parent?.direction || 'vertical'

  // In stack direction: residual space
  // In cross direction: full parent space (minus padding)
  return {
    width: direction === 'horizontal' ? residual.width : residual.width,
    height: direction === 'vertical' ? residual.height : residual.height
  }
}

function initResizeDrag() {
  let resizing = null

  dom.canvas.addEventListener('mousedown', e => {
    const dot = e.target.closest('.resize-dot')
    if (!dot) return

    e.preventDefault()
    e.stopPropagation()

    const containerId = dot.dataset.id
    const pos = dot.dataset.pos
    const container = getContainer(containerId)
    const bounds = state.containerBounds[containerId]
    const availableSpace = getAvailableSpaceForElement(containerId)

    if (!container || !bounds) return

    // Determine resize axes based on position
    const resizeX = pos.includes('e') || pos.includes('w')
    const resizeY = pos.includes('n') || pos.includes('s')

    resizing = {
      containerId,
      pos,
      resizeX,
      resizeY,
      invertX: pos.includes('w'),
      invertY: pos.includes('n'),
      startX: e.clientX,
      startY: e.clientY,
      startWidth: bounds.width,
      startHeight: bounds.height,
      availableWidth: availableSpace.width,
      availableHeight: availableSpace.height
    }

    document.body.style.cursor = dot.style.cursor
  })

  document.addEventListener('mousemove', e => {
    if (!resizing) return

    const container = getContainer(resizing.containerId)
    if (!container) return

    if (!container.sizing) {
      container.sizing = { width: 'fill', height: 'fill' }
    }

    const dx = e.clientX - resizing.startX
    const dy = e.clientY - resizing.startY
    const childMin = getChildrenMinSize(resizing.containerId)

    if (resizing.resizeX) {
      const delta = resizing.invertX ? -dx : dx
      const newWidth = resizing.startWidth + delta

      // Drag über verfügbaren Platz → fill, unter Kinder → hug, sonst px
      if (newWidth >= resizing.availableWidth - 10) {
        container.sizing.width = 'fill'
      } else if (newWidth <= childMin.width + 10) {
        container.sizing.width = 'hug'
      } else {
        container.sizing.width = Math.max(40, newWidth)
      }
    }

    if (resizing.resizeY) {
      const delta = resizing.invertY ? -dy : dy
      const newHeight = resizing.startHeight + delta

      if (newHeight >= resizing.availableHeight - 10) {
        container.sizing.height = 'fill'
      } else if (newHeight <= childMin.height + 10) {
        container.sizing.height = 'hug'
      } else {
        container.sizing.height = Math.max(40, newHeight)
      }
    }

    render()

    // Show size indicator
    const bounds = state.containerBounds[resizing.containerId]
    if (bounds) {
      showSizeIndicator(container.sizing, bounds)
    }
  })

  document.addEventListener('mouseup', () => {
    if (resizing) {
      resizing = null
      document.body.style.cursor = ''
      hideSizeIndicator()
    }
  })
}

function showSizeIndicator(sizing, bounds) {
  let indicator = document.getElementById('sizeIndicator')
  if (!indicator) {
    indicator = document.createElement('div')
    indicator.id = 'sizeIndicator'
    indicator.className = 'size-indicator'
    dom.canvas.appendChild(indicator)
  }

  const w = typeof sizing.width === 'number' ? Math.round(sizing.width) + 'px' : sizing.width
  const h = typeof sizing.height === 'number' ? Math.round(sizing.height) + 'px' : sizing.height

  indicator.textContent = `${w} × ${h}`
  indicator.style.display = 'block'
  indicator.style.left = `${bounds.left + bounds.width / 2}px`
  indicator.style.top = `${bounds.top + bounds.height / 2}px`
}

function hideSizeIndicator() {
  const indicator = document.getElementById('sizeIndicator')
  if (indicator) {
    indicator.style.display = 'none'
  }
}

function onGridSettingChange() {
  const selectedId = state.selectedElements[0]
  const container = getContainer(selectedId)
  if (!container?.grid) return

  container.grid.columns = parseInt(dom.gridColumns.value) || 4
  container.grid.rows = parseInt(dom.gridRows.value) || 3
  container.grid.gap = parseInt(dom.gridGap.value) || 8

  render()
}

function updateGridControls() {
  const selectedId = state.selectedElements[0]
  const container = getContainer(selectedId)

  if (container?.grid) {
    dom.gridControls.style.display = 'flex'
    dom.gridColumns.value = container.grid.columns || 4
    dom.gridRows.value = container.grid.rows || 3
    dom.gridGap.value = container.grid.gap || 8
  } else {
    dom.gridControls.style.display = 'none'
  }
}

// ============================================================================
// Code Generation
// ============================================================================

function generateCode() {
  const root = getContainer('root')
  let code = 'App\n'

  root.children.forEach(childId => {
    code += generateContainerCode(childId, 1)
  })

  dom.codeOutput.textContent = code || '// Ziehe Komponenten auf die Canvas'
}

function generateContainerCode(containerId, indent) {
  const container = getContainer(containerId)
  if (!container) return ''

  const spaces = '  '.repeat(indent)
  let props = []

  if (container.zone && container.zone !== 'mid-center') {
    props.push(`align ${formatZoneForCode(container.zone)}`)
  }

  // Sizing properties
  if (container.sizing) {
    const w = container.sizing.width
    const h = container.sizing.height
    if (typeof w === 'number') {
      props.push(`w ${Math.round(w)}`)
    } else if (w === 'hug') {
      props.push('w hug')
    }
    // fill is default, don't output

    if (typeof h === 'number') {
      props.push(`h ${Math.round(h)}`)
    } else if (h === 'hug') {
      props.push('h hug')
    }
  }

  // Grid properties
  if (container.grid) {
    props.push(`grid ${container.grid.columns}`)
    if (container.grid.rows && container.grid.rows !== 3) {
      props.push(`rows ${container.grid.rows}`)
    }
    if (container.grid.gap && container.grid.gap !== 8) {
      props.push(`gap ${container.grid.gap}`)
    }
  }

  const propsStr = props.length ? ' ' + props.join(', ') : ''
  let code = `${spaces}${container.name}${propsStr}\n`

  container.children?.forEach(childId => {
    code += generateContainerCode(childId, indent + 1)
  })

  return code
}

function formatZoneForCode(zone) {
  const mapping = {
    'top-left': 'top left', 'top-center': 'top', 'top-right': 'top right',
    'mid-left': 'left', 'mid-center': 'center', 'mid-right': 'right',
    'bot-left': 'bottom left', 'bot-center': 'bottom', 'bot-right': 'bottom right'
  }
  return mapping[zone] || zone
}

// ============================================================================
// Resize Handling
// ============================================================================

function initResizeHandler() {
  new ResizeObserver(() => render()).observe(dom.canvas)
}

// ============================================================================
// Init
// ============================================================================

function init() {
  render()
  initDragAndDrop()
  initInteraction()
  initResizeHandler()

  // Expose for debugging
  window.state = state
  window.getContainer = getContainer
  window.render = render
}

init()
