// Card
const node_1 = document.createElement('div')
_elements['node-1'] = node_1
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorRoot = 'true'
node_1.dataset.mirrorName = 'Card'
Object.assign(node_1.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
  padding: '16px',
  background: '#1a1a1a',
  'border-radius': '8px',
})
node_1.dataset.component = 'Card'
// Title
const node_2 = document.createElement('div')
_elements['node-2'] = node_2
node_2.dataset.mirrorId = 'node-2'
node_2.dataset.mirrorName = 'Title'
node_2.textContent = 'Hello'
Object.assign(node_2.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
  'font-size': '18px',
  color: '#ef4444',
})
node_2.dataset.component = 'Title'
node_2.dataset.slot = 'Title'
node_1.appendChild(node_2)

_root.appendChild(node_1)
