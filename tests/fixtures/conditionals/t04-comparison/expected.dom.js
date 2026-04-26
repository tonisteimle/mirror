  // Conditional
  const node_1_container = document.createElement('div')
  node_1_container.dataset.conditionalId = 'node-1'
  node_1_container.style.display = 'contents';
  _elements['node-1'] = node_1_container
  
  node_1_container._conditionalConfig = {
    condition: () => $get("count") > 0,
    renderThen: () => {
      const fragment = document.createDocumentFragment()
      const node_2_cond = document.createElement('span')
      node_2_cond.dataset.mirrorId = 'node-2'
      node_2_cond.dataset.mirrorName = 'Text'
      node_2_cond.textContent = "Items present"
      fragment.appendChild(node_2_cond)
      return fragment
    },
  }
  
  // Initial conditional render
  if ($get("count") > 0) {
    node_1_container.appendChild(node_1_container._conditionalConfig.renderThen())
  }
  
  _root.appendChild(node_1_container)
