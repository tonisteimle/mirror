  // Each loop: task in tasks
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'task',
    collection: 'tasks',
    renderItem: (task, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('div')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = task
      node_2_tpl.dataset.mirrorName = 'Frame'
      Object.assign(node_2_tpl.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-self': 'stretch',
        'align-items': 'flex-start',
      })
      const node_3_tpl = document.createElement('span')
      node_3_tpl.dataset.mirrorId = 'node-3[' + index + ']'
      node_3_tpl._loopItem = task
      node_3_tpl.dataset.mirrorName = 'Text'
      node_3_tpl.textContent = task.title
      node_2_tpl.appendChild(node_3_tpl)
      if (task.done) {
        const node_4_tpl = document.createElement('span')
        node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
        node_4_tpl._loopItem = task
        node_4_tpl.dataset.mirrorName = 'Text'
        node_4_tpl.textContent = "✓"
        node_2_tpl.appendChild(node_4_tpl)
      }
      const node_5_tpl = document.createElement('span')
      node_5_tpl.dataset.mirrorId = 'node-5[' + index + ']'
      node_5_tpl._loopItem = task
      node_5_tpl.dataset.mirrorName = 'Text'
      node_5_tpl.textContent = "○"
      node_2_tpl.appendChild(node_5_tpl)
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_tasksData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('tasks'))
  node_1_tasksData.forEach((task, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(task, index))
  })
  
  _root.appendChild(node_1_container)
