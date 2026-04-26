  // Conditional
  const node_1_container = document.createElement('div')
  node_1_container.dataset.conditionalId = 'node-1'
  node_1_container.style.display = 'contents';
  _elements['node-1'] = node_1_container
  
  node_1_container._conditionalConfig = {
    condition: () => $get("isOpen"),
    renderThen: () => {
      const fragment = document.createDocumentFragment()
      const node_2_cond = document.createElement('div')
      node_2_cond.dataset.mirrorId = 'node-2'
      node_2_cond.dataset.mirrorName = 'Frame'
      node_2_cond.setAttribute('tabindex', "0")
      Object.assign(node_2_cond.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-self': 'stretch',
        'align-items': 'flex-start',
        'background': '#1a1a1a',
        'padding': '12px',
      })
      node_2_cond.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          _runtime.set('isOpen', 'false')
        }
      })
      const node_3_cond = document.createElement('span')
      node_3_cond.dataset.mirrorId = 'node-3'
      node_3_cond.dataset.mirrorName = 'Text'
      node_3_cond.textContent = "Press ESC to close"
      Object.assign(node_3_cond.style, {
        'color': 'white',
      })
      node_2_cond.appendChild(node_3_cond)
      fragment.appendChild(node_2_cond)
      return fragment
    },
  }
  
  // Initial conditional render
  if ($get("isOpen")) {
    node_1_container.appendChild(node_1_container._conditionalConfig.renderThen())
  }
  
  _root.appendChild(node_1_container)
