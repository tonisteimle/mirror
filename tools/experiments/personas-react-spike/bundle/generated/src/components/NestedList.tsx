import type { ReactNode } from 'react'
export default function NestedList({ children }: { children?: ReactNode }) {
  return <ul className="ml-6 flex flex-col gap-2 list-none">{children}</ul>
}
