import { inlineMd } from '../lib/inline-md'

export default function PersonaSteckbrief({ text }: { text: string }) {
  return (
    <p
      className="text-[17px] font-light leading-[1.6] max-w-[80ch] mt-7"
      dangerouslySetInnerHTML={{ __html: inlineMd(text) }}
    />
  )
}
