  // Input
  const node_1 = document.createElement('input')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Input'
  node_1.setAttribute('placeholder', "Benutzername")
  Object.assign(node_1.style, {
    'height': '36px',
    'flex-shrink': '0',
    'padding': '0px 12px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'width': '200px',
    'flex-shrink': '0',
  })
  node_1.dataset.bind = 'username'
  node_1.dataset.component = 'Input'
  node_1.dataset.slot = 'Input'
  // Two-way data binding: username
  node_1.value = $get("username") ?? ""
  node_1.addEventListener('input', (e) => {
    $set("username", e.target.value)
  })
  _runtime.bindValue(node_1, "username")
  _root.appendChild(node_1)
