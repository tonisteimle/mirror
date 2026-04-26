  // Input
  const node_1 = document.createElement('input')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Input'
  node_1.setAttribute('placeholder', "Telefon")
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
  node_1.dataset.bind = 'phone'
  node_1.dataset.component = 'Input'
  node_1.dataset.slot = 'Input'
  // Input mask: (###) ###-####
  _runtime.applyMask(node_1, "(###) ###-####")
  // Two-way data binding: phone
  node_1.value = _runtime.formatWithMask($get("phone") ?? "", "(###) ###-####")
  node_1.addEventListener('input', (e) => {
    $set("phone", _runtime.getMaskRawValue(e.target))
  })
  _runtime.bindValue(node_1, "phone")
  _root.appendChild(node_1)
