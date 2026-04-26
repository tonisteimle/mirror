  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  node_1.setAttribute('tabindex', "0")
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_1.dataset.component = 'Frame'
  node_1.setAttribute('tabindex', '0')
  node_1.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      _runtime.toast("Up")
    }
  })
  node_1.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      _runtime.toast("Down")
    }
  })
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = "Arrow keys"
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  _root.appendChild(node_1)
