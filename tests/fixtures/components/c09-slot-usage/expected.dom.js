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
  'font-weight': '700',
  color: 'white',
})
node_2.dataset.component = 'Title'
node_2.dataset.slot = 'Title'
node_1.appendChild(node_2)

// Body
const node_3 = document.createElement('div')
_elements['node-3'] = node_3
node_3.dataset.mirrorId = 'node-3'
node_3.dataset.mirrorName = 'Body'
Object.assign(node_3.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
  gap: '4px',
})
node_3.dataset.component = 'Body'
node_3.dataset.slot = 'Body'
// Text
const node_4 = document.createElement('span')
_elements['node-4'] = node_4
node_4.dataset.mirrorId = 'node-4'
node_4.dataset.mirrorName = 'Text'
node_4.textContent = 'World'
node_4.dataset.component = 'Text'
node_3.appendChild(node_4)

node_1.appendChild(node_3)

_root.appendChild(node_1)
