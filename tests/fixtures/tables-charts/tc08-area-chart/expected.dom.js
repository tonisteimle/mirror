  // Area
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Area'
  node_1.setAttribute('chartType', "line")
  node_1.setAttribute('data', "$sales")
  node_1.setAttribute('fill', true)
  node_1.setAttribute('tension', 0.3)
  // Chart initialization
  node_1.dataset.mirrorChart = 'true'
  const node_1_config = {
    type: 'line',
    data: $get('sales'),
    fill: true,
    tension: 0.3,
  }
  _runtime.createChart(node_1, node_1_config)
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '400px',
    'flex-shrink': '0',
    'height': '200px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Area'
  node_1.dataset.slot = 'Area'
  _root.appendChild(node_1)
