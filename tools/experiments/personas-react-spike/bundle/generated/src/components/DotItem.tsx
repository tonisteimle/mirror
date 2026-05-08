import type { ReactNode } from 'react'
import DotMarker from './DotMarker'

export default function DotItem({ children }: { children?: ReactNode }) {
  return (
    <li className="flex flex-row gap-4">
      <DotMarker />
      <div className="grow">{children}</div>
    </li>
  )
}
