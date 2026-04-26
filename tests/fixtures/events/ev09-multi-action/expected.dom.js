  // Button
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Button'
  node_1.textContent = "Multi"
  Object.assign(node_1.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '0px 16px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
  })
  node_1.dataset.component = 'Button'
  node_1.addEventListener('click', (e) => {
    _runtime.increment('count')
  })
  node_1.addEventListener('click', (e) => {
    _runtime.toast("Incremented")
  })
  _root.appendChild(node_1)
  
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = $get("count")
  node_2._textTemplate = () => $get("count")
  _runtime.bindText(node_2, "count")
  node_2.dataset.component = 'Text'
  _root.appendChild(node_2)
