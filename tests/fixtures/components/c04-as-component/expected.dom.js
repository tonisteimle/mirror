// DangerBtn
const node_1 = document.createElement('button')
_elements['node-1'] = node_1
node_1.dataset.mirrorId = 'node-1'
node_1.dataset.mirrorRoot = 'true'
node_1.dataset.mirrorName = 'DangerBtn'
node_1.textContent = 'Delete'
Object.assign(node_1.style, {
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
node_1.dataset.component = 'DangerBtn'
_root.appendChild(node_1)
