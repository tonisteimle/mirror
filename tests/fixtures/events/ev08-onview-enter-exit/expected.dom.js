  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'background': '#333',
    'height': '200px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Frame'
  // Enter viewport observer
  const node_1_enterCallback = () => {
    _runtime.toast("In view")
  }
  node_1._enterCallback = node_1_enterCallback
  if (!node_1._enterExitObserver) {
    _runtime.setupEnterExitObserver(node_1, node_1._enterCallback, node_1._exitCallback)
  }
  // Exit viewport observer
  const node_1_exitCallback = () => {
    _runtime.toast("Out of view")
  }
  node_1._exitCallback = node_1_exitCallback
  if (!node_1._enterExitObserver) {
    _runtime.setupEnterExitObserver(node_1, node_1._enterCallback, node_1._exitCallback)
  }
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = "Scroll to me"
  Object.assign(node_2.style, {
    'color': 'white',
  })
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  _root.appendChild(node_1)
