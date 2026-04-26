  // Headline
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Headline'
  node_1.textContent = "Hello"
  Object.assign(node_1.style, {
    'font-size': '24px',
    'font-weight': '700',
    'color': '#2271C1',
  })
  node_1.dataset.component = 'Headline'
  _root.appendChild(node_1)
