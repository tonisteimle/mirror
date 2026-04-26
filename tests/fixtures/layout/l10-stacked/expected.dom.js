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
    'position': 'relative',
    'width': '100px',
    'flex-shrink': '0',
    'height': '100px',
    'flex-shrink': '0',
  })
  node_1.dataset.layout = 'absolute'
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
    'height': '100px',
    'flex-shrink': '0',
    'background': '#2271C1',
    'position': 'absolute',
    'left': '0',
  })
  node_2.dataset.component = 'Frame'
  // Auto-set parent to relative for absolute child
  if (node_1.style.position !== 'relative' && node_1.style.position !== 'absolute' && node_1.style.position !== 'fixed') {
    node_1.style.position = 'relative'
    if (!node_1.dataset.layout) node_1.dataset.mirrorAbs = 'true'
  }
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
    'position': 'absolute',
    'left': '70px',
    'position': 'absolute',
    'top': '70px',
    'width': '30px',
    'flex-shrink': '0',
    'height': '30px',
    'flex-shrink': '0',
    'background': '#ef4444',
    'border-radius': '99px',
  })
  node_3.dataset.component = 'Frame'
  // Auto-set parent to relative for absolute child
  if (node_1.style.position !== 'relative' && node_1.style.position !== 'absolute' && node_1.style.position !== 'fixed') {
    node_1.style.position = 'relative'
    if (!node_1.dataset.layout) node_1.dataset.mirrorAbs = 'true'
  }
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
