  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = "This is a very long string that should be truncated"
  Object.assign(node_1.style, {
    'overflow': 'hidden',
    'text-overflow': 'ellipsis',
    'white-space': 'nowrap',
    'width': '100px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
