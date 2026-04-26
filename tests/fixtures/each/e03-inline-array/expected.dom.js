  // Each loop: x in [...]
  const node_1_container = document.createElement('div')
  node_1_container.dataset.eachContainer = 'node-1'
  node_1_container.style.display = 'contents';
  
  _elements['node-1'] = node_1_container
  node_1_container._eachConfig = {
    itemVar: 'x',
    collection: [1, 2, 3],
    renderItem: (x, index) => {
      const itemContainer = document.createElement('div')
      itemContainer.dataset.eachItem = index
      itemContainer.style.display = 'contents';
      const node_2_tpl = document.createElement('span')
      node_2_tpl.dataset.mirrorId = 'node-2[' + index + ']'
      node_2_tpl._loopItem = x
      node_2_tpl.dataset.mirrorName = 'Text'
      node_2_tpl.textContent = x
      itemContainer.appendChild(node_2_tpl)
      return itemContainer
    },
  }
  
  // Initial render
  const node_1_inlineData = [1, 2, 3]
  node_1_inlineData.forEach((x, index) => {
    node_1_container.appendChild(node_1_container._eachConfig.renderItem(x, index))
  })
  
  _root.appendChild(node_1_container)
