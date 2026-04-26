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
  node_3.textContent = "Title"
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
  
  // Each loop: task in tasks
  const node_5_container = document.createElement('div')
  node_5_container.dataset.eachContainer = 'node-5'
  node_5_container.style.display = 'contents';
  
  _elements['node-5'] = node_5_container
  node_5_container._eachConfig = {
    itemVar: 'task',
    collection: 'tasks',
    renderItem: (task, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_6_tpl = document.createElement('div')
      node_6_tpl.dataset.mirrorId = 'node-6[' + index + ']'
      node_6_tpl._loopItem = task
      node_6_tpl.dataset.mirrorName = 'TableRow'
      Object.assign(node_6_tpl.style, {
        'display': 'flex',
        'flex-direction': 'row',
        'align-self': 'stretch',
        'align-items': 'flex-start',
        'gap': '24px',
        'padding': '12px 16px',
      })
      const node_7_tpl = document.createElement('span')
      node_7_tpl.dataset.mirrorId = 'node-7[' + index + ']'
      node_7_tpl._loopItem = task
      node_7_tpl.dataset.mirrorName = 'Text'
      node_7_tpl.textContent = task.title
      Object.assign(node_7_tpl.style, {
        'color': 'white',
      })
      node_6_tpl.appendChild(node_7_tpl)
      const node_8_tpl = document.createElement('span')
      node_8_tpl.dataset.mirrorId = 'node-8[' + index + ']'
      node_8_tpl._loopItem = task
      node_8_tpl.dataset.mirrorName = 'Text'
      node_8_tpl.textContent = task.status
      Object.assign(node_8_tpl.style, {
        'color': '#888',
      })
      node_6_tpl.appendChild(node_8_tpl)
      itemContainer.appendChild(node_6_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_5_tasksData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('tasks'))
  node_5_tasksData.forEach((task, index) => {
    node_5_container.appendChild(node_5_container._eachConfig.renderItem(task, index))
  })
  
  node_1.appendChild(node_5_container)
  
  _root.appendChild(node_1)
