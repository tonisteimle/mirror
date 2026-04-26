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
    'background': 'var(--brand-bg)',
    'color': 'var(--brand-col)',
    'border-color': 'var(--brand-boc)',
    'border': '2px solid currentColor',
    'padding': '8px',
  })
  node_1.dataset.component = 'Frame'
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = "Branded"
  Object.assign(node_2.style, {
    'color': 'var(--brand-col)',
  })
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  _root.appendChild(node_1)
