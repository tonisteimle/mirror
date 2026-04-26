  // Text
  const node_1 = document.createElement('span')
  _elements['node-1'] = node_1
  node_1.dataset.mirrorId = 'node-1'
  node_1.dataset.mirrorRoot = 'true'
  node_1.dataset.mirrorName = 'Text'
  node_1.textContent = `${$get("company.ceo.name")}, ${$get("company.ceo.title")}`
  node_1._textTemplate = () => `${$get("company.ceo.name")}, ${$get("company.ceo.title")}`
  _runtime.bindText(node_1, "company.ceo.name")
  _runtime.bindText(node_1, "company.ceo.title")
  node_1.dataset.component = 'Text'
  _root.appendChild(node_1)
