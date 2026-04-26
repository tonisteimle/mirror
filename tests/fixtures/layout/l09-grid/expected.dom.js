  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'grid',
    'grid-template-columns': 'repeat(3, 1fr)',
    'gap': '8px',
  })
  node_1.dataset.layout = 'grid'
  node_1.dataset.component = 'Frame'
  // Frame
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Frame'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'grid-row': 'span 40',
    'height': '100%',
    'background': 'red',
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
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'grid-row': 'span 40',
    'height': '100%',
    'background': 'blue',
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
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'grid-row': 'span 40',
    'height': '100%',
    'background': 'green',
  })
  node_4.dataset.component = 'Frame'
  node_1.appendChild(node_4)
  
  // Frame
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Frame'
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'grid-row': 'span 40',
    'height': '100%',
    'background': 'yellow',
  })
  node_5.dataset.component = 'Frame'
  node_1.appendChild(node_5)
  
  // Frame
  const node_6 = document.createElement('div')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Frame'
  Object.assign(node_6.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'grid-row': 'span 40',
    'height': '100%',
    'background': 'purple',
  })
  node_6.dataset.component = 'Frame'
  node_1.appendChild(node_6)
  
  // Frame
  const node_7 = document.createElement('div')
  _elements['node-7'] = node_7
  node_7.dataset.mirrorId = 'node-7'
  node_7.dataset.mirrorName = 'Frame'
  Object.assign(node_7.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'grid-row': 'span 40',
    'height': '100%',
    'background': 'orange',
  })
  node_7.dataset.component = 'Frame'
  node_1.appendChild(node_7)
  
  _root.appendChild(node_1)
