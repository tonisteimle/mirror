  // Button
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Button'
  _elements['MenuBtn'] = node_1
  node_1.dataset.mirrorName = 'MenuBtn'
  Object.assign(node_1.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
    'background': '#333',
    'color': 'white',
  })
  node_1._stateStyles = {
    'open': {
      'background': '#2271C1',
    },
  }
  node_1._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'open': {
        styles: {
          'background': '#2271C1',
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: 'open', trigger: 'onclick', modifier: 'toggle' },
    ],
  }
  node_1._baseStyles = {
    'background': node_1.style['background'] || '',
  }
  node_1.dataset.state = 'default'
  Object.assign(node_1.style, node_1._stateMachine.states['default'].styles)
  node_1.addEventListener('click', (e) => {
    const sm = node_1._stateMachine
    const current = sm.current
    if (current === 'open') {
      _runtime.transitionTo(node_1, 'default')
    } else {
      _runtime.transitionTo(node_1, 'open')
    }
  })
  node_1.dataset.component = 'Button'
  _root.appendChild(node_1)
  
  // Frame
  const node_2 = document.createElement('div')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Frame'
  Object.assign(node_2.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '4px',
    'background': '#1a1a1a',
    'padding': '12px',
    'display': 'none',
  })
  node_2._stateStyles = {
    '_MenuBtn_open': {
      'display': '',
    },
  }
  node_2._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      '_MenuBtn_open': {
        styles: {
          'display': '',
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: '_MenuBtn_open', trigger: '' },
    ],
  }
  node_2._baseStyles = {
    'display': node_2.style['display'] || '',
  }
  node_2.dataset.state = 'default'
  Object.assign(node_2.style, node_2._stateMachine.states['default'].styles)
  node_2.dataset.component = 'Frame'
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = "Menu Item 1"
  Object.assign(node_3.style, {
    'color': 'white',
  })
  node_3.dataset.component = 'Text'
  node_2.appendChild(node_3)
  
  // Text
  const node_4 = document.createElement('span')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Text'
  node_4.textContent = "Menu Item 2"
  Object.assign(node_4.style, {
    'color': 'white',
  })
  node_4.dataset.component = 'Text'
  node_2.appendChild(node_4)
  
  _root.appendChild(node_2)
  
  
  // Setup when dependencies (after DOM is built)
  // When dependency: _MenuBtn_open when MenuBtn open
  _runtime.watchStates(node_2, '_MenuBtn_open', 'default', 'or', [
    { target: 'MenuBtn', state: 'open' },
  ])
