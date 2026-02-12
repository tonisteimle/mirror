import { propertiesToStyle, isContainerComponent } from './src/utils/style-converter'
import { CONTAINER_COMPONENTS } from './src/dsl/properties'

// Test 1: Check if Button is in containers
console.log('Button in CONTAINER_COMPONENTS:', CONTAINER_COMPONENTS.has('Button'))

// Test 2: Check isContainerComponent for Button
console.log('isContainerComponent("Button"):', isContainerComponent('Button'))

// Test 3: Test propertiesToStyle with state properties (like hover state)
const hoverProperties = { col: '#1d5ba0' }
const styleResult = propertiesToStyle(hoverProperties, true, 'Button')

console.log('State hover properties:', JSON.stringify(hoverProperties))
console.log('propertiesToStyle result:', JSON.stringify(styleResult))
console.log('backgroundColor:', styleResult.backgroundColor)
console.log('color:', styleResult.color)

// Test 4: Test with empty component name
const styleWithEmpty = propertiesToStyle(hoverProperties, true, '')
console.log('\nWith empty component name:')
console.log('propertiesToStyle result:', JSON.stringify(styleWithEmpty))
console.log('backgroundColor:', styleWithEmpty.backgroundColor)
console.log('color:', styleWithEmpty.color)
