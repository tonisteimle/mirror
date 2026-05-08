import type { ReactNode } from 'react'
import DashMarker from './DashMarker'

export default function DashItem({ children }: { children?: ReactNode }) {
  return (
    <li className="flex flex-row gap-6">
      <DashMarker />
      <div className="grow">{children}</div>
    </li>
  )
}
