  // Checkbox
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Checkbox'
  node_1.setAttribute('type', "checkbox")
  node_1.textContent = "Newsletter"
  node_1.dataset.component = 'Checkbox'
  _root.appendChild(node_1)
  
  // Checkbox
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Checkbox'
  node_2.setAttribute('type', "checkbox")
  node_2.textContent = "AGB"
  node_2.setAttribute('checked', true)
  node_2.dataset.component = 'Checkbox'
  _root.appendChild(node_2)
