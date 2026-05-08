import type { ReactNode } from 'react'

export default function FooterFrame({ children }: { children?: ReactNode }) {
  return <footer className="bg-ink text-white pt-[88px] px-6 pb-10 w-full">{children}</footer>
}
