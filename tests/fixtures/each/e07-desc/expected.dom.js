  // Each loop: task in tasks
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'task',
    collection: 'tasks',
    orderBy: "priority",
    orderDesc: true,
    renderItem: (task, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('span')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = task
      node_2_tpl.dataset.mirrorName = 'Text'
      node_2_tpl.textContent = task.title
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_tasksData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('tasks'))
  const node_1_tasksSorted = [...node_1_tasksData].sort((a, b) => {
    const aVal = a.priority
    const bVal = b.priority
    if (aVal < bVal) return 1
    if (aVal > bVal) return -1
    return 0
  })
  node_1_tasksSorted.forEach((task, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(task, index))
  })
  
  _root.appendChild(node_1_container)
