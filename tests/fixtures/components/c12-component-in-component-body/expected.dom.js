  // Card
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Card'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '8px',
    'padding': '16px',
    'background': '#1a1a1a',
    'border-radius': '8px',
  })
  node_1.dataset.component = 'Card'
  // Btn
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Btn'
  node_2.textContent = "Inside Card"
  Object.assign(node_2.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '4px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
    'background': '#333',
    'color': 'white',
  })
  node_2.dataset.component = 'Btn'
  node_2.dataset.slot = 'Btn'
  node_1.appendChild(node_2)
  
  _root.appendChild(node_1)
