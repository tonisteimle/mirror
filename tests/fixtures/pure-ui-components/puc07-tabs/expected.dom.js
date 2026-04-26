  // Tabs
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Tabs'
  node_1.setAttribute('data-default-value', "home")
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_1.dataset.component = 'Tabs'
  // Tab
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Tab'
  node_2.textContent = "Home"
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_2.dataset.component = 'Tab'
  // Frame
  const node_3 = document.createElement('div')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Frame'
  Object.assign(node_3.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'padding': '16px',
  })
  node_3.dataset.component = 'Frame'
  // Text
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Text'
  node_4.textContent = "Home content"
  node_4.dataset.component = 'Text'
  node_3.appendChild(node_4)
  
  node_2.appendChild(node_3)
  
  node_1.appendChild(node_2)
  
  // Tab
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Tab'
  node_5.textContent = "Profile"
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_5.dataset.component = 'Tab'
  // Frame
  const node_6 = document.createElement('div')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Frame'
  Object.assign(node_6.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'padding': '16px',
  })
  node_6.dataset.component = 'Frame'
  // Text
  const node_7 = document.createElement('span')
  _elements['node-7'] = node_7
  node_7.dataset.mirrorId = 'node-7'
  node_7.dataset.mirrorName = 'Text'
  node_7.textContent = "Profile content"
  node_7.dataset.component = 'Text'
  node_6.appendChild(node_7)
  
  node_5.appendChild(node_6)
  
  node_1.appendChild(node_5)
  
  // Tab
  const node_8 = document.createElement('div')
  _elements['node-8'] = node_8
  node_8.dataset.mirrorId = 'node-8'
  node_8.dataset.mirrorName = 'Tab'
  node_8.textContent = "Settings"
  Object.assign(node_8.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_8.dataset.component = 'Tab'
  // Frame
  const node_9 = document.createElement('div')
  _elements['node-9'] = node_9
  node_9.dataset.mirrorId = 'node-9'
  node_9.dataset.mirrorName = 'Frame'
  Object.assign(node_9.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'padding': '16px',
  })
  node_9.dataset.component = 'Frame'
  // Text
  const node_10 = document.createElement('span')
  _elements['node-10'] = node_10
  node_10.dataset.mirrorId = 'node-10'
  node_10.dataset.mirrorName = 'Text'
  node_10.textContent = "Settings content"
  node_10.dataset.component = 'Text'
  node_9.appendChild(node_10)
  
  node_8.appendChild(node_9)
  
  node_1.appendChild(node_8)
  
  _root.appendChild(node_1)
