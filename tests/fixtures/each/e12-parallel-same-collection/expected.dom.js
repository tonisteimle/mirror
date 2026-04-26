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
  })
  node_1.dataset.component = 'Frame'
  // Text
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Text'
  node_2.textContent = "List 1:"
  node_2.dataset.component = 'Text'
  node_1.appendChild(node_2)
  
  // Each loop: task in tasks
  const node_3_container = document.createElement('div')
  node_3_container.dataset.eachContainer = 'node-3'
  node_3_container.style.display = 'contents';
  
  _elements['node-3'] = node_3_container
  node_3_container._eachConfig = {
    itemVar: 'task',
    collection: 'tasks',
    renderItem: (task, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_4_tpl = document.createElement('span')
      node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
      node_4_tpl._loopItem = task
      node_4_tpl.dataset.mirrorName = 'Text'
      node_4_tpl.textContent = task.title
      itemContainer.appendChild(node_4_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_3_tasksData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('tasks'))
  node_3_tasksData.forEach((task, index) => {
    node_3_container.appendChild(node_3_container._eachConfig.renderItem(task, index))
  })
  
  node_1.appendChild(node_3_container)
  
  _root.appendChild(node_1)
  
  // Frame
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Frame'
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
  })
  node_5.dataset.component = 'Frame'
  // Text
  const node_6 = document.createElement('span')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Text'
  node_6.textContent = "List 2:"
  node_6.dataset.component = 'Text'
  node_5.appendChild(node_6)
  
  // Each loop: task in tasks
  const node_7_container = document.createElement('div')
  node_7_container.dataset.eachContainer = 'node-7'
  node_7_container.style.display = 'contents';
  
  _elements['node-7'] = node_7_container
  node_7_container._eachConfig = {
    itemVar: 'task',
    collection: 'tasks',
    renderItem: (task, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_8_tpl = document.createElement('span')
      node_8_tpl.dataset.mirrorId = 'node-8[' + index + ']'
      node_8_tpl._loopItem = task
      node_8_tpl.dataset.mirrorName = 'Text'
      node_8_tpl.textContent = task.title
      itemContainer.appendChild(node_8_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_7_tasksData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('tasks'))
  node_7_tasksData.forEach((task, index) => {
    node_7_container.appendChild(node_7_container._eachConfig.renderItem(task, index))
  })
  
  node_5.appendChild(node_7_container)
  
  _root.appendChild(node_5)
