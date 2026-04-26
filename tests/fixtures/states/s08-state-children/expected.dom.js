  // LikeBtn
  const node_1 = document.createElement('button')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'LikeBtn'
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'row',
    'align-items': 'flex-start',
    'gap': '8px',
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
  })
  node_1.dataset.layout = 'flex'
  node_1._stateStyles = {
    'on': {
      'background': '#ef4444',
    },
  }
  node_1._stateMachine = {
    initial: 'default',
    current: 'default',
    states: {
      'on': {
        styles: {
          'background': '#ef4444',
        },
        children: () => {
          const _stateChildren = []
          const _sc0 = document.createElement('span')
          _sc0.textContent = "heart"
          _sc0.setAttribute('data-icon-color', "white")
          _sc0.setAttribute('data-icon-size', "18")
          _sc0.setAttribute('data-icon-fill', true)
          _sc0.style['width'] = '20px'
          _sc0.style['flex-shrink'] = '0'
          _sc0.style['height'] = '20px'
          _sc0.style['flex-shrink'] = '0'
          _sc0.style['font-size'] = '18px'
          _sc0.style['width'] = '18px'
          _sc0.style['height'] = '18px'
          _sc0.dataset.iconSize = '16'
          _sc0.dataset.iconColor = 'currentColor'
          _sc0.dataset.iconWeight = '2'
          _runtime.loadIcon(_sc0, 'heart')
          _stateChildren.push(_sc0)
          const _sc1 = document.createElement('span')
          _sc1.textContent = "Liked!"
          _sc1.style['color'] = 'white'
          _stateChildren.push(_sc1)
          return _stateChildren
        },
      },
      'default': {
        styles: {
        },
        children: () => {
          const _stateChildren = []
          const _sc0 = document.createElement('span')
          _sc0.textContent = "heart"
          _sc0.setAttribute('data-icon-color', "#888")
          _sc0.setAttribute('data-icon-size', "18")
          _sc0.style['width'] = '20px'
          _sc0.style['flex-shrink'] = '0'
          _sc0.style['height'] = '20px'
          _sc0.style['flex-shrink'] = '0'
          _sc0.style['color'] = '#888'
          _sc0.style['font-size'] = '18px'
          _sc0.style['width'] = '18px'
          _sc0.style['height'] = '18px'
          _sc0.dataset.iconSize = '16'
          _sc0.dataset.iconColor = '#888'
          _sc0.dataset.iconWeight = '2'
          _runtime.loadIcon(_sc0, 'heart')
          _stateChildren.push(_sc0)
          const _sc1 = document.createElement('span')
          _sc1.textContent = "Like"
          _sc1.style['color'] = '#888'
          _stateChildren.push(_sc1)
          return _stateChildren
        },
      },
    },
    transitions: [
      { to: 'on', trigger: 'onclick', modifier: 'toggle' },
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
    if (current === 'on') {
      _runtime.transitionTo(node_1, 'default')
    } else {
      _runtime.transitionTo(node_1, 'on')
    }
  })
  node_1.dataset.component = 'LikeBtn'
  // Icon
  const node_2 = document.createElement('span')
  _elements['node-2'] = node_2
  node_2.dataset.mirrorId = 'node-2'
  node_2.dataset.mirrorName = 'Icon'
  node_2.setAttribute('data-icon-color', "#888")
  node_2.setAttribute('data-icon-size', "18")
  // Icon default styles
  Object.assign(node_2.style, {
    'display': 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'flex-shrink': '0',
    'line-height': '0',
  })
  // Load Lucide icon
  _runtime.loadIcon(node_2, "heart")
  Object.assign(node_2.style, {
    'width': '20px',
    'flex-shrink': '0',
    'height': '20px',
    'flex-shrink': '0',
    'color': '#888',
    'font-size': '18px',
    'width': '18px',
    'height': '18px',
  })
  node_2.dataset.component = 'Icon'
  node_2.dataset.slot = 'Icon'
  node_1.appendChild(node_2)
  
  // Text
  const node_3 = document.createElement('span')
  _elements['node-3'] = node_3
  node_3.dataset.mirrorId = 'node-3'
  node_3.dataset.mirrorName = 'Text'
  node_3.textContent = "Like"
  Object.assign(node_3.style, {
    'color': '#888',
  })
  node_3.dataset.component = 'Text'
  node_3.dataset.slot = 'Text'
  node_1.appendChild(node_3)
  
  _root.appendChild(node_1)
