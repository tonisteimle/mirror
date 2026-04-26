  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  node_1.textContent = "Geschäftlich"
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'background': 'var(--cat)',
  })
  node_1.dataset.component = 'Frame'
  _root.appendChild(node_1)
  
  // w
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'w'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'height': '50px',
    'flex-shrink': '0',
  })
  node_2.dataset.component = 'w'
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = $get("cat")
  node_3._textTemplate = () => $get("cat")
  _runtime.bindText(node_3, "cat")
  node_3.dataset.component = 'Text'
  node_2.appendChild(node_3)
  
  _root.appendChild(node_2)
