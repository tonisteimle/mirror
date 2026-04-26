  // Btn
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Btn'
  node_1.textContent = "Override demo"
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
    'font-size': '14px',
  })
  node_1._stateStyles = {
    'on': {
      'background': '#ef4444',
      'color': '#fff',
      'font-size': '16px',
    },
  }
  node_1._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'on': {
        styles: {
          'background': '#ef4444',
          'color': '#fff',
          'font-size': '16px',
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
  node_1._baseStyles = {
    'background': node_1.style['background'] || '',
    'color': node_1.style['color'] || '',
    'font-size': node_1.style['font-size'] || '',
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
  node_1.dataset.component = 'Btn'
  _root.appendChild(node_1)
