  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '12px',
  })
  node_1.dataset.layout = 'flex'
  node_1.dataset.component = 'Frame'
  // PrimaryBtn
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'PrimaryBtn'
  node_2.textContent = "Save"
  Object.assign(node_2.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px 20px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
    'background': '#2271C1',
    'color': 'white',
  })
  node_2.dataset.component = 'PrimaryBtn'
  node_1.appendChild(node_2)
  
  // DangerBtn
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'DangerBtn'
  node_3.textContent = "Delete"
  Object.assign(node_3.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px 20px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
    'background': '#ef4444',
    'color': 'white',
  })
  node_3.dataset.component = 'DangerBtn'
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
