  // Donut
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Donut'
  node_1.setAttribute('chartType', "doughnut")
  node_1.setAttribute('data', "$data")
  // Chart initialization
  node_1.dataset.mirrorChart = 'true'
  const node_1_config = {
    type: 'doughnut',
    data: $get('data'),
  }
  _runtime.createChart(node_1, node_1_config)
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '250px',
    'flex-shrink': '0',
    'height': '250px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Donut'
  _root.appendChild(node_1)
