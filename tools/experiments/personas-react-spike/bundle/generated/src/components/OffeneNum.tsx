// `OffeneNum as Text: fs 14, weight 300, w 32`
// Used as marker in OffeneList items in app.mir, but the visual reference
// renders the numeral via CSS `counter()`. We keep the component for parity
// even though we don't end up using it directly in JSX.
export default function OffeneNum({ text }: { text: string }) {
  return <span className="text-[14px] font-light w-8 inline-block">{text}</span>
}
