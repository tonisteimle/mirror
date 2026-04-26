  // Each loop: item, idx in items
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'item',
    collection: 'items',
    renderItem: (item, idx) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = idx
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('span')
      node_2_tpl.dataset.mirrorId = 'node-2[' + idx + ']'
      node_2_tpl._loopItem = item
      node_2_tpl.dataset.mirrorName = 'Text'
      node_2_tpl.textContent = `${idx}: ${item.label}`
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_itemsData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('items'))
  node_1_itemsData.forEach((item, idx) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(item, idx))
  })
  
  _root.appendChild(node_1_container)
