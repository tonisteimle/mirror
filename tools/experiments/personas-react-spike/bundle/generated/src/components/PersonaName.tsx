import { inlineMd } from '../lib/inline-md'

export default function PersonaName({ text }: { text: string }) {
  return (
    <h2
      className="text-[44px] font-bold tracking-[-0.02em] leading-[1.05] em-light"
      dangerouslySetInnerHTML={{ __html: inlineMd(text) }}
    />
  )
}
