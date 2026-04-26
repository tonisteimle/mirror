  // Btn
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Btn'
  node_1.textContent = "Save"
  Object.assign(node_1.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '12px 24px',
    'border-radius': '6px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'background': 'var(--primary-bg)',
    'color': 'var(--text-col)',
  })
  node_1.dataset.component = 'Btn'
  _root.appendChild(node_1)
