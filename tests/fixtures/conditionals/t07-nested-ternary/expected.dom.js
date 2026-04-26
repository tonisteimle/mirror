  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = ($get("level") == 1 ? "Beginner" : ($get("level") == 2 ? "Intermediate" : "Advanced"))
  node_1._textTemplate = () => ($get("level") == 1 ? "Beginner" : ($get("level") == 2 ? "Intermediate" : "Advanced"))
  _runtime.bindText(node_1, "level")
  _runtime.bindText(node_1, "level")
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
