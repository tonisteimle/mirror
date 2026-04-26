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
    'gap': '8px',
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
    'display': 'none',
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
    'display': '',
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
    'height': '100px',
    'flex-shrink': '0',
    'background': 'green',
    'overflow-y': 'auto',
  })
  node_4.dataset.component = 'Frame'
  // Text
  const node_5 = document.createElement('span')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Text'
  node_5.textContent = "Long content that scrolls"
  node_5.dataset.component = 'Text'
  node_4.appendChild(node_5)
  
  node_1.appendChild(node_4)
  
  // Frame
  const node_6 = document.createElement('div')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Frame'
  Object.assign(node_6.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '100px',
    'flex-shrink': '0',
    'height': '50px',
    'flex-shrink': '0',
    'background': 'yellow',
    'overflow': 'hidden',
  })
  node_6.dataset.component = 'Frame'
  // Text
  const node_7 = document.createElement('span')
  _elements['node-7'] = node_7
  node_7.dataset.mirrorId = 'node-7'
  node_7.dataset.mirrorName = 'Text'
  node_7.textContent = "Clipped content overflow"
  node_7.dataset.component = 'Text'
  node_6.appendChild(node_7)
  
  node_1.appendChild(node_6)
  
  _root.appendChild(node_1)
