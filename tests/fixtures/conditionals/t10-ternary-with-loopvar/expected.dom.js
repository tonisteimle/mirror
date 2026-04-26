  // Each loop: pos in positions
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'pos',
    collection: 'positions',
    renderItem: (pos, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('div')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = pos
      node_2_tpl.dataset.mirrorName = 'Frame'
      Object.assign(node_2_tpl.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-items': 'flex-start',
        'background': (pos.change > 0 ? "var(--accent-bg)" : "var(--danger-bg)"),
        'width': '100px',
        'flex-shrink': '0',
        'height': '30px',
        'flex-shrink': '0',
      })
      const node_3_tpl = document.createElement('span')
      node_3_tpl.dataset.mirrorId = 'node-3[' + index + ']'
      node_3_tpl._loopItem = pos
      node_3_tpl.dataset.mirrorName = 'Text'
      node_3_tpl.textContent = pos.name
      node_2_tpl.appendChild(node_3_tpl)
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_positionsData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('positions'))
  node_1_positionsData.forEach((pos, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(pos, index))
  })
  
  _root.appendChild(node_1_container)
