  // Image
  const node_1 = document.createElement('img')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Image'
  node_1.setAttribute('src', "photo.jpg")
  Object.assign(node_1.style, {
    'width': '200px',
    'flex-shrink': '0',
    'height': '100px',
    'flex-shrink': '0',
    'border-radius': '6px',
  })
  node_1.dataset.component = 'Image'
  node_1.dataset.slot = 'Image'
  _root.appendChild(node_1)
