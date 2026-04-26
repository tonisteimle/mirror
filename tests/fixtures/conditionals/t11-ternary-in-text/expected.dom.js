  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = ($get("count") > 0 ? `Items: ${$get("count")}` : "Empty")
  node_1._textTemplate = () => ($get("count") > 0 ? `Items: ${$get("count")}` : "Empty")
  _runtime.bindText(node_1, "count")
  _runtime.bindText(node_1, "count")
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
