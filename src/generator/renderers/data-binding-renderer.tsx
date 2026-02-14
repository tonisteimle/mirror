/**
 * Data Binding Renderer
 *
 * Renders components that have data binding (data TypeName [where condition]).
 * Iterates over the data collection and renders children for each record.
 */

import React, { Fragment } from 'react'
import type { ASTNode } from '../../parser/types'
import { DataRecordProvider } from '../data-context'
import { useDataContext } from '../data-context-hooks'
import { getDataRecords, resolveNodeFields } from '../data-utils'
import type { GenerateOptions, RenderChildrenFn } from './types'

interface DataBindingRendererProps {
  node: ASTNode
  options: GenerateOptions
  renderChildren: RenderChildrenFn
}

/**
 * Renders a data-bound component by iterating over records.
 * Each child is rendered once per record with the record in context.
 */
export function DataBindingRenderer({ node, options, renderChildren }: DataBindingRendererProps) {
  const { allRecords, schemas } = useDataContext()

  if (!node.dataBinding) return null

  const { typeName, filter } = node.dataBinding

  // Get records for this data binding
  const records = getDataRecords(typeName, allRecords, schemas, filter)

  // Find the schema to get the actual type name
  const schema = schemas.find(s =>
    s.typeName === typeName ||
    s.typeName.toLowerCase() === typeName.toLowerCase() ||
    s.typeName.toLowerCase() + 's' === typeName.toLowerCase()
  )
  const actualTypeName = schema?.typeName || typeName

  return (
    <Fragment>
      {records.map((record, index) => (
        <DataRecordProvider
          key={record._id || `${node.id}-${index}`}
          record={record}
          typeName={actualTypeName}
        >
          <DataAwareChildren
            children={node.children}
            options={options}
            renderChildren={renderChildren}
            record={record}
            typeName={actualTypeName}
            schemas={schemas}
            allRecords={allRecords}
          />
        </DataRecordProvider>
      ))}
    </Fragment>
  )
}

/**
 * Wrapper component that resolves field references in children before rendering.
 * This is needed because resolveNodeFields requires access to the current record context.
 */
interface DataAwareChildrenProps {
  children: ASTNode[]
  options: GenerateOptions
  renderChildren: RenderChildrenFn
  record: import('../../parser/types').DataRecord
  typeName: string
  schemas: import('../../parser/types').DataSchema[]
  allRecords: Map<string, import('../../parser/types').DataRecord[]>
}

function DataAwareChildren({
  children,
  options,
  renderChildren,
  record,
  typeName,
  schemas,
  allRecords
}: DataAwareChildrenProps) {
  return (
    <>
      {children.map((child, childIndex) => {
        // Resolve field references in this child node
        const resolvedChild = resolveNodeFields(child, record, typeName, schemas, allRecords)
        return (
          <Fragment key={child.id || `child-${childIndex}`}>
            {renderChildren([resolvedChild], options)}
          </Fragment>
        )
      })}
    </>
  )
}
