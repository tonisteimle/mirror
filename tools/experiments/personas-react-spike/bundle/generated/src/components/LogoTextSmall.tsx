export default function LogoTextSmall({ text, light }: { text: string; light?: boolean }) {
  return (
    <span className={`text-[11px] font-normal leading-[1.25] ${light ? 'text-white' : ''}`.trim()}>
      {text}
    </span>
  )
}
