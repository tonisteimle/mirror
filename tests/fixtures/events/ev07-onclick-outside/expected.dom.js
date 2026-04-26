  // Button
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Button'
  node_1.textContent = "Toggle Menu"
  Object.assign(node_1.style, {
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
  node_1._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'on': {
        styles: {
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: 'on', trigger: 'onclick', modifier: 'toggle' },
    ],
  }
  node_1.dataset.state = 'default'
  Object.assign(node_1.style, node_1._stateMachine.states['default'].styles)
  node_1.addEventListener('click', (e) => {
    const sm = node_1._stateMachine
    const current = sm.current
    if (current === 'on') {
      _runtime.transitionTo(node_1, 'default')
    } else {
      _runtime.transitionTo(node_1, 'on')
    }
  })
  node_1.dataset.component = 'Button'
  _root.appendChild(node_1)
  
  // Conditional
  const node_2_container = document.createElement('div')
  node_2_container.dataset.conditionalId = 'node-2'
  node_2_container.style.display = 'contents';
  _elements['node-2'] = node_2_container
  
  node_2_container._conditionalConfig = {
    condition: () => $get("menuOpen"),
    renderThen: () => {
      const fragment = document.createDocumentFragment()
      const node_3_cond = document.createElement('div')
      node_3_cond.dataset.mirrorId = 'node-3'
      node_3_cond.dataset.mirrorName = 'Frame'
      Object.assign(node_3_cond.style, {
        'display': 'flex',
        'flex-direction': 'column',
        'align-self': 'stretch',
        'align-items': 'flex-start',
        'background': '#1a1a1a',
        'padding': '12px',
      })
      // Click outside handler
      const node_3_cond_clickOutsideHandler = (e) => {
        if (!node_3_cond.contains(e.target)) {
          _runtime.set('menuOpen', 'false')
        }
      }
      document.addEventListener('click', node_3_cond_clickOutsideHandler)
      node_3_cond._clickOutsideHandler = node_3_cond_clickOutsideHandler
      const node_4_cond = document.createElement('span')
      node_4_cond.dataset.mirrorId = 'node-4'
      node_4_cond.dataset.mirrorName = 'Text'
      node_4_cond.textContent = "Menu Item 1"
      Object.assign(node_4_cond.style, {
        'color': 'white',
      })
      node_3_cond.appendChild(node_4_cond)
      const node_5_cond = document.createElement('span')
      node_5_cond.dataset.mirrorId = 'node-5'
      node_5_cond.dataset.mirrorName = 'Text'
      node_5_cond.textContent = "Menu Item 2"
      Object.assign(node_5_cond.style, {
        'color': 'white',
      })
      node_3_cond.appendChild(node_5_cond)
      fragment.appendChild(node_3_cond)
      return fragment
    },
  }
  
  // Initial conditional render
  if ($get("menuOpen")) {
    node_2_container.appendChild(node_2_container._conditionalConfig.renderThen())
  }
  
  _root.appendChild(node_2_container)
