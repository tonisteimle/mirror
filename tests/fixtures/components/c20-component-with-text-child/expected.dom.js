// TreeNode
const node_1 = document.createElement('div')
_elements['node-1'] = node_1
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorRoot = 'true'
node_1.dataset.mirrorName = 'TreeNode'
Object.assign(node_1.style, {
  display: 'flex',
  'flex-direction': 'column',
  'align-self': 'stretch',
  'align-items': 'flex-start',
  padding: '8px',
  background: '#1a1a1a',
})
node_1.dataset.component = 'TreeNode'
// Text
const node_2 = document.createElement('span')
_elements['node-2'] = node_2
node_2.dataset.mirrorId = 'node-2'
node_2.dataset.mirrorName = 'Text'
node_2.textContent = 'Leaf'
node_2.dataset.component = 'Text'
node_2.dataset.slot = 'Text'
node_1.appendChild(node_2)

_root.appendChild(node_1)
