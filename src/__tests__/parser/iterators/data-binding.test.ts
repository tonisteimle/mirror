/**
 * Parser Tests: Data Binding
 *
 * Tests for data binding syntax:
 * - data Collection
 * - data Collection where field == value
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne } from '../../test-utils'

describe('Basic Data Binding', () => {
  it('parses data with collection name', () => {
    const node = parseOne('TaskList data Tasks')
    expect(node.dataBinding?.typeName).toBe('Tasks')
  })

  it('parses data binding with different collections', () => {
    const collections = ['Users', 'Products', 'Orders', 'Messages']
    collections.forEach((coll) => {
      const node = parseOne(`List data ${coll}`)
      expect(node.dataBinding?.typeName).toBe(coll)
    })
  })
})

describe('Data with Where Clause', () => {
  it('parses where with == condition', () => {
    const node = parseOne('TaskList data Tasks where done == false')
    expect(node.dataBinding?.typeName).toBe('Tasks')
    expect(node.dataBinding?.filter).toBeDefined()
    expect(node.dataBinding?.filter?.type).toBe('comparison')
  })

  it('parses where with string value', () => {
    const node = parseOne('UserList data Users where role == "admin"')
    expect(node.dataBinding?.typeName).toBe('Users')
    expect(node.dataBinding?.filter?.type).toBe('comparison')
  })

  it('parses where with boolean true', () => {
    const node = parseOne('CompletedTasks data Tasks where done == true')
    expect(node.dataBinding?.typeName).toBe('Tasks')
    expect(node.dataBinding?.filter?.value).toBe(true)
  })
})

describe('Data Binding in Context', () => {
  it('data binding with component properties', () => {
    const node = parseOne('TaskList pad 16, gap 8, data Tasks')
    expect(node.properties.pad).toBe(16)
    expect(node.properties.g).toBe(8)
    expect(node.dataBinding?.typeName).toBe('Tasks')
  })

  it('data binding with children', () => {
    const result = parse(`UserList data Users
  - UserCard
      Avatar $item.avatar
      Name $item.name`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].dataBinding?.typeName).toBe('Users')
  })
})

describe('Data with Each Loop', () => {
  it('each with data binding', () => {
    const result = parse(`each $task in $tasks
  TaskCard
    Text $task.title
    Icon if $task.done then "check" else "circle"`)
    expect(result.errors).toHaveLength(0)
  })

  it('each with item properties', () => {
    const result = parse(`each $user in $users
  Card
    Avatar $user.avatar
    Text $user.name
    Text $user.email`)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Complex Data Queries', () => {
  it('where with string comparison', () => {
    const node = parseOne('ActiveUsers data Users where status == "active"')
    expect(node.dataBinding?.typeName).toBe('Users')
    expect(node.dataBinding?.filter?.type).toBe('comparison')
  })

  it('data binding in nested structure', () => {
    const result = parse(`Dashboard
  Section "Active Tasks"
    TaskList data Tasks where status == "active"
  Section "Completed"
    TaskList data Tasks where status == "done"`)
    expect(result.errors).toHaveLength(0)
  })
})
