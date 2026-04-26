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
    'gap': '4px',
  })
  node_1.dataset.component = 'Frame'
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = $get("user.name")
  node_2._textTemplate = () => $get("user.name")
  _runtime.bindText(node_2, "user.name")
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = $get("user.email")
  node_3._textTemplate = () => $get("user.email")
  _runtime.bindText(node_3, "user.email")
  node_3.dataset.component = 'Text'
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
