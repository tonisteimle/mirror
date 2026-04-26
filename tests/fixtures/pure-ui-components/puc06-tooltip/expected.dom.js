  // Tooltip
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Tooltip'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_1.dataset.component = 'Tooltip'
  // Trigger
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Trigger'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_2.dataset.component = 'Trigger'
  node_2.dataset.slot = 'Trigger'
  // Icon
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Icon'
  node_3.setAttribute('data-icon-color', "#888")
  node_3.setAttribute('data-icon-size', "20")
  // Icon default styles
  Object.assign(node_3.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_3, "info")
  Object.assign(node_3.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'color': '#888',
    'font-size': '20px',
    'width': '20px',
    'height': '20px',
  })
  node_3.dataset.component = 'Icon'
  node_2.appendChild(node_3)
  
  node_1.appendChild(node_2)
  
  // Content
  const node_4 = document.createElement('div')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Content'
  Object.assign(node_4.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_4.dataset.component = 'Content'
  node_4.dataset.slot = 'Content'
  // Text
  const node_5 = document.createElement('span')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Text'
  node_5.textContent = "Help text"
  Object.assign(node_5.style, {
    'font-size': '12px',
  })
  node_5.dataset.component = 'Text'
  node_4.appendChild(node_5)
  
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
