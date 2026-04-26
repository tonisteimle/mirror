// Button
const node_1 = document.createElement('div')
_elements['node-1'] = node_1
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorRoot = 'true'
node_1.dataset.mirrorName = 'Button'
node_1.textContent = 'Custom'
Object.assign(node_1.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
  padding: '12px',
  background: '#2271C1',
  color: 'white',
  'border-radius': '6px',
})
node_1.dataset.component = 'Button'
_root.appendChild(node_1)
