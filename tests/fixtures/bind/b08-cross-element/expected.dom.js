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
  // Input
  const node_2 = document.createElement('input')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Input'
  node_2.setAttribute('placeholder', "Type here")
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
  node_2.dataset.bind = 'value'
  node_2.dataset.component = 'Input'
  node_2.dataset.slot = 'Input'
  // Two-way data binding: value
  node_2.value = $get("value") ?? ""
  node_2.addEventListener('input', (e) => {
    $set("value", e.target.value)
  })
  _runtime.bindValue(node_2, "value")
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = `Echo: ${$get("value")}`
  node_3._textTemplate = () => `Echo: ${$get("value")}`
  _runtime.bindText(node_3, "value")
  node_3.dataset.component = 'Text'
  node_1.appendChild(node_3)
  
  // Text
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Text'
  node_4.textContent = `Length: ${$get("value.length")}`
  node_4._textTemplate = () => `Length: ${$get("value.length")}`
  _runtime.bindText(node_4, "value.length")
  node_4.dataset.component = 'Text'
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
