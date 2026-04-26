  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'background': 'white',
    'color': 'black',
    'width': '100px',
    'flex-shrink': '0',
    'height': '50px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Frame'
  _root.appendChild(node_1)
  
  // Frame
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Frame'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'background': 'rgba(0,0,0,0.5)',
    'width': '100px',
    'flex-shrink': '0',
    'height': '50px',
    'flex-shrink': '0',
  })
  node_2.dataset.component = 'Frame'
  _root.appendChild(node_2)
