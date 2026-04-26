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
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = `Count: ${$get("counter")}`
  node_2._textTemplate = () => `Count: ${$get("counter")}`
  _runtime.bindText(node_2, "counter")
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  // Button
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Button'
  node_3.textContent = "Increment"
  Object.assign(node_3.style, {
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
  node_3.dataset.component = 'Button'
  node_3.addEventListener('click', (e) => {
    _runtime.increment('counter')
  })
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
