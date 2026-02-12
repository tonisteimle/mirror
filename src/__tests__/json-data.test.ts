/**
 * Test JSON data arrays in token definitions
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../parser/parser'

describe('JSON Data Arrays', () => {
  it('parses single-line JSON array', () => {
    const code = `$items: [1, 2, 3]

Box "test"`

    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== TOKENS ===')
    for (const [k, v] of result.tokens) {
      console.log(`  ${k}:`, v)
    }

    expect(result.tokens.has('items')).toBe(true)
    const items = result.tokens.get('items')
    expect(Array.isArray(items)).toBe(true)
    expect(items).toEqual([1, 2, 3])
  })

  it('parses multi-line JSON array', () => {
    const code = `$projects: [
  { "name": "Project 1", "status": "active" },
  { "name": "Project 2", "status": "paused" }
]

Box "test"`

    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== TOKENS ===')
    for (const [k, v] of result.tokens) {
      console.log(`  ${k}:`, JSON.stringify(v))
    }

    expect(result.tokens.has('projects')).toBe(true)
    const projects = result.tokens.get('projects')
    expect(Array.isArray(projects)).toBe(true)
    expect(projects).toHaveLength(2)
    expect(projects[0].name).toBe('Project 1')
    expect(projects[1].status).toBe('paused')
  })

  it('parses projects array like in tutorial', () => {
    const code = `$projects: [
  { "name": "Website Redesign", "status": "active", "progress": 75, "tasks": 12 },
  { "name": "Mobile App", "status": "active", "progress": 40, "tasks": 8 },
  { "name": "API Integration", "status": "paused", "progress": 20, "tasks": 5 }
]

App ver
  each $project in $projects
    Card $project.name`

    const result = parse(code)

    console.log('=== ERRORS ===')
    console.log(result.errors)

    console.log('\n=== PROJECTS ===')
    const projects = result.tokens.get('projects')
    console.log(JSON.stringify(projects, null, 2))

    expect(result.tokens.has('projects')).toBe(true)
    expect(Array.isArray(projects)).toBe(true)
    expect(projects).toHaveLength(3)

    // Check that App is the root node
    expect(result.nodes[0].name).toBe('App')
  })
})
