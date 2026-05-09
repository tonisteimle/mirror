  // DangerIcon
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'DangerIcon'
  node_1.setAttribute('data-icon-color', "#ff0000")
  node_1.setAttribute('data-icon-size', "32")
  // Icon default styles
  Object.assign(node_1.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_1, "trash")
  Object.assign(node_1.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'color': '#ff0000',
    'font-size': '32px',
    'width': '32px',
    'height': '32px',
  })
  node_1.dataset.component = 'DangerIcon'
  _root.appendChild(node_1)
