  // Each loop: user in users
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'user',
    collection: 'users',
    renderItem: (user, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('div')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = user
      node_2_tpl.dataset.mirrorName = 'Frame'
      Object.assign(node_2_tpl.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-self': 'stretch',
        'align-items': 'flex-start',
      })
      const node_3_tpl = document.createElement('span')
      node_3_tpl.dataset.mirrorId = 'node-3[' + index + ']'
      node_3_tpl._loopItem = user
      node_3_tpl.dataset.mirrorName = 'Text'
      node_3_tpl.textContent = user.name
      node_2_tpl.appendChild(node_3_tpl)
      const node_4_tpl = document.createElement('span')
      node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
      node_4_tpl._loopItem = user
      node_4_tpl.dataset.mirrorName = 'Text'
      node_4_tpl.textContent = user.role
      node_2_tpl.appendChild(node_4_tpl)
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_usersData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('users'))
  node_1_usersData.forEach((user, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(user, index))
  })
  
  _root.appendChild(node_1_container)
