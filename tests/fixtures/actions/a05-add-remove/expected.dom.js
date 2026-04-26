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
  node_2.textContent = "Add"
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
    _runtime.add('todos', { text: "New", done: false })
  })
  node_1.appendChild(node_2)
  
  // Each loop: todo in todos
  const node_3_container = document.createElement('div')
  node_3_container.dataset.eachContainer = 'node-3'
  node_3_container.style.display = 'contents';
  
  _elements['node-3'] = node_3_container
  node_3_container._eachConfig = {
    itemVar: 'todo',
    collection: 'todos',
    renderItem: (todo, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_4_tpl = document.createElement('div')
      node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
      node_4_tpl._loopItem = todo
      node_4_tpl.dataset.mirrorName = 'Frame'
      Object.assign(node_4_tpl.style, {
        'display': 'flex',
        'flex-direction': 'row',
        'align-self': 'stretch',
        'align-items': 'flex-start',
        'gap': '4px',
      })
      const node_5_tpl = document.createElement('span')
      node_5_tpl.dataset.mirrorId = 'node-5[' + index + ']'
      node_5_tpl._loopItem = todo
      node_5_tpl.dataset.mirrorName = 'Text'
      node_5_tpl.textContent = todo.text
      node_4_tpl.appendChild(node_5_tpl)
      const node_6_tpl = document.createElement('button')
      node_6_tpl.dataset.mirrorId = 'node-6[' + index + ']'
      node_6_tpl._loopItem = todo
      node_6_tpl.dataset.mirrorName = 'Button'
      node_6_tpl.textContent = "X"
      Object.assign(node_6_tpl.style, {
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
      node_6_tpl.addEventListener('click', (e) => {
        _runtime.remove(todo)
      })
      node_4_tpl.appendChild(node_6_tpl)
      itemContainer.appendChild(node_4_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_3_todosData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('todos'))
  node_3_todosData.forEach((todo, index) => {
    node_3_container.appendChild(node_3_container._eachConfig.renderItem(todo, index))
  })
  
  node_1.appendChild(node_3_container)
  
  _root.appendChild(node_1)
