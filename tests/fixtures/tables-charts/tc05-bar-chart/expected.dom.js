  // Bar
  const node_1 = document.createElement('div')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Bar'
  node_1.setAttribute('chartType', "bar")
  node_1.setAttribute('data', "$data")
  node_1.setAttribute('colors', "#2271C1")
  // Chart initialization
  node_1.dataset.mirrorChart = 'true'
  const node_1_config = {
    type: 'bar',
    data: $get('data'),
    colors: ["#2271C1"],
  }
  _runtime.createChart(node_1, node_1_config)
  Object.assign(node_1.style, {
    'display': 'flex',
    'flex-direction': 'column',
    'align-items': 'flex-start',
    'width': '350px',
    'flex-shrink': '0',
    'height': '180px',
    'flex-shrink': '0',
  })
  node_1.dataset.component = 'Bar'
  _root.appendChild(node_1)
