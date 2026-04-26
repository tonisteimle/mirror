  // Icon
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Icon'
  node_1.setAttribute('data-icon-size', "24")
  node_1.setAttribute('data-icon-color', "#2271C1")
  // Icon default styles
  Object.assign(node_1.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_1, "loader")
  Object.assign(node_1.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'animation': 'mirror-spin 1s linear infinite',
    'font-size': '24px',
    'width': '24px',
    'height': '24px',
    'color': '#2271C1',
  })
  node_1.dataset.component = 'Icon'
  _root.appendChild(node_1)
