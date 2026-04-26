  // Slider
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Slider'
  node_1.setAttribute('value', "50")
  node_1.setAttribute('min', "0")
  node_1.setAttribute('max', "100")
  node_1.setAttribute('step', "10")
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_1.dataset.component = 'Slider'
  _root.appendChild(node_1)
