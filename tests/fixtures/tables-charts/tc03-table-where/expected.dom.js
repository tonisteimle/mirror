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
  // Each loop: task in tasks
  const node_2_container = document.createElement('div')
  node_2_container.dataset.eachContainer = 'node-2'
  node_2_container.style.display = 'contents';
  
  _elements['node-2'] = node_2_container
  node_2_container._eachConfig = {
    itemVar: 'task',
    collection: 'tasks',
    filterFn: (task) => task.status != "done",
    renderItem: (task, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_3_tpl = document.createElement('div')
      node_3_tpl.dataset.mirrorId = 'node-3[' + index + ']'
      node_3_tpl._loopItem = task
      node_3_tpl.dataset.mirrorName = 'TableRow'
      Object.assign(node_3_tpl.style, {
        'display': 'flex',
        'flex-direction': 'row',
        'align-self': 'stretch',
        'align-items': 'flex-start',
        'gap': '24px',
        'padding': '12px',
      })
      const node_4_tpl = document.createElement('span')
      node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
      node_4_tpl._loopItem = task
      node_4_tpl.dataset.mirrorName = 'Text'
      node_4_tpl.textContent = task.title
      Object.assign(node_4_tpl.style, {
        'color': 'white',
      })
      node_3_tpl.appendChild(node_4_tpl)
      const node_5_tpl = document.createElement('span')
      node_5_tpl.dataset.mirrorId = 'node-5[' + index + ']'
      node_5_tpl._loopItem = task
      node_5_tpl.dataset.mirrorName = 'Text'
      node_5_tpl.textContent = task.status
      Object.assign(node_5_tpl.style, {
        'color': '#888',
      })
      node_3_tpl.appendChild(node_5_tpl)
      itemContainer.appendChild(node_3_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_2_tasksData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('tasks'))
  let node_2_tasksFiltered = node_2_tasksData.filter(task => task.status != "done")
  node_2_tasksFiltered.forEach((task, index) => {
    node_2_container.appendChild(node_2_container._eachConfig.renderItem(task, index))
  })
  
  node_1.appendChild(node_2_container)
  
  _root.appendChild(node_1)
