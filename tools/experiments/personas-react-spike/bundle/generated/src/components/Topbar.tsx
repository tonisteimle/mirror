import type { ReactNode } from 'react'

export default function Topbar({ children }: { children?: ReactNode }) {
  return (
    <header className="w-full pt-8 px-6 pb-6 flex flex-row items-center bg-white">
      {children}
    </header>
  )
}
