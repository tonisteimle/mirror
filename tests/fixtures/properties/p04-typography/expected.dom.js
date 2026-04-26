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
  node_2.textContent = "Title"
  Object.assign(node_2.style, {
    'font-size': '24px',
    'font-weight': '700',
  })
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = "Light"
  Object.assign(node_3.style, {
    'font-size': '12px',
    'font-weight': '300',
    'font-style': 'italic',
  })
  node_3.dataset.component = 'Text'
  node_1.appendChild(node_3)
  
  // Text
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Text'
  node_4.textContent = "Caps"
  Object.assign(node_4.style, {
    'font-size': '14px',
    'text-transform': 'uppercase',
  })
  node_4.dataset.component = 'Text'
  node_1.appendChild(node_4)
  
  // Text
  const node_5 = document.createElement('span')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Text'
  node_5.textContent = "Mono"
  Object.assign(node_5.style, {
    'font-family': 'ui-monospace, monospace',
  })
  node_5.dataset.component = 'Text'
  node_1.appendChild(node_5)
  
  // Text
  const node_6 = document.createElement('span')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Text'
  node_6.textContent = "Underlined"
  Object.assign(node_6.style, {
    'text-decoration': 'underline',
  })
  node_6.dataset.component = 'Text'
  node_1.appendChild(node_6)
  
  _root.appendChild(node_1)
