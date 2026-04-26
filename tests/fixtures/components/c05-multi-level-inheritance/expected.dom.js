  // LoudBtn
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'LoudBtn'
  node_1.textContent = "Loud"
  Object.assign(node_1.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '4px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'background': '#2271C1',
    'color': 'white',
    'font-size': '18px',
    'font-weight': '700',
  })
  node_1.dataset.component = 'LoudBtn'
  _root.appendChild(node_1)
