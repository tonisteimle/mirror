  // TaskStatus
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'TaskStatus'
  node_1.textContent = "Status"
  Object.assign(node_1.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '8px 16px',
    'border-radius': '6px',
    'border-width': '0px',
    'border-style': 'solid',
    'cursor': 'pointer',
  })
  node_1._stateStyles = {
    'todo': {
      'background': '#333',
      'color': '#888',
    },
    'doing': {
      'background': '#f59e0b',
      'color': 'white',
    },
    'done': {
      'background': '#10b981',
      'color': 'white',
    },
  }
  node_1._stateMachine = {
    initial: 'todo',
    current: 'todo',
    states: {
      'todo': {
        styles: {
          'background': '#333',
          'color': '#888',
        },
      },
      'doing': {
        styles: {
          'background': '#f59e0b',
          'color': 'white',
        },
      },
      'done': {
        styles: {
          'background': '#10b981',
          'color': 'white',
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: 'todo', trigger: 'onclick', modifier: 'toggle' },
    ],
  }
  node_1._baseStyles = {
    'background': node_1.style['background'] || '',
    'color': node_1.style['color'] || '',
  }
  node_1.dataset.state = 'todo'
  Object.assign(node_1.style, node_1._stateMachine.states['todo'].styles)
  node_1.addEventListener('click', (e) => {
    const sm = node_1._stateMachine
    const current = sm.current
    _runtime.stateMachineToggle(node_1)
  })
  node_1.dataset.component = 'TaskStatus'
  _root.appendChild(node_1)
