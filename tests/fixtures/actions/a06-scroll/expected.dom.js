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
  // Button
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Button'
  node_2.textContent = "Top"
  Object.assign(node_2.style, {
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
  node_2.dataset.component = 'Button'
  node_2.addEventListener('click', (e) => {
    _runtime.scrollToTop()
  })
  node_1.appendChild(node_2)
  
  // Button
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Button'
  node_3.textContent = "Bottom"
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
    _runtime.scrollToBottom()
  })
  node_1.appendChild(node_3)
  
  // Frame
  const node_4 = document.createElement('div')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Frame'
  _elements['Section1'] = node_4
  node_4.dataset.mirrorName = 'Section1'
  Object.assign(node_4.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'height': '200px',
    'flex-shrink': '0',
    'background': '#333',
  })
  node_4.dataset.component = 'Frame'
  // Text
  const node_5 = document.createElement('span')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Text'
  node_5.textContent = "Section 1"
  node_5.dataset.component = 'Text'
  node_4.appendChild(node_5)
  
  node_1.appendChild(node_4)
  
  // Button
  const node_6 = document.createElement('button')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Button'
  node_6.textContent = "Section 1"
  Object.assign(node_6.style, {
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
  node_6.dataset.component = 'Button'
  node_6.addEventListener('click', (e) => {
    _runtime.scrollTo(_elements['Section1'] || 'Section1')
  })
  node_1.appendChild(node_6)
  
  _root.appendChild(node_1)
