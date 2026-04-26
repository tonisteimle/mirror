  // Input
  const node_1 = document.createElement('input')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Input'
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
  node_1.dataset.bind = 'searchTerm'
  node_1.dataset.component = 'Input'
  node_1.dataset.slot = 'Input'
  node_1.addEventListener('input', (e) => {
    _runtime.toast("Typing")
  })
  node_1.addEventListener('change', (e) => {
    _runtime.toast("Changed")
  })
  // Two-way data binding: searchTerm
  node_1.value = $get("searchTerm") ?? ""
  node_1.addEventListener('input', (e) => {
    $set("searchTerm", e.target.value)
  })
  _runtime.bindValue(node_1, "searchTerm")
  _root.appendChild(node_1)
