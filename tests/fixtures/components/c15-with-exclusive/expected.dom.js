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
    'gap': '0px',
  })
  node_1.dataset.layout = 'flex'
  node_1.dataset.component = 'Frame'
  // Tab
  const node_2 = document.createElement('button')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Tab'
  node_2.textContent = "Home"
  Object.assign(node_2.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '6px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'color': '#888',
  })
  node_2._stateStyles = {
    'selected': {
      'color': 'white',
      'border-style': 'solid',
      'border-width': '0 0 2px 0',
      'border-color': '#2271C1',
    },
  }
  node_2._stateMachine = {
    initial: 'selected',
    current: 'selected',
    states: {
      'selected': {
        styles: {
          'color': 'white',
          'border-style': 'solid',
          'border-width': '0 0 2px 0',
          'border-color': '#2271C1',
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: 'selected', trigger: 'onclick', modifier: 'exclusive' },
    ],
  }
  node_2._baseStyles = {
    'color': node_2.style['color'] || '',
    'border-style': node_2.style['border-style'] || '',
    'border-width': node_2.style['border-width'] || '',
    'border-color': node_2.style['border-color'] || '',
  }
  node_2.dataset.state = 'selected'
  Object.assign(node_2.style, node_2._stateMachine.states['selected'].styles)
  node_2.addEventListener('click', (e) => {
    const sm = node_2._stateMachine
    const current = sm.current
    _runtime.exclusiveTransition(node_2, 'selected')
  })
  node_2.dataset.component = 'Tab'
  node_1.appendChild(node_2)
  
  // Tab
  const node_3 = document.createElement('button')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Tab'
  node_3.textContent = "Profile"
  Object.assign(node_3.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '6px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'color': '#888',
  })
  node_3._stateStyles = {
    'selected': {
      'color': 'white',
      'border-style': 'solid',
      'border-width': '0 0 2px 0',
      'border-color': '#2271C1',
    },
  }
  node_3._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'selected': {
        styles: {
          'color': 'white',
          'border-style': 'solid',
          'border-width': '0 0 2px 0',
          'border-color': '#2271C1',
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: 'selected', trigger: 'onclick', modifier: 'exclusive' },
    ],
  }
  node_3._baseStyles = {
    'color': node_3.style['color'] || '',
    'border-style': node_3.style['border-style'] || '',
    'border-width': node_3.style['border-width'] || '',
    'border-color': node_3.style['border-color'] || '',
  }
  node_3.dataset.state = 'default'
  Object.assign(node_3.style, node_3._stateMachine.states['default'].styles)
  node_3.addEventListener('click', (e) => {
    const sm = node_3._stateMachine
    const current = sm.current
    _runtime.exclusiveTransition(node_3, 'selected')
  })
  node_3.dataset.component = 'Tab'
  node_1.appendChild(node_3)
  
  // Tab
  const node_4 = document.createElement('button')
  _elements['node-4'] = node_4
  node_4.dataset.mirrorId = 'node-4'
  node_4.dataset.mirrorName = 'Tab'
  node_4.textContent = "Settings"
  Object.assign(node_4.style, {
    'width': 'fit-content',
    'height': '36px',
    'flex-shrink': '0',
    'min-width': '36px',
    'padding': '10px',
    'border-radius': '6px',
    'border': '0px solid currentColor',
    'cursor': 'pointer',
    'color': '#888',
  })
  node_4._stateStyles = {
    'selected': {
      'color': 'white',
      'border-style': 'solid',
      'border-width': '0 0 2px 0',
      'border-color': '#2271C1',
    },
  }
  node_4._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'selected': {
        styles: {
          'color': 'white',
          'border-style': 'solid',
          'border-width': '0 0 2px 0',
          'border-color': '#2271C1',
        },
      },
      'default': {
        styles: {
        },
      },
    },
    transitions: [
      { to: 'selected', trigger: 'onclick', modifier: 'exclusive' },
    ],
  }
  node_4._baseStyles = {
    'color': node_4.style['color'] || '',
    'border-style': node_4.style['border-style'] || '',
    'border-width': node_4.style['border-width'] || '',
    'border-color': node_4.style['border-color'] || '',
  }
  node_4.dataset.state = 'default'
  Object.assign(node_4.style, node_4._stateMachine.states['default'].styles)
  node_4.addEventListener('click', (e) => {
    const sm = node_4._stateMachine
    const current = sm.current
    _runtime.exclusiveTransition(node_4, 'selected')
  })
  node_4.dataset.component = 'Tab'
  node_1.appendChild(node_4)
  
  _root.appendChild(node_1)
