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
  node_2.textContent = `Count: ${$get("tasks.count")}`
  node_2._textTemplate = () => `Count: ${$get("tasks.count")}`
  _runtime.bindText(node_2, "tasks.count")
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = `First: ${$get("tasks.first.title")}`
  node_3._textTemplate = () => `First: ${$get("tasks.first.title")}`
  _runtime.bindText(node_3, "tasks.first.title")
  node_3.dataset.component = 'Text'
  node_1.appendChild(node_3)
  
  // Text
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Text'
  node_4.textContent = `Last: ${$get("tasks.last.title")}`
  node_4._textTemplate = () => `Last: ${$get("tasks.last.title")}`
  _runtime.bindText(node_4, "tasks.last.title")
  node_4.dataset.component = 'Text'
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
