  // Select
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Select'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_1.dataset.component = 'Select'
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
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = "Choose..."
  node_3.dataset.component = 'Text'
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
  // Item
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Item'
  node_5.textContent = "Berlin"
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_5.dataset.component = 'Item'
  node_5.dataset.slot = 'Item'
  node_4.appendChild(node_5)
  
  // Item
  const node_6 = document.createElement('div')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Item'
  node_6.textContent = "Hamburg"
  Object.assign(node_6.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_6.dataset.component = 'Item'
  node_6.dataset.slot = 'Item'
  node_4.appendChild(node_6)
  
  // Item
  const node_7 = document.createElement('div')
  _elements['node-7'] = node_7
  node_7.dataset.mirrorId = 'node-7'
  node_7.dataset.mirrorName = 'Item'
  node_7.textContent = "Munich"
  Object.assign(node_7.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_7.dataset.component = 'Item'
  node_7.dataset.slot = 'Item'
  node_4.appendChild(node_7)
  
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
