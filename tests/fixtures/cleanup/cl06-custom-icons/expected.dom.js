  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '8px',
  })
  node_1.dataset.layout = 'flex'
  node_1.dataset.component = 'Frame'
  // Icon
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Icon'
  node_2.setAttribute('data-icon-size', "24")
  node_2.setAttribute('data-icon-color', "#2271C1")
  // Icon default styles
  Object.assign(node_2.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_2, "hbox")
  Object.assign(node_2.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'font-size': '24px',
    'width': '24px',
    'height': '24px',
    'color': '#2271C1',
  })
  node_2.dataset.component = 'Icon'
  node_1.appendChild(node_2)
  
  // Icon
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Icon'
  node_3.setAttribute('data-icon-size', "24")
  node_3.setAttribute('data-icon-color', "#888")
  // Icon default styles
  Object.assign(node_3.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_3, "vbox")
  Object.assign(node_3.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'font-size': '24px',
    'width': '24px',
    'height': '24px',
    'color': '#888',
  })
  node_3.dataset.component = 'Icon'
  node_1.appendChild(node_3)
  
  // Icon
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Icon'
  node_4.setAttribute('data-icon-size', "24")
  node_4.setAttribute('data-icon-color', "#10b981")
  // Icon default styles
  Object.assign(node_4.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_4, "check")
  Object.assign(node_4.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'font-size': '24px',
    'width': '24px',
    'height': '24px',
    'color': '#10b981',
  })
  node_4.dataset.component = 'Icon'
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
