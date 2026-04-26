  // Each loop: cat in categories
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'cat',
    collection: 'categories',
    renderItem: (cat, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('div')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = cat
      node_2_tpl.dataset.mirrorName = 'Frame'
      Object.assign(node_2_tpl.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-self': 'stretch',
        'align-items': 'flex-start',
      })
      const node_3_tpl = document.createElement('span')
      node_3_tpl.dataset.mirrorId = 'node-3[' + index + ']'
      node_3_tpl._loopItem = cat
      node_3_tpl.dataset.mirrorName = 'Text'
      node_3_tpl.textContent = cat.name
      node_2_tpl.appendChild(node_3_tpl)
      const node_4_tpl = document.createElement('div')
      node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
      node_4_tpl._loopItem = cat
      node_4_tpl.dataset.mirrorName = 'Each'
      // Nested each loop: item in cat.items
      const node_4_container = document.createElement('div')
      node_4_container.dataset.eachContainer = 'node-4'
      node_4_container.style.display = 'contents';
      ((d => Array.isArray(d) ? d : (d && typeof d === 'object' ? Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v) : []))(cat.items)).forEach((item, index) => {
        const itemContainer = document.createElement('div')
        itemContainer.dataset.eachItem = index
        itemContainer.style.display = 'contents';
        const node_5_tpl = document.createElement('span')
        node_5_tpl.dataset.mirrorId = 'node-5[' + index + ']'
        node_5_tpl._loopItem = item
        node_5_tpl.dataset.mirrorName = 'Text'
        node_5_tpl.textContent = item.label
        itemContainer.appendChild(node_5_tpl)
        node_4_container.appendChild(itemContainer)
      })
      node_4_tpl.appendChild(node_4_container)
      node_2_tpl.appendChild(node_4_tpl)
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_categoriesData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('categories'))
  node_1_categoriesData.forEach((cat, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(cat, index))
  })
  
  _root.appendChild(node_1_container)
