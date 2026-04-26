  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = "Mobile App"
  Object.assign(node_1.style, {
    'font-size': '24px',
  })
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
