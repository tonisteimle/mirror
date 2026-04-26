  // Switch
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Switch'
  node_1.textContent = "Dark Mode"
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_1.dataset.component = 'Switch'
  _root.appendChild(node_1)
  
  // Switch
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Switch'
  node_2.textContent = "Notifications"
  node_2.setAttribute('checked', true)
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_2.dataset.component = 'Switch'
  _root.appendChild(node_2)
