  // DatePicker Component: DatePicker
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.zagComponent = 'datepicker'
  node_1.dataset.mirrorName = 'DatePicker'
  node_1._zagConfig = {
    type: 'datepicker',
    id: 'node-1',
    machineConfig: {"id":"node-1","selectionMode":"range","startOfWeek":1},
  }
  
  Object.assign(node_1.style, {
    'align-self': 'stretch',
  })
  // Control (Input + Trigger wrapper)
  const node_1_control = document.createElement('div')
  node_1_control.dataset.slot = 'Control'
  node_1.appendChild(node_1_control)
  
  // Input
  const node_1_input = document.createElement('input')
  node_1_input.type = 'text'
  node_1_input.dataset.slot = 'Input'
  node_1_input.placeholder = 'Select date...'
  node_1_control.appendChild(node_1_input)
  
  // Trigger (calendar button)
  const node_1_trigger = document.createElement('button')
  node_1_trigger.type = 'button'
  node_1_trigger.dataset.slot = 'Trigger'
  node_1_trigger.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  node_1_control.appendChild(node_1_trigger)
  
  // Content (calendar popup)
  const node_1_content = document.createElement('div')
  node_1_content.dataset.slot = 'Content'
  node_1.appendChild(node_1_content)
  
  _root.appendChild(node_1)
  
  // Initialize DatePicker
  if (typeof _runtime !== 'undefined' && _runtime.initDatePickerComponent) {
    _runtime.initDatePickerComponent(node_1)
  }
