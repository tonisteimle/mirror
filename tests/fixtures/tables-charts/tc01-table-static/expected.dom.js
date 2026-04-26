  // Table
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Table'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'background': '#1a1a1a',
    'border-radius': '8px',
  })
  node_1.dataset.component = 'Table'
  // TableHeader
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'TableHeader'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '24px',
    'padding': '12px 16px',
    'background': '#252525',
  })
  node_2.dataset.layout = 'flex'
  node_2.dataset.component = 'TableHeader'
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = "Name"
  Object.assign(node_3.style, {
    'color': '#888',
    'font-size': '11px',
  })
  node_3.dataset.component = 'Text'
  node_2.appendChild(node_3)
  
  // Text
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Text'
  node_4.textContent = "Status"
  Object.assign(node_4.style, {
    'color': '#888',
    'font-size': '11px',
  })
  node_4.dataset.component = 'Text'
  node_2.appendChild(node_4)
  
  node_1.appendChild(node_2)
  
  // TableRow
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'TableRow'
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '24px',
    'padding': '12px 16px',
  })
  node_5.dataset.layout = 'flex'
  node_5.dataset.component = 'TableRow'
  // Text
  const node_6 = document.createElement('span')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Text'
  node_6.textContent = "Max"
  Object.assign(node_6.style, {
    'color': 'white',
  })
  node_6.dataset.component = 'Text'
  node_5.appendChild(node_6)
  
  // Text
  const node_7 = document.createElement('span')
  _elements['node-7'] = node_7
  node_7.dataset.mirrorId = 'node-7'
  node_7.dataset.mirrorName = 'Text'
  node_7.textContent = "Active"
  Object.assign(node_7.style, {
    'color': 'white',
  })
  node_7.dataset.component = 'Text'
  node_5.appendChild(node_7)
  
  node_1.appendChild(node_5)
  
  _root.appendChild(node_1)
