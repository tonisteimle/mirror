// Btn
const node_1 = document.createElement('button')
_elements['node-1'] = node_1
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorRoot = 'true'
node_1.dataset.mirrorName = 'Btn'
node_1.textContent = 'Default'
Object.assign(node_1.style, {
  width: 'fit-content',
  height: '36px',
  'flex-shrink': '0',
  'min-width': '36px',
  padding: '10px',
  'border-radius': '4px',
  border: '0px solid currentColor',
  cursor: 'pointer',
  background: '#333',
  color: 'white',
})
node_1.dataset.component = 'Btn'
_root.appendChild(node_1)

// Btn
const node_2 = document.createElement('button')
_elements['node-2'] = node_2
node_2.dataset.mirrorId = 'node-2'
node_2.dataset.mirrorName = 'Btn'
node_2.textContent = 'Override'
Object.assign(node_2.style, {
  width: 'fit-content',
  height: '36px',
  'flex-shrink': '0',
  'min-width': '36px',
  padding: '10px',
  'border-radius': '4px',
  border: '0px solid currentColor',
  cursor: 'pointer',
  background: '#ef4444',
  color: 'white',
})
node_2.dataset.component = 'Btn'
_root.appendChild(node_2)
