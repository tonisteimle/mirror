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
    'gap': '8px',
  })
  node_1.dataset.component = 'Frame'
  // Input
  const node_2 = document.createElement('input')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Input'
  _elements['EmailField'] = node_2
  node_2.dataset.mirrorName = 'EmailField'
  node_2.setAttribute('name', "EmailField")
  node_2.setAttribute('placeholder', "Email")
  Object.assign(node_2.style, {
    'height': '36px',
    'flex-shrink': '0',
    'padding': '0px 12px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'width': '200px',
    'flex-shrink': '0',
  })
  node_2.dataset.bind = 'email'
  node_2.dataset.component = 'Input'
  node_2.dataset.slot = 'Input'
  // Two-way data binding: email
  node_2.value = $get("email") ?? ""
  node_2.addEventListener('input', (e) => {
    $set("email", e.target.value)
  })
  _runtime.bindValue(node_2, "email")
  node_1.appendChild(node_2)
  
  // Button
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Button'
  node_3.textContent = "Set Error"
  Object.assign(node_3.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '0px 16px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
  })
  node_3.dataset.component = 'Button'
  node_3.addEventListener('click', (e) => {
    _runtime.setError(_elements['EmailField'], 'Invalid email')
  })
  node_1.appendChild(node_3)
  
  // Button
  const node_4 = document.createElement('button')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Button'
  node_4.textContent = "Clear Error"
  Object.assign(node_4.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '0px 16px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
  })
  node_4.dataset.component = 'Button'
  node_4.addEventListener('click', (e) => {
    _runtime.clearError(_elements['EmailField'])
  })
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
