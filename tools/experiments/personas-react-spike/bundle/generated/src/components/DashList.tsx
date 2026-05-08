import type { ReactNode } from 'react'
export default function DashList({ children }: { children?: ReactNode }) {
  return <ul className="dash-list">{children}</ul>
}
