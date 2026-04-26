  // DangerIcon
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'DangerIcon'
  node_1.setAttribute('data-icon-color', "#ff0000")
  node_1.textContent = "trash"
  node_1.setAttribute('data-icon-size', "32")
  Object.assign(node_1.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'color': '#ff0000',
    'font-size': '32px',
    'width': '32px',
    'height': '32px',
  })
  node_1.dataset.component = 'DangerIcon'
  _root.appendChild(node_1)
