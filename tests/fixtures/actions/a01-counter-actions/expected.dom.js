  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '8px',
  })
  node_1.dataset.layout = 'flex'
  node_1.dataset.component = 'Frame'
  // Button
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Button'
  node_2.textContent = "-"
  Object.assign(node_2.style, {
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
  node_2.dataset.component = 'Button'
  node_2.addEventListener('click', (e) => {
    _runtime.decrement('count')
  })
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = $get("count")
  node_3._textTemplate = () => $get("count")
  _runtime.bindText(node_3, "count")
  node_3.dataset.component = 'Text'
  node_1.appendChild(node_3)
  
  // Button
  const node_4 = document.createElement('button')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Button'
  node_4.textContent = "+"
  Object.assign(node_4.style, {
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
  node_4.dataset.component = 'Button'
  node_4.addEventListener('click', (e) => {
    _runtime.increment('count')
  })
  node_1.appendChild(node_4)
  
  // Button
  const node_5 = document.createElement('button')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Button'
  node_5.textContent = "Reset"
  Object.assign(node_5.style, {
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
  node_5.dataset.component = 'Button'
  node_5.addEventListener('click', (e) => {
    _runtime.set('count', 0)
  })
  node_1.appendChild(node_5)
  
  _root.appendChild(node_1)
