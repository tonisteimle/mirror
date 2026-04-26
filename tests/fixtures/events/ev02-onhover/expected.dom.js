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
    'background': '#333',
    'width': '200px',
    'flex-shrink': '0',
    'height': '100px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Frame'
  node_1.addEventListener('mouseenter', (e) => {
    _runtime.toast("Hovered")
  })
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = "Hover me"
  Object.assign(node_2.style, {
    'color': 'white',
  })
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  _root.appendChild(node_1)
