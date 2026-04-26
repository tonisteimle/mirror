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
  node_2.setAttribute('placeholder', "Suchen...")
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
  node_2.dataset.bind = 'searchTerm'
  node_2.dataset.component = 'Input'
  node_2.dataset.slot = 'Input'
  // Two-way data binding: searchTerm
  node_2.value = $get("searchTerm") ?? ""
  node_2.addEventListener('input', (e) => {
    $set("searchTerm", e.target.value)
  })
  _runtime.bindValue(node_2, "searchTerm")
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = `Suche: ${$get("searchTerm")}`
  node_3._textTemplate = () => `Suche: ${$get("searchTerm")}`
  _runtime.bindText(node_3, "searchTerm")
  node_3.dataset.component = 'Text'
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
