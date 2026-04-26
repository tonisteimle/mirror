  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = `Hello ${$get("first")} ${$get("last")}, you have ${$get("count")} points`
  node_1._textTemplate = () => `Hello ${$get("first")} ${$get("last")}, you have ${$get("count")} points`
  _runtime.bindText(node_1, "first")
  _runtime.bindText(node_1, "last")
  _runtime.bindText(node_1, "count")
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
