  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = "Hello"
  Object.assign(node_1.style, {
    'color': '#2271C1',
    'font-size': '16px',
  })
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
