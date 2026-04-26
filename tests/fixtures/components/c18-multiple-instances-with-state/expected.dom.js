  // Frame
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Frame'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-self': 'stretch',
    'align-items': 'flex-start',
    'gap': '8px',
  })
  node_1.dataset.layout = 'flex'
  node_1.dataset.component = 'Frame'
  // Btn
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Btn'
  node_2.textContent = "A"
  Object.assign(node_2.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '4px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'background': '#333',
    'color': 'white',
  })
  node_2._stateStyles = {
    'on': {
      'background': '#ef4444',
    },
  }
  node_2._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'on': {
        styles: {
          'background': '#ef4444',
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
  node_2._baseStyles = {
    'background': node_2.style['background'] || '',
  }
  node_2.dataset.state = 'default'
  Object.assign(node_2.style, node_2._stateMachine.states['default'].styles)
  node_2.addEventListener('click', (e) => {
    const sm = node_2._stateMachine
    const current = sm.current
    if (current === 'on') {
      _runtime.transitionTo(node_2, 'default')
    } else {
      _runtime.transitionTo(node_2, 'on')
    }
  })
  node_2.dataset.component = 'Btn'
  node_1.appendChild(node_2)
  
  // Btn
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Btn'
  node_3.textContent = "B"
  Object.assign(node_3.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '4px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'background': '#333',
    'color': 'white',
  })
  node_3._stateStyles = {
    'on': {
      'background': '#ef4444',
    },
  }
  node_3._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'on': {
        styles: {
          'background': '#ef4444',
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
  node_3._baseStyles = {
    'background': node_3.style['background'] || '',
  }
  node_3.dataset.state = 'default'
  Object.assign(node_3.style, node_3._stateMachine.states['default'].styles)
  node_3.addEventListener('click', (e) => {
    const sm = node_3._stateMachine
    const current = sm.current
    if (current === 'on') {
      _runtime.transitionTo(node_3, 'default')
    } else {
      _runtime.transitionTo(node_3, 'on')
    }
  })
  node_3.dataset.component = 'Btn'
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
