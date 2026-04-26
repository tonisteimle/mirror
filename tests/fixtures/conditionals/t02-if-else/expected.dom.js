  // Conditional
  const node_1_container = document.createElement('div')
  node_1_container.dataset.conditionalId = 'node-1'
  node_1_container.style.display = 'contents';
  _elements['node-1'] = node_1_container
  
  node_1_container._conditionalConfig = {
    condition: () => $get("loggedIn"),
    renderThen: () => {
      const fragment = document.createDocumentFragment()
      const node_2_cond = document.createElement('span')
      node_2_cond.dataset.mirrorId = 'node-2'
      node_2_cond.dataset.mirrorName = 'Text'
      node_2_cond.textContent = "Welcome back"
      fragment.appendChild(node_2_cond)
      return fragment
    },
    renderElse: () => {
      const fragment = document.createDocumentFragment()
      const node_3_cond = document.createElement('span')
      node_3_cond.dataset.mirrorId = 'node-3'
      node_3_cond.dataset.mirrorName = 'Text'
      node_3_cond.textContent = "Please log in"
      fragment.appendChild(node_3_cond)
      return fragment
    },
  }
  
  // Initial conditional render
  if ($get("loggedIn")) {
    node_1_container.appendChild(node_1_container._conditionalConfig.renderThen())
  } else {
    node_1_container.appendChild(node_1_container._conditionalConfig.renderElse())
  }
  
  _root.appendChild(node_1_container)
