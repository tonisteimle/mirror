  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '8px',
  })
  node_1.dataset.component = 'Frame'
  // Button
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Button'
  node_2.textContent = "Show"
  Object.assign(node_2.style, {
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
  node_2.dataset.component = 'Button'
  node_2.addEventListener('click', (e) => {
    _runtime.set('menuOpen', 'true')
  })
  node_1.appendChild(node_2)
  
  // Button
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Button'
  node_3.textContent = "Hide"
  Object.assign(node_3.style, {
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
  node_3.dataset.component = 'Button'
  node_3.addEventListener('click', (e) => {
    _runtime.set('menuOpen', 'false')
  })
  node_1.appendChild(node_3)
  
  // Button
  const node_4 = document.createElement('button')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Button'
  node_4.textContent = "Toggle"
  Object.assign(node_4.style, {
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
  node_4._stateMachine = {
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
  node_4.dataset.state = 'default'
  Object.assign(node_4.style, node_4._stateMachine.states['default'].styles)
  node_4.addEventListener('click', (e) => {
    const sm = node_4._stateMachine
    const current = sm.current
    if (current === 'on') {
      _runtime.transitionTo(node_4, 'default')
    } else {
      _runtime.transitionTo(node_4, 'on')
    }
  })
  node_4.dataset.component = 'Button'
  node_1.appendChild(node_4)
  
  // Frame
  const node_5 = document.createElement('div')
  _elements['node-5'] = node_5
  node_5.dataset.mirrorId = 'node-5'
  node_5.dataset.mirrorName = 'Frame'
  Object.assign(node_5.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'background': '#1a1a1a',
    'padding': '12px',
  })
  node_5._visibleWhen = 'menuOpen'
  // Evaluate initial visibility
  node_5.style.display = ($get("menuOpen")) ? '' : 'none'
  _runtime.bindVisibility(node_5, 'menuOpen')
  node_5.dataset.component = 'Frame'
  // Text
  const node_6 = document.createElement('span')
  _elements['node-6'] = node_6
  node_6.dataset.mirrorId = 'node-6'
  node_6.dataset.mirrorName = 'Text'
  node_6.textContent = "Menu"
  node_6.dataset.component = 'Text'
  node_5.appendChild(node_6)
  
  node_1.appendChild(node_5)
  
  _root.appendChild(node_1)
