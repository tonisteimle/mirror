// StatusBadge
const node_1 = document.createElement('div')
_elements['node-1'] = node_1
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorRoot = 'true'
node_1.dataset.mirrorName = 'StatusBadge'
Object.assign(node_1.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
  padding: '8px',
  background: '#2271C1',
  'border-radius': '4px',
})
node_1.dataset.component = 'StatusBadge'
_root.appendChild(node_1)
