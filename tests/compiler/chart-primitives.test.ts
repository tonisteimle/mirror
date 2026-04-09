/**
 * Tests for Chart Primitives
 *
 * Tests that chart primitives (Line, Bar, Pie, etc.) are correctly
 * parsed, transformed to IR, and generate proper DOM code.
 */

import { describe, test, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

describe('Chart Primitives', () => {
  describe('Schema Recognition', () => {
    test('Line is recognized as a primitive', () => {
      const code = `Line $data`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances).toHaveLength(1)
      expect(ast.instances[0].component).toBe('Line')
    })

    test('Bar is recognized as a primitive', () => {
      const code = `Bar $sales`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances[0].component).toBe('Bar')
    })

    test('Pie is recognized as a primitive', () => {
      const code = `Pie $categories`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances[0].component).toBe('Pie')
    })

    test('Donut is recognized as a primitive', () => {
      const code = `Donut $distribution`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances[0].component).toBe('Donut')
    })

    test('Area is recognized as a primitive', () => {
      const code = `Area $trends`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances[0].component).toBe('Area')
    })

    test('Scatter is recognized as a primitive', () => {
      const code = `Scatter $points`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances[0].component).toBe('Scatter')
    })

    test('Radar is recognized as a primitive', () => {
      const code = `Radar $skills`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.instances[0].component).toBe('Radar')
    })
  })

  describe('IR Transformation', () => {
    test('Line chart creates IRNode with primitive=chart', () => {
      const code = `Line $data, w 400, h 200`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes).toHaveLength(1)
      const node = ir.nodes[0]
      expect(node.primitive).toBe('chart')
      expect(node.tag).toBe('div')

      // Check chart type property
      const chartTypeProp = node.properties.find(p => p.name === 'chartType')
      expect(chartTypeProp?.value).toBe('line')
    })

    test('Bar chart has chartType=bar', () => {
      const code = `Bar $sales`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      expect(node.primitive).toBe('chart')
      const chartTypeProp = node.properties.find(p => p.name === 'chartType')
      expect(chartTypeProp?.value).toBe('bar')
    })

    test('Pie chart has chartType=pie', () => {
      const code = `Pie $categories`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const chartTypeProp = node.properties.find(p => p.name === 'chartType')
      expect(chartTypeProp?.value).toBe('pie')
    })

    test('Donut chart has chartType=doughnut', () => {
      const code = `Donut $categories`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const chartTypeProp = node.properties.find(p => p.name === 'chartType')
      expect(chartTypeProp?.value).toBe('doughnut')
    })

    test('Area chart has chartType=line with fill defaults', () => {
      const code = `Area $trends`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const chartTypeProp = node.properties.find(p => p.name === 'chartType')
      expect(chartTypeProp?.value).toBe('line')
    })

    test('Chart with data binding extracts data property', () => {
      const code = `Line $sales`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const dataProp = node.properties.find(p => p.name === 'data')
      expect(dataProp?.value).toBe('$sales')
    })

    test('Chart with x/y field properties', () => {
      const code = `Bar $products, x "name", y "value"`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const xProp = node.properties.find(p => p.name === 'xField')
      const yProp = node.properties.find(p => p.name === 'yField')
      expect(xProp?.value).toBe('name')
      expect(yProp?.value).toBe('value')
    })

    test('Chart preserves sizing styles', () => {
      const code = `Line $data, w 400, h 200`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      // Check that width/height styles are present
      const widthStyle = node.styles.find(s => s.property === 'width')
      const heightStyle = node.styles.find(s => s.property === 'height')
      expect(widthStyle).toBeDefined()
      expect(heightStyle).toBeDefined()
    })
  })

  describe('DOM Generation', () => {
    test('generates createChart runtime call', () => {
      const code = `Line $data, w 400, h 200`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('_runtime.createChart')
      expect(output).toContain("type: 'line'")
      expect(output).toContain("data: $get('data')")
    })

    test('generates chart config with type', () => {
      const code = `Bar $sales`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain("type: 'bar'")
    })

    test('generates chart with x/y fields', () => {
      const code = `Bar $products, x "name", y "value"`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain("xField: 'name'")
      expect(output).toContain("yField: 'value'")
    })

    test('generates chart with title', () => {
      const code = `Line $data, title "Sales Report"`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain("title: 'Sales Report'")
    })

    test('sets data-mirrorChart attribute', () => {
      const code = `Line $data`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain("dataset.mirrorChart = 'true'")
    })
  })

  describe('Chart Properties', () => {
    test('colors property is parsed', () => {
      const code = `Line $data, colors #2563eb #10b981`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const colorsProp = node.properties.find(p => p.name === 'colors')
      expect(colorsProp?.value).toContain('#2563eb')
      expect(colorsProp?.value).toContain('#10b981')
    })

    test('legend property is parsed with explicit value', () => {
      const code = `Pie $data, legend true`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const legendProp = node.properties.find(p => p.name === 'legend')
      expect(legendProp?.value).toBe(true)
    })

    test('grid property is parsed with explicit false', () => {
      const code = `Line $data, grid false`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const gridProp = node.properties.find(p => p.name === 'grid')
      // Note: Parser returns "false" as string, IR converts to boolean
      expect(gridProp?.value).toBe(false)
    })

    test('stacked property is parsed with explicit value', () => {
      const code = `Bar $data, stacked true`
      const ast = parse(code)
      const ir = toIR(ast)

      const node = ir.nodes[0]
      const stackedProp = node.properties.find(p => p.name === 'stacked')
      expect(stackedProp?.value).toBe(true)
    })
  })
})
