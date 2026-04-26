  // Dialog
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Dialog'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'background': 'rgba(0,0,0,0.5)',
  })
  node_1.dataset.component = 'Dialog'
  // Trigger
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Trigger'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_2.dataset.component = 'Trigger'
  node_2.dataset.slot = 'Trigger'
  // Button
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Button'
  node_3.textContent = "Open Dialog"
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
  node_2.appendChild(node_3)
  
  node_1.appendChild(node_2)
  
  // Backdrop
  const node_4 = document.createElement('div')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Backdrop'
  Object.assign(node_4.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_4.dataset.component = 'Backdrop'
  node_4.dataset.slot = 'Backdrop'
  node_1.appendChild(node_4)
  
  // Content
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Content'
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_5.dataset.component = 'Content'
  node_5.dataset.slot = 'Content'
  // Frame
  const node_6 = document.createElement('div')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Frame'
  Object.assign(node_6.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'gap': '16px',
    'padding': '24px',
    'background': '#1a1a1a',
    'border-radius': '12px',
    'width': '400px',
    'flex-shrink': '0',
  })
  node_6.dataset.component = 'Frame'
  node_5.appendChild(node_6)
  
  // Text
  const node_7 = document.createElement('span')
  _elements['node-7'] = node_7
  node_7.dataset.mirrorId = 'node-7'
  node_7.dataset.mirrorName = 'Text'
  node_7.textContent = "Title"
  Object.assign(node_7.style, {
    'font-size': '18px',
    'font-weight': '700',
    'color': 'white',
  })
  node_7.dataset.component = 'Text'
  node_5.appendChild(node_7)
  
  // Text
  const node_8 = document.createElement('span')
  _elements['node-8'] = node_8
  node_8.dataset.mirrorId = 'node-8'
  node_8.dataset.mirrorName = 'Text'
  node_8.textContent = "Body content"
  Object.assign(node_8.style, {
    'color': '#888',
  })
  node_8.dataset.component = 'Text'
  node_5.appendChild(node_8)
  
  // CloseTrigger
  const node_9 = document.createElement('div')
  _elements['node-9'] = node_9
  node_9.dataset.mirrorId = 'node-9'
  node_9.dataset.mirrorName = 'CloseTrigger'
  Object.assign(node_9.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_9.dataset.component = 'CloseTrigger'
  node_9.dataset.slot = 'CloseTrigger'
  // Button
  const node_10 = document.createElement('button')
  _elements['node-10'] = node_10
  node_10.dataset.mirrorId = 'node-10'
  node_10.dataset.mirrorName = 'Button'
  node_10.textContent = "Close"
  Object.assign(node_10.style, {
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
  node_10.dataset.component = 'Button'
  node_9.appendChild(node_10)
  
  node_5.appendChild(node_9)
  
  node_1.appendChild(node_5)
  
  _root.appendChild(node_1)
