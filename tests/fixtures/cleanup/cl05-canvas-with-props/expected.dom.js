  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = "Title"
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
  
  // Frame
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Frame'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '12px',
  })
  node_2.dataset.layout = 'flex'
  node_2.dataset.component = 'Frame'
  // Button
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Button'
  node_3.textContent = "A"
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
  node_2.appendChild(node_3)
  
  // Button
  const node_4 = document.createElement('button')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Button'
  node_4.textContent = "B"
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
  node_2.appendChild(node_4)
  
  _root.appendChild(node_2)
