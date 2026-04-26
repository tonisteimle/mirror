  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = "Beginner"
  node_1.dataset.state = 'level'
  node_1._initialState = 'level'
  if (node_1._stateStyles && node_1._stateStyles['level']) {
    Object.assign(node_1.style, node_1._stateStyles['level'])
  }
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
  
  // level
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'level'
  node_2.textContent = "Intermediate"
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_2.dataset.component = 'level'
  _root.appendChild(node_2)
