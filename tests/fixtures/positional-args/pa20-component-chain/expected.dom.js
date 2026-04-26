  // Btn
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Btn'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'padding': '10px',
    'border-radius': '6px',
    'width': '100px',
    'flex-shrink': '0',
    'height': '32px',
    'flex-shrink': '0',
    'background': '#888',
  })
  node_1.dataset.component = 'Btn'
  _root.appendChild(node_1)
  
  // PrimaryBtn
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'PrimaryBtn'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'padding': '10px',
    'border-radius': '6px',
    'background': '#444',
    'width': '100px',
    'flex-shrink': '0',
    'height': '32px',
    'flex-shrink': '0',
  })
  node_2.dataset.component = 'PrimaryBtn'
  _root.appendChild(node_2)
  
  // DangerBtn
  const node_3 = document.createElement('div')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'DangerBtn'
  Object.assign(node_3.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'padding': '10px',
    'border-radius': '6px',
    'background': '#c00',
    'width': '100px',
    'flex-shrink': '0',
    'height': '32px',
    'flex-shrink': '0',
  })
  node_3.dataset.component = 'DangerBtn'
  _root.appendChild(node_3)
