  // Each loop: item in items
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'item',
    collection: 'items',
    renderItem: (item, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('div')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = item
      node_2_tpl.dataset.mirrorName = 'Frame'
      Object.assign(node_2_tpl.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-self': 'stretch',
        'align-items': 'flex-start',
        'gap': '4px',
      })
      const node_3_tpl = document.createElement('span')
      node_3_tpl.dataset.mirrorId = 'node-3[' + index + ']'
      node_3_tpl._loopItem = item
      node_3_tpl.dataset.mirrorName = 'Text'
      node_3_tpl.textContent = item.label
      node_2_tpl.appendChild(node_3_tpl)
      const node_4_tpl = document.createElement('input')
      node_4_tpl.dataset.mirrorId = 'node-4[' + index + ']'
      node_4_tpl._loopItem = item
      node_4_tpl.dataset.mirrorName = 'Input'
      node_4_tpl.dataset.bind = 'item.value'
      node_4_tpl.value = item.value
      Object.assign(node_4_tpl.style, {
        'height': '36px',
        'flex-shrink': '0',
        'padding': '0px 12px',
        'border-radius': '6px',
        'border-width': '0px',
        'border-style': 'solid',
        'width': '200px',
        'flex-shrink': '0',
      })
      node_2_tpl.appendChild(node_4_tpl)
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_itemsData = (function(d) { if (Array.isArray(d)) return d; if (d && typeof d === 'object') { return Object.entries(d).map(([k, v]) => typeof v === 'object' && v !== null ? { _key: k, ...v } : v); } return []; })($get('items'))
  node_1_itemsData.forEach((item, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(item, index))
  })
  
  _root.appendChild(node_1_container)
