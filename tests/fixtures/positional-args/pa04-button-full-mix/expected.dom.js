  // Button
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Button'
  node_1.textContent = "Save"
  Object.assign(node_1.style, {
    'width': 'fit-content',
    'height': '32px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '0px 16px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
    'background': '#2271C1',
    'color': 'white',
  })
  node_1.dataset.component = 'Button'
  _root.appendChild(node_1)
