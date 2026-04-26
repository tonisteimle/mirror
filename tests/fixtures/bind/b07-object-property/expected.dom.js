  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '4px',
  })
  node_1.dataset.component = 'Frame'
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = $get("user.name")
  node_2._textTemplate = () => $get("user.name")
  _runtime.bindText(node_2, "user.name")
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  // Input
  const node_3 = document.createElement('input')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Input'
  node_3.setAttribute('placeholder', "E-Mail")
  Object.assign(node_3.style, {
    'height': '36px',
    'flex-shrink': '0',
    'padding': '0px 12px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'width': '200px',
    'flex-shrink': '0',
  })
  node_3.dataset.bind = 'user.email'
  node_3.dataset.component = 'Input'
  node_3.dataset.slot = 'Input'
  // Two-way data binding: user.email
  node_3.value = $get("user.email") ?? ""
  node_3.addEventListener('input', (e) => {
    $set("user.email", e.target.value)
  })
  _runtime.bindValue(node_3, "user.email")
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
