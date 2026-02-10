interface CodeViewProps {
  code: string
}

export function CodeView({ code }: CodeViewProps) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: '#2D2D2D',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px',
      }}>
        <span style={{ color: '#9CA3AF', fontSize: '12px' }}>React JSX</span>
        <button
          onClick={copyToClipboard}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Kopieren
        </button>
      </div>
      <pre style={{
        flex: 1,
        margin: 0,
        padding: '16px',
        backgroundColor: '#1E1E1E',
        color: '#D4D4D4',
        fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        overflow: 'auto',
        borderBottomLeftRadius: '8px',
        borderBottomRightRadius: '8px',
      }}>
        {code || '// Code erscheint hier...'}
      </pre>
    </div>
  )
}
