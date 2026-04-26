  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '16px',
  })
  node_1.dataset.component = 'Frame'
  // Frame
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Frame'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '100px',
    'flex-shrink': '0',
    'height': '50px',
    'flex-shrink': '0',
    'background': 'red',
    'transform': 'rotate(45deg)',
  })
  node_2.dataset.component = 'Frame'
  node_1.appendChild(node_2)
  
  // Frame
  const node_3 = document.createElement('div')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Frame'
  Object.assign(node_3.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '100px',
    'flex-shrink': '0',
    'height': '50px',
    'flex-shrink': '0',
    'background': 'blue',
    'transform': 'scale(0.8)',
  })
  node_3.dataset.component = 'Frame'
  node_1.appendChild(node_3)
  
  // Frame
  const node_4 = document.createElement('div')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Frame'
  Object.assign(node_4.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '100px',
    'flex-shrink': '0',
    'height': '50px',
    'flex-shrink': '0',
    'background': 'green',
    'opacity': '0.7',
  })
  node_4.dataset.component = 'Frame'
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
